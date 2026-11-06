<?php

use Illuminate\Support\Str;

return [

    'driver' => env('SESSION_DRIVER', 'cookie'),

    'lifetime' => (int) env('SESSION_LIFETIME', 480),

    'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),

    'encrypt' => env('SESSION_ENCRYPT', false),

    'files' => storage_path('framework/sessions'),

    'connection' => env('SESSION_CONNECTION'),

    'table' => env('SESSION_TABLE', 'sessions'),

    'store' => env('SESSION_STORE'),

    'lottery' => [2, 100],

    'cookie' => env('SESSION_COOKIE', 'sessionid'),

    'path' => env('SESSION_PATH', '/'),

    'domain' => env('SESSION_DOMAIN'),

    'secure' => env('SESSION_SECURE_COOKIE', !filter_var(env('APP_DEBUG', false), FILTER_VALIDATE_BOOLEAN)),

    'http_only' => env('SESSION_HTTP_ONLY', true),

    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    'partitioned' => env('SESSION_PARTITIONED_COOKIE', false),

];
