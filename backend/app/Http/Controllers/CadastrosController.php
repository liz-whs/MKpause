<?php

namespace App\Http\Controllers;

use App\Mkpause\Cadastros;
use App\Mkpause\Convites;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Permissoes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CadastrosController extends Controller
{
    private const MODELOS = ['estudante' => 'Estudante', 'professor' => 'Professor',
        'psicologo_escolar' => 'PsicologoEscolar', 'psicologo_clinico' => 'PsicologoClinico'];
    private const MODELOS_VINCULO = ['professores' => 'ProfessorEstudante',
        'psicologos-escolares' => 'PsicologoEscolarEstudante', 'psicologos-clinicos' => 'PsicologoClinicoEstudante',
        'responsaveis' => 'EstudanteResponsavel'];

    public function listar(Request $request, string $tipo)
    {
        $q = Cadastros::consulta($tipo)->orderBy('u.nome_completo')->orderBy('p.'.Cadastros::TIPOS[$tipo][1]);
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
        $id = Cadastros::criar($tipo, $dados);
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
        $q = Cadastros::consulta($tipo)->where('p.'.Cadastros::TIPOS[$tipo][1], self::id($id));
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

    public function listarResponsaveis(Request $request)
    {
        $q = DB::table('responsavel')->orderBy('nome_completo')->orderBy('id_responsavel');
        $this->filtrarAtivo($request, $q, 'ativo');
        return $this->json($q->get()->map(fn ($r) => self::responsavel($r))->all());
    }

    public function verResponsavel(Request $request, $id)
    {
        return $this->json(self::responsavel($this->responsavelOu404($request, $id)));
    }

    public function criarResponsavel(Request $request)
    {
        $dados = $this->validarResponsavel($this->entrada($request), parcial: false);
        $agora = Formato::banco(Formato::agora());
        $id = DB::table('responsavel')->insertGetId($dados + ['ativo' => true, 'criado_em' => $agora,
            'atualizado_em' => $agora], 'id_responsavel');
        return $this->json(self::responsavel(DB::table('responsavel')->where('id_responsavel', $id)->first()), 201);
    }

    public function atualizarResponsavel(Request $request, $id)
    {
        $r = $this->responsavelOu404($request, $id);
        $dados = $this->validarResponsavel($this->entrada($request, parcial: true), parcial: true);
        DB::table('responsavel')->where('id_responsavel', $r->id_responsavel)
            ->update($dados + ['atualizado_em' => Formato::banco(Formato::agora())]);
        return $this->json(self::responsavel(DB::table('responsavel')->where('id_responsavel', $r->id_responsavel)->first()));
    }

    public function desativarResponsavel(Request $request, $id)
    {
        $r = $this->responsavelOu404($request, $id);
        DB::transaction(function () use ($r) {
            DB::table('responsavel')->where('id_responsavel', $r->id_responsavel)
                ->update(['ativo' => false, 'atualizado_em' => Formato::banco(Formato::agora())]);
            $convites = DB::table('convite_responsavel')->where('id_responsavel', $r->id_responsavel)
                ->whereIn('status', ['PENDENTE', 'ACEITO'])->lockForUpdate()->get();
            foreach ($convites as $c) {
                Convites::revogar($c);
            }
        });
        return $this->json(['detail' => 'Cadastro desativado. O histórico foi mantido.']);
    }

    private function responsavelOu404(Request $request, $id): object
    {
        $q = DB::table('responsavel')->where('id_responsavel', self::id($id));
        $this->filtrarAtivo($request, $q, 'ativo');
        return $q->first() ?? throw ErroApi::semRegistro('Responsavel');
    }

    private function validarResponsavel(Entrada $e, bool $parcial): array
    {
        $dados = [];
        $nome = $e->texto('nome_completo', max: 150);
        $email = $e->email('email', obrigatorio: false, vazio: true, nulo: true);
        $telefone = $e->texto('telefone', max: 30, obrigatorio: false, vazio: true, nulo: true);
        $e->falharSeHouverErros();
        foreach (['nome_completo' => $nome, 'email' => is_string($email) ? mb_strtolower($email) : $email, 'telefone' => $telefone] as $k => $v) {
            if ($v !== Entrada::AUSENTE) {
                $dados[$k] = $v;
            }
        }
        return $dados;
    }

    public static function responsavel(object $r): array
    {
        return ['id_responsavel' => (int) $r->id_responsavel, 'nome_completo' => $r->nome_completo, 'email' => $r->email,
            'ativo' => (bool) $r->ativo, 'criado_em' => Formato::local($r->criado_em), 'telefone' => $r->telefone];
    }

    private const VINCULOS = [
        'professores' => ['professor_estudante', 'id_professor', 'professor', 'professor', 'id_professor',
            'Vínculo desativado. O professor deixa de receber os alertas deste estudante.'],
        'psicologos-escolares' => ['psicologo_escolar_estudante', 'id_psicologo_escolar', 'psicologo_escolar',
            'psicologo_escolar', 'id_psicologo_escolar',
            'Vínculo desativado. O psicólogo escolar deixa de receber os alertas deste estudante.'],
        'psicologos-clinicos' => ['psicologo_clinico_estudante', 'id_psicologo_clinico', 'psicologo_clinico',
            'psicologo_clinico', 'id_psicologo_clinico',
            'Vínculo desativado. O psicólogo clínico deixa de ver os registros deste estudante.'],
        'responsaveis' => ['estudante_responsavel', 'id_responsavel', 'responsavel', 'responsavel', 'id_responsavel',
            'Vínculo desativado.'],
    ];

    public function listarVinculos(Request $request, string $tipo)
    {
        [$tabela] = self::VINCULOS[$tipo];
        $q = DB::table($tabela)->orderByDesc('criado_em');
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
        $parentesco = $tipo === 'responsaveis'
            ? $e->texto('grau_parentesco', max: 60, obrigatorio: false, vazio: true, nulo: true) : Entrada::AUSENTE;
        $e->falharSeHouverErros();
        $chave = [$coluna => $prof, 'id_estudante' => $estudante];

        if (in_array($tipo, ['psicologos-clinicos', 'responsaveis'], true)
            && !DB::table($tabela)->where($chave)->where('ativo', true)->exists()
            && !DB::table('convite_responsavel as c')->join('responsavel as r', 'r.id_responsavel', '=', 'c.id_responsavel')
                ->where('c.id_estudante', $estudante)->where("c.{$coluna}", $prof)->where('c.status', 'ACEITO')
                ->where('r.ativo', true)->exists()) {
            throw ErroApi::invalido($tipo === 'responsaveis'
                ? 'Envie o convite e aguarde o aceite do responsável.'
                : 'Envie o convite ao responsável e aguarde o aceite antes de criar o vínculo clínico.');
        }

        $extras = $parentesco === Entrada::AUSENTE ? [] : ['grau_parentesco' => $parentesco];
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
        DB::table($tabela)->where($chave)->update(['ativo' => false]);
        return $this->json(['detail' => $mensagem]);
    }

    private static function vinculo(string $tipo, object $v): array
    {
        [, $coluna, $campo] = self::VINCULOS[$tipo];
        $saida = [$campo => (int) $v->$coluna, 'estudante' => (int) $v->id_estudante];
        if ($tipo === 'responsaveis') {
            $saida['grau_parentesco'] = $v->grau_parentesco;
        }
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
