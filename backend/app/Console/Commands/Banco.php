<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class Banco
{
    public static function exigir(Command $comando): void
    {
        $cfg = DB::connection()->getConfig();
        $comando->line('Conectando em '.($cfg['host'] ?? 'local').':'.($cfg['port'] ?? '-').", banco '".($cfg['database'] ?? '?')."', usuário '".($cfg['username'] ?? '-')."'...");
        try {
            DB::connection()->getPdo();
        } catch (Throwable $erro) {
            throw new RuntimeException(
                "Não consegui conectar no PostgreSQL. Confira se:\n"
                ."  1. o PostgreSQL está rodando (serviço 'postgresql' no Windows);\n"
                ."  2. o arquivo .env existe nesta pasta (copie de .env.example) com DB_PASSWORD certo;\n"
                ."  3. o banco foi criado (php artisan mkpause:aplicar-esquema ou flyway migrate).\n"
                .'Detalhe: '.$erro->getMessage());
        }
    }
}
