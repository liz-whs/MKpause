<?php

namespace App\Http\Controllers;

use App\Mkpause\Conta;
use App\Mkpause\Emails;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Permissoes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AlertasController extends Controller
{
    public const STATUS = ['ABERTO', 'EM_ACOMPANHAMENTO', 'RESOLVIDO', 'CANCELADO'];

    public const AJUDA_IMEDIATA = 'O MKpause não é um serviço de emergência. Se você estiver em perigo agora, '
        .'procure um adulto por perto ou ligue 192 (SAMU) ou 188 (CVV).';

    public function listar(Request $request)
    {
        return $this->json(self::varios($this->consulta($request)->get()));
    }

    public function ver(Request $request, $id)
    {
        return $this->json(self::varios(collect([$this->alerta($request, $id)]))[0]);
    }

    public function emitir(Request $request)
    {
        $conta = $this->conta($request);
        if (!$conta->e(Conta::ESTUDANTE)) {
            throw ErroApi::proibido('Só o estudante emite alertas.');
        }
        $e = $this->entrada($request);
        $nivel = $e->escolha('nivel', [2, 3]);
        $idSessao = $e->inteiro('id_sessao', obrigatorio: false, nulo: true);
        $descricao = $e->texto('descricao', max: 2000, obrigatorio: false, vazio: true);
        $e->falharSeHouverErros();
        $estudante = $conta->idPerfil();

        $sessao = null;
        if (is_int($idSessao) && $idSessao !== 0) {
            $sessao = DB::table('sessao')->where('id_sessao', $idSessao)->where('id_estudante', $estudante)->value('id_sessao');
            if ($sessao === null) {
                throw ErroApi::campos(['id_sessao' => 'Sessão não encontrada.']);
            }
        }

        $destinatarios = self::destinatariosPara($estudante, $nivel);
        if (!$destinatarios) {
            throw ErroApi::conflito('Você ainda não tem profissionais vinculados para receber o aviso. '
                .'Procure um adulto da escola. '.self::AJUDA_IMEDIATA);
        }

        $id = DB::transaction(function () use ($estudante, $sessao, $nivel, $descricao, $destinatarios) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table('alerta')->insertGetId([
                'id_estudante' => $estudante, 'id_sessao' => $sessao, 'nivel' => $nivel, 'criado_em' => $agora,
                'status' => 'ABERTO', 'descricao' => is_string($descricao) && $descricao !== '' ? $descricao : null,
            ], 'id_alerta');
            foreach ($destinatarios as [$usuario, $tipo]) {
                $idDest = DB::table('destinatario_alerta')->insertGetId([
                    'id_alerta' => $id, 'id_usuario' => $usuario->id_usuario, 'tipo_destinatario' => $tipo,
                    'status_notificacao' => 'PENDENTE',
                ], 'id_destinatario_alerta');
                DB::table('notificacao_email')->insert([
                    'id_destinatario_alerta' => $idDest, 'email_destino' => $usuario->email, 'status' => 'PENDENTE',
                    'tentativas' => 0, 'criado_em' => $agora, 'disponivel_em' => $agora,
                ]);
            }
            return $id;
        });
        Emails::agendar();

        return $this->json([
            'alerta' => self::varios(DB::table('alerta')->where('id_alerta', $id)->get())[0],
            'avisados' => array_map(fn ($d) => $d[0]->nome_completo, $destinatarios),
            'mensagem' => $nivel === 2 ? 'Seu aviso foi enviado. Você pode fazer sua pausa.'
                : 'Seu pedido foi enviado. Você não precisa explicar nada agora. '.self::AJUDA_IMEDIATA,
        ], 201);
    }

    public static function destinatariosPara(int $estudante, int $nivel): array
    {
        $escolhidos = [];
        $buscar = function (string $tabela, string $vinculo, string $chave, string $tipo) use ($estudante, &$escolhidos) {
            $linhas = DB::table("{$tabela} as p")->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
                ->join("{$vinculo} as v", "v.{$chave}", '=', "p.{$chave}")
                ->where('p.ativo', true)->where('u.ativo', true)->where('v.id_estudante', $estudante)->where('v.ativo', true)
                ->orderBy("p.{$chave}")->select('u.id_usuario', 'u.nome_completo', 'u.email')->get();
            foreach ($linhas as $u) {
                $escolhidos[$u->id_usuario] ??= [$u, $tipo];
            }
        };
        $buscar('professor', 'professor_estudante', 'id_professor', 'PROFESSOR');
        if ($nivel === 3) {
            $buscar('psicologo_escolar', 'psicologo_escolar_estudante', 'id_psicologo_escolar', 'PSICOLOGO_ESCOLAR');
        }
        return array_values($escolhidos);
    }

    public function mudarStatus(Request $request, $id)
    {
        $alerta = $this->alerta($request, $id);
        $e = $this->entrada($request);
        $novo = $e->escolha('status', self::STATUS);
        $e->falharSeHouverErros();

        $conta = $this->conta($request);
        if ($conta->e(Conta::ESTUDANTE)) {
            if ($novo !== 'CANCELADO') {
                throw ErroApi::proibido('Você pode apenas cancelar um alerta que enviou.');
            }
        } elseif (!$conta->e(Conta::ADMINISTRADOR) && $this->destinatario($request, $alerta) === null) {
            throw ErroApi::proibido('Só quem recebeu o alerta pode mudar o status.');
        }
        DB::table('alerta')->where('id_alerta', $alerta->id_alerta)->update(['status' => $novo]);
        return $this->json(self::varios(DB::table('alerta')->where('id_alerta', $alerta->id_alerta)->get())[0]);
    }

    public function lido(Request $request, $id)
    {
        $d = $this->destinatario($request, $this->alerta($request, $id));
        if ($d->lido_em === null) {
            DB::table('destinatario_alerta')->where('id_destinatario_alerta', $d->id_destinatario_alerta)
                ->update(['status_notificacao' => 'LIDA', 'lido_em' => Formato::banco(Formato::agora())]);
        }
        $d = DB::table('destinatario_alerta as d')->join('usuario as u', 'u.id_usuario', '=', 'd.id_usuario')
            ->where('d.id_destinatario_alerta', $d->id_destinatario_alerta)->select('d.*', 'u.nome_completo')->first();
        return $this->json(self::destinatarioDados($d));
    }

    public function observacoes(Request $request, $id)
    {
        $alerta = $this->alerta($request, $id);
        $conta = $this->conta($request);
        if (!Permissoes::pode($conta, 'ver_observacoes', $alerta->id_estudante)) {
            throw ErroApi::proibido('Seu perfil não tem acesso a estas observações.');
        }
        $lista = DB::table('observacao as o')->join('usuario as u', 'u.id_usuario', '=', 'o.id_autor')
            ->where('o.id_alerta', $alerta->id_alerta)->orderByDesc('o.criado_em')->orderByDesc('o.id_observacao')
            ->select('o.*', 'u.nome_completo as nome_autor')->get();
        return $this->json($lista->map(fn ($o) => self::observacao($o))->all());
    }

    public function observar(Request $request, $id)
    {
        $alerta = $this->alerta($request, $id);
        $conta = $this->conta($request);
        if (!Permissoes::pode($conta, 'registrar_observacao', $alerta->id_estudante)) {
            throw ErroApi::proibido('Seu perfil não registra observações neste alerta.');
        }
        $e = $this->entrada($request);
        $conteudo = $e->texto('conteudo', max: 5000);
        $e->falharSeHouverErros();
        $idObs = DB::table('observacao')->insertGetId([
            'id_alerta' => $alerta->id_alerta, 'id_autor' => $conta->id(), 'conteudo' => $conteudo,
            'criado_em' => Formato::banco(Formato::agora()),
        ], 'id_observacao');
        $o = DB::table('observacao as o')->join('usuario as u', 'u.id_usuario', '=', 'o.id_autor')
            ->where('o.id_observacao', $idObs)->select('o.*', 'u.nome_completo as nome_autor')->first();
        return $this->json(self::observacao($o) + ['mensagem' => 'Observação salva.'], 201);
    }

    private function consulta(Request $request)
    {
        $conta = $this->conta($request);
        $q = DB::table('alerta as a')->select('a.*')->orderByDesc('a.criado_em')->orderByDesc('a.id_alerta');
        if ($conta->e(Conta::ESTUDANTE)) {
            $q->where('a.id_estudante', $conta->idPerfil());
        } elseif ($conta->e(Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR)) {
            $q->whereExists(fn ($s) => $s->from('destinatario_alerta as d')->whereColumn('d.id_alerta', 'a.id_alerta')
                ->where('d.id_usuario', $conta->id()));
        } elseif ($conta->e(Conta::PSICOLOGO_CLINICO)) {
            $q->whereIn('a.id_estudante', Permissoes::estudantesVinculados($conta));
        }
        if ($status = $request->query('status')) {
            $q->where('a.status', mb_strtoupper($status));
        }
        return $q;
    }

    private function alerta(Request $request, $id): object
    {
        return $this->consulta($request)->where('a.id_alerta', self::id($id))->first() ?? throw ErroApi::semRegistro('Alerta');
    }

    private function destinatario(Request $request, object $alerta): ?object
    {
        return DB::table('destinatario_alerta')->where('id_alerta', $alerta->id_alerta)
            ->where('id_usuario', $this->conta($request)->id())->first();
    }

    public static function varios($alertas): array
    {
        $nomes = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->whereIn('e.id_estudante', $alertas->pluck('id_estudante')->unique())->pluck('u.nome_completo', 'e.id_estudante');
        $destinatarios = DB::table('destinatario_alerta as d')->join('usuario as u', 'u.id_usuario', '=', 'd.id_usuario')
            ->whereIn('d.id_alerta', $alertas->pluck('id_alerta'))->orderBy('d.id_destinatario_alerta')
            ->select('d.*', 'u.nome_completo')->get()->groupBy('id_alerta');
        return $alertas->map(fn ($a) => [
            'id_alerta' => (int) $a->id_alerta, 'estudante' => (int) $a->id_estudante,
            'nome_estudante' => $nomes[$a->id_estudante] ?? null,
            'sessao' => $a->id_sessao === null ? null : (int) $a->id_sessao,
            'nivel' => (int) $a->nivel, 'criado_em' => Formato::local($a->criado_em), 'status' => $a->status,
            'descricao' => $a->descricao,
            'destinatarios' => ($destinatarios[$a->id_alerta] ?? collect())->map(fn ($d) => self::destinatarioDados($d))->values()->all(),
        ])->values()->all();
    }

    private static function destinatarioDados(object $d): array
    {
        return ['usuario' => (int) $d->id_usuario, 'nome' => $d->nome_completo, 'tipo_destinatario' => $d->tipo_destinatario,
            'status_notificacao' => $d->status_notificacao, 'enviado_em' => Formato::local($d->enviado_em),
            'lido_em' => Formato::local($d->lido_em)];
    }

    private static function observacao(object $o): array
    {
        return ['id_observacao' => (int) $o->id_observacao, 'alerta' => (int) $o->id_alerta, 'autor' => (int) $o->id_autor,
            'nome_autor' => $o->nome_autor, 'conteudo' => $o->conteudo, 'criado_em' => Formato::local($o->criado_em),
            'atualizado_em' => Formato::local($o->atualizado_em)];
    }
}
