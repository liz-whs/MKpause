<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function withSession(array $data)
    {
        if (isset($data['id_usuario']) && !array_key_exists('credencial', $data)) {
            $conta = \App\Mkpause\Conta::carregar($data['id_usuario']);
            if ($conta) $data['credencial'] = \App\Http\Middleware\Autenticar::credencial($conta);
        }
        return parent::withSession($data);
    }
}
