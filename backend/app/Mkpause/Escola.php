<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

class Escola
{
    public static function id(Conta $conta): int
    {
        $id = (int) ($conta->usuario->id_escola ?? 0);
        if ($id < 1) {
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
