<?php

namespace App\Http\Controllers;

use App\Http\Middleware\Autenticar;
use App\Mkpause\Conta;
use App\Mkpause\Csrf;
use App\Mkpause\SenhaDjango;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Login (RF01, RF10, RF19, RF26), logout, conta atual e token CSRF. */
class AutenticacaoController extends Controller
{
    /** GET /api/auth/csrf/: entrega o cookie csrftoken, que a interface manda em X-CSRFToken. */
    public function csrf(Request $request)
    {
        $segredo = Csrf::segredo($request);
        return $this->json(['csrftoken' => Csrf::mascarar($segredo)])->withCookie(Csrf::cookie($segredo));
    }

    public function login(Request $request)
    {
        $e = $this->entrada($request);
        $email = $e->email('email');
        $senha = $e->texto('senha', aparar: false);
        $e->falharSeHouverErros();

        $usuario = DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])->where('ativo', true)->first();
        $conta = $usuario && SenhaDjango::conferir($senha, $usuario->senha_hash) ? Conta::comPerfil($usuario) : null;
        // Mesma mensagem para e-mail inexistente e senha errada.
        if ($conta === null) {
            return $this->json(['detail' => 'E-mail ou senha não conferem. Confira e tente de novo.'], 401)
                ->header('WWW-Authenticate', 'Session');
        }
        Autenticar::entrar($request, $conta);
        return $this->json($conta->dados());
    }

    public function logout(Request $request)
    {
        $request->session()->flush();
        $request->session()->regenerate(true);
        return $this->json(['detail' => 'Você saiu da sua conta.']);
    }

    public function eu(Request $request)
    {
        return $this->json($this->conta($request)->dados());
    }
}
