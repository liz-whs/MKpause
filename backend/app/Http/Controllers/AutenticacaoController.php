<?php

namespace App\Http\Controllers;

use App\Http\Middleware\Autenticar;
use App\Mkpause\Conta;
use App\Mkpause\Csrf;
use App\Mkpause\SenhaPbkdf2;
use App\Mkpause\Limite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutenticacaoController extends Controller
{
    public function csrf(Request $request)
    {
        $segredo = Csrf::segredo($request);
        return $this->json(['csrftoken' => Csrf::mascarar($segredo)])->withCookie(Csrf::cookie($segredo));
    }

    public function login(Request $request)
    {
        $inicio = hrtime(true);
        Limite::exigir($request, 'login-ip');
        Csrf::exigir($request);
        $e = $this->entrada($request);
        $email = $e->email('email');
        $senha = $e->texto('senha', max: 128, aparar: false);
        $e->falharSeHouverErros();
        Limite::exigir($request, 'login');

        $validacao = hrtime(true);
        $usuario = DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])->where('ativo', true)->first();
        $consulta = hrtime(true);
        $hash = $usuario->senha_hash ?? 'pbkdf2_sha256$1200000$mkpauseDummySalt2026$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        $valida = SenhaPbkdf2::conferir($senha, $hash);
        $verificacao = hrtime(true);
        $conta = $usuario && $valida ? Conta::comPerfil($usuario) : null;
        if ($conta === null) {
            return $this->json(['detail' => 'E-mail ou senha não conferem. Confira e tente de novo.'], 401)
                ->header('WWW-Authenticate', 'Session');
        }
        $perfil = hrtime(true);
        Autenticar::entrar($request, $conta);
        $resposta = $this->json($conta->dados());

        if (config('mkpause.diagnostico_login')) {
            $fim = hrtime(true);
            $ms = static fn (int $inicio, int $fim): float => round(($fim - $inicio) / 1e6, 1);
            Log::channel('stderr')->info('mkpause.login.tempos', [
                'validacao_e_limites_ms' => $ms($inicio, $validacao),
                'consulta_usuario_ms' => $ms($validacao, $consulta),
                'verificacao_senha_ms' => $ms($consulta, $verificacao),
                'consulta_perfil_ms' => $ms($verificacao, $perfil),
                'regeneracao_sessao_e_resposta_ms' => $ms($perfil, $fim),
                'controller_ms' => $ms($inicio, $fim),
            ]);
        }

        return $resposta;
    }

    public function logout(Request $request)
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return $this->json(['detail' => 'Você saiu da sua conta.']);
    }

    public function concluirPrimeiroAcesso(Request $request)
    {
        $conta = $this->conta($request);
        // O perfil é limitado pelo middleware e a conta-alvo vem da sessão autenticada.
        DB::table('estudante')->where('id_estudante', $conta->idPerfil())
            ->where('id_usuario', $conta->id())->update(['primeiro_acesso_concluido' => true]);
        return $this->json(Conta::carregar($conta->id())->dados());
    }

    public function eu(Request $request)
    {
        return $this->json($this->conta($request)->dados());
    }
}
