<?php

use App\Http\Middleware\Autenticar;
use App\Mkpause\Csrf;
use App\Mkpause\ErroApi;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

$ambiente = Dotenv\Repository\RepositoryBuilder::createWithNoAdapters()
    ->addAdapter(Dotenv\Repository\Adapter\PutenvAdapter::class)
    ->addAdapter(Dotenv\Repository\Adapter\EnvConstAdapter::class)
    ->addAdapter(Dotenv\Repository\Adapter\ServerConstAdapter::class)
    ->immutable()->make();
foreach ([dirname(__DIR__), dirname(__DIR__, 2)] as $i => $pasta) {
    Dotenv\Dotenv::create($ambiente, $pasta, $i === 0 ? '.env' : '.env.local')->safeLoad();
}

$json = fn (int $status, array $corpo, array $cabecalhos = []) => response()->json(
    $corpo, $status, $cabecalhos + ['Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [Csrf::COOKIE]);
        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
        ]);
        $middleware->alias(['conta' => Autenticar::class]);
        $proxies = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', '')))));
        $middleware->trustProxies(at: $proxies);
    })
    ->withExceptions(function (Exceptions $exceptions) use ($json): void {
        $exceptions->dontReport([ErroApi::class, QueryException::class]);
        $exceptions->render(fn (ErroApi $e) => $json($e->status, $e->corpo, $e->cabecalhos));

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) use ($json) {
            return $json(405, ['detail' => "Método \"{$request->getMethod()}\" não é permitido."]);
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($json) {
            return $request->is('api/*') ? $json(404, ['detail' => 'Não encontrado.']) : null;
        });

        $exceptions->render(function (QueryException $e) use ($json) {
            $estado = (string) ($e->errorInfo[0] ?? $e->getCode());
            if (str_starts_with($estado, '23')) {
                Log::warning('Database integrity failure', ['sqlstate' => $estado]);
                return $json(409, ['detail' => 'Não conseguimos salvar: os dados conflitam com um registro existente '
                    .'ou com uma regra do banco. Confira os campos e tente de novo.']);
            }
            Log::error('Database operation failed', ['sqlstate' => $estado]);
            return $json(400, ['detail' => 'Não conseguimos salvar agora. Tente de novo em instantes.']);
        });
    })->create();
