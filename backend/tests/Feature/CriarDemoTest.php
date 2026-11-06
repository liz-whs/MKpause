<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** Verifica o catálogo no Laravel sem escrever no banco real. */
class CriarDemoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null, 'database.connections.sqlite.host' => 'teste-local',
            'database.connections.sqlite.port' => 0, 'database.connections.sqlite.username' => 'teste']);
        DB::purge('sqlite');
        Schema::create('atividade', function (Blueprint $t) {
            $t->increments('id_atividade');
            foreach (['nome', 'tipo', 'conteudo_ou_referencia'] as $campo) $t->string($campo);
            $t->boolean('disponivel')->default(true);
            $t->dateTime('criado_em')->nullable();
            $t->dateTime('atualizado_em')->nullable();
        });
        Schema::create('usuario', function (Blueprint $t) {
            $t->increments('id_usuario');
            foreach (['nome_completo', 'email', 'senha_hash'] as $campo) $t->string($campo);
            $t->boolean('ativo');
            $t->dateTime('criado_em');
            $t->dateTime('atualizado_em');
        });
        foreach (['estudante', 'professor', 'psicologo_escolar', 'psicologo_clinico', 'administrador'] as $perfil) {
            Schema::create($perfil, function (Blueprint $t) use ($perfil) {
                $t->increments('id_'.$perfil);
                $t->unsignedInteger('id_usuario');
                foreach (['turma', 'instituicao_ensino', 'cargo', 'registro_profissional', 'estado_registro'] as $campo) $t->string($campo)->nullable();
                $t->boolean('ativo');
                $t->dateTime('criado_em');
                $t->dateTime('atualizado_em');
            });
        }
        foreach (['professor', 'psicologo_escolar', 'psicologo_clinico'] as $perfil) {
            Schema::create($perfil.'_estudante', function (Blueprint $t) use ($perfil) {
                $t->unsignedInteger('id_'.$perfil);
                $t->unsignedInteger('id_estudante');
                $t->boolean('ativo');
                $t->dateTime('criado_em');
            });
        }
    }

    public function test_cria_catalogo_com_nomes_atualizados_sem_duplicar(): void
    {
        for ($i = 0; $i < 2; $i++) $this->artisan('mkpause:criar-demo', ['--senha' => 'senha-demo-teste'])->assertSuccessful();
        $this->assertSame(4, DB::table('atividade')->count());
        $this->assertSame('Respire&Pause', DB::table('atividade')->where('tipo', 'RESPIRACAO')->value('nome'));
        $this->assertSame('MK Breath', DB::table('atividade')->where('tipo', 'VIDEO')->value('nome'));
        $this->assertSame(2, DB::table('atividade')->where('tipo', 'JOGO')->count());
        $this->assertSame(5, DB::table('usuario')->count());
    }

    public function test_renomeia_legados_preservando_ids_e_nomes_personalizados(): void
    {
        $id = DB::table('atividade')->insertGetId(['nome' => 'Respiração da chinchila', 'tipo' => 'RESPIRACAO',
            'conteudo_ou_referencia' => 'respiracao'], 'id_atividade');
        DB::table('atividade')->insert(['nome' => 'Vídeo: um minuto de calma', 'tipo' => 'VIDEO', 'conteudo_ou_referencia' => 'video']);
        $this->artisan('mkpause:criar-demo', ['--senha' => 'senha-demo-teste'])->assertSuccessful();
        $this->assertSame('Respire&Pause', DB::table('atividade')->where('id_atividade', $id)->value('nome'));
        $this->assertSame('MK Breath', DB::table('atividade')->where('tipo', 'VIDEO')->value('nome'));
        DB::table('atividade')->where('tipo', 'VIDEO')->update(['nome' => 'Vídeo da escola']);
        $this->artisan('mkpause:criar-demo', ['--senha' => 'senha-demo-teste'])->assertSuccessful();
        $this->assertSame('Vídeo da escola', DB::table('atividade')->where('tipo', 'VIDEO')->value('nome'));
        $this->assertSame(4, DB::table('atividade')->count());
    }
}
