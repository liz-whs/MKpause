<?php

namespace App\Http\Controllers;

use App\Mkpause\Cadastros;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Permissoes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cadastros do administrador (RF27–RF30): GET / POST / PATCH / DELETE em
 * admin/estudantes, admin/professores, admin/psicologos-escolares, admin/psicologos-clinicos
 * (?ativo=true|false filtra). DELETE não apaga: desativa e mantém o histórico.
 */
class CadastrosController extends Controller
{
    private const MODELOS = ['estudante' => 'Estudante', 'professor' => 'Professor',
        'psicologo_escolar' => 'PsicologoEscolar', 'psicologo_clinico' => 'PsicologoClinico'];
    private const MODELOS_VINCULO = ['professores' => 'ProfessorEstudante',
        'psicologos-escolares' => 'PsicologoEscolarEstudante', 'psicologos-clinicos' => 'PsicologoClinicoEstudante'];

    public function listar(Request $request, string $tipo)
    {
        $q = Cadastros::consulta($tipo)->where('u.id_escola', \App\Mkpause\Escola::id($this->conta($request)))->orderBy('u.nome_completo')->orderBy('p.'.Cadastros::TIPOS[$tipo][1]);
        $this->filtrarAtivo($request, $q, 'p.ativo');
        return $this->json($q->get()->map(fn ($p) => Cadastros::dados($tipo, $p))->all());
    }

    public function ver(Request $request, $id, string $tipo)
    {
        return $this->json(Cadastros::dados($tipo, $this->perfil($request, $tipo, $id)));
    }

    public function criar(Request $request, string $tipo)
    {
        $dados = Cadastros::validar($tipo, $this->entrada($request), parcial: false);
        $id = Cadastros::criar($tipo, $dados, \App\Mkpause\Escola::id($this->conta($request)));
        return $this->json(Cadastros::dados($tipo, Cadastros::buscar($tipo, $id)), 201);
    }

    public function atualizar(Request $request, $id, string $tipo)
    {
        $atual = $this->perfil($request, $tipo, $id);
        $dados = Cadastros::validar($tipo, $this->entrada($request, parcial: true), parcial: true, idUsuario: $atual->id_usuario);
        Cadastros::atualizar($tipo, $atual, $dados);
        return $this->json(Cadastros::dados($tipo, Cadastros::buscar($tipo, $atual->{Cadastros::TIPOS[$tipo][1]})));
    }

    public function desativar(Request $request, $id, string $tipo)
    {
        $p = $this->perfil($request, $tipo, $id);
        [$tabela, $chave] = Cadastros::TIPOS[$tipo];
        DB::transaction(function () use ($tabela, $chave, $p) {
            DB::table($tabela)->where($chave, $p->$chave)->update(['ativo' => false]);
            DB::table('usuario')->where('id_usuario', $p->id_usuario)->update(['ativo' => false]);
        });
        return $this->json(['detail' => 'Cadastro desativado. O histórico foi mantido.']);
    }

    private function perfil(Request $request, string $tipo, $id): object
    {
        $q = Cadastros::consulta($tipo)->where('u.id_escola', \App\Mkpause\Escola::id($this->conta($request)))->where('p.'.Cadastros::TIPOS[$tipo][1], self::id($id));
        $this->filtrarAtivo($request, $q, 'p.ativo');
        return $q->first() ?? throw ErroApi::semRegistro(self::MODELOS[$tipo]);
    }

    private function filtrarAtivo(Request $request, $q, string $coluna): void
    {
        $ativo = $request->query('ativo');
        if (in_array($ativo, ['true', 'false'], true)) {
            $q->where($coluna, $ativo === 'true');
        }
    }

    // ------------------------------------------------------------ vínculos (admin)

    /** tipo => [tabela, coluna do profissional, campo na API, tabela do profissional, chave, mensagem ao remover] */
    private const VINCULOS = [
        'professores' => ['professor_estudante', 'id_professor', 'professor', 'professor', 'id_professor',
            'Vínculo desativado. O professor deixa de receber os alertas deste estudante.'],
        'psicologos-escolares' => ['psicologo_escolar_estudante', 'id_psicologo_escolar', 'psicologo_escolar',
            'psicologo_escolar', 'id_psicologo_escolar',
            'Vínculo desativado. O psicólogo escolar deixa de receber os alertas deste estudante.'],
        'psicologos-clinicos' => ['psicologo_clinico_estudante', 'id_psicologo_clinico', 'psicologo_clinico',
            'psicologo_clinico', 'id_psicologo_clinico',
            'Vínculo desativado. O psicólogo clínico deixa de ver os registros deste estudante.'],
    ];

    public function listarVinculos(Request $request, string $tipo)
    {
        [$tabela, $coluna, , $tabelaProf, $chaveProf] = self::VINCULOS[$tipo];
        $q = DB::table($tabela)->whereIn($coluna, DB::table($tabelaProf.' as p')->join('usuario as u','u.id_usuario','=','p.id_usuario')->where('u.id_escola', \App\Mkpause\Escola::id($this->conta($request)))->select('p.'.$chaveProf))->whereIn('id_estudante', Permissoes::estudantesVinculados($this->conta($request)))->orderByDesc('criado_em');
        if ($est = $request->query('estudante')) {
            Entrada::paraInteiro($est) === null ? $q->whereRaw('false') : $q->where('id_estudante', (int) $est);
        }
        $this->filtrarAtivo($request, $q, 'ativo');
        return $this->json($q->get()->map(fn ($v) => self::vinculo($tipo, $v))->all());
    }

    public function criarVinculo(Request $request, string $tipo)
    {
        [$tabela, $coluna, $campo, $tabelaProf, $chaveProf] = self::VINCULOS[$tipo];
        $e = $this->entrada($request);
        $prof = $e->referencia($campo, $tabelaProf, $chaveProf);
        $estudante = $e->referencia('estudante', 'estudante', 'id_estudante');
        $e->falharSeHouverErros();
        \App\Mkpause\Escola::exigirPerfil($this->conta($request), $tabelaProf, $chaveProf, $prof);
        \App\Mkpause\Escola::exigirPerfil($this->conta($request), 'estudante', 'id_estudante', $estudante);
        $chave = [$coluna => $prof, 'id_estudante' => $estudante];

        $extras = [];
        $existente = DB::table($tabela)->where($chave)->first();
        if ($existente) {
            DB::table($tabela)->where($chave)->update(['ativo' => true] + $extras);
        } else {
            DB::table($tabela)->insert($chave + $extras + ['ativo' => true, 'criado_em' => Formato::banco(Formato::agora())]);
        }
        return $this->json(self::vinculo($tipo, DB::table($tabela)->where($chave)->first()), $existente ? 200 : 201);
    }

    public function removerVinculo(Request $request, string $tipo)
    {
        [$tabela, $coluna, $campo, , , $mensagem] = self::VINCULOS[$tipo];
        $corpo = $this->corpo($request);
        $prof = Entrada::paraInteiro($corpo[$campo] ?? null);
        $estudante = Entrada::paraInteiro($corpo['estudante'] ?? null);
        $chave = [$coluna => $prof, 'id_estudante' => $estudante];
        if ($prof === null || $estudante === null || !DB::table($tabela)->where($chave)->exists()) {
            throw ErroApi::semRegistro(self::MODELOS_VINCULO[$tipo]);
        }
        \App\Mkpause\Escola::exigirPerfil($this->conta($request), 'estudante', 'id_estudante', $estudante);
        DB::table($tabela)->where($chave)->update(['ativo' => false]);
        return $this->json(['detail' => $mensagem]);
    }

    private static function vinculo(string $tipo, object $v): array
    {
        [, $coluna, $campo] = self::VINCULOS[$tipo];
        $saida = [$campo => (int) $v->$coluna, 'estudante' => (int) $v->id_estudante];
        return $saida + ['ativo' => (bool) $v->ativo, 'criado_em' => Formato::local($v->criado_em)];
    }

    public function meusEstudantes(Request $request)
    {
        return $this->json($this->consultaMeus($request)->get()->map(fn ($e) => self::resumoEstudante($e))->all());
    }

    public function meuEstudante(Request $request, $id)
    {
        $e = $this->consultaMeus($request)->where('e.id_estudante', self::id($id))->first();
        return $e ? $this->json(self::resumoEstudante($e)) : throw ErroApi::semRegistro('Estudante');
    }

    private function consultaMeus(Request $request)
    {
        return DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->whereIn('e.id_estudante', Permissoes::estudantesVinculados($this->conta($request)))
            ->select('e.id_estudante', 'u.nome_completo', 'u.email', 'e.instituicao_ensino', 'e.turma')
            ->orderBy('u.nome_completo')->orderBy('e.id_estudante');
    }

    private static function resumoEstudante(object $e): array
    {
        return ['id_estudante' => (int) $e->id_estudante, 'nome_completo' => $e->nome_completo, 'email' => $e->email,
            'instituicao_ensino' => $e->instituicao_ensino, 'turma' => $e->turma];
    }
}
