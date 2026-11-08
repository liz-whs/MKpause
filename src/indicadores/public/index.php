<?php
declare(strict_types=1);

/**
 * Serviço de indicadores anônimos do MKpause (PHP).
 *
 *   GET /indicadores/api/resumo?dias=7|30|90   indicadores da escola (só administrador)
 *   GET /indicadores/api/saude                 o serviço e o banco estão no ar?
 *
 * Em desenvolvimento: `npm run indicadores` em src/web (o Vite repassa /indicadores para cá).
 */

use MKpause\Indicadores\Autorizacao;
use MKpause\Indicadores\Banco;
use MKpause\Indicadores\Configuracao;
use MKpause\Indicadores\ErroHttp;
use MKpause\Indicadores\Indicadores;

spl_autoload_register(function (string $classe): void {
    $prefixo = 'MKpause\\Indicadores\\';
    if (str_starts_with($classe, $prefixo)) {
        require __DIR__ . '/../src/' . substr($classe, strlen($prefixo)) . '.php';
    }
});

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

$rota = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
$rota = preg_replace('#^/indicadores#', '', $rota);

try {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        throw new ErroHttp(405, 'Use GET.');
    }
    $config = new Configuracao();
    if ($rota === '/api/saude') {
        Banco::conectar($config)->query('SELECT 1');
        responder(200, ['ok' => true]);
        return;
    }
    if ($rota === '/api/resumo') {
        $conta = (new Autorizacao($config))->exigirAdministrador($_SERVER['HTTP_COOKIE'] ?? '');
        $dias = filter_var($_GET['dias'] ?? '30', FILTER_VALIDATE_INT);
        $indicadores = new Indicadores(Banco::conectar($config), $config->fuso(), (int) $conta['id_escola']);
        responder(200, $indicadores->resumo($dias === false ? 0 : $dias));
        return;
    }
    throw new ErroHttp(404, 'Rota não encontrada.');
} catch (ErroHttp $e) {
    responder($e->status, ['detail' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('[indicadores] ' . get_class($e));
    responder(500, ['detail' => 'Não foi possível calcular os indicadores agora.']);
}
