<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        if ($this->app->environment('testing')) return;
        \App\Mkpause\ConfiguracaoSegura::exigir(config('mkpause.segredo'), config('session.driver'));
        if ($this->app->environment('production') && config('app.debug')) throw new \RuntimeException('Desabilite APP_DEBUG em produção.');
        if (str_contains((string) env('TRUSTED_PROXIES', ''), '*')) throw new \RuntimeException('Informe somente proxies controlados em TRUSTED_PROXIES.');
    }
}
