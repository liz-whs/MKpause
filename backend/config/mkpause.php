<?php

$segredo = env('MKPAUSE_SECRET_KEY', env('DJANGO_SECRET_KEY', 'mkpause-inseguro-somente-para-desenvolvimento'));
$renderHost = env('RENDER_EXTERNAL_HOSTNAME');

$origens = array_values(array_filter(explode(',', (string) env(
    'CSRF_TRUSTED_ORIGINS', env('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')))));
if ($renderHost) {
    $origens[] = "https://{$renderHost}";
}

return [
    'segredo' => $segredo,

    'demo_habilitada' => filter_var(env('MKPAUSE_DEMO', false), FILTER_VALIDATE_BOOLEAN),
    // MVP: todas as contas em uma só escola (o nome da instituição segue como texto em cada perfil).
    // Desligue (MKPAUSE_ESCOLA_UNICA=false) para voltar a separar os dados por escola.
    'escola_unica' => filter_var(env('MKPAUSE_ESCOLA_UNICA', true), FILTER_VALIDATE_BOOLEAN),

    'debug' => filter_var(env('APP_DEBUG', env('DJANGO_DEBUG', false)), FILTER_VALIDATE_BOOLEAN),

    'diagnostico_login' => filter_var(env('MKPAUSE_DIAGNOSTICO_LOGIN', false), FILTER_VALIDATE_BOOLEAN),

    'senha_tamanho_minimo' => 8,

    'demo_senha' => env('DEMO_SENHA'),

    'cookies_seguros' => !filter_var(env('APP_DEBUG', env('DJANGO_DEBUG', false)), FILTER_VALIDATE_BOOLEAN),

    'csrf_origens_confiaveis' => $origens,

    'public_base_url' => rtrim((string) env('PUBLIC_BASE_URL', 'http://localhost:5173'), '/'),

    'interface_web' => env('MKPAUSE_INTERFACE_WEB', dirname(__DIR__, 2).'/src/web/dist'),

    'limites' => ['cadastro' => 10, 'vinculo' => 10, 'login' => 10, 'login-ip' => 120],

    'email' => [
        'modo' => str_contains((string) env('EMAIL_BACKEND', 'filebased'), 'smtp') ? 'smtp' : 'arquivo',
        'pasta' => env('EMAIL_FILE_PATH', dirname(__DIR__).'/.emails'),
        'host' => env('EMAIL_HOST', ''),
        'porta' => (int) env('EMAIL_PORT', '587'),
        'usuario' => env('EMAIL_HOST_USER', ''),
        'senha' => env('EMAIL_HOST_PASSWORD', ''),
        'tls' => env('EMAIL_USE_TLS', '1') === '1',
        'ssl' => env('EMAIL_USE_SSL', '0') === '1',
        'remetente' => env('DEFAULT_FROM_EMAIL', 'mkpause <nao-responda@mkpause.local>'),
        'envio_automatico' => env('EMAIL_ENVIO_AUTOMATICO', '0') === '1',
    ],
];
