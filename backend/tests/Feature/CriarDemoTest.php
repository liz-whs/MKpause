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
        config(['mkpause.demo_habilitada' => true]);
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null, 'database.connections.sqlite.host' => 'teste-local',
            'database.connections.sqlite.port' => 0, 'database.connections.sqlite.username' => 'teste']);
        DB::purge('sqlite');
        Schema::create('escola', function (Blueprint $t) { $t->increments('id_escola'); $t->string('nome')->unique(); });
        DB::table('escola')->insert(['id_escola' => 1, 'nome' => 'Escola Modelo']);
        Schema::create('atividade', function (Blueprint $t) {
            $t->increments('id_atividade'); $t->integer('id_escola')->default(1);
            foreach (['nome', 'tipo', 'conteudo_ou_referencia'] as $campo) $t->string($campo);
            $t->boolean('disponivel')->default(true);
            $t->dateTime('criado_em')->nullable();
            $t->dateTime('atualizado_em')->nullable();
        });
        Schema::create('usuario', function (Blueprint $t) {
            $t->increments('id_usuario'); $t->integer('id_escola')->nullable();
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
        $this->assertSame(7, DB::table('atividade')->count());
        $this->assertSame('respire & pause', DB::table('atividade')->where('tipo', 'RESPIRACAO')->value('nome'));
        $this->assertSame('mk breath', DB::table('atividade')->where('conteudo_ou_referencia', 'video')->value('nome'));
        $this->assertSame(3, DB::table('atividade')->where('tipo', 'JOGO')->count());
        $this->assertSame(5, DB::table('usuario')->count());
    }

    public function test_renomeia_legados_preservando_ids_e_nomes_personalizados(): void
    {
        $id = DB::table('atividade')->insertGetId(['nome' => 'Respiração da chinchila', 'tipo' => 'RESPIRACAO',
            'conteudo_ou_referencia' => 'respiracao'], 'id_atividade');
        DB::table('atividade')->insert(['nome' => 'Vídeo: um minuto de calma', 'tipo' => 'VIDEO', 'conteudo_ou_referencia' => 'video']);
        $this->artisan('mkpause:criar-demo', ['--senha' => 'senha-demo-teste'])->assertSuccessful();
        $this->assertSame('respire & pause', DB::table('atividade')->where('id_atividade', $id)->value('nome'));
        $this->assertSame('mk breath', DB::table('atividade')->where('conteudo_ou_referencia', 'video')->value('nome'));
        DB::table('atividade')->where('conteudo_ou_referencia', 'video')->update(['nome' => 'Vídeo da escola']);
        $this->artisan('mkpause:criar-demo', ['--senha' => 'senha-demo-teste'])->assertSuccessful();
        $this->assertSame('Vídeo da escola', DB::table('atividade')->where('conteudo_ou_referencia', 'video')->value('nome'));
        $this->assertSame(7, DB::table('atividade')->count());
    }

    public function test_sincroniza_catalogo_sem_criar_contas_nem_reativar_atividade_oculta(): void
    {
        $this->artisan('mkpause:sincronizar-atividades')->assertSuccessful();
        $this->assertSame(7, DB::table('atividade')->count());
        $this->assertSame(0, DB::table('usuario')->count());
        DB::table('atividade')->where('nome', 'mk connection')->update(['disponivel' => false]);
        $this->artisan('mkpause:sincronizar-atividades')->assertSuccessful();
        $this->assertSame(7, DB::table('atividade')->count());
        $this->assertFalse((bool) DB::table('atividade')->where('nome', 'mk connection')->value('disponivel'));
        $this->assertSame(3, DB::table('atividade')->where('tipo', 'VIDEO')->count());
    }
    public function test_renomeia_os_sete_nomes_sem_mudar_ids_ou_disponibilidade(): void
    {
        $antigos = ['Respire&Pause', 'PianoPause', 'MK Potion', 'MKconnection', 'MK Breath', 'Respiração em espiral', 'Respiração com a chinchila'];
        $ids = [];
        foreach (\App\Mkpause\CatalogoAtividades::ITENS as $i => [$nome, $tipo, $ref]) {
            $ids[] = DB::table('atividade')->insertGetId(['nome' => $antigos[$i], 'tipo' => $tipo, 'conteudo_ou_referencia' => $ref, 'disponivel' => false]);
        }
        \App\Mkpause\CatalogoAtividades::sincronizar();
        $this->assertSame(7, DB::table('atividade')->count());
        foreach (\App\Mkpause\CatalogoAtividades::ITENS as $i => [$nome]) {
            $item = DB::table('atividade')->where('id_atividade', $ids[$i])->first();
            $this->assertSame($nome, $item->nome);
            $this->assertFalse((bool) $item->disponivel);
        }
    }

}
