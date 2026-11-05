<?php

namespace App\Http\Middleware;

use App\Mkpause\Conta;
use App\Mkpause\Csrf;
use App\Mkpause\ErroApi;
use Closure;
use Illuminate\Http\Request;

/**
 * Login pela sessão (cookie). A cada pedido a conta é recarregada do banco: desativar a
 * conta ou o perfil corta o acesso na hora.
 *
 * Uso nas rotas: 'conta' (só exige login) ou 'conta:administrador' / 'conta:professor,psicologo_escolar'.
 * Pedidos que alteram dados exigem o token CSRF.
 */
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
        if ($conta === null) {
            $request->session()->flush();
            throw new ErroApi(401, ['detail' => 'Sua conta não está mais ativa. Procure a escola.'],
                ['WWW-Authenticate' => 'Session']);
        }
        if (!in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS', 'TRACE'], true)) {
            Csrf::exigir($request);
        }
        if ($perfis && !$conta->e(...$perfis)) {
            throw ErroApi::proibido('Seu perfil não tem acesso a esta área.');
        }
        $request->attributes->set('conta', $conta);
        return $next($request);
    }

    public static function entrar(Request $request, Conta $conta): void
    {
        $request->session()->regenerate(true);
        $request->session()->put(self::CHAVE_SESSAO, $conta->id());
    }
}
