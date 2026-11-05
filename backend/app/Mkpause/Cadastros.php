<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

/**
 * Cadastro de perfis (RF27–RF30). Cada perfil grava duas linhas na mesma transação:
 * `usuario` (nome, e-mail, senha) e a tabela do perfil. Para a interface, os campos
 * aparecem juntos num objeto só. Usado pelo admin e pelo cadastro com código.
 */
class Cadastros
{
    /** perfil => [tabela, chave, campos próprios do perfil] */
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

    /**
     * Valida o corpo. $idUsuario: no PATCH, o usuário atual (o e-mail dele não conta como repetido).
     * Devolve ['usuario' => [...], 'perfil' => [...], 'senha' => ?string] só com os campos enviados.
     */
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
        $senha = $e->texto('senha', min: config('mkpause.senha_tamanho_minimo'), obrigatorio: false, aparar: false);

        $opcional = fn (string $campo, int $max) => $e->texto($campo, max: $max, obrigatorio: false, vazio: true, nulo: true);
        foreach (self::TIPOS[$tipo][2] as $campo) {
            $valor = match ($campo) {
                'data_nascimento' => $e->data($campo, obrigatorio: false, nulo: true),
                'telefone' => $opcional($campo, 30),
                'instituicao_ensino' => $opcional($campo, 160),
                'turma' => $opcional($campo, 80),
                'cargo' => $opcional($campo, 120),
                'registro_profissional' => $e->texto($campo, max: 40),
                'estado_registro' => self::regexUf($e),
            };
            $guardar($perfil, $campo, $valor);
        }
        $e->falharSeHouverErros();

        // Regras do objeto inteiro: só rodam se os campos passaram.
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

    /** Cria usuario + perfil (transação). Devolve o id do perfil. */
    public static function criar(string $tipo, array $dados): int
    {
        [$tabela, $chave] = self::TIPOS[$tipo];
        return DB::transaction(function () use ($tabela, $chave, $dados) {
            $agora = Formato::banco(Formato::agora());
            $idUsuario = DB::table('usuario')->insertGetId([
                ...$dados['usuario'],
                'senha_hash' => SenhaDjango::criar($dados['senha']),
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
                $usuario['senha_hash'] = SenhaDjango::criar($dados['senha']);
            }
            DB::table('usuario')->where('id_usuario', $atual->id_usuario)->update($usuario);
            DB::table($tabela)->where($chave, $atual->$chave)->update($dados['perfil'] + ['atualizado_em' => $agora]);
        });
    }

    /** Consulta com os campos do perfil e do usuario (apelido p e u). */
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

    /** O que a API devolve (sem a senha). */
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
