<?php

namespace App\Http\Controllers;

use App\Mkpause\Conta;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Permissoes;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Ficha de acompanhamento (RF16, RF17, RF31, RN22), avisos (RF18, RF25) e o painel do
 * psicólogo clínico.
 *
 * GET/POST/PATCH /api/estudantes/<id>/ficha/       POST só admin; PATCH admin ou psi. clínico
 * GET    /api/estudantes/<id>/dashboard/?dias=14   psi. clínico vinculado
 * GET    /api/avisos/                              avisos ativos para o público do perfil
 * POST   /api/avisos/  PATCH/DELETE /api/avisos/<id>/   admin (DELETE desativa)
 */
class AcompanhamentoController extends Controller
{
    // ------------------------------------------------------------------- ficha

    public function verFicha(Request $request, $id)
    {
        $estudante = $this->estudante($request, $id, 'ver_ficha');
        $dados = self::ficha($this->fichaDe($estudante));
        // Registros clínicos não são disponibilizados à escola nem à administração.
        if (!$this->conta($request)->e(Conta::PSICOLOGO_CLINICO)) {
            $conteudo = self::conteudoFicha($dados['informacoes_acompanhamento']);
            unset($conteudo['registros']);
            $dados['informacoes_acompanhamento'] = json_encode($conteudo, JSON_UNESCAPED_UNICODE);
        }
        return $this->json($dados);
    }

    public function criarFicha(Request $request, $id)
    {
        if (!$this->conta($request)->e(Conta::ADMINISTRADOR)) {
            throw ErroApi::proibido('Só a administração cria fichas de acompanhamento.');
        }
        $estudante = DB::table('estudante')->where('id_estudante', self::id($id))->first() ?? throw ErroApi::semRegistro('Estudante');
        if (DB::table('ficha_acompanhamento')->where('id_estudante', $estudante->id_estudante)->exists()) {
            throw ErroApi::conflito('Este estudante já tem uma ficha.');
        }
        $dados = $this->validarFicha($this->entrada($request), parcial: false);
        if (array_key_exists('informacoes_acompanhamento', $dados)) {
            $conteudo = self::conteudoFicha($dados['informacoes_acompanhamento']);
            unset($conteudo['registros']);
            $dados['informacoes_acompanhamento'] = json_encode($conteudo, JSON_UNESCAPED_UNICODE);
        }
        $agora = Formato::banco(Formato::agora());
        $idFicha = DB::table('ficha_acompanhamento')->insertGetId($dados + [
            'id_estudante' => $estudante->id_estudante, 'ativo' => true, 'criada_em' => $agora, 'atualizada_em' => $agora,
        ], 'id_ficha');
        return $this->json(self::ficha(DB::table('ficha_acompanhamento')->where('id_ficha', $idFicha)->first()), 201);
    }

    public function editarFicha(Request $request, $id)
    {
        $estudante = $this->estudante($request, $id, 'editar_ficha');
        $ficha = $this->fichaDe($estudante);
        $dados = $this->validarFicha($this->entrada($request, parcial: true), parcial: true);
        if (array_key_exists('ativo', $dados) && !$this->conta($request)->e(Conta::ADMINISTRADOR)) {
            throw ErroApi::proibido('Só a administração ativa ou desativa fichas.');
        }
        DB::transaction(function () use ($ficha, $dados) {
            $atual = DB::table('ficha_acompanhamento')->where('id_ficha', $ficha->id_ficha)->lockForUpdate()->first();
            if (array_key_exists('informacoes_acompanhamento', $dados)) {
                $novo = self::conteudoFicha($dados['informacoes_acompanhamento']);
                // PATCH atualiza os campos da ficha; registros só entram pela operação de acréscimo.
                $novo['registros'] = self::conteudoFicha($atual->informacoes_acompanhamento)['registros'] ?? [];
                $dados['informacoes_acompanhamento'] = json_encode($novo, JSON_UNESCAPED_UNICODE);
            }
            DB::table('ficha_acompanhamento')->where('id_ficha', $ficha->id_ficha)
                ->update($dados + ['atualizada_em' => Formato::banco(Formato::agora())]);
        });
        return $this->verFicha($request, $id);
    }

    private static function conteudoFicha(?string $texto): array
    {
        $dados = json_decode($texto ?? '{}', true);
        return is_array($dados) && !array_is_list($dados) ? $dados : ['encaminhamento' => $texto ?? ''];
    }

    public function registrarAcompanhamento(Request $request, $id)
    {
        $conta = $this->conta($request);
        if (!$conta->e(Conta::PSICOLOGO_CLINICO)) throw ErroApi::proibido('Só o psicólogo clínico registra acompanhamentos.');
        $estudante = $this->estudante($request, $id, 'editar_ficha');
        $e = $this->entrada($request);
        $texto = $e->texto('texto', max: 10000);
        $chave = $e->texto('chave', max: 100);
        $e->falharSeHouverErros();
        $registro = DB::transaction(function () use ($conta, $estudante, $texto, $chave) {
            $ficha = DB::table('ficha_acompanhamento')->where('id_estudante', $estudante->id_estudante)->lockForUpdate()->first();
            if (!$ficha || !$ficha->ativo) throw ErroApi::conflito('Peça à administração para criar ou ativar a ficha antes de registrar.');
            $dados = self::conteudoFicha($ficha->informacoes_acompanhamento);
            $registros = $dados['registros'] ?? [];
            $autor = 'u-'.$conta->id();
            foreach ($registros as $r) {
                if (($r['chave'] ?? null) === $chave && ($r['autorId'] ?? null) === $autor) {
                    if ($r['texto'] !== $texto) throw ErroApi::conflito('Esta tentativa já foi salva com outro conteúdo. Atualize a ficha.');
                    return $r;
                }
            }
            $registro = ['id' => (string) Str::uuid(), 'chave' => $chave, 'autorId' => $autor,
                'em' => Formato::utc(Formato::agora()), 'texto' => $texto];
            $dados['registros'] = [...$registros, $registro];
            DB::table('ficha_acompanhamento')->where('id_ficha', $ficha->id_ficha)->update([
                'informacoes_acompanhamento' => json_encode($dados, JSON_UNESCAPED_UNICODE),
                'atualizada_em' => Formato::banco(Formato::agora()),
            ]);
            return $registro;
        });
        return $this->json($registro, 201);
    }

    private function estudante(Request $request, $id, string $acao): object
    {
        $estudante = DB::table('estudante')->where('id_estudante', self::id($id))->first() ?? throw ErroApi::semRegistro('Estudante');
        if (!Permissoes::pode($this->conta($request), $acao, $estudante->id_estudante)) {
            throw ErroApi::proibido('Seu perfil não tem acesso à ficha deste estudante.');
        }
        return $estudante;
    }

    private function fichaDe(object $estudante): object
    {
        return DB::table('ficha_acompanhamento')->where('id_estudante', $estudante->id_estudante)->first()
            ?? throw ErroApi::naoEncontrado('Este estudante ainda não tem ficha de acompanhamento.');
    }

    private function validarFicha(Entrada $e, bool $parcial): array
    {
        $dados = [
            'informacoes_acompanhamento' => $e->texto('informacoes_acompanhamento', obrigatorio: false, vazio: true, nulo: true),
            'ativo' => $e->booleano('ativo', obrigatorio: false),
        ];
        $e->falharSeHouverErros();
        return array_filter($dados, fn ($v) => $v !== Entrada::AUSENTE);
    }

    private static function ficha(object $f): array
    {
        $nome = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', $f->id_estudante)->value('u.nome_completo');
        return ['id_ficha' => (int) $f->id_ficha, 'estudante' => (int) $f->id_estudante, 'nome_estudante' => $nome,
            'informacoes_acompanhamento' => $f->informacoes_acompanhamento, 'criada_em' => Formato::local($f->criada_em),
            'atualizada_em' => Formato::local($f->atualizada_em), 'ativo' => (bool) $f->ativo];
    }

    // ------------------------------------------------------------------- avisos

    public const PUBLICOS = ['TODOS', 'ESTUDANTES', 'PROFESSORES', 'PSICOLOGOS_ESCOLARES', 'PSICOLOGOS_CLINICOS', 'RESPONSAVEIS'];
    private const PUBLICO_DO_PERFIL = [
        Conta::ESTUDANTE => 'ESTUDANTES', Conta::PROFESSOR => 'PROFESSORES',
        Conta::PSICOLOGO_ESCOLAR => 'PSICOLOGOS_ESCOLARES', Conta::PSICOLOGO_CLINICO => 'PSICOLOGOS_CLINICOS',
    ];

    public function listarAvisos(Request $request)
    {
        return $this->json($this->avisos($request)->get()->map(fn ($a) => self::aviso($a))->all());
    }

    public function verAviso(Request $request, $id)
    {
        return $this->json(self::aviso($this->avisoOu404($request, $id)));
    }

    public function criarAviso(Request $request)
    {
        $dados = $this->validarAviso($this->entrada($request), parcial: false);
        $id = DB::table('aviso')->insertGetId($dados + [
            'publico_destinatario' => 'TODOS', 'ativo' => true, 'id_autor' => $this->conta($request)->id(),
            'publicado_em' => Formato::banco(Formato::agora()),
        ], 'id_aviso');
        return $this->json(self::aviso($this->avisoOu404($request, $id)), 201);
    }

    public function atualizarAviso(Request $request, $id)
    {
        $a = $this->avisoOu404($request, $id);
        $dados = $this->validarAviso($this->entrada($request, parcial: true), parcial: true);
        if ($dados) {
            DB::table('aviso')->where('id_aviso', $a->id_aviso)->update($dados);
        }
        return $this->json(self::aviso($this->avisoOu404($request, $a->id_aviso)));
    }

    public function desativarAviso(Request $request, $id)
    {
        $a = $this->avisoOu404($request, $id);
        DB::table('aviso')->where('id_aviso', $a->id_aviso)->update(['ativo' => false]);
        return $this->json(['detail' => 'Aviso desativado.']);
    }

    private function avisos(Request $request)
    {
        $q = DB::table('aviso as a')->join('usuario as u', 'u.id_usuario', '=', 'a.id_autor')
            ->select('a.*', 'u.nome_completo as nome_autor')->orderByDesc('a.publicado_em')->orderByDesc('a.id_aviso');
        $conta = $this->conta($request);
        if (!$conta->e(Conta::ADMINISTRADOR)) {
            $q->where('a.ativo', true)->whereIn('a.publico_destinatario', ['TODOS', self::PUBLICO_DO_PERFIL[$conta->perfil]]);
        }
        return $q;
    }

    private function avisoOu404(Request $request, $id): object
    {
        return $this->avisos($request)->where('a.id_aviso', self::id($id))->first() ?? throw ErroApi::semRegistro('Aviso');
    }

    private function validarAviso(Entrada $e, bool $parcial): array
    {
        $dados = [
            'titulo' => $e->texto('titulo', max: 180),
            'conteudo' => $e->texto('conteudo'),
            'publico_destinatario' => $e->escolha('publico_destinatario', self::PUBLICOS, obrigatorio: false),
            'ativo' => $e->booleano('ativo', obrigatorio: false),
        ];
        $e->falharSeHouverErros();
        return array_filter($dados, fn ($v) => $v !== Entrada::AUSENTE);
    }

    private static function aviso(object $a): array
    {
        return ['id_aviso' => (int) $a->id_aviso, 'titulo' => $a->titulo, 'conteudo' => $a->conteudo,
            'publicado_em' => Formato::local($a->publicado_em), 'autor' => (int) $a->id_autor, 'nome_autor' => $a->nome_autor,
            'publico_destinatario' => $a->publico_destinatario, 'ativo' => (bool) $a->ativo];
    }

    // --------------------------------------------------------- painel do clínico

    /** Indicadores descritivos de autorrelato; não faz diagnóstico e não grava agregados. */
    public function dashboard(Request $request, $id)
    {
        $e = Entrada::do($request->query());
        $dias = $e->escolha('dias', ['7', '14', '30', '90'], padrao: '14');
        $e->falharSeHouverErros();
        $dias = (int) $dias;

        $estudante = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', self::id($id))->select('e.id_estudante', 'u.nome_completo')->first()
            ?? throw ErroApi::semRegistro('Estudante');
        if (!Permissoes::pode($this->conta($request), 'ver_historico', $estudante->id_estudante)) {
            throw ErroApi::proibido('Você não acompanha este estudante.');
        }

        // Limites de data no fuso do projeto, sem incluir dados de amanhã.
        $hoje = CarbonImmutable::now(Formato::FUSO)->startOfDay();
        $inicio = $hoje->subDays($dias - 1);
        $fim = $hoje->addDay();
        $sessoes = DB::table('sessao as s')->join('atividade as a', 'a.id_atividade', '=', 's.id_atividade')
            ->where('s.id_estudante', $estudante->id_estudante)->where('s.status', 'CONCLUIDA')
            ->where('s.iniciada_em', '>=', Formato::banco($inicio))->where('s.iniciada_em', '<', Formato::banco($fim))
            ->orderBy('s.iniciada_em')->orderBy('s.id_sessao')->select('s.id_sessao', 's.iniciada_em', 'a.tipo')->get();
        $humores = DB::table('registro_humor')->whereIn('id_sessao', $sessoes->pluck('id_sessao'))
            ->whereIn('momento', ['PRE', 'POS'])->whereBetween('estado', [1, 5])->orderBy('id_registro_humor')
            ->get()->groupBy('id_sessao');

        $antes = $depois = array_fill(1, 5, 0);
        $atividades = ['RESPIRACAO' => 0, 'JOGO' => 0, 'VIDEO' => 0];
        $evolucao = [];
        $aumentou = $manteve = $diminuiu = 0;
        foreach ($sessoes as $s) {
            $porMomento = [];
            foreach ($humores[$s->id_sessao] ?? [] as $h) {
                $porMomento[$h->momento] = (int) $h->estado;
            }
            if (count($porMomento) !== 2) {
                continue; // Não usar sessão com registro incompleto.
            }
            [$pre, $pos] = [$porMomento['PRE'], $porMomento['POS']];
            $antes[$pre]++;
            $depois[$pos]++;
            if (array_key_exists($s->tipo, $atividades)) {
                $atividades[$s->tipo]++;
            }
            $aumentou += $pos > $pre;
            $manteve += $pos === $pre;
            $diminuiu += $pos < $pre;
            $evolucao[] = [
                'id_sessao' => (int) $s->id_sessao,
                'data' => Formato::instante($s->iniciada_em)->setTimezone(Formato::FUSO)->format('Y-m-d'),
                'iniciada_em' => Formato::isoUtc($s->iniciada_em),
                'humor_antes' => $pre,
                'humor_depois' => $pos,
            ];
        }

        $total = count($evolucao);
        return $this->json([
            'estudante' => ['id_estudante' => (int) $estudante->id_estudante, 'nome' => $estudante->nome_completo],
            'periodo' => ['dias' => $dias, 'inicio' => $inicio->format('Y-m-d'), 'fim' => $hoje->format('Y-m-d')],
            'resumo' => [
                'sessoes_concluidas' => $total,
                'humor_aumentou' => $aumentou,
                'humor_manteve' => $manteve,
                'humor_diminuiu' => $diminuiu,
                'percentual_aumento' => $total ? round($aumentou * 100 / $total, 1) : null,
            ],
            'evolucao' => $evolucao,
            'distribuicao_humor' => array_map(fn ($estado) => ['estado' => $estado, 'antes' => $antes[$estado],
                'depois' => $depois[$estado]], range(1, 5)),
            'atividades' => array_map(fn ($tipo) => ['tipo' => $tipo, 'quantidade' => $atividades[$tipo]], array_keys($atividades)),
            'aviso' => 'Indicadores descritivos de autorrelato; não constituem diagnóstico.',
        ]);
    }
}
