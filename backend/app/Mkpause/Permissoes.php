<?php

namespace App\Mkpause;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Quem pode fazer o quê (RN02, RN03, RN04, RN20, RN33, RN34).
 *
 * Toda regra de acesso está aqui. Para mudar uma permissão, edite ACESSO:
 * as rotas só perguntam Permissoes::pode($conta, $acao, $idEstudante).
 */
class Permissoes
{
    // ação => perfis que podem. Profissionais só sobre estudantes vinculados;
    // o estudante só sobre si mesmo; o administrador sobre todos.
    public const ACESSO = [
        'ver_dados_basicos' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR],
        'ver_historico' => [Conta::ESTUDANTE, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR], // RF09, RF12, RF13
        'ver_alertas' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR],
        'ver_observacoes' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO], // RF14
        // Gatilho trg_validar_autor_observacao: só estudante, professor e psi. escolar
        'registrar_observacao' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR], // RF07, RF23
        'ver_ficha' => [Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR], // RF16, RF31
        'editar_ficha' => [Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR], // RF17, RF31
    ];

    /** Consulta dos estudantes (tabela `estudante`, apelido e) que a conta pode acessar. */
    public static function estudantesVinculados(Conta $conta): Builder
    {
        $q = DB::table('estudante as e')->select('e.id_estudante');
        if ($conta->perfil === Conta::ADMINISTRADOR) {
            return $q;
        }
        $q->join('usuario as ue', 'ue.id_usuario', '=', 'e.id_usuario')
            ->where('e.ativo', true)->where('ue.ativo', true);
        $id = $conta->idPerfil();
        return match ($conta->perfil) {
            Conta::ESTUDANTE => $q->where('e.id_estudante', $id),
            Conta::PROFESSOR => $q->whereExists(fn ($s) => $s->from('professor_estudante as v')
                ->whereColumn('v.id_estudante', 'e.id_estudante')->where('v.id_professor', $id)->where('v.ativo', true)),
            Conta::PSICOLOGO_ESCOLAR => $q->whereExists(fn ($s) => $s->from('psicologo_escolar_estudante as v')
                ->whereColumn('v.id_estudante', 'e.id_estudante')->where('v.id_psicologo_escolar', $id)->where('v.ativo', true)),
            Conta::PSICOLOGO_CLINICO => $q->whereExists(fn ($s) => $s->from('psicologo_clinico_estudante as v')
                ->whereColumn('v.id_estudante', 'e.id_estudante')->where('v.id_psicologo_clinico', $id)->where('v.ativo', true)),
            default => $q->whereRaw('false'),
        };
    }

    public static function pode(Conta $conta, string $acao, int $idEstudante): bool
    {
        if (!in_array($conta->perfil, self::ACESSO[$acao], true)) {
            return false;
        }
        return self::estudantesVinculados($conta)->where('e.id_estudante', $idEstudante)->exists();
    }
}
