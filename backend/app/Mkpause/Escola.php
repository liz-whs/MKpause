<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

class Escola
{
    /** MVP: todos na mesma escola (config mkpause.escola_unica). */
    public static function unica(): bool
    {
        return (bool) config('mkpause.escola_unica');
    }

    /**
     * Escola que reúne todas as contas no modo de escola única: a mais antiga do banco
     * (estável entre deploys). Num banco sem escolas, cria a "mkpause".
     */
    public static function principal(): int
    {
        $id = DB::table('escola')->min('id_escola');
        if ($id === null) {
            DB::table('escola')->insertOrIgnore(['nome' => 'mkpause']);
            $id = DB::table('escola')->min('id_escola');
            CatalogoAtividades::sincronizar((int) $id);
        }

        return (int) $id;
    }

    /**
     * No modo de escola única, coloca a conta na escola principal (contas antigas sem escola,
     * ou de outra escola). Chamado no login, antes de gravar a sessão.
     */
    public static function unificar(object $usuario): object
    {
        if (! self::unica()) {
            return $usuario;
        }
        $principal = self::principal();
        if ((int) ($usuario->id_escola ?? 0) !== $principal) {
            DB::table('usuario')->where('id_usuario', $usuario->id_usuario)->update(['id_escola' => $principal]);
            $usuario->id_escola = $principal;
        }

        return $usuario;
    }

    public static function id(Conta $conta): int
    {
        $id = (int) ($conta->usuario->id_escola ?? 0);
        if ($id < 1) {
            if (self::unica()) {
                return self::principal();
            }
            throw ErroApi::proibido('Sua conta ainda não tem escola definida. Procure a administração.');
        }

        return $id;
    }

    public static function exigirPerfil(Conta $conta, string $tabela, string $chave, int $id): void
    {
        if (! DB::table($tabela.' as p')->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
            ->where('p.'.$chave, $id)->where('u.id_escola', self::id($conta))->exists()) {
            throw ErroApi::naoEncontrado();
        }
    }
}
