<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

class Cadastros
{
    public const TIPOS = [
        'estudante' => ['estudante', 'id_estudante', ['data_nascimento', 'telefone', 'instituicao_ensino', 'turma']],
        'professor' => ['professor', 'id_professor', ['telefone', 'instituicao_ensino', 'cargo']],
        'psicologo_escolar' => ['psicologo_escolar', 'id_psicologo_escolar',
            ['telefone', 'registro_profissional', 'estado_registro', 'instituicao_ensino']],
        'psicologo_clinico' => ['psicologo_clinico', 'id_psicologo_clinico',
            ['telefone', 'registro_profissional', 'estado_registro']],
    ];

    private const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
        'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

    public static function validar(string $tipo, Entrada $e, bool $parcial, ?int $idUsuario = null): array
    {
        $usuario = $perfil = [];
        $guardar = function (array &$alvo, string $campo, mixed $valor) {
            if ($valor !== Entrada::AUSENTE) {
                $alvo[$campo] = $valor;
            }
        };

        $guardar($usuario, 'nome_completo', $e->texto('nome_completo', max: 150));
        $email = $e->email('email', max: 254);
        if (is_string($email) && $email !== '') {
            $email = mb_strtolower($email);
            $repetido = DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])
                ->when($idUsuario, fn ($q) => $q->where('id_usuario', '!=', $idUsuario))->exists();
            if ($repetido) {
                $e->erro('email', 'Já existe uma conta com este e-mail.');
            }
        }
        $guardar($usuario, 'email', $email);
        $senha = $e->texto('senha', max: 128, min: config('mkpause.senha_tamanho_minimo'), obrigatorio: false, aparar: false);

        $opcional = fn (string $campo, int $max) => $e->texto($campo, max: $max, obrigatorio: false, vazio: true, nulo: true);
        foreach (self::TIPOS[$tipo][2] as $campo) {
            $valor = match ($campo) {
                'data_nascimento' => $e->data($campo, obrigatorio: false, nulo: true),
                'telefone' => self::telefone($e),
                'instituicao_ensino' => $opcional($campo, 160),
                'turma' => $opcional($campo, 80),
                'cargo' => $opcional($campo, 120),
                'registro_profissional' => $e->texto($campo, max: 40),
                'estado_registro' => self::regexUf($e),
            };
            if ($campo === 'data_nascimento' && is_string($valor) && $valor !== Entrada::AUSENTE && $valor > Formato::agora()->format('Y-m-d')) {
                $e->erro($campo, 'A data de nascimento não pode estar no futuro.');
            }
            $guardar($perfil, $campo, $valor);
        }
        $e->falharSeHouverErros();

        if (!$parcial && ($senha === Entrada::AUSENTE || $senha === null || $senha === '')) {
            throw ErroApi::campos(['senha' => ['Defina uma senha para o primeiro acesso.']]);
        }
        if (array_key_exists('estado_registro', $perfil)) {
            $perfil['estado_registro'] = strtoupper($perfil['estado_registro']);
            if (!in_array($perfil['estado_registro'], self::UFS, true)) {
                throw ErroApi::campos(['estado_registro' => ['Use uma UF válida, como PR.']]);
            }
        }
        return ['usuario' => $usuario, 'perfil' => $perfil, 'senha' => $senha === Entrada::AUSENTE ? null : $senha];
    }

    private static function regexUf(Entrada $e): mixed
    {
        $valor = $e->texto('estado_registro');
        if (is_string($valor) && $valor !== '' && !preg_match('/^[A-Za-z]{2}$/', $valor)) {
            $e->erro('estado_registro', 'Use a sigla da UF, ex.: PR.');
            return null;
        }
        return $valor;
    }

    private static function telefone(Entrada $e): mixed
    {
        $valor = $e->texto('telefone', max: 30, obrigatorio: false, vazio: true, nulo: true);
        if ($valor === Entrada::AUSENTE || $valor === null || $valor === '') return $valor;
        $digitos = preg_replace('/\D/', '', $valor);
        if (in_array(strlen($digitos), [12, 13], true) && str_starts_with($digitos, '55')) $digitos = substr($digitos, 2);
        if (!preg_match('/^[+\d\s().-]+$/', $valor) || !in_array(strlen($digitos), [10, 11], true)) {
            $e->erro('telefone', 'Informe um telefone com DDD e 10 ou 11 dígitos.');
            return null;
        }
        $corte = strlen($digitos) === 11 ? 5 : 4;
        return '('.substr($digitos, 0, 2).') '.substr($digitos, 2, $corte).'-'.substr($digitos, 2 + $corte);
    }

    /** Cria usuario + perfil (transação). Devolve o id do perfil. */
    public static function criar(string $tipo, array $dados, ?int $escola = null): int
    {
        [$tabela, $chave] = self::TIPOS[$tipo];
        return DB::transaction(function () use ($tabela, $chave, $dados, $escola) {
            $agora = Formato::banco(Formato::agora());
            $idUsuario = DB::table('usuario')->insertGetId([
                ...$dados['usuario'], 'id_escola' => $escola,
                'senha_hash' => Senha::criar($dados['senha']),
                'ativo' => true, 'criado_em' => $agora, 'atualizado_em' => $agora,
            ], 'id_usuario');
            return DB::table($tabela)->insertGetId([
                ...$dados['perfil'], 'id_usuario' => $idUsuario,
                'ativo' => true, 'criado_em' => $agora, 'atualizado_em' => $agora,
            ], $chave);
        });
    }

    public static function atualizar(string $tipo, object $atual, array $dados): void
    {
        [$tabela, $chave] = self::TIPOS[$tipo];
        DB::transaction(function () use ($tabela, $chave, $atual, $dados) {
            $agora = Formato::banco(Formato::agora());
            $usuario = $dados['usuario'] + ['atualizado_em' => $agora];
            if ($dados['senha']) {
                $usuario['senha_hash'] = Senha::criar($dados['senha']);
            }
            DB::table('usuario')->where('id_usuario', $atual->id_usuario)->update($usuario);
            DB::table($tabela)->where($chave, $atual->$chave)->update($dados['perfil'] + ['atualizado_em' => $agora]);
        });
    }

    public static function consulta(string $tipo)
    {
        [$tabela] = self::TIPOS[$tipo];
        return DB::table("{$tabela} as p")->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
            ->select('p.*', 'u.nome_completo', 'u.email');
    }

    public static function buscar(string $tipo, int $id): ?object
    {
        return self::consulta($tipo)->where('p.'.self::TIPOS[$tipo][1], $id)->first();
    }

    public static function dados(string $tipo, object $p): array
    {
        [, $chave, $campos] = self::TIPOS[$tipo];
        $saida = [
            $chave => (int) $p->$chave, 'nome_completo' => $p->nome_completo, 'email' => $p->email,
            'ativo' => (bool) $p->ativo, 'criado_em' => Formato::local($p->criado_em),
        ];
        foreach ($campos as $campo) {
            $saida[$campo] = $campo === 'data_nascimento' ? Formato::data($p->$campo) : $p->$campo;
        }
        return $saida;
    }
}
