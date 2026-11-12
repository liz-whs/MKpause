<?php

namespace App\Http\Controllers;

use App\Http\Middleware\Autenticar;
use App\Mkpause\Conta;
use App\Mkpause\Csrf;
use App\Mkpause\Senha;
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
        $hash = $usuario->senha_hash ?? null;
        if (!$hash || str_starts_with($hash, '!')) {
            Senha::conferirEmTempoComparavel($senha);
            $valida = false;
        } else {
            $valida = Senha::conferir($senha, $hash);
        }
        $verificacao = hrtime(true);
        // MVP (escola única): contas antigas sem escola entram na escola principal antes de abrir a sessão.
        $conta = $usuario && $valida ? Conta::comPerfil(\App\Mkpause\Escola::unificar($usuario)) : null;
        $perfil = hrtime(true);
        if ($conta !== null && str_starts_with($hash, 'pbkdf2_sha256$') && Senha::argon2idDisponivel()) {
            $conta = $this->migrarSenha($conta, $senha, $hash);
        }
        if ($conta === null) {
            return $this->json(['detail' => 'E-mail ou senha não conferem. Confira e tente de novo.'], 401)
                ->header('WWW-Authenticate', 'Session');
        }
        $migracao = hrtime(true);
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
                'migracao_senha_ms' => $ms($perfil, $migracao),
                'regeneracao_sessao_e_resposta_ms' => $ms($migracao, $fim),
                'controller_ms' => $ms($inicio, $fim),
            ]);
        }

        return $resposta;
    }

    private function migrarSenha(Conta $conta, string $senha, string $hashAnterior): ?Conta
    {
        $novoHash = Senha::criar($senha);
        $atualizado = DB::table('usuario')->where('id_usuario', $conta->id())
            ->where('ativo', true)->where('senha_hash', $hashAnterior)
            ->update(['senha_hash' => $novoHash]);

        if ($atualizado === 1) {
            $conta->usuario->senha_hash = $novoHash;
            return $conta;
        }

        // Outro login ou uma troca de senha pode ter alterado a credencial.
        $atual = Conta::carregar($conta->id());
        return $atual && Senha::conferir($senha, $atual->usuario->senha_hash) ? $atual : null;
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
