<?php

namespace App\Http\Middleware;

use App\Mkpause\Conta;
use App\Mkpause\Csrf;
use App\Mkpause\ErroApi;
use Closure;
use Illuminate\Http\Request;

class Autenticar
{
    public const CHAVE_SESSAO = 'id_usuario';

    public function handle(Request $request, Closure $next, string ...$perfis)
    {
        $id = $request->session()->get(self::CHAVE_SESSAO);
        if ($id === null) {
            throw ErroApi::semLogin();
        }
        $conta = Conta::carregar($id);
        $assinatura = $request->session()->get('credencial');
        if ($conta === null || !is_string($assinatura) || !hash_equals(self::credencial($conta), $assinatura)) {
            $request->session()->invalidate();
            throw new ErroApi(401, ['detail' => 'Sua conta não está mais ativa. Procure a escola.'],
                ['WWW-Authenticate' => 'Session']);
        }
        if (!in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS', 'TRACE'], true)) {
            Csrf::exigir($request);
        }
        if ($perfis && !$conta->e(...$perfis)) {
            throw ErroApi::proibido('Seu perfil não tem acesso a esta área.');
        }
        if (!$request->is('api/auth/*')) \App\Mkpause\Escola::id($conta);
        $request->attributes->set('conta', $conta);
        return $next($request);
    }

    public static function credencial(Conta $conta): string
    {
        return hash_hmac('sha256', $conta->id().'|'.$conta->perfil.'|'.$conta->idPerfil().'|'.($conta->usuario->id_escola ?? '').'|'.$conta->usuario->senha_hash, config('mkpause.segredo'));
    }

    public static function entrar(Request $request, Conta $conta): void
    {
        $request->session()->regenerate(true);
        $request->session()->put(self::CHAVE_SESSAO, $conta->id());
        $request->session()->put('credencial', self::credencial($conta));
    }
}
