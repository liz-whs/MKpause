<?php

namespace Tests\Feature;

use App\Http\Controllers\AcompanhamentoController;
use App\Mkpause\Conta;
use App\Mkpause\ErroApi;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardClinicoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-07T12:00:00-03:00'));
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null]);
        DB::purge('sqlite');
        DB::statement('CREATE TABLE usuario (id_usuario INTEGER PRIMARY KEY, id_escola INTEGER, nome_completo TEXT, ativo BOOLEAN)');
        DB::statement('CREATE TABLE estudante (id_estudante INTEGER PRIMARY KEY, id_usuario INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE psicologo_clinico_estudante (id_psicologo_clinico INTEGER, id_estudante INTEGER, ativo BOOLEAN)');
        DB::statement('CREATE TABLE atividade (id_atividade INTEGER PRIMARY KEY, tipo TEXT)');
        DB::statement('CREATE TABLE sessao (id_sessao INTEGER PRIMARY KEY, id_estudante INTEGER, id_atividade INTEGER, iniciada_em TEXT, status TEXT, observacoes_sessao TEXT)');
        DB::statement('CREATE TABLE registro_humor (id_registro_humor INTEGER PRIMARY KEY, id_sessao INTEGER, momento TEXT, emocao TEXT, estado INTEGER)');
        DB::table('usuario')->insert(['id_usuario' => 1, 'id_escola' => 1, 'nome_completo' => 'Estudante teste', 'ativo' => true]);
        DB::table('estudante')->insert(['id_estudante' => 1, 'id_usuario' => 1, 'ativo' => true]);
        DB::table('psicologo_clinico_estudante')->insert(['id_psicologo_clinico' => 2, 'id_estudante' => 1, 'ativo' => true]);
        DB::table('atividade')->insert(['id_atividade' => 1, 'tipo' => 'JOGO']);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function painel(int $clinico = 2): array
    {
        $request = Request::create('/api/estudantes/1/dashboard?dias=14');
        $request->attributes->set('conta', new Conta((object) ['id_usuario' => 2, 'id_escola' => 1],
            Conta::PSICOLOGO_CLINICO, (object) ['id_psicologo_clinico' => $clinico]));
        return (new AcompanhamentoController)->dashboard($request, 1)->getData(true);
    }

    private function sessao(int $id, ?string $antes, ?string $depois, ?string $obs = null, string $status = 'CONCLUIDA', string $data = '2026-11-06 12:00:00+00:00'): void
    {
        DB::table('sessao')->insert(['id_sessao' => $id, 'id_estudante' => 1, 'id_atividade' => 1,
            'iniciada_em' => $data, 'status' => $status, 'observacoes_sessao' => $obs]);
        foreach (['PRE' => $antes, 'POS' => $depois] as $momento => $emocao) {
            DB::table('registro_humor')->insert(['id_sessao' => $id, 'momento' => $momento, 'emocao' => $emocao, 'estado' => 4]);
        }
    }

    public function test_conta_emocoes_explicitas_legadas_e_atuais_sem_alterar_os_registros(): void
    {
        $this->sessao(1, null, null, '[mkpause antes=ansioso depois=calmo]');
        $this->sessao(2, 'feliz', 'irritado', '[mkpause antes=triste depois=calmo]');
        $dados = $this->painel();
        $this->assertSame(2, $dados['resumo']['sessoes_concluidas']);
        $this->assertSame(50, $dados['resumo']['percentual_terminou_leve']);
        $this->assertSame('ansioso', $dados['evolucao'][0]['humor_antes']);
        $this->assertSame('calmo', $dados['evolucao'][0]['humor_depois']);
        $this->assertSame('feliz', $dados['evolucao'][1]['humor_antes']);
        $this->assertSame('irritado', $dados['evolucao'][1]['humor_depois']);
        $this->assertSame(2, $dados['atividades'][1]['quantidade']);
        $this->assertSame(1, array_column($dados['distribuicao_humor'], null, 'emocao')['calmo']['depois']);
        $this->assertNull(DB::table('registro_humor')->where('id_sessao', 1)->value('emocao'));
    }

    public function test_nao_inventa_emocoes_nem_conta_sessoes_incompletas_canceladas_ou_fora_do_periodo(): void
    {
        $this->sessao(1, null, null); // Escala numérica não equivale a emoção.
        $this->sessao(2, null, null, '[mkpause antes=invalido depois=calmo]');
        $this->sessao(3, null, null, '[mkpause antes=triste depois=feliz]');
        DB::table('registro_humor')->where('id_sessao', 3)->where('momento', 'POS')->delete();
        $this->sessao(4, 'triste', 'calmo', status: 'CANCELADA');
        $this->sessao(5, 'triste', 'calmo', data: '2026-09-01 12:00:00+00:00');
        $this->assertSame(0, $this->painel()['resumo']['sessoes_concluidas']);
    }

    public function test_marca_legada_nao_libera_acesso_sem_vinculo(): void
    {
        $this->sessao(1, null, null, '[mkpause antes=ansioso depois=calmo]');
        try {
            $this->painel(9);
            $this->fail('Clínico sem vínculo não pode consultar o painel.');
        } catch (ErroApi $erro) {
            $this->assertSame(403, $erro->status);
        }
    }
}
