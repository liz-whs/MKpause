<?php

namespace App\Mkpause;

class ConfiguracaoSegura
{
    public static function exigir(?string $segredo, string $driver): void
    {
        if ($segredo === null || strlen($segredo) < 32 || in_array($segredo, ['mkpause-inseguro-somente-para-desenvolvimento', 'troque-por-uma-chave-longa-e-aleatoria'], true)) {
            throw new \RuntimeException('Configure MKPAUSE_SECRET_KEY com pelo menos 32 caracteres aleatórios.');
        }
        if (! in_array($driver, ['database', 'file', 'redis'], true)) {
            throw new \RuntimeException('Use sessões revogáveis: SESSION_DRIVER=database, file ou redis.');
        }
    }
}
