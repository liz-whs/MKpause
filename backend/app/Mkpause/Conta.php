<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

class Conta
{
    public const ESTUDANTE = 'estudante';
    public const PROFESSOR = 'professor';
    public const PSICOLOGO_ESCOLAR = 'psicologo_escolar';
    public const PSICOLOGO_CLINICO = 'psicologo_clinico';
    public const ADMINISTRADOR = 'administrador';

    public const PROFISSIONAIS = [self::PROFESSOR, self::PSICOLOGO_ESCOLAR, self::PSICOLOGO_CLINICO];

    public const TABELAS = [
        self::ADMINISTRADOR => ['administrador', 'id_administrador'],
        self::PSICOLOGO_CLINICO => ['psicologo_clinico', 'id_psicologo_clinico'],
        self::PSICOLOGO_ESCOLAR => ['psicologo_escolar', 'id_psicologo_escolar'],
        self::PROFESSOR => ['professor', 'id_professor'],
        self::ESTUDANTE => ['estudante', 'id_estudante'],
    ];

    public function __construct(public readonly object $usuario, public readonly string $perfil,
                                public readonly object $dadosPerfil)
    {
    }

    public static function carregar(int|string|null $idUsuario): ?self
    {
        if ($idUsuario === null) {
            return null;
        }
        $usuario = DB::table('usuario')->where('id_usuario', $idUsuario)->where('ativo', true)->first();
        return $usuario ? self::comPerfil($usuario) : null;
    }

    public static function comPerfil(object $usuario): ?self
    {
        foreach (self::TABELAS as $perfil => [$tabela]) {
            $dados = DB::table($tabela)->where('id_usuario', $usuario->id_usuario)->where('ativo', true)
                ->orderBy(self::TABELAS[$perfil][1])->first();
            if ($dados) {
                return new self($usuario, $perfil, $dados);
            }
        }
        return null;
    }

    public function id(): int
    {
        return (int) $this->usuario->id_usuario;
    }

    public function idPerfil(): int
    {
        return (int) $this->dadosPerfil->{self::TABELAS[$this->perfil][1]};
    }

    public function e(string ...$perfis): bool
    {
        return in_array($this->perfil, $perfis, true);
    }

    public function dados(): array
    {
        return [
            'id_usuario' => $this->id(),
            'nome_completo' => $this->usuario->nome_completo,
            'email' => $this->usuario->email,
            'perfil' => $this->perfil,
            'id_perfil' => $this->idPerfil(),
        ];
    }
}
