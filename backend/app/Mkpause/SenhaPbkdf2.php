<?php

namespace App\Mkpause;

class SenhaPbkdf2
{
    public const ITERACOES = 1200000;

    public static function criar(?string $senha): string
    {
        if ($senha === null) {
            return '!'.self::aleatorio(40);
        }
        $sal = self::aleatorio(22);
        return self::calcular($senha, $sal, self::ITERACOES);
    }

    public static function conferir(string $senha, ?string $hash): bool
    {
        if (!$hash || str_starts_with($hash, '!')) {
            return false;
        }
        $partes = explode('$', $hash, 4);
        if (count($partes) !== 4 || $partes[0] !== 'pbkdf2_sha256' || !ctype_digit($partes[1])) {
            return false;
        }
        return hash_equals($hash, self::calcular($senha, $partes[2], (int) $partes[1]));
    }

    private static function calcular(string $senha, string $sal, int $iteracoes): string
    {
        $bruto = hash_pbkdf2('sha256', $senha, $sal, $iteracoes, 32, true);
        return "pbkdf2_sha256\${$iteracoes}\${$sal}\$".base64_encode($bruto);
    }

    private static function aleatorio(int $tamanho): string
    {
        $alfabeto = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $texto = '';
        for ($i = 0; $i < $tamanho; $i++) {
            $texto .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
        }
        return $texto;
    }
}
