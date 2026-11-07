<?php

namespace App\Mkpause;

class Codigos
{
    public const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public static function gerar(int $tamanho): string
    {
        $texto = '';
        for ($i = 0; $i < $tamanho; $i++) {
            $texto .= self::ALFABETO[random_int(0, strlen(self::ALFABETO) - 1)];
        }
        return $texto;
    }

    public static function normalizar(string $texto): string
    {
        return str_replace('-', '', preg_replace('/\s+/u', '', mb_strtoupper($texto)));
    }

    public static function hash(string $texto): string
    {
        return hash_hmac('sha256', self::normalizar($texto), config('mkpause.segredo'));
    }

    public static function formatar(string $texto): string
    {
        $meio = intdiv(strlen($texto), 2);
        return substr($texto, 0, $meio).'-'.substr($texto, $meio);
    }
}
