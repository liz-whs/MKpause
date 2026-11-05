<?php

namespace App\Http\Controllers;

use App\Mkpause\Conta;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Conteúdos de autorregulação (RF02, RF03, RF35, RN31).
 * GET    /api/atividades/        lista (estudante vê só as disponíveis; ?tipo=JOGO)
 * POST   /api/atividades/        admin cadastra
 * PATCH  /api/atividades/<id>/   admin altera
 * DELETE /api/atividades/<id>/   admin marca como indisponível (não apaga: há sessões ligadas)
 */
class AtividadesController extends Controller
{
    public const TIPOS = ['JOGO', 'VIDEO', 'EXERCICIO', 'RESPIRACAO', 'OUTRO'];

    public function listar(Request $request)
    {
        return $this->json($this->consulta($request)->get()->map(fn ($a) => self::dados($a))->all());
    }

    public function ver(Request $request, $id)
    {
        return $this->json(self::dados($this->atividade($request, $id)));
    }

    public function criar(Request $request)
    {
        $dados = $this->validar($this->entrada($request), parcial: false);
        $agora = Formato::banco(Formato::agora());
        $id = DB::table('atividade')->insertGetId($dados + ['disponivel' => true, 'criado_em' => $agora,
            'atualizado_em' => $agora], 'id_atividade');
        return $this->json(self::dados(DB::table('atividade')->where('id_atividade', $id)->first()), 201);
    }

    public function atualizar(Request $request, $id)
    {
        $a = $this->atividade($request, $id);
        $dados = $this->validar($this->entrada($request, parcial: true), parcial: true);
        DB::table('atividade')->where('id_atividade', $a->id_atividade)
            ->update($dados + ['atualizado_em' => Formato::banco(Formato::agora())]);
        return $this->json(self::dados(DB::table('atividade')->where('id_atividade', $a->id_atividade)->first()));
    }

    public function desativar(Request $request, $id)
    {
        $a = $this->atividade($request, $id);
        DB::table('atividade')->where('id_atividade', $a->id_atividade)
            ->update(['disponivel' => false, 'atualizado_em' => Formato::banco(Formato::agora())]);
        return $this->json(['detail' => 'Atividade marcada como indisponível.']);
    }

    private function consulta(Request $request)
    {
        $q = DB::table('atividade')->orderBy('nome')->orderBy('id_atividade');
        if (!$this->conta($request)->e(Conta::ADMINISTRADOR)) {
            $q->where('disponivel', true);
        }
        if ($tipo = $request->query('tipo')) {
            $q->where('tipo', mb_strtoupper($tipo));
        }
        return $q;
    }

    private function atividade(Request $request, $id): object
    {
        return $this->consulta($request)->where('id_atividade', self::id($id))->first() ?? throw ErroApi::semRegistro('Atividade');
    }

    private function validar(Entrada $e, bool $parcial): array
    {
        $campos = [
            'nome' => $e->texto('nome', max: 160),
            'descricao' => $e->texto('descricao', obrigatorio: false, vazio: true, nulo: true),
            'tipo' => $e->escolha('tipo', self::TIPOS),
            'conteudo_ou_referencia' => $e->texto('conteudo_ou_referencia', obrigatorio: false, vazio: true, nulo: true),
            'disponivel' => $e->booleano('disponivel', obrigatorio: false),
        ];
        $e->falharSeHouverErros();
        return array_filter($campos, fn ($v) => $v !== Entrada::AUSENTE);
    }

    public static function dados(object $a): array
    {
        return [
            'id_atividade' => (int) $a->id_atividade, 'nome' => $a->nome, 'descricao' => $a->descricao,
            'tipo' => $a->tipo, 'conteudo_ou_referencia' => $a->conteudo_ou_referencia,
            'disponivel' => (bool) $a->disponivel, 'criado_em' => Formato::local($a->criado_em),
            'atualizado_em' => Formato::local($a->atualizado_em),
        ];
    }
}
