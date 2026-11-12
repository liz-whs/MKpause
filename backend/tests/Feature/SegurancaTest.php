<?php

namespace Tests\Feature;

use App\Mkpause\Codigos;
use App\Mkpause\ConfiguracaoSegura;
use App\Mkpause\Conta;
use App\Mkpause\SenhaPbkdf2;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SegurancaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null, 'cache.default' => 'array']);
        DB::purge('sqlite');
        Cache::flush();
        DB::statement('CREATE TABLE usuario (id_escola INTEGER DEFAULT 1, id_usuario INTEGER PRIMARY KEY, nome_completo TEXT, email TEXT, senha_hash TEXT, ativo BOOLEAN)');
        foreach (Conta::TABELAS as $perfil => [$tabela, $chave]) {
            DB::statement("CREATE TABLE {$tabela} ({$chave} INTEGER PRIMARY KEY, id_usuario INTEGER, ativo BOOLEAN)");
        }
        DB::statement('CREATE TABLE psicologo_clinico_estudante (id_psicologo_clinico INTEGER, id_estudante INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE psicologo_escolar_estudante (id_psicologo_escolar INTEGER, id_estudante INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE ficha_acompanhamento (id_ficha INTEGER PRIMARY KEY, id_estudante INTEGER, informacoes_acompanhamento TEXT, ativo BOOLEAN, criada_em TEXT, atualizada_em TEXT)');
        static $hash;
        $hash ??= SenhaPbkdf2::criar('Senha teste 123!');
        foreach ([1 => 'estudante', 2 => 'psicologo_clinico', 3 => 'administrador', 4 => 'professor', 5 => 'psicologo_escolar', 6 => 'psicologo_clinico'] as $id => $perfil) {
            DB::table('usuario')->insert(['id_usuario' => $id, 'nome_completo' => 'Conta '.$id, 'email' => "conta{$id}@teste.br", 'senha_hash' => $hash, 'ativo' => true]);
            DB::table($perfil)->insert(['id_'.$perfil => $id, 'id_usuario' => $id, 'ativo' => true]);
        }
        DB::table('psicologo_clinico_estudante')->insert(['id_psicologo_clinico' => 2, 'id_estudante' => 1, 'ativo' => true]);
        DB::table('psicologo_escolar_estudante')->insert(['id_psicologo_escolar' => 5, 'id_estudante' => 1, 'ativo' => true]);
        DB::table('ficha_acompanhamento')->insert(['id_ficha' => 1, 'id_estudante' => 1, 'ativo' => true,
            'criada_em' => '2026-11-06 12:00:00', 'atualizada_em' => '2026-11-06 12:00:00',
            'informacoes_acompanhamento' => json_encode(['encaminhamento' => 'Legado', 'registros' => [
                ['autorId' => 'u-2', 'em' => '2026-11-01T12:00:00Z', 'texto' => 'Anterior'],
            ]])]);
    }

    private function preparar(): void
    {
        DB::table('usuario')->insert(['id_usuario' => 7, 'nome_completo' => 'Outro estudante', 'email' => 'outro@teste.br', 'id_escola' => 2, 'ativo' => true]);
        DB::table('estudante')->insert(['id_estudante' => 7, 'id_usuario' => 7, 'ativo' => true]);
        DB::statement('ALTER TABLE estudante ADD COLUMN instituicao_ensino TEXT');
        DB::statement('ALTER TABLE estudante ADD COLUMN turma TEXT');
        DB::statement('CREATE TABLE professor_estudante (id_professor INTEGER,id_estudante INTEGER,ativo BOOLEAN)');
        DB::table('professor_estudante')->insert(['id_professor' => 4, 'id_estudante' => 1, 'ativo' => true]);
        DB::statement('CREATE TABLE atividade (id_escola INTEGER DEFAULT 1, id_atividade INTEGER PRIMARY KEY,nome TEXT,descricao TEXT,tipo TEXT,conteudo_ou_referencia TEXT,disponivel BOOLEAN,criado_em TEXT,atualizado_em TEXT)');
        DB::statement('CREATE TABLE sessao (id_sessao INTEGER PRIMARY KEY,id_estudante INTEGER,id_atividade INTEGER,iniciada_em TEXT,terminada_em TEXT,nivel_avaliado INTEGER,duracao_segundos INTEGER,observacoes_sessao TEXT,status TEXT)');
        DB::statement('CREATE TABLE registro_humor (id_registro_humor INTEGER PRIMARY KEY,id_sessao INTEGER,estado INTEGER,emocao TEXT,momento TEXT,registrado_em TEXT)');
        DB::table('atividade')->insert(['id_atividade' => 1, 'nome' => 'Teste', 'tipo' => 'RESPIRACAO', 'disponivel' => true]);
        foreach ([1, 7] as $id) {
            DB::table('sessao')->insert(['id_sessao' => $id, 'id_estudante' => $id, 'id_atividade' => 1, 'iniciada_em' => '2026-11-06 12:00:00', 'status' => 'EM_ANDAMENTO']);
            DB::table('registro_humor')->insert(['id_sessao' => $id, 'emocao' => 'ansioso', 'momento' => 'PRE', 'registrado_em' => '2026-11-06 12:00:00']);
        }
        $token = str_repeat('a', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
    }

    public function test_alerta_nivel_3_nao_pode_ser_cancelado_por_nenhum_perfil(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE alerta (id_alerta INTEGER PRIMARY KEY, id_estudante INTEGER, nivel INTEGER, status TEXT, criado_em TEXT)');
        DB::statement('CREATE TABLE destinatario_alerta (id_alerta INTEGER, id_usuario INTEGER)');
        DB::table('alerta')->insert(['id_alerta' => 1, 'id_estudante' => 1, 'nivel' => 3, 'status' => 'ABERTO']);
        foreach ([4, 5] as $id) {
            DB::table('destinatario_alerta')->insert(['id_alerta' => 1, 'id_usuario' => $id]);
        }
        foreach ([1, 3, 4, 5] as $usuario) {
            $this->withSession(['id_usuario' => $usuario])->patchJson('/api/alertas/1', ['status' => 'CANCELADO'])
                ->assertForbidden()->assertJsonPath('detail', 'Alertas de nível 3 não podem ser cancelados.');
            $this->assertSame('ABERTO', DB::table('alerta')->where('id_alerta', 1)->value('status'));
            $this->assertSame(2, DB::table('destinatario_alerta')->count());
        }
    }

    public function test_volta_para_a_sala_guarda_o_horario_em_que_o_aviso_terminou(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE alerta (id_alerta INTEGER PRIMARY KEY, id_estudante INTEGER, id_sessao INTEGER, nivel INTEGER, status TEXT, criado_em TEXT, descricao TEXT, finalizado_em TEXT)');
        DB::statement('CREATE TABLE destinatario_alerta (id_destinatario_alerta INTEGER PRIMARY KEY, id_alerta INTEGER, id_usuario INTEGER, tipo_destinatario TEXT, status_notificacao TEXT, enviado_em TEXT, lido_em TEXT)');
        DB::table('alerta')->insert(['id_alerta' => 1, 'id_estudante' => 1, 'nivel' => 2, 'status' => 'ABERTO', 'criado_em' => '2026-11-06 12:00:00']);
        DB::table('destinatario_alerta')->insert(['id_alerta' => 1, 'id_usuario' => 4, 'tipo_destinatario' => 'PROFESSOR', 'status_notificacao' => 'PENDENTE']);

        $this->travelTo(new \DateTimeImmutable('2026-11-06 12:25:00', new \DateTimeZone('America/Sao_Paulo')));
        $resposta = $this->withSession(['id_usuario' => 1])->patchJson('/api/alertas/1', ['status' => 'CANCELADO'])->assertOk();

        $this->assertNotNull(DB::table('alerta')->where('id_alerta', 1)->value('finalizado_em'));
        $this->assertNotSame($resposta->json('criado_em'), $resposta->json('finalizado_em'));
        $this->assertStringContainsString('12:25', $resposta->json('finalizado_em'));
        $this->withSession(['id_usuario' => 4])->getJson('/api/alertas')->assertOk()
            ->assertJsonPath('0.finalizado_em', $resposta->json('finalizado_em'));
    }

    public function test_alerta_repetido_reaproveita_o_aberto_sem_novos_emails(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE alerta (id_alerta INTEGER PRIMARY KEY, id_estudante INTEGER, id_sessao INTEGER, nivel INTEGER, status TEXT, criado_em TEXT, descricao TEXT, finalizado_em TEXT)');
        DB::statement('CREATE TABLE destinatario_alerta (id_destinatario_alerta INTEGER PRIMARY KEY, id_alerta INTEGER, id_usuario INTEGER, tipo_destinatario TEXT, status_notificacao TEXT, enviado_em TEXT, lido_em TEXT)');
        DB::statement('CREATE TABLE notificacao_email (id INTEGER PRIMARY KEY, id_destinatario_alerta INTEGER, email_destino TEXT, status TEXT, tentativas INTEGER, criado_em TEXT, disponivel_em TEXT)');
        DB::statement('ALTER TABLE usuario ADD COLUMN telefone TEXT');
        config(['mkpause.email.envio_automatico' => false]);
        $this->withSession(['id_usuario' => 1]);
        foreach ([3, 2] as $nivel) {
            $primeiro = $this->postJson('/api/alertas', ['nivel' => $nivel])->assertCreated()->json('alerta.id_alerta');
            $emails = DB::table('notificacao_email')->count();
            $this->postJson('/api/alertas', ['nivel' => $nivel])->assertOk()
                ->assertJsonPath('alerta.id_alerta', $primeiro)->assertJsonPath('repetido', true);
            $this->assertSame($emails, DB::table('notificacao_email')->count());
            $this->assertSame(1, DB::table('alerta')->where('nivel', $nivel)->count());
        }
        // Depois do retorno, uma nova saída gera um novo aviso.
        $this->patchJson('/api/alertas/'.DB::table('alerta')->where('nivel', 2)->value('id_alerta'), ['status' => 'CANCELADO'])->assertOk();
        $this->postJson('/api/alertas', ['nivel' => 2])->assertCreated();
        $this->assertSame(2, DB::table('alerta')->where('nivel', 2)->count());
    }

    public function test_professor_registra_observacao_de_estudante_sem_alerta(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE observacao (id_observacao INTEGER PRIMARY KEY, id_alerta INTEGER, id_estudante INTEGER, id_autor INTEGER, conteudo TEXT, criado_em TEXT, atualizado_em TEXT)');
        $this->withSession(['id_usuario' => 4])->postJson('/api/estudantes/1/observacoes', ['conteudo' => 'Conversamos no intervalo.'])
            ->assertCreated()->assertJsonPath('alerta', null)->assertJsonPath('estudante', 1);
        $this->getJson('/api/estudantes/1/observacoes')->assertOk()
            ->assertJsonPath('0.conteudo', 'Conversamos no intervalo.')->assertJsonPath('0.papel_autor', 'professor');
        $this->withSession(['id_usuario' => 5])->getJson('/api/estudantes/1/observacoes')->assertOk()->assertJsonCount(1);
        // Sem vínculo, não registra; o estudante também não usa esta rota.
        $this->withSession(['id_usuario' => 4])->postJson('/api/estudantes/7/observacoes', ['conteudo' => 'x'])->assertForbidden();
        $this->withSession(['id_usuario' => 1])->postJson('/api/estudantes/1/observacoes', ['conteudo' => 'x'])->assertForbidden();
    }

    public function test_auditoria_idor_sessoes_e_fichas_e_listas(): void
    {
        $this->preparar();
        foreach ([2, 5] as $user) {
            $this->withSession(['id_usuario' => $user])->getJson('/api/sessoes?estudante=1')->assertOk()->assertJsonCount(1);
            $this->getJson('/api/sessoes?estudante=7')->assertForbidden();
            $this->getJson('/api/sessoes/7')->assertForbidden();
            $this->getJson('/api/estudantes/7/ficha')->assertForbidden();
        }
        foreach ([2, 4, 5] as $user) {
            $this->withSession(['id_usuario' => $user])->getJson('/api/estudantes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id_estudante', 1);
            $this->getJson('/api/estudantes/7')->assertNotFound();
        }
        $this->withSession(['id_usuario' => 6])->getJson('/api/estudantes')->assertOk()->assertExactJson([]);
        $this->getJson('/api/estudantes/1/ficha')->assertForbidden();
        $this->getJson('/api/estudantes/1/dashboard')->assertForbidden();
        foreach ([1, 3, 4, 7] as $user) {
            $this->withSession(['id_usuario' => $user])->getJson('/api/sessoes/1')->assertForbidden();
        }
    }

    public function test_auditoria_estudante_nao_encerra_sessao_alheia(): void
    {
        $this->preparar();
        $this->withSession(['id_usuario' => 7])->postJson('/api/sessoes/1/concluir', ['humor_pos' => 'calmo'])->assertNotFound();
        $this->postJson('/api/sessoes/1/cancelar')->assertNotFound();
        $this->assertSame('EM_ANDAMENTO', DB::table('sessao')->where('id_sessao', 1)->value('status'));
        $this->assertSame(2, DB::table('registro_humor')->count());
    }

    public function test_auditoria_autoria_humor_nao_pode_ser_forjada(): void
    {
        $this->preparar();
        $r = $this->withSession(['id_usuario' => 1])->postJson('/api/sessoes', ['id_atividade' => 1, 'humor_pre' => 'ansioso', 'id_estudante' => 7, 'estudante' => 7, 'iniciada_em' => '1900-01-01', 'status' => 'CONCLUIDA'])->assertCreated();
        $r->assertJsonPath('sessao.estudante', 1)->assertJsonPath('sessao.status', 'EM_ANDAMENTO');
        $this->assertStringNotContainsString('1900', $r->json('sessao.iniciada_em'));
    }

    public function test_auditoria_alterar_senha_revoga_sessao_existente(): void
    {
        $this->preparar();
        $this->withSession(['id_usuario' => 2])->getJson('/api/auth/eu')->assertOk();
        DB::table('usuario')->where('id_usuario', 2)->update(['senha_hash' => SenhaPbkdf2::criar('Nova senha diferente 123!')]);
        // Uma troca de senha invalida a credencial de sessões anteriores.
        $this->getJson('/api/auth/eu')->assertUnauthorized();
    }

    public function test_auditoria_isolamento_por_escola_para_administrador(): void
    {
        $this->preparar();
        DB::table('estudante')->where('id_estudante', 1)->update(['instituicao_ensino' => 'Escola A']);
        DB::table('estudante')->where('id_estudante', 7)->update(['instituicao_ensino' => 'Escola B']);
        $this->withSession(['id_usuario' => 3])->getJson('/api/estudantes')->assertOk()->assertJsonCount(1);
    }

    public function test_cabecalho_do_cliente_nao_define_ip_sem_proxy_confiavel(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1']);
        $this->app['router']->get('/api/auditoria-ip', fn (Request $r) => response()->json(['ip' => $r->ip()]));
        $this->withHeader('X-Forwarded-For', '198.51.100.42')->getJson('/api/auditoria-ip')->assertOk()->assertJsonPath('ip', '127.0.0.1');
    }

    public function test_auditoria_rate_limit_ip_nao_pode_ser_contornado_por_header(): void
    {
        $this->preparar();
        config(['mkpause.limites.login-ip' => 1]);
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1']);
        $body = ['email' => 'inexistente@teste.br', 'senha' => 'senha incorreta'];
        $this->withHeader('X-Forwarded-For', '198.51.100.51')->postJson('/api/auth/login', $body)->assertUnauthorized();
        $this->postJson('/api/auth/login', $body)->assertStatus(429);
        $this->withHeader('X-Forwarded-For', '198.51.100.52')->postJson('/api/auth/login', $body)->assertStatus(429);
    }

    public function test_demo_desligada_bloqueia_conta_e_sessao_ja_existentes(): void
    {
        DB::table('usuario')->where('id_usuario', 3)->update(['email' => 'admin.demo@mkpause.dev']);
        config(['mkpause.demo_habilitada' => true]);
        $this->withSession(['id_usuario' => 3]);
        config(['mkpause.demo_habilitada' => false]);
        $this->getJson('/api/auth/eu')->assertUnauthorized();
        $this->assertNull(Conta::carregar(3));
        $this->artisan('mkpause:criar-demo')->assertFailed();
    }

    public function test_sem_escola_nao_acessa_cadastros(): void
    {
        DB::table('usuario')->where('id_usuario', 3)->update(['id_escola' => null]);
        $this->withSession(['id_usuario' => 3])->getJson('/api/admin/estudantes')->assertForbidden();
    }

    private function prepararEscolaUnica(): void
    {
        config(['mkpause.escola_unica' => true]);
        DB::statement('CREATE TABLE escola (id_escola INTEGER PRIMARY KEY, nome TEXT UNIQUE)');
        DB::table('escola')->insert([['id_escola' => 1, 'nome' => 'Principal'], ['id_escola' => 2, 'nome' => 'Outra']]);
        DB::statement('CREATE TABLE codigo_cadastro (id_codigo_cadastro INTEGER PRIMARY KEY, id_escola INTEGER)');
        DB::table('codigo_cadastro')->insert([['id_codigo_cadastro' => 1, 'id_escola' => null], ['id_codigo_cadastro' => 2, 'id_escola' => 2]]);
        DB::statement('CREATE TABLE atividade (id_escola INTEGER, id_atividade INTEGER PRIMARY KEY, nome TEXT, descricao TEXT, tipo TEXT, conteudo_ou_referencia TEXT, disponivel BOOLEAN, criado_em TEXT, atualizado_em TEXT)');
        $token = str_repeat('a', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
    }

    public function test_escola_unica_conta_antiga_sem_escola_entra_e_acessa(): void
    {
        $this->prepararEscolaUnica();
        // Conta criada antes da V7: sem escola (ex.: estudante do Marista).
        DB::table('usuario')->where('id_usuario', 3)->update(['id_escola' => null]);
        $this->postJson('/api/auth/login', ['email' => 'conta3@teste.br', 'senha' => 'Senha teste 123!'])->assertOk();
        $this->assertSame(1, (int) DB::table('usuario')->where('id_usuario', 3)->value('id_escola'));
        // Rota que exige escola definida: antes dava "Sua conta ainda não tem escola definida".
        $this->getJson('/api/atividades')->assertOk();
    }

    public function test_escola_unica_comando_reune_contas_e_codigos_e_pode_repetir(): void
    {
        $this->prepararEscolaUnica();
        DB::table('usuario')->where('id_usuario', 2)->update(['id_escola' => null]);
        DB::table('usuario')->where('id_usuario', 4)->update(['id_escola' => 2]);
        $this->artisan('mkpause:escola-unica')->assertSuccessful();
        $this->assertSame([1], DB::table('usuario')->distinct()->pluck('id_escola')->map(fn ($i) => (int) $i)->all());
        $this->assertSame([1], DB::table('codigo_cadastro')->distinct()->pluck('id_escola')->map(fn ($i) => (int) $i)->all());
        $this->assertSame(count(\App\Mkpause\CatalogoAtividades::ITENS), DB::table('atividade')->where('id_escola', 1)->count());
        $this->artisan('mkpause:escola-unica')->expectsOutputToContain('Contas movidas: 0')->assertSuccessful();
    }

    public function test_escola_unica_desligada_mantem_separacao(): void
    {
        config(['mkpause.escola_unica' => false]);
        DB::table('usuario')->where('id_usuario', 4)->update(['id_escola' => 2]);
        $this->artisan('mkpause:escola-unica')->assertSuccessful();
        $this->assertSame(2, (int) DB::table('usuario')->where('id_usuario', 4)->value('id_escola'));
    }

    public function test_mudanca_de_escola_invalida_sessao(): void
    {
        $this->withSession(['id_usuario' => 2]);
        DB::table('usuario')->where('id_usuario', 2)->update(['id_escola' => 2]);
        $this->getJson('/api/auth/eu')->assertUnauthorized();
    }

    public function test_cookie_antigo_nao_le_sessao_destruida_no_banco(): void
    {
        DB::statement('CREATE TABLE sessions (id TEXT PRIMARY KEY,user_id INTEGER,ip_address TEXT,user_agent TEXT,payload TEXT,last_activity INTEGER)');
        $store = app('session')->driver('database');
        $store->start();
        $store->put('id_usuario', 2);
        $id = $store->getId();
        $store->save();
        $this->assertTrue(DB::table('sessions')->where('id', $id)->exists());
        $store->invalidate();
        $this->assertFalse(DB::table('sessions')->where('id', $id)->exists());
        $this->assertSame('', $store->getHandler()->read($id));
    }

    public function test_configuracoes_inseguras_sao_recusadas(): void
    {
        foreach ([[null, 'database'], ['', 'database'], ['mkpause-inseguro-somente-para-desenvolvimento', 'database'], [str_repeat('a', 40), 'cookie']] as [$key,$driver]) {
            try {
                ConfiguracaoSegura::exigir($key, $driver);
                $this->fail('Configuração insegura.');
            } catch (\RuntimeException $e) {
                $this->assertNotEmpty($e->getMessage());
            }
        }
        ConfiguracaoSegura::exigir(str_repeat('a', 40), 'database');
        $this->addToAssertionCount(1);
    }

    public function test_cuidados_sao_restritos_a_conta_atual_e_data_do_servidor(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-08T01:00:00Z'));
        $this->preparar();
        DB::statement('CREATE TABLE cuidado_estudante (id_estudante INTEGER,dia TEXT,cuidado TEXT,PRIMARY KEY(id_estudante,dia,cuidado))');
        DB::table('cuidado_estudante')->insert(['id_estudante' => 7, 'dia' => '2026-11-01', 'cuidado' => 'agua']);
        $this->withSession(['id_usuario' => 1])->getJson('/api/cuidados')->assertOk()->assertExactJson([]);
        $this->postJson('/api/cuidados', ['id_estudante' => 7, 'cuidado' => 'agua', 'feito' => true])->assertForbidden();
        $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => 'agua', 'feito' => true, 'dia' => '1900-01-01'])->assertOk();
        $this->assertSame('2026-11-07', DB::table('cuidado_estudante')->where('id_estudante', 1)->value('dia'));
        $corpo = ['id_estudante' => 1, 'cuidado' => 'agua', 'feito' => true];
        $this->postJson('/api/cuidados', $corpo)->assertOk();
        $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => 'agua', 'feito' => false])->assertStatus(400);
        $this->assertSame(1, DB::table('cuidado_estudante')->where('id_estudante', 1)->count());
        // Sábado, domingo e segunda recebem suas próprias conclusões.
        $this->travel(1)->days();
        $this->postJson('/api/cuidados', $corpo)->assertOk();
        $this->assertSame(1, DB::table('cuidado_estudante')->where('id_estudante', 1)->where('dia', '2026-11-08')->count());
        $this->travel(1)->days();
        $this->postJson('/api/cuidados', $corpo)->assertOk();
        $this->assertSame(1, DB::table('cuidado_estudante')->where('id_estudante', 1)->where('dia', '2026-11-09')->count());

        $this->withSession(['id_usuario' => 3])->getJson('/api/cuidados')->assertForbidden();
    }

    public function test_admin_nao_altera_cadastro_ficha_ou_vinculo_de_outra_escola(): void
    {
        $this->preparar();
        DB::statement('ALTER TABLE estudante ADD COLUMN data_nascimento TEXT');
        DB::statement('ALTER TABLE estudante ADD COLUMN telefone TEXT');
        DB::statement('ALTER TABLE estudante ADD COLUMN criado_em TEXT');
        $this->withSession(['id_usuario' => 3])->getJson('/api/admin/estudantes')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/admin/estudantes/7')->assertNotFound();
        $this->patchJson('/api/admin/estudantes/7', ['nome_completo' => 'Invadido'])->assertNotFound();
        $this->deleteJson('/api/admin/estudantes/7')->assertNotFound();
        $this->postJson('/api/estudantes/7/ficha', [])->assertNotFound();
        $this->postJson('/api/admin/vinculos/professores', ['professor' => 4, 'estudante' => 7])->assertNotFound();
    }

    public function test_atividades_nao_cruzam_escolas(): void
    {
        $this->preparar();
        DB::table('atividade')->insert(['id_atividade' => 2, 'id_escola' => 2, 'nome' => 'Outra', 'tipo' => 'RESPIRACAO', 'disponivel' => true]);
        $this->withSession(['id_usuario' => 3])->getJson('/api/atividades')->assertOk()->assertJsonCount(1);
        $this->patchJson('/api/atividades/2', ['disponivel' => false])->assertNotFound();
        $this->withSession(['id_usuario' => 1])->postJson('/api/sessoes', ['id_atividade' => 2, 'humor_pre' => 'calmo'])->assertStatus(400);
    }

    public function test_erro_sql_nao_vaza_valores_na_resposta_nem_nos_logs(): void
    {
        Log::spy();
        $this->app['router']->get('/api/teste-log-seguro', function () {
            throw new QueryException('sqlite', 'INSERT INTO ficha_acompanhamento VALUES (?)', ['CONTEUDO-SIGILOSO'], new \PDOException('CONTEUDO-SIGILOSO'));
        });
        $r = $this->getJson('/api/teste-log-seguro')->assertStatus(400);
        $this->assertStringNotContainsString('CONTEUDO-SIGILOSO', $r->getContent());
        Log::shouldHaveReceived('error')->once()->with('Database operation failed', \Mockery::on(fn ($context) => ! str_contains(json_encode($context), 'CONTEUDO-SIGILOSO')));
    }

    public function test_codigo_cadastro_de_outra_escola_nao_pode_ser_revogado(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE codigo_cadastro (id_codigo_cadastro INTEGER PRIMARY KEY,id_escola INTEGER,revogado_em TEXT)');
        DB::table('codigo_cadastro')->insert(['id_codigo_cadastro' => 2, 'id_escola' => 2]);
        $this->withSession(['id_usuario' => 3])->postJson('/api/admin/codigos-cadastro/2/revogar')->assertNotFound();
        $this->assertNull(DB::table('codigo_cadastro')->where('id_codigo_cadastro', 2)->value('revogado_em'));
    }

    public function test_avisos_de_outra_escola_nao_sao_lidos_ou_editados(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE aviso (id_aviso INTEGER PRIMARY KEY,id_autor INTEGER,titulo TEXT,conteudo TEXT,publico_destinatario TEXT,ativo BOOLEAN,publicado_em TEXT)');
        DB::table('usuario')->where('id_usuario', 6)->update(['id_escola' => 2]);
        foreach ([1 => 3, 2 => 6] as $id => $autor) {
            DB::table('aviso')->insert(['id_aviso' => $id, 'id_autor' => $autor, 'titulo' => 'Aviso', 'publico_destinatario' => 'TODOS', 'ativo' => true]);
        }
        $this->withSession(['id_usuario' => 3])->getJson('/api/avisos')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/avisos/2')->assertNotFound();
        $this->patchJson('/api/avisos/2', ['titulo' => 'Invadido'])->assertNotFound();
    }

    public function test_codigo_de_vinculo_nao_permite_cruzar_escolas(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE codigo_vinculo (id_codigo_vinculo INTEGER PRIMARY KEY,id_estudante INTEGER,codigo_hash TEXT,revogado_em TEXT,expira_em TEXT,status TEXT)');
        DB::table('codigo_vinculo')->insert(['id_codigo_vinculo' => 7, 'id_estudante' => 7, 'codigo_hash' => Codigos::hash('ABCDEF'), 'expira_em' => now()->addDay()->toIso8601String(), 'status' => 'ABERTO']);
        $this->withSession(['id_usuario' => 4])->postJson('/api/vinculos/resgatar', ['codigo' => 'ABCDEF'])->assertNotFound();
        $this->assertSame('ABERTO', DB::table('codigo_vinculo')->value('status'));
    }

    public function test_cadastro_publico_usa_escola_e_perfil_do_codigo_e_nao_do_corpo(): void
    {
        $this->preparar();
        foreach (['criado_em', 'atualizado_em'] as $c) {
            DB::statement('ALTER TABLE usuario ADD COLUMN '.$c.' TEXT');
            DB::statement('ALTER TABLE estudante ADD COLUMN '.$c.' TEXT');
        }
        foreach (['data_nascimento', 'telefone'] as $c) {
            DB::statement('ALTER TABLE estudante ADD COLUMN '.$c.' TEXT');
        }
        DB::statement('CREATE TABLE codigo_cadastro (id_codigo_cadastro INTEGER PRIMARY KEY,id_escola INTEGER,codigo_hash TEXT,revogado_em TEXT,expira_em TEXT,usos INTEGER,usos_maximos INTEGER,perfil TEXT,turma TEXT,instituicao_ensino TEXT)');
        DB::statement('CREATE TABLE uso_codigo_cadastro (id_codigo_cadastro INTEGER,id_usuario INTEGER,usado_em TEXT)');
        DB::table('codigo_cadastro')->insert(['id_codigo_cadastro' => 1, 'id_escola' => 1, 'codigo_hash' => Codigos::hash('ABCDEF2345'), 'expira_em' => now()->addDay()->toIso8601String(), 'usos' => 0, 'usos_maximos' => 1, 'perfil' => 'ESTUDANTE']);
        $r = $this->postJson('/api/auth/cadastro', ['codigo' => 'ABCDEF2345', 'nome_completo' => 'Novo estudante', 'email' => 'novo@teste.br', 'senha' => 'Senha nova segura!', 'id_escola' => 2, 'perfil' => 'administrador'])->assertCreated()->assertJsonPath('id_escola',1)->assertJsonPath('perfil','estudante');
        $this->assertSame(1,DB::table('usuario')->where('id_usuario',$r->json('id_usuario'))->value('id_escola'));
    }

    public function test_humores_inicial_e_final_sao_obrigatorios_e_relato_e_opcional(): void
    {
        $this->preparar();
        $this->withSession(['id_usuario' => 1]);
        $this->postJson('/api/sessoes', ['id_atividade' => 1])->assertStatus(400);
        $inicio = $this->postJson('/api/sessoes', ['id_atividade' => 1, 'humor_pre' => 'ansioso'])->assertCreated();
        $id = $inicio->json('sessao.id_sessao');
        $this->postJson('/api/sessoes/'.$id.'/concluir', ['observacoes_sessao' => 'Sem avaliação final'])->assertStatus(400);
        $this->assertSame('EM_ANDAMENTO', DB::table('sessao')->where('id_sessao', $id)->value('status'));
        $this->postJson('/api/sessoes/'.$id.'/concluir', ['humor_pos' => 'calmo'])->assertOk();
        $this->assertSame('CONCLUIDA', DB::table('sessao')->where('id_sessao', $id)->value('status'));
        $this->assertSame(['ansioso', 'calmo'], DB::table('registro_humor')->where('id_sessao', $id)->orderBy('id_registro_humor')->pluck('emocao')->all());
    }

    public function test_todos_os_cuidados_do_catalogo_podem_ser_marcados_sem_remover_conclusoes(): void
    {
        $this->preparar();
        DB::statement('CREATE TABLE cuidado_estudante (id_estudante INTEGER,dia TEXT,cuidado TEXT,PRIMARY KEY(id_estudante,dia,cuidado))');
        $this->withSession(['id_usuario' => 1]);
        $ids = ['agua', 'alongar', 'longe', 'fruta', 'caminhar', 'conversar', 'sono', 'desenhar', 'cores', 'musica', 'gentileza', 'gratidao', 'natureza', 'dancar', 'arrumar', 'careta', 'notificacoes', 'playlist', 'escrever', 'limites', 'hobby', 'pausatela', 'prioridade', 'reconhecer'];
        foreach ($ids as $id) {
            $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => $id, 'feito' => true])->assertOk();
        }
        $this->assertSame(24, DB::table('cuidado_estudante')->count());
        $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => 'careta', 'feito' => true])->assertOk();
        $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => 'careta', 'feito' => false])->assertStatus(400);
        $this->postJson('/api/cuidados', ['id_estudante' => 1, 'cuidado' => 'inexistente', 'feito' => true])->assertStatus(400);
        $this->assertSame(24, DB::table('cuidado_estudante')->count());
    }
}
