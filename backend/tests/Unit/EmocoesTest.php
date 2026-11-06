<?php

namespace Tests\Unit;

use App\Http\Controllers\SessoesController;
use PHPUnit\Framework\TestCase;

class EmocoesTest extends TestCase
{
    public function test_aceita_exatamente_as_seis_emocoes_da_interface(): void
    {
        self::assertSame(
            ['feliz', 'calmo', 'ansioso', 'triste', 'irritado', 'cansado'],
            SessoesController::EMOCOES
        );
    }

    public function test_emocoes_dificeis_sugerem_nivel_dois_sem_gerar_nivel_tres(): void
    {
        foreach (SessoesController::EMOCOES as $emocao) {
            $nivel = SessoesController::avaliarHumor($emocao);
            self::assertSame(
                in_array($emocao, ['ansioso', 'triste', 'irritado'], true) ? 2 : 1,
                $nivel
            );
            self::assertNotSame(3, $nivel);
        }
    }
}
