<?php

namespace App\Mkpause;

class Senha
{
    private const ARGON2ID = ['memory_cost' => 19 * 1024, 'time_cost' => 2, 'threads' => 1];

    public static function argon2idDisponivel(): bool
    {
        return in_array('argon2id', password_algos(), true);
    }

    public static function criar(?string $senha): string
    {
        if ($senha === null || !self::argon2idDisponivel()) {
            return SenhaPbkdf2::criar($senha);
        }

        return password_hash($senha, PASSWORD_ARGON2ID, self::ARGON2ID);
    }

    public static function conferir(string $senha, ?string $hash): bool
    {
        if ($hash !== null && str_starts_with($hash, '$argon2id$')) {
            return password_verify($senha, $hash);
        }

        return SenhaPbkdf2::conferir($senha, $hash);
    }

    public static function conferirEmTempoComparavel(string $senha): void
    {
        // Credencial fictícia fixa para contas ausentes ou sem senha utilizável.
        $hash = self::argon2idDisponivel()
            ? '$argon2id$v=19$m=19456,t=2,p=1$bWtwYXVzZUJlbmNobWFyaw$1UID9YTX7BxmkVXMyXAQ8wGVYoPBk8506Jsma1VMc60'
            : 'pbkdf2_sha256$1200000$mkpauseDummySalt2026$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        self::conferir($senha, $hash);
    }
}
