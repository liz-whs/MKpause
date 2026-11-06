<?php

namespace App\Mkpause;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class Csrf
{
    public const COOKIE = 'csrftoken';
    private const CARACTERES = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    private const TAMANHO = 32;

    public static function segredo(Request $request): string
    {
        $atual = (string) $request->cookies->get(self::COOKIE, '');
        $atual = strlen($atual) === 2 * self::TAMANHO ? self::desmascarar($atual) : $atual;
        return self::formatoValido($atual) && strlen($atual) === self::TAMANHO ? $atual : self::aleatorio();
    }

    public static function mascarar(string $segredo): string
    {
        $mascara = self::aleatorio();
        $cifra = '';
        for ($i = 0; $i < self::TAMANHO; $i++) {
            $cifra .= self::CARACTERES[(strpos(self::CARACTERES, $segredo[$i]) + strpos(self::CARACTERES, $mascara[$i])) % 62];
        }
        return $mascara.$cifra;
    }

    public static function cookie(string $segredo): Cookie
    {
        return Cookie::create(self::COOKIE, $segredo, time() + 31449600, '/', null,
            config('mkpause.cookies_seguros'), false, false, Cookie::SAMESITE_LAX);
    }

    public static function exigir(Request $request): void
    {
        $origem = $request->headers->get('Origin');
        if ($origem !== null) {
            if (!self::origemConfiavel($request, $origem)) {
                self::falhar("Origin checking failed - {$origem} does not match any trusted origins.");
            }
        } elseif ($request->isSecure()) {
            $referer = $request->headers->get('Referer');
            if (!$referer) {
                self::falhar('Referer checking failed - no Referer.');
            }
            $partes = parse_url($referer);
            $base = isset($partes['scheme'], $partes['host'])
                ? $partes['scheme'].'://'.$partes['host'].(isset($partes['port']) ? ':'.$partes['port'] : '') : null;
            if ($base === null || $partes['scheme'] !== 'https' || !self::origemConfiavel($request, $base)) {
                self::falhar("Referer checking failed - {$referer} does not match any trusted origins.");
            }
        }

        $cookie = (string) $request->cookies->get(self::COOKIE, '');
        if ($cookie === '') {
            self::falhar('CSRF cookie not set.');
        }
        $cookie = strlen($cookie) === 2 * self::TAMANHO ? self::desmascarar($cookie) : $cookie;
        $enviado = (string) $request->headers->get('X-CSRFToken', '');
        if ($enviado === '') {
            self::falhar('CSRF token missing.');
        }
        if (!in_array(strlen($enviado), [self::TAMANHO, 2 * self::TAMANHO], true)) {
            self::falhar("CSRF token from the 'X-Csrftoken' HTTP header has incorrect length.");
        }
        if (!self::formatoValido($enviado)) {
            self::falhar("CSRF token from the 'X-Csrftoken' HTTP header has invalid characters.");
        }
        $enviado = strlen($enviado) === 2 * self::TAMANHO ? self::desmascarar($enviado) : $enviado;
        if (!hash_equals($cookie, $enviado)) {
            self::falhar("CSRF token from the 'X-Csrftoken' HTTP header incorrect.");
        }
    }

    private static function origemConfiavel(Request $request, string $origem): bool
    {
        return $origem === $request->getSchemeAndHttpHost()
            || in_array($origem, config('mkpause.csrf_origens_confiaveis'), true);
    }

    private static function falhar(string $motivo): never
    {
        throw ErroApi::proibido("CSRF Failed: {$motivo}");
    }

    private static function desmascarar(string $token): string
    {
        $mascara = substr($token, 0, self::TAMANHO);
        $cifra = substr($token, self::TAMANHO);
        $segredo = '';
        for ($i = 0; $i < self::TAMANHO; $i++) {
            $p = strpos(self::CARACTERES, $cifra[$i]) - strpos(self::CARACTERES, $mascara[$i]);
            $segredo .= self::CARACTERES[($p % 62 + 62) % 62];
        }
        return $segredo;
    }

    private static function formatoValido(string $texto): bool
    {
        return $texto !== '' && strspn($texto, self::CARACTERES) === strlen($texto);
    }

    private static function aleatorio(): string
    {
        $texto = '';
        for ($i = 0; $i < self::TAMANHO; $i++) {
            $texto .= self::CARACTERES[random_int(0, 61)];
        }
        return $texto;
    }
}
