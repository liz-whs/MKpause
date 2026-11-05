<?php
declare(strict_types=1);

namespace MKpause\Indicadores;

use PDO;

/** Conexão com o PostgreSQL do MKpause, só de leitura. */
final class Banco
{
    public static function conectar(Configuracao $config): PDO
    {
        if (!in_array('pgsql', PDO::getAvailableDrivers(), true)) {
            throw new \RuntimeException('O PHP está sem a extensão pdo_pgsql (veja o README do serviço).');
        }
        [$dsn, $usuario, $senha] = $config->banco();
        $pdo = new PDO($dsn, $usuario, $senha, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        // O serviço só lê: qualquer escrita é recusada pelo próprio PostgreSQL.
        $pdo->exec('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
        $pdo->exec("SET statement_timeout = '5s'");
        return $pdo;
    }
}
