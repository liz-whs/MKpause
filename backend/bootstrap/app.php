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

// Mesmo esquema de variáveis do backend anterior: backend/.env e, por cima do que faltar,
// o .env.local da raiz do repositório (onde o `neon deploy` grava DATABASE_URL).
// As variáveis do processo (Render, Docker, terminal) sempre vencem os arquivos. Lê também por
// getenv(): com variables_order = "GPCS" (XAMPP, php.ini de produção) elas não aparecem em $_ENV.
$ambiente = Dotenv\Repository\RepositoryBuilder::createWithNoAdapters()
    ->addAdapter(Dotenv\Repository\Adapter\PutenvAdapter::class)
    ->addAdapter(Dotenv\Repository\Adapter\EnvConstAdapter::class)
    ->addAdapter(Dotenv\Repository\Adapter\ServerConstAdapter::class)
    ->immutable()->make();
foreach ([dirname(__DIR__), dirname(__DIR__, 2)] as $i => $pasta) {
    Dotenv\Dotenv::create($ambiente, $pasta, $i === 0 ? '.env' : '.env.local')->safeLoad();
}

$json = fn (int $status, array $corpo, array $cabecalhos = []) => response()->json(
    $corpo, $status, $cabecalhos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // A sessão é um cookie (como o Django); o csrftoken precisa ser legível pelo JavaScript.
        $middleware->encryptCookies(except: [Csrf::COOKIE]);
        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
        ]);
        $middleware->alias(['conta' => Autenticar::class]);
        $middleware->trustProxies(at: '*'); // o Render termina o HTTPS antes
    })
    ->withExceptions(function (Exceptions $exceptions) use ($json): void {
        // Respostas previstas da API (400, 401, 403...): não são falhas do servidor, não vão para o log.
        $exceptions->dontReport([ErroApi::class]);
        $exceptions->render(fn (ErroApi $e) => $json($e->status, $e->corpo, $e->cabecalhos));

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) use ($json) {
            return $json(405, ['detail' => "Método \"{$request->getMethod()}\" não é permitido."]);
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($json) {
            return $request->is('api/*') ? $json(404, ['detail' => 'Não encontrado.']) : null;
        });

        // Restrições e gatilhos do PostgreSQL viram mensagens compreensíveis, sem detalhes do banco.
        $exceptions->render(function (QueryException $e) use ($json) {
            $estado = (string) ($e->errorInfo[0] ?? $e->getCode());
            if (str_starts_with($estado, '23')) {
                Log::warning('IntegrityError: '.$e->getMessage());
                return $json(409, ['detail' => 'Não conseguimos salvar: os dados conflitam com um registro existente '
                    .'ou com uma regra do banco. Confira os campos e tente de novo.']);
            }
            Log::error('DatabaseError: '.$e->getMessage());
            return $json(400, ['detail' => 'Não conseguimos salvar agora. Tente de novo em instantes.']);
        });
    })->create();
