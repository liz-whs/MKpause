<?php

namespace Tests\Unit;

use App\Mkpause\SenhaPbkdf2;
use PHPUnit\Framework\TestCase;

class CredenciaisTest extends TestCase
{
    public function test_hash_tem_sal_unico_e_valida_somente_a_senha_correta(): void
    {
        $senha = 'Senha de teste 123!';
        $a = SenhaPbkdf2::criar($senha);
        $b = SenhaPbkdf2::criar($senha);
        $this->assertNotSame($senha, $a);
        $this->assertNotSame($a, $b);
        $this->assertStringStartsWith('pbkdf2_sha256$1200000$', $a);
        $this->assertTrue(SenhaPbkdf2::conferir($senha, $a));
        $this->assertFalse(SenhaPbkdf2::conferir('Senha incorreta', $a));
        $this->assertFalse(SenhaPbkdf2::conferir($senha, SenhaPbkdf2::criar(null)));
    }

    public function test_hash_legado_continua_valido_e_hash_invalido_e_recusado(): void
    {
        $hash = 'pbkdf2_sha256$1000$salLegado$'.base64_encode(hash_pbkdf2('sha256', 'senha legada', 'salLegado', 1000, 32, true));
        $this->assertTrue(SenhaPbkdf2::conferir('senha legada', $hash));
        foreach ([null, '', 'texto puro', 'pbkdf2_sha256$0$sal$hash', 'pbkdf2_sha256$9999999999$sal$hash'] as $invalido) {
            $this->assertFalse(SenhaPbkdf2::conferir('senha', $invalido));
        }
    }
}
