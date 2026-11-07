<?php

namespace Tests\Feature;

use App\Http\Controllers\AlertasController;
use App\Http\Controllers\CadastrosController;
use App\Http\Controllers\SessoesController;
use App\Mkpause\Conta;
use App\Mkpause\Emails;
use App\Mkpause\ErroApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EscopoRequisitosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null]);
        DB::purge('sqlite');
        DB::statement('CREATE TABLE usuario (id_usuario INTEGER PRIMARY KEY, nome_completo TEXT, ativo BOOLEAN)');
        DB::statement('CREATE TABLE estudante (id_estudante INTEGER PRIMARY KEY, id_usuario INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE psicologo_clinico (id_psicologo_clinico INTEGER PRIMARY KEY, id_usuario INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE psicologo_clinico_estudante (id_psicologo_clinico INTEGER, id_estudante INTEGER, ativo BOOLEAN, criado_em TEXT)');
        DB::statement('CREATE TABLE alerta (id_alerta INTEGER PRIMARY KEY, id_estudante INTEGER)');
        DB::statement('CREATE TABLE observacao (id_observacao INTEGER PRIMARY KEY, id_alerta INTEGER, id_autor INTEGER, conteudo TEXT, criado_em TEXT)');
        DB::table('usuario')->insert(['id_usuario' => 1, 'nome_completo' => 'Teste', 'ativo' => true]);
        DB::table('estudante')->insert(['id_estudante' => 1, 'id_usuario' => 1, 'ativo' => true]);
        DB::table('psicologo_clinico')->insert(['id_psicologo_clinico' => 1, 'id_usuario' => 1, 'ativo' => true]);
    }

    private function pedido(string $perfil): Request
    {
        $request = Request::create('/api', 'GET');
        $request->attributes->set('conta', new Conta((object) ['id_usuario' => 1], $perfil,
            (object) ['id_'.$perfil => 1]));
        return $request;
    }

    private function proibido(callable $acao): void
    {
        try {
            $acao();
            $this->fail('O acesso removido deveria ser recusado.');
        } catch (ErroApi $erro) {
            $this->assertSame(403, $erro->status);
        }
    }

    public function test_estudante_nao_consulta_historico_nem_detalhe(): void
    {
        $c = new SessoesController;
        $r = $this->pedido(Conta::ESTUDANTE);
        $this->proibido(fn () => $c->listar($r));
        $this->proibido(fn () => $c->ver($r, 1));
    }

    public function test_clinico_nao_consulta_alertas_nem_suas_rotas_de_observacao(): void
    {
        $c = new AlertasController;
        $r = $this->pedido(Conta::PSICOLOGO_CLINICO);
        $this->proibido(fn () => $c->listar($r));
        $this->proibido(fn () => $c->ver($r, 1));
        $this->proibido(fn () => $c->observacoes($r, 1));
    }

    public function test_observacoes_clinicas_continuam_restritas_ao_vinculo_sem_expor_alerta(): void
    {
        DB::table('alerta')->insert(['id_alerta' => 9, 'id_estudante' => 1]);
        DB::table('observacao')->insert(['id_observacao' => 2, 'id_alerta' => 9, 'id_autor' => 1,
            'conteudo' => 'Observação escolar', 'criado_em' => '2026-11-06 12:00:00']);
        $c = new AlertasController;
        $r = $this->pedido(Conta::PSICOLOGO_CLINICO);
        $this->proibido(fn () => $c->observacoesDoEstudante($r, 1));
        DB::table('psicologo_clinico_estudante')->insert(['id_psicologo_clinico' => 1, 'id_estudante' => 1, 'ativo' => true]);
        $dados = $c->observacoesDoEstudante($r, 1)->getData(true);
        $this->assertSame('Observação escolar', $dados[0]['conteudo']);
        $this->assertArrayNotHasKey('id_alerta', $dados[0]);
        DB::table('psicologo_clinico_estudante')->update(['ativo' => false]);
        $this->proibido(fn () => $c->observacoesDoEstudante($r, 1));
    }

    public function test_admin_vincula_clinico_sem_tabelas_ou_aceite_de_responsavel(): void
    {
        $r = Request::create('/api', 'POST', server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['psicologo_clinico' => 1, 'estudante' => 1]));
        $c = new CadastrosController;
        $this->assertSame(201, $c->criarVinculo($r, 'psicologos-clinicos')->getStatusCode());
        $this->assertSame(1, DB::table('psicologo_clinico_estudante')->where('ativo', true)->count());
        $c->criarVinculo($r, 'psicologos-clinicos');
        $this->assertSame(1, DB::table('psicologo_clinico_estudante')->count());
    }

    public function test_rotas_de_responsaveis_e_convites_foram_retiradas(): void
    {
        foreach (['admin/responsaveis', 'admin/vinculos/responsaveis',
            'admin/estudantes/1/convites-responsavel', 'convites-responsavel/verificar',
            'convites-responsavel/aceitar', 'convites-responsavel/recusar'] as $rota) {
            $this->postJson('/api/'.$rota)->assertNotFound();
        }
        $this->getJson('/api/admin/responsaveis')->assertNotFound();
    }

    public function test_convite_legado_nao_produz_mensagem_de_email(): void
    {
        $metodo = new \ReflectionMethod(Emails::class, 'mensagem');
        $this->assertNull($metodo->invoke(null, (object) ['id_convite' => 1, 'id_destinatario_alerta' => null]));
    }
}
