<?php

namespace Tests\Feature;

use App\Http\Controllers\AcompanhamentoController;
use App\Http\Controllers\SessoesController;
use App\Mkpause\Conta;
use App\Mkpause\ErroApi;
use App\Mkpause\SenhaPbkdf2;
use App\Mkpause\Permissoes;
use App\Mkpause\Cadastros;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AutenticacaoAcompanhamentoTest extends TestCase
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
        DB::statement('ALTER TABLE estudante ADD COLUMN primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT TRUE');
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

    private function pedido(int $usuario, array $dados = []): Request
    {
        $r = Request::create('/api', 'POST', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($dados));
        $r->attributes->set('conta', Conta::carregar($usuario));
        return $r;
    }

    private function proibido(callable $acao, int $status = 403): void
    {
        try { $acao(); $this->fail('Deveria recusar o acesso.'); }
        catch (ErroApi $erro) { $this->assertSame($status, $erro->status); }
    }

    private function login(string $senha = 'Senha teste 123!')
    {
        $token = str_repeat('a', 32);
        return $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token)
            ->postJson('/api/auth/login', ['email' => 'conta2@teste.br', 'senha' => $senha]);
    }

    public function test_login_real_cria_sessao_sem_devolver_credenciais(): void
    {
        $r = $this->login()->assertOk()->assertSessionHas('id_usuario', 2);
        $this->assertArrayNotHasKey('senha', $r->json());
        $this->assertArrayNotHasKey('senha_hash', $r->json());
        $this->getJson('/api/auth/eu')->assertOk()->assertJsonPath('perfil', 'psicologo_clinico');
        $this->postJson('/api/auth/logout')->assertOk();
        $this->getJson('/api/auth/eu')->assertUnauthorized();
    }

    public function test_migra_hash_legado_apos_login_valido_e_reutiliza_argon2id(): void
    {
        if (!in_array('argon2id', password_algos(), true)) {
            $this->markTestSkipped('PHP sem Argon2id.');
        }

        $usuario = DB::table('usuario')->where('id_usuario', 2);
        $legado = $usuario->value('senha_hash');
        $this->login('incorreta')->assertUnauthorized();
        $this->assertSame($legado, $usuario->value('senha_hash'));

        $this->login()->assertOk();
        $novoHash = $usuario->value('senha_hash');
        $this->assertStringStartsWith('$argon2id$', $novoHash);
        $this->getJson('/api/auth/eu')->assertOk();
        $this->postJson('/api/auth/logout')->assertOk();

        $this->login()->assertOk();
        $this->assertSame($novoHash, $usuario->value('senha_hash'));
    }

    public function test_senha_errada_conta_inativa_e_login_sem_csrf_sao_recusados(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'conta2@teste.br', 'senha' => 'Senha teste 123!'])->assertForbidden();
        $this->login('incorreta')->assertUnauthorized();
        DB::table('usuario')->where('id_usuario', 2)->update(['ativo' => false]);
        $this->login()->assertUnauthorized();
    }

    public function test_api_restrita_sem_login_e_perfil_errado_nao_passam(): void
    {
        $this->getJson('/api/admin/estudantes')->assertUnauthorized();
        $this->withSession(['id_usuario' => 1])->getJson('/api/admin/estudantes')->assertForbidden();
        DB::table('usuario')->where('id_usuario', 1)->update(['ativo' => false]);
        $this->withSession(['id_usuario' => 1])->getJson('/api/auth/eu')->assertUnauthorized();
    }

    public function test_login_limita_tentativas_e_informa_quando_tentar_novamente(): void
    {
        config(['mkpause.limites.login' => 2]);
        $this->login('errada')->assertUnauthorized();
        $this->login('errada')->assertUnauthorized();
        $this->login('errada')->assertStatus(429)->assertHeader('Retry-After');
        $this->travel(61)->seconds();
        $this->login()->assertOk();
    }

    public function test_registro_acrescenta_sem_apagar_legado_e_reenvio_nao_duplica(): void
    {
        $c = new AcompanhamentoController;
        $r = $this->pedido(2, ['texto' => 'Novo acompanhamento', 'chave' => 'tentativa-1', 'autorId' => 'u-999', 'em' => '1900-01-01']);
        $primeiro = $c->registrarAcompanhamento($r, 1)->getData(true);
        $this->assertSame('u-2', $primeiro['autorId']);
        $this->assertNotSame('1900-01-01', $primeiro['em']);
        $this->assertSame($primeiro, $c->registrarAcompanhamento($r, 1)->getData(true));
        $c->registrarAcompanhamento($this->pedido(2, ['texto' => 'Segundo', 'chave' => 'tentativa-2']), 1);
        $dados = json_decode(DB::table('ficha_acompanhamento')->value('informacoes_acompanhamento'), true);
        $this->assertCount(3, $dados['registros']);
        $this->assertSame('Anterior', $dados['registros'][0]['texto']);
        $this->assertSame('Legado', $dados['encaminhamento']);
        $c->editarFicha($this->pedido(3, ['informacoes_acompanhamento' => '{"encaminhamento":"Atualizado","registros":[]}']), 1);
        $dados = json_decode(DB::table('ficha_acompanhamento')->value('informacoes_acompanhamento'), true);
        $this->assertCount(3, $dados['registros']);
        foreach ([3, 5] as $usuario) {
            $visivel = $c->verFicha($this->pedido($usuario), 1)->getData(true);
            $this->assertArrayNotHasKey('registros', json_decode($visivel['informacoes_acompanhamento'], true));
        }
    }

    public function test_registro_exige_perfil_vinculo_ficha_ativa_e_texto(): void
    {
        $c = new AcompanhamentoController;
        foreach ([1, 3, 4, 5, 6] as $usuario) $this->proibido(fn () => $c->registrarAcompanhamento($this->pedido($usuario, ['texto' => 'Teste', 'chave' => '1']), 1));
        $this->proibido(fn () => $c->registrarAcompanhamento($this->pedido(2, ['texto' => '', 'chave' => '1']), 1), 400);
        DB::table('ficha_acompanhamento')->update(['ativo' => false]);
        $this->proibido(fn () => $c->registrarAcompanhamento($this->pedido(2, ['texto' => 'Teste', 'chave' => '1']), 1), 409);
        DB::table('ficha_acompanhamento')->delete();
        $this->proibido(fn () => $c->registrarAcompanhamento($this->pedido(2, ['texto' => 'Teste', 'chave' => '1']), 1), 409);
    }

    public function test_admin_nao_consulta_sessoes_humores_ou_dashboard_individual(): void
    {
        $conta = Conta::carregar(3);
        $this->assertFalse(Permissoes::pode($conta, 'ver_historico', 1));
        $c = new SessoesController;
        $this->proibido(fn () => $c->listar($this->pedido(3)));
        $this->proibido(fn () => $c->ver($this->pedido(3), 1));
        foreach (['sessoes', 'sessoes?estudante=1', 'sessoes/1', 'estudantes/1/dashboard'] as $url) {
            $this->withSession(['id_usuario' => 3])->getJson('/api/'.$url)->assertForbidden();
        }
    }

    public function test_revogar_vinculo_escolar_bloqueia_alertas_antigos_e_todas_as_suas_acoes(): void
    {
        DB::statement('CREATE TABLE professor_estudante (id_professor INTEGER, id_estudante INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE alerta (id_alerta INTEGER PRIMARY KEY, id_estudante INTEGER, id_sessao INTEGER, nivel INTEGER, criado_em TEXT, status TEXT, descricao TEXT)');
        DB::statement('CREATE TABLE destinatario_alerta (id_destinatario_alerta INTEGER PRIMARY KEY, id_alerta INTEGER, id_usuario INTEGER, tipo_destinatario TEXT, status_notificacao TEXT, enviado_em TEXT, lido_em TEXT)');
        DB::table('professor_estudante')->insert(['id_professor' => 4, 'id_estudante' => 1, 'ativo' => true]);
        DB::table('alerta')->insert(['id_alerta' => 1, 'id_estudante' => 1, 'nivel' => 3, 'criado_em' => '2026-11-06 12:00:00', 'status' => 'ABERTO']);
        foreach ([4 => 'PROFESSOR', 5 => 'PSICOLOGO_ESCOLAR'] as $id => $tipo) {
            DB::table('destinatario_alerta')->insert(['id_destinatario_alerta' => $id, 'id_alerta' => 1,
                'id_usuario' => $id, 'tipo_destinatario' => $tipo, 'status_notificacao' => 'PENDENTE']);
        }
        $token = str_repeat('a', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
        foreach ([4 => 'professor', 5 => 'psicologo_escolar'] as $id => $perfil) {
            $this->withSession(['id_usuario' => $id])->getJson('/api/alertas')->assertOk()->assertJsonCount(1);
            DB::table($perfil.'_estudante')->where('id_'.$perfil, $id)->update(['ativo' => false]);
            $this->getJson('/api/alertas')->assertOk()->assertExactJson([]);
            $this->getJson('/api/alertas/1')->assertNotFound();
            $this->getJson('/api/alertas/1/observacoes')->assertNotFound();
            $this->patchJson('/api/alertas/1', ['status' => 'RESOLVIDO'])->assertNotFound();
            $this->postJson('/api/alertas/1/lido')->assertNotFound();
            $this->postJson('/api/alertas/1/observacoes', ['conteudo' => 'Sem autorização'])->assertNotFound();
            $this->assertSame('ABERTO', DB::table('alerta')->value('status'));
            $this->assertNull(DB::table('destinatario_alerta')->where('id_usuario', $id)->value('lido_em'));
            DB::table($perfil.'_estudante')->where('id_'.$perfil, $id)->update(['ativo' => true]);
            $this->getJson('/api/alertas/1')->assertOk();
        }
    }

    public function test_sessao_e_humores_mantem_estudante_e_datas_e_so_psicologos_vinculados_consultam(): void
    {
        DB::statement('CREATE TABLE atividade (id_escola INTEGER DEFAULT 1, id_atividade INTEGER PRIMARY KEY, nome TEXT, descricao TEXT, tipo TEXT, conteudo_ou_referencia TEXT, disponivel BOOLEAN, criado_em TEXT, atualizado_em TEXT)');
        DB::statement('CREATE TABLE sessao (id_sessao INTEGER PRIMARY KEY, id_estudante INTEGER, id_atividade INTEGER, iniciada_em TEXT, terminada_em TEXT, nivel_avaliado INTEGER, duracao_segundos INTEGER, observacoes_sessao TEXT, status TEXT)');
        DB::statement('CREATE TABLE registro_humor (id_registro_humor INTEGER PRIMARY KEY, id_sessao INTEGER, estado INTEGER, emocao TEXT, momento TEXT, registrado_em TEXT)');
        DB::table('atividade')->insert(['id_atividade' => 1, 'nome' => 'Respire&Pause', 'tipo' => 'RESPIRACAO', 'disponivel' => true]);
        $c = new SessoesController;
        $inicio = $c->iniciar($this->pedido(1, ['id_atividade' => 1, 'humor_pre' => 'ansioso']))->getData(true)['sessao'];
        $fim = $c->concluir($this->pedido(1, ['humor_pos' => 'calmo']), $inicio['id_sessao'])->getData(true)['sessao'];
        $this->assertSame(1, $fim['estudante']);
        $this->assertNotEmpty($fim['iniciada_em']);
        $this->assertNotEmpty($fim['terminada_em']);
        $this->assertCount(2, $fim['registros_humor']);
        foreach ($fim['registros_humor'] as $humor) $this->assertNotEmpty($humor['registrado_em']);
        foreach ([2, 5] as $usuario) {
            $this->withSession(['id_usuario' => $usuario])->getJson('/api/sessoes?estudante=1')->assertOk()->assertJsonCount(1);
            $this->getJson('/api/sessoes/'.$inicio['id_sessao'])->assertOk()->assertJsonPath('estudante', 1);
        }
        $this->withSession(['id_usuario' => 6])->getJson('/api/sessoes?estudante=1')->assertForbidden();
        DB::table('psicologo_clinico_estudante')->update(['ativo' => false]);
        $this->withSession(['id_usuario' => 2])->getJson('/api/sessoes/'.$inicio['id_sessao'])->assertForbidden();
        $this->assertSame(1, DB::table('sessao')->count());
        $this->assertSame(2, DB::table('registro_humor')->count());
    }

    private function prepararCadastros(): void
    {
        foreach (['criado_em', 'atualizado_em'] as $campo) DB::statement("ALTER TABLE usuario ADD COLUMN {$campo} TEXT");
        foreach (Cadastros::TIPOS as [$tabela, $chave, $campos]) {
            foreach ([...$campos, 'criado_em', 'atualizado_em'] as $campo) DB::statement("ALTER TABLE {$tabela} ADD COLUMN {$campo} TEXT");
        }
        $token = str_repeat('a', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
    }

    public function test_admin_cadastra_os_tres_perfis_profissionais_com_login_real(): void
    {
        $this->prepararCadastros();
        foreach (['professores' => 'professor', 'psicologos-escolares' => 'psicologo_escolar', 'psicologos-clinicos' => 'psicologo_clinico'] as $rota => $perfil) {
            $dados = ['nome_completo' => 'Profissional Novo', 'email' => $perfil.'@escola.br', 'senha' => 'Senha segura 123!',
                'telefone' => '+55 (41) 99999-1234', 'cargo' => 'Matemática', 'instituicao_ensino' => 'Escola teste',
                'registro_profissional' => '08/12345', 'estado_registro' => 'pr'];
            $resposta = $this->withSession(['id_usuario' => 3])->postJson('/api/admin/'.$rota, $dados)->assertCreated();
            $this->assertArrayNotHasKey('senha', $resposta->json());
            $this->assertArrayNotHasKey('senha_hash', $resposta->json());
            $this->assertSame('(41) 99999-1234', $resposta->json('telefone'));
            if ($perfil !== 'professor') $resposta->assertJsonPath('estado_registro', 'PR');
            $usuario = DB::table('usuario')->where('email', $dados['email'])->first();
            $this->assertNotSame($dados['senha'], $usuario->senha_hash);
            $this->postJson('/api/auth/login', ['email' => $dados['email'], 'senha' => $dados['senha']])->assertOk()->assertJsonPath('perfil', $perfil);
            $this->getJson('/api/admin/professores')->assertForbidden();
        }
    }

    public function test_cadastro_valida_limites_telefone_datas_e_duplicidade(): void
    {
        $this->prepararCadastros();
        $dados = ['nome_completo' => 'Nome válido', 'email' => 'novo@escola.br', 'senha' => 'Senha segura 123!'];
        $this->withSession(['id_usuario' => 3]);
        foreach ([['nome_completo' => str_repeat('n', 151)], ['senha' => str_repeat('s', 129)],
            ['telefone' => '123'], ['telefone' => 'abc41999991234'], ['cargo' => str_repeat('c', 121)],
            ['instituicao_ensino' => str_repeat('e', 161)], ['email' => 'conta2@teste.br']] as $invalido) {
            $this->postJson('/api/admin/professores', array_replace($dados, $invalido))->assertBadRequest();
        }
        foreach (['2023-02-29', '2024-04-31', '9999-01-01'] as $data) {
            $this->postJson('/api/admin/estudantes', $dados + ['data_nascimento' => $data])->assertBadRequest();
        }
        $psicologo = $dados + ['registro_profissional' => '08/12345', 'estado_registro' => 'PR'];
        $this->postJson('/api/admin/psicologos-clinicos', array_replace($psicologo, ['registro_profissional' => str_repeat('1', 41)]))->assertBadRequest();
        $this->postJson('/api/admin/psicologos-clinicos', array_replace($psicologo, ['estado_registro' => 'XX']))->assertBadRequest();
        $this->assertSame(6, DB::table('usuario')->count());
        $this->postJson('/api/admin/estudantes', $dados + ['data_nascimento' => '2024-02-29', 'telefone' => '4133334444'])
            ->assertCreated()->assertJsonPath('data_nascimento', '2024-02-29')->assertJsonPath('telefone', '(41) 3333-4444');
    }
    public function test_primeiro_acesso_fica_concluido_na_conta_e_nao_altera_outro_estudante(): void
    {
        DB::table('estudante')->where('id_estudante', 1)->update(['primeiro_acesso_concluido' => false]);
        DB::table('usuario')->insert(['id_usuario' => 7, 'nome_completo' => 'Outro estudante', 'email' => 'outro@teste.br', 'senha_hash' => 'hash', 'ativo' => true]);
        DB::table('estudante')->insert(['id_estudante' => 7, 'id_usuario' => 7, 'ativo' => true, 'primeiro_acesso_concluido' => false]);
        $token = str_repeat('p', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
        $this->withSession(['id_usuario' => 1])->getJson('/api/auth/eu')->assertOk()->assertJsonPath('primeiro_acesso_pendente', true);
        $this->postJson('/api/auth/primeiro-acesso/concluir', ['id_estudante' => 7])->assertOk()->assertJsonPath('primeiro_acesso_pendente', false);
        $this->assertTrue((bool) DB::table('estudante')->where('id_estudante', 1)->value('primeiro_acesso_concluido'));
        $this->assertFalse((bool) DB::table('estudante')->where('id_estudante', 7)->value('primeiro_acesso_concluido'));
        $this->withSession(['id_usuario' => 1])->getJson('/api/auth/eu')->assertOk()->assertJsonPath('primeiro_acesso_pendente', false);
        $this->postJson('/api/auth/primeiro-acesso/concluir')->assertOk()->assertJsonPath('primeiro_acesso_pendente', false);
    }

    public function test_contas_existentes_e_profissionais_nao_tem_primeiro_acesso_pendente(): void
    {
        foreach ([1, 2, 3, 4, 5] as $id) {
            $this->withSession(['id_usuario' => $id])->getJson('/api/auth/eu')->assertOk()->assertJsonPath('primeiro_acesso_pendente', false);
        }
    }

    public function test_concluir_primeiro_acesso_exige_login_csrf_e_perfil_estudante(): void
    {
        $this->postJson('/api/auth/primeiro-acesso/concluir')->assertUnauthorized();
        $this->withSession(['id_usuario' => 1])->postJson('/api/auth/primeiro-acesso/concluir')->assertForbidden();
        $token = str_repeat('p', 32);
        $this->withCredentials()->withUnencryptedCookie('csrftoken', $token)->withHeader('X-CSRFToken', $token);
        foreach ([2, 3, 4, 5] as $id) {
            $this->withSession(['id_usuario' => $id])->postJson('/api/auth/primeiro-acesso/concluir')->assertForbidden();
        }
    }

}
