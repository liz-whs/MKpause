<?php

namespace App\Http\Controllers;

use App\Http\Middleware\Autenticar;
use App\Mkpause\Cadastros;
use App\Mkpause\Codigos;
use App\Mkpause\Conta;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Limite;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CodigosController extends Controller
{
    private const CADASTRO_INVALIDO = 'Código inválido ou expirado. Peça um novo à escola.';
    private const VINCULO_INVALIDO = 'Código inválido ou expirado. Peça um novo ao estudante.';
    private const PERFIS = ['ESTUDANTE', 'PROFESSOR', 'PSICOLOGO_ESCOLAR', 'PSICOLOGO_CLINICO'];

    public function listarCadastro(Request $request)
    {
        $lista = DB::table('codigo_cadastro')->orderByDesc('criado_em')->orderByDesc('id_codigo_cadastro')->get();
        return $this->json($lista->map(fn ($c) => self::cadastro($c))->all());
    }

    public function criarCadastro(Request $request)
    {
        $e = $this->entrada($request);
        $perfil = $e->escolha('perfil', self::PERFIS);
        $usos = $e->inteiro('usos_maximos', min: 1, max: 200, padrao: 1);
        $validade = $e->inteiro('validade_dias', min: 1, max: 30, padrao: 7);
        $turma = $e->texto('turma', max: 80, obrigatorio: false, vazio: true, nulo: true);
        $escola = $e->texto('instituicao_ensino', max: 160, obrigatorio: false, vazio: true, nulo: true);
        $e->falharSeHouverErros();
        if ($perfil !== 'ESTUDANTE' && ($turma !== Entrada::AUSENTE || $escola !== Entrada::AUSENTE)) {
            throw ErroApi::campos(['non_field_errors' => ['Turma e escola no código são só para estudante.']]);
        }
        $texto = Codigos::gerar(10);
        $agora = Formato::agora();
        $id = DB::table('codigo_cadastro')->insertGetId([
            'codigo_hash' => Codigos::hash($texto), 'sufixo' => substr($texto, -3), 'perfil' => $perfil,
            'id_administrador' => $this->conta($request)->idPerfil(),
            'turma' => $turma === Entrada::AUSENTE ? null : $turma,
            'instituicao_ensino' => $escola === Entrada::AUSENTE ? null : $escola,
            'usos_maximos' => $usos, 'usos' => 0, 'expira_em' => Formato::banco($agora->addDays($validade)),
            'criado_em' => Formato::banco($agora),
        ], 'id_codigo_cadastro');
        $c = DB::table('codigo_cadastro')->where('id_codigo_cadastro', $id)->first();
        return $this->json(self::cadastro($c) + ['codigo' => Codigos::formatar($texto)], 201);
    }

    public function revogarCadastro(Request $request, $id)
    {
        $c = DB::transaction(function () use ($id) {
            $c = DB::table('codigo_cadastro')->where('id_codigo_cadastro', self::id($id))->lockForUpdate()->first()
                ?? throw ErroApi::semRegistro('CodigoCadastro');
            if (!$c->revogado_em) {
                DB::table('codigo_cadastro')->where('id_codigo_cadastro', $c->id_codigo_cadastro)
                    ->update(['revogado_em' => Formato::banco(Formato::agora())]);
            }
            return DB::table('codigo_cadastro')->where('id_codigo_cadastro', $c->id_codigo_cadastro)->first();
        });
        return $this->json(self::cadastro($c));
    }

    private static function situacao(object $c): string
    {
        if ($c->revogado_em) {
            return 'REVOGADO';
        }
        if (Formato::instante($c->expira_em) <= Formato::agora()) {
            return 'EXPIRADO';
        }
        return $c->usos >= $c->usos_maximos ? 'ESGOTADO' : 'ATIVO';
    }

    private static function cadastro(object $c): array
    {
        $usos = DB::table('uso_codigo_cadastro as x')->join('usuario as u', 'u.id_usuario', '=', 'x.id_usuario')
            ->where('x.id_codigo_cadastro', $c->id_codigo_cadastro)->orderBy('x.usado_em')->orderBy('x.id_usuario')
            ->select('x.id_usuario', 'u.nome_completo', 'u.email', 'x.usado_em')->get();
        return [
            'id_codigo_cadastro' => (int) $c->id_codigo_cadastro, 'sufixo' => $c->sufixo, 'perfil' => $c->perfil,
            'turma' => $c->turma, 'instituicao_ensino' => $c->instituicao_ensino,
            'usos_maximos' => (int) $c->usos_maximos, 'usos' => (int) $c->usos, 'expira_em' => Formato::utc($c->expira_em),
            'revogado_em' => Formato::utc($c->revogado_em), 'situacao' => self::situacao($c),
            'criado_em' => Formato::utc($c->criado_em),
            'usado_por' => $usos->map(fn ($u) => ['id_usuario' => (int) $u->id_usuario, 'nome_completo' => $u->nome_completo,
                'email' => $u->email, 'usado_em' => Formato::utc($u->usado_em)])->all(),
        ];
    }

    private function textoCodigo(Entrada $e): string
    {
        $texto = $e->texto('codigo', max: 100);
        $e->falharSeHouverErros();
        return $texto;
    }

    private static function codigoCadastro(string $texto, bool $bloquear = false): object
    {
        $q = DB::table('codigo_cadastro')->where('codigo_hash', Codigos::hash($texto));
        $c = ($bloquear ? $q->lockForUpdate() : $q)->first();
        if ($c === null || self::situacao($c) !== 'ATIVO') {
            throw ErroApi::invalido(self::CADASTRO_INVALIDO);
        }
        return $c;
    }

    public function verificar(Request $request)
    {
        Limite::exigir($request, 'cadastro');
        $c = self::codigoCadastro($this->textoCodigo($this->entrada($request)));
        return $this->json(['perfil' => $c->perfil, 'turma' => $c->turma, 'instituicao_ensino' => $c->instituicao_ensino]);
    }

    public function cadastrar(Request $request)
    {
        Limite::exigir($request, 'cadastro');
        $corpo = $this->entrada($request);
        $texto = $this->textoCodigo($corpo);
        $campos = $this->corpo($request);
        unset($campos['codigo']);
        try {
            $idUsuario = DB::transaction(function () use ($texto, &$campos) {
                $c = self::codigoCadastro($texto, bloquear: true);
                if ($c->perfil === 'ESTUDANTE') {
                    foreach (['turma', 'instituicao_ensino'] as $campo) {
                        if ($c->$campo !== null) {
                            $campos[$campo] = $c->$campo;
                        }
                    }
                }
                $tipo = strtolower($c->perfil);
                $dados = Cadastros::validar($tipo, new Entrada($campos), parcial: false);
                $idPerfil = Cadastros::criar($tipo, $dados);
                $idUsuario = Cadastros::buscar($tipo, $idPerfil)->id_usuario;
                DB::table('codigo_cadastro')->where('id_codigo_cadastro', $c->id_codigo_cadastro)->increment('usos');
                DB::table('uso_codigo_cadastro')->insert(['id_codigo_cadastro' => $c->id_codigo_cadastro,
                    'id_usuario' => $idUsuario, 'usado_em' => Formato::banco(Formato::agora())]);
                return $idUsuario;
            });
        } catch (QueryException $erro) {
            if (str_starts_with((string) ($erro->errorInfo[0] ?? ''), '23')
                && DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [(string) ($campos['email'] ?? '')])->exists()) {
                throw ErroApi::campos(['email' => ['Já existe uma conta com este e-mail.']]);
            }
            throw $erro;
        }
        $conta = Conta::carregar($idUsuario);
        Autenticar::entrar($request, $conta);
        return $this->json($conta->dados(), 201);
    }

    private static function abertos(int $estudante)
    {
        return DB::table('codigo_vinculo')->where('id_estudante', $estudante)->where('status', 'ABERTO')->whereNull('revogado_em');
    }

    private static function revogarAbertos(int $estudante): void
    {
        self::abertos($estudante)->update(['status' => 'REVOGADO', 'revogado_em' => Formato::banco(Formato::agora())]);
    }

    public function gerarVinculo(Request $request)
    {
        $estudante = $this->conta($request)->idPerfil();
        [$id, $texto, $expira] = DB::transaction(function () use ($estudante) {
            DB::table('estudante')->where('id_estudante', $estudante)->lockForUpdate()->first();
            self::revogarAbertos($estudante);
            $texto = Codigos::gerar(6);
            $agora = Formato::agora();
            $expira = $agora->addHours(24);
            $id = DB::table('codigo_vinculo')->insertGetId([
                'id_estudante' => $estudante, 'codigo_hash' => Codigos::hash($texto),
                'expira_em' => Formato::banco($expira), 'status' => 'ABERTO', 'criado_em' => Formato::banco($agora),
            ], 'id_codigo_vinculo');
            return [$id, $texto, $expira];
        });
        return $this->json(['id_codigo_vinculo' => $id, 'codigo' => Codigos::formatar($texto),
            'expira_em' => Formato::utc($expira)], 201);
    }

    public function vinculoAtual(Request $request)
    {
        $c = self::abertos($this->conta($request)->idPerfil())->where('expira_em', '>', Formato::banco(Formato::agora()))
            ->orderBy('id_codigo_vinculo')->first();
        return $c ? $this->json(['id_codigo_vinculo' => (int) $c->id_codigo_vinculo, 'expira_em' => Formato::utc($c->expira_em),
            'status' => $c->status]) : $this->vazio();
    }

    public function cancelarVinculoAtual(Request $request)
    {
        $estudante = $this->conta($request)->idPerfil();
        DB::transaction(function () use ($estudante) {
            DB::table('estudante')->where('id_estudante', $estudante)->lockForUpdate()->first();
            self::revogarAbertos($estudante);
        });
        return $this->vazio();
    }

    private static function pendentes()
    {
        return DB::table('codigo_vinculo as c')->where('c.status', 'AGUARDANDO_ESTUDANTE')->whereNull('c.revogado_em')
            ->where('c.expira_em', '>', Formato::banco(Formato::agora()));
    }

    private static function profissionalAtivo(object $c): ?object
    {
        [$tabela, $chave, $id] = $c->id_professor
            ? ['professor', 'id_professor', $c->id_professor]
            : ['psicologo_escolar', 'id_psicologo_escolar', $c->id_psicologo_escolar];
        if (!$id) {
            return null;
        }
        return DB::table("{$tabela} as p")->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
            ->where("p.{$chave}", $id)->where('p.ativo', true)->where('u.ativo', true)->select('p.*', 'u.nome_completo')->first();
    }

    public function solicitacoes(Request $request)
    {
        $lista = [];
        $pedidos = self::pendentes()->where('c.id_estudante', $this->conta($request)->idPerfil())
            ->orderByDesc('c.resgatado_em')->orderByDesc('c.id_codigo_vinculo')->get();
        foreach ($pedidos as $c) {
            $p = self::profissionalAtivo($c);
            if ($p === null) {
                continue;
            }
            $detalhe = $c->id_professor ? $p->cargo : "CRP {$p->registro_profissional}/{$p->estado_registro}";
            $lista[] = ['id_codigo_vinculo' => (int) $c->id_codigo_vinculo, 'resgatado_em' => Formato::utc($c->resgatado_em),
                'profissional' => ['nome_completo' => $p->nome_completo,
                    'perfil' => $c->id_professor ? Conta::PROFESSOR : Conta::PSICOLOGO_ESCOLAR,
                    'detalhe' => implode(' · ', array_filter([$detalhe, $p->instituicao_ensino]))]];
        }
        return $this->json($lista);
    }

    private static function bloquearCodigo($consulta, string $mensagem): object
    {
        $estudante = (clone $consulta)->value('id_estudante');
        if ($estudante === null) {
            throw ErroApi::invalido($mensagem);
        }
        $e = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', $estudante)->lockForUpdate()->select('e.ativo', 'u.ativo as usuario_ativo')->first();
        $c = (clone $consulta)->lockForUpdate()->first();
        if ($c === null || $c->revogado_em || Formato::instante($c->expira_em) <= Formato::agora()
            || !$e->ativo || !$e->usuario_ativo) {
            throw ErroApi::invalido($mensagem);
        }
        return $c;
    }

    private static function resumoEstudante(int $idEstudante): array
    {
        $e = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', $idEstudante)->select('u.nome_completo', 'e.turma')->first();
        return ['primeiro_nome' => preg_split('/\s+/', trim($e->nome_completo))[0], 'turma' => $e->turma ?? ''];
    }

    public function responderVinculo(Request $request, $id, string $resposta)
    {
        $estudante = $this->conta($request)->idPerfil();
        $status = DB::transaction(function () use ($id, $estudante, $resposta) {
            $consulta = DB::table('codigo_vinculo')->where('id_codigo_vinculo', self::id($id))->where('id_estudante', $estudante);
            (clone $consulta)->exists() ?: throw ErroApi::semRegistro('CodigoVinculo');
            $mensagem = 'Este pedido não está mais disponível.';
            $c = self::bloquearCodigo($consulta, $mensagem);
            if ($c->status !== 'AGUARDANDO_ESTUDANTE' || self::profissionalAtivo($c) === null) {
                throw ErroApi::invalido($mensagem);
            }
            if ($resposta === 'aceitar') {
                [$tabela, $chave] = $c->id_professor ? ['professor_estudante', 'id_professor']
                    : ['psicologo_escolar_estudante', 'id_psicologo_escolar'];
                $vinculo = [$chave => $c->$chave, 'id_estudante' => $c->id_estudante];
                if (DB::table($tabela)->where($vinculo)->exists()) {
                    DB::table($tabela)->where($vinculo)->update(['ativo' => true]);
                } else {
                    DB::table($tabela)->insert($vinculo + ['ativo' => true, 'criado_em' => Formato::banco(Formato::agora())]);
                }
            }
            $status = $resposta === 'aceitar' ? 'ACEITO' : 'RECUSADO';
            DB::table('codigo_vinculo')->where('id_codigo_vinculo', $c->id_codigo_vinculo)
                ->update(['status' => $status, 'respondido_em' => Formato::banco(Formato::agora())]);
            return $status;
        });
        return $this->json(['status' => $status]);
    }

    public function resgatar(Request $request)
    {
        Limite::exigir($request, 'vinculo');
        $conta = $this->conta($request);
        $texto = $this->textoCodigo($this->entrada($request));
        [$status, $idEstudante] = DB::transaction(function () use ($conta, $texto) {
            $c = self::bloquearCodigo(DB::table('codigo_vinculo')->where('codigo_hash', Codigos::hash($texto)), self::VINCULO_INVALIDO);
            if ($c->status !== 'ABERTO') {
                throw ErroApi::invalido(self::VINCULO_INVALIDO);
            }
            [$tabela, $chave] = $conta->e(Conta::PROFESSOR) ? ['professor_estudante', 'id_professor']
                : ['psicologo_escolar_estudante', 'id_psicologo_escolar'];
            if (DB::table($tabela)->where($chave, $conta->idPerfil())->where('id_estudante', $c->id_estudante)
                ->where('ativo', true)->exists()) {
                throw ErroApi::conflito('Você já acompanha este estudante.');
            }
            DB::table('codigo_vinculo')->where('id_codigo_vinculo', $c->id_codigo_vinculo)->update([
                $chave => $conta->idPerfil(), 'resgatado_em' => Formato::banco(Formato::agora()),
                'status' => 'AGUARDANDO_ESTUDANTE',
            ]);
            return ['AGUARDANDO_ESTUDANTE', (int) $c->id_estudante];
        });
        return $this->json(['status' => $status, 'estudante' => self::resumoEstudante($idEstudante)]);
    }

    public function enviados(Request $request)
    {
        $conta = $this->conta($request);
        $coluna = $conta->e(Conta::PROFESSOR) ? 'c.id_professor' : 'c.id_psicologo_escolar';
        $lista = self::pendentes()->join('estudante as e', 'e.id_estudante', '=', 'c.id_estudante')
            ->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where($coluna, $conta->idPerfil())->where('e.ativo', true)->where('u.ativo', true)
            ->orderByDesc('c.resgatado_em')->orderByDesc('c.id_codigo_vinculo')->select('c.*')->get();
        return $this->json($lista->map(fn ($c) => ['id_codigo_vinculo' => (int) $c->id_codigo_vinculo,
            'estudante' => self::resumoEstudante((int) $c->id_estudante), 'resgatado_em' => Formato::utc($c->resgatado_em)])->all());
    }
}
