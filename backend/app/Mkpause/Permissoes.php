<?php

namespace App\Mkpause;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class Permissoes
{
    public const ACESSO = [
        'ver_dados_basicos' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR],
        'ver_historico' => [Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO], // RF12, RF13; administração sem acesso emocional
        'ver_alertas' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::ADMINISTRADOR],
        'ver_observacoes' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO], // RF14
        // Gatilho trg_validar_autor_observacao: só estudante, professor e psi. escolar
        'registrar_observacao' => [Conta::ESTUDANTE, Conta::PROFESSOR, Conta::PSICOLOGO_ESCOLAR], // RF07, RF23
        'ver_ficha' => [Conta::PSICOLOGO_ESCOLAR, Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR], // RF16, RF31
        'editar_ficha' => [Conta::PSICOLOGO_CLINICO, Conta::ADMINISTRADOR], // RF17, RF31
    ];

    public static function estudantesVinculados(Conta $conta): Builder
    {
        $q = DB::table('estudante as e')->join('usuario as ue', 'ue.id_usuario', '=', 'e.id_usuario')
            ->where('ue.id_escola', Escola::id($conta))->select('e.id_estudante');
        if ($conta->perfil === Conta::ADMINISTRADOR) {
            return $q;
        }
        $q->where('e.ativo', true)->where('ue.ativo', true);
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
