<?php

namespace App\Mkpause;

class AssinaturaTemporizada
{
    private const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    public static function assinar(array $dados, string $sal): string
    {
        $json = json_encode($dados, JSON_UNESCAPED_SLASHES);
        $valor = self::b64(self::latin1($json)).':'.self::base62(time());
        return $valor.':'.self::assinatura($valor, $sal);
    }

    public static function abrir(string $token, string $sal, int $idadeMaxima): ?array
    {
        $partes = explode(':', $token);
        if (count($partes) !== 3) {
            return null;
        }
        [$dados, $tempo, $assinatura] = $partes;
        if (!hash_equals(self::assinatura("{$dados}:{$tempo}", $sal), $assinatura)) {
            return null;
        }
        $instante = self::deBase62($tempo);
        if ($instante === null || time() - $instante > $idadeMaxima) {
            return null;
        }
        if (str_starts_with($dados, '.')) {
            return null;
        }
        $json = base64_decode(strtr($dados, '-_', '+/'), true);
        $valor = $json === false ? null : json_decode($json, true);
        return is_array($valor) ? $valor : null;
    }

    private static function assinatura(string $valor, string $sal): string
    {
        $chave = hash('sha256', $sal.'signer'.config('mkpause.segredo'), true);
        return self::b64(hash_hmac('sha256', $valor, $chave, true));
    }

    private static function b64(string $bruto): string
    {
        return rtrim(strtr(base64_encode($bruto), '+/', '-_'), '=');
    }

    private static function latin1(string $json): string
    {
        return $json;
    }

    private static function base62(int $n): string
    {
        $texto = '';
        do {
            $texto = self::B62[$n % 62].$texto;
            $n = intdiv($n, 62);
        } while ($n > 0);
        return $texto;
    }

    private static function deBase62(string $texto): ?int
    {
        $n = 0;
        foreach (str_split($texto) as $c) {
            $i = strpos(self::B62, $c);
            if ($i === false) {
                return null;
            }
            $n = $n * 62 + $i;
        }
        return $n;
    }
}
