<?php

namespace App\Http\Controllers;

use App\Mkpause\Conta;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Permissoes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Sessão de autorregulação (RF04–RF07, RF12, RF13).
 *
 * Fluxo:
 *   1. POST /api/sessoes/avaliar/            {"humor": 1-5}  -> nível sugerido e atividades (não grava)
 *   2. POST /api/sessoes/                    {"id_atividade", "humor_pre"} -> EM_ANDAMENTO + humor PRE
 *   3. POST /api/sessoes/<id>/concluir/      {"humor_pos", "observacoes_sessao"?} -> CONCLUIDA + humor POS
 *      ou POST /api/sessoes/<id>/cancelar/   -> CANCELADA ("tudo bem parar")
 *   GET /api/sessoes/[?estudante=ID]         histórico para profissionais autorizados e vinculados
 */
class SessoesController extends Controller
{
    // Critério provisório (RN07): a avaliação apoia o fluxo, não é diagnóstico (RN35).
    public const MENSAGEM_POR_NIVEL = [
        1 => 'Que tal fazer uma atividade no seu ritmo?',
        2 => 'Se quiser, você pode avisar seu professor que vai sair para fazer uma pausa.',
        3 => 'Se quiser, você pode pedir ajuda. Avisamos seu professor e a psicóloga da escola.',
    ];

    /** Humor (1 = muito mal ... 5 = muito bem) -> nível de suporte sugerido (1 a 3). */
    public static function avaliarHumor(int $estado): int
    {
        return $estado <= 1 ? 3 : ($estado === 2 ? 2 : 1);
    }

    public function listar(Request $request)
    {
        $conta = $this->conta($request);
        if (!$conta->e(Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO)) throw ErroApi::proibido('O histórico é restrito aos psicólogos autorizados.');
        $q = DB::table('sessao')->orderByDesc('iniciada_em')->orderByDesc('id_sessao');
        $id = $request->query('estudante');
        if (!$id) {
            throw ErroApi::campos(['estudante' => 'Informe o estudante (?estudante=ID).']);
        }
        $estudante = DB::table('estudante')->where('id_estudante', self::id($id))->first()
            ?? throw ErroApi::semRegistro('Estudante');
        if (!Permissoes::pode($conta, 'ver_historico', $estudante->id_estudante)) {
            throw ErroApi::proibido('Seu perfil não tem acesso ao histórico deste estudante.');
        }
        $q->where('id_estudante', $estudante->id_estudante);
        return $this->json(self::varias($q->get()));
    }

    public function ver(Request $request, $id)
    {
        $conta = $this->conta($request);
        if (!$conta->e(Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO)) throw ErroApi::proibido('O histórico é restrito aos psicólogos autorizados.');
        $q = DB::table('sessao')->where('id_sessao', self::id($id));
        $sessao = $q->first() ?? throw ErroApi::semRegistro('Sessao');
        if (!Permissoes::pode($conta, 'ver_historico', $sessao->id_estudante)) {
            throw ErroApi::proibido('Seu perfil não tem acesso ao histórico deste estudante.');
        }
        return $this->json(self::varias(collect([$sessao]))[0]);
    }

    public function avaliar(Request $request)
    {
        $e = $this->entrada($request);
        $humor = $e->inteiro('humor', min: 1, max: 5);
        $e->falharSeHouverErros();
        $nivel = self::avaliarHumor($humor);
        $atividades = DB::table('atividade')->where('disponivel', true)->orderBy('nome')->orderBy('id_atividade')->get();
        return $this->json([
            'nivel' => $nivel,
            'mensagem' => self::MENSAGEM_POR_NIVEL[$nivel],
            'pode_emitir_alerta' => $nivel >= 2,
            'atividades' => $atividades->map(fn ($a) => AtividadesController::dados($a))->all(),
        ]);
    }

    public function iniciar(Request $request)
    {
        $e = $this->entrada($request);
        $idAtividade = $e->inteiro('id_atividade');
        $humor = $e->inteiro('humor_pre', min: 1, max: 5);
        $e->falharSeHouverErros();
        $atividade = DB::table('atividade')->where('id_atividade', $idAtividade)->where('disponivel', true)->first();
        if ($atividade === null) {
            throw ErroApi::campos(['id_atividade' => 'Esta atividade não está disponível. Escolha outra.']);
        }
        $nivel = self::avaliarHumor($humor);
        $id = DB::transaction(function () use ($request, $atividade, $humor, $nivel) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table('sessao')->insertGetId([
                'id_estudante' => $this->conta($request)->idPerfil(), 'id_atividade' => $atividade->id_atividade,
                'iniciada_em' => $agora, 'nivel_avaliado' => $nivel, 'status' => 'EM_ANDAMENTO',
            ], 'id_sessao');
            DB::table('registro_humor')->insert(['id_sessao' => $id, 'estado' => $humor, 'momento' => 'PRE',
                'registrado_em' => $agora]);
            return $id;
        });
        return $this->json(['sessao' => $this->dadosDe($id), 'mensagem' => self::MENSAGEM_POR_NIVEL[$nivel]], 201);
    }

    public function concluir(Request $request, $id)
    {
        $e = $this->entrada($request);
        $humor = $e->inteiro('humor_pos', min: 1, max: 5);
        $observacoes = $e->texto('observacoes_sessao', obrigatorio: false, vazio: true);
        $e->falharSeHouverErros();
        DB::transaction(function () use ($request, $id, $humor, $observacoes) {
            $sessao = $this->emAndamento($request, $id);
            $extras = is_string($observacoes) ? ['observacoes_sessao' => $observacoes] : [];
            $agora = $this->encerrar($sessao, 'CONCLUIDA', $extras);
            DB::table('registro_humor')->insert(['id_sessao' => $sessao->id_sessao, 'estado' => $humor,
                'momento' => 'POS', 'registrado_em' => $agora]);
        });
        return $this->json(['sessao' => $this->dadosDe(self::id($id)), 'mensagem' => 'Pausa feita. Volte quando quiser.']);
    }

    public function cancelar(Request $request, $id)
    {
        DB::transaction(fn () => $this->encerrar($this->emAndamento($request, $id), 'CANCELADA'));
        return $this->json(['sessao' => $this->dadosDe(self::id($id)), 'mensagem' => 'Tudo bem parar. Você pode voltar depois.']);
    }

    private function emAndamento(Request $request, $id): object
    {
        $sessao = DB::table('sessao')->where('id_sessao', self::id($id))
            ->where('id_estudante', $this->conta($request)->idPerfil())->lockForUpdate()->first()
            ?? throw ErroApi::semRegistro('Sessao');
        if ($sessao->status !== 'EM_ANDAMENTO') {
            throw ErroApi::conflito('Esta pausa já foi encerrada.');
        }
        return $sessao;
    }

    /** Grava o fim da sessão; devolve o instante usado (para o registro de humor). */
    private function encerrar(object $sessao, string $status, array $extras = []): string
    {
        $fim = Formato::agora();
        $inicio = Formato::instante($sessao->iniciada_em);
        $segundos = max((int) floor(($fim->getTimestamp() + $fim->micro / 1e6) - ($inicio->getTimestamp() + $inicio->micro / 1e6)), 0);
        $agora = Formato::banco($fim);
        DB::table('sessao')->where('id_sessao', $sessao->id_sessao)->update(
            ['terminada_em' => $agora, 'duracao_segundos' => $segundos, 'status' => $status] + $extras);
        return $agora;
    }

    private function dadosDe(int $id): array
    {
        return self::varias(DB::table('sessao')->where('id_sessao', $id)->get())[0];
    }

    /** Serializa sessões com a atividade e os registros de humor (2 consultas, sem N+1). */
    public static function varias($sessoes): array
    {
        $atividades = DB::table('atividade')->whereIn('id_atividade', $sessoes->pluck('id_atividade')->unique())
            ->get()->keyBy('id_atividade');
        $humores = DB::table('registro_humor')->whereIn('id_sessao', $sessoes->pluck('id_sessao'))
            ->orderBy('id_registro_humor')->get()->groupBy('id_sessao');
        return $sessoes->map(fn ($s) => [
            'id_sessao' => (int) $s->id_sessao,
            'estudante' => (int) $s->id_estudante,
            'atividade' => AtividadesController::dados($atividades[$s->id_atividade]),
            'iniciada_em' => Formato::local($s->iniciada_em),
            'terminada_em' => Formato::local($s->terminada_em),
            'nivel_avaliado' => $s->nivel_avaliado === null ? null : (int) $s->nivel_avaliado,
            'duracao_segundos' => $s->duracao_segundos === null ? null : (int) $s->duracao_segundos,
            'observacoes_sessao' => $s->observacoes_sessao,
            'status' => $s->status,
            'registros_humor' => ($humores[$s->id_sessao] ?? collect())->map(fn ($h) => [
                'estado' => (int) $h->estado, 'momento' => $h->momento, 'registrado_em' => Formato::local($h->registrado_em),
            ])->values()->all(),
        ])->values()->all();
    }
}
