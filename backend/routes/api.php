<?php

use App\Http\Controllers\AcompanhamentoController as Acompanhamento;
use App\Http\Controllers\AlertasController as Alertas;
use App\Http\Controllers\AtividadesController as Atividades;
use App\Http\Controllers\AutenticacaoController as Autenticacao;
use App\Http\Controllers\CadastrosController as Cadastros;
use App\Http\Controllers\CodigosController as Codigos;
use App\Http\Controllers\EmailsController as Emails;
use App\Http\Controllers\SessoesController as Sessoes;
use Illuminate\Support\Facades\Route;

$admin = 'conta:administrador';
$estudante = 'conta:estudante';
$escolares = 'conta:professor,psicologo_escolar';

Route::get('auth/csrf', [Autenticacao::class, 'csrf']);
Route::post('auth/login', [Autenticacao::class, 'login']);
Route::post('auth/codigo-cadastro/verificar', [Codigos::class, 'verificar']);
Route::post('auth/cadastro', [Codigos::class, 'cadastrar']);

Route::post('auth/logout', [Autenticacao::class, 'logout'])->middleware('conta');
Route::get('auth/eu', [Autenticacao::class, 'eu'])->middleware('conta');
Route::post('auth/primeiro-acesso/concluir', [Autenticacao::class, 'concluirPrimeiroAcesso'])->middleware($estudante);

Route::get('cuidados', [\App\Http\Controllers\CuidadosController::class, 'listar'])->middleware($estudante);
Route::post('cuidados', [\App\Http\Controllers\CuidadosController::class, 'atualizar'])->middleware($estudante);

Route::get('atividades', [Atividades::class, 'listar'])->middleware('conta');
Route::get('atividades/{id}', [Atividades::class, 'ver'])->middleware('conta');
Route::middleware($admin)->group(function () {
    Route::post('atividades', [Atividades::class, 'criar']);
    Route::patch('atividades/{id}', [Atividades::class, 'atualizar']);
    Route::delete('atividades/{id}', [Atividades::class, 'desativar']);
});

// ---------------------------------------------------- sessões (RF04–RF07, RF12, RF13)
Route::get('sessoes', [Sessoes::class, 'listar'])->middleware('conta:psicologo_escolar,psicologo_clinico');
Route::middleware($estudante)->group(function () {
    Route::post('sessoes/avaliar', [Sessoes::class, 'avaliar']);
    Route::post('sessoes', [Sessoes::class, 'iniciar']);
    Route::post('sessoes/{id}/concluir', [Sessoes::class, 'concluir']);
    Route::post('sessoes/{id}/cancelar', [Sessoes::class, 'cancelar']);
});
Route::get('sessoes/{id}', [Sessoes::class, 'ver'])->middleware('conta:psicologo_escolar,psicologo_clinico');

// ------------------------------------------------- alertas (RF08, RF14, RF21–RF23)
Route::middleware('conta')->group(function () {
    Route::get('alertas', [Alertas::class, 'listar']);
    Route::post('alertas', [Alertas::class, 'emitir']);
    Route::get('alertas/{id}', [Alertas::class, 'ver']);
    Route::patch('alertas/{id}', [Alertas::class, 'mudarStatus']);
    Route::get('alertas/{id}/observacoes', [Alertas::class, 'observacoes']);
    Route::post('alertas/{id}/observacoes', [Alertas::class, 'observar']);
});
Route::post('alertas/{id}/lido', [Alertas::class, 'lido'])->middleware($escolares);

Route::get('avisos', [Acompanhamento::class, 'listarAvisos'])->middleware('conta');
Route::get('avisos/{id}', [Acompanhamento::class, 'verAviso'])->middleware('conta');
Route::middleware($admin)->group(function () {
    Route::post('avisos', [Acompanhamento::class, 'criarAviso']);
    Route::patch('avisos/{id}', [Acompanhamento::class, 'atualizarAviso']);
    Route::delete('avisos/{id}', [Acompanhamento::class, 'desativarAviso']);
});

Route::middleware('conta')->group(function () {
    Route::get('estudantes/{id}/ficha', [Acompanhamento::class, 'verFicha']);
    Route::post('estudantes/{id}/ficha', [Acompanhamento::class, 'criarFicha']);
    Route::patch('estudantes/{id}/ficha', [Acompanhamento::class, 'editarFicha']);
    Route::post('estudantes/{id}/registros', [Acompanhamento::class, 'registrarAcompanhamento']);
});
Route::get('estudantes/{id}/dashboard', [Acompanhamento::class, 'dashboard'])->middleware('conta:psicologo_clinico');
Route::middleware('conta:professor,psicologo_escolar,psicologo_clinico,administrador')->group(function () {
    Route::get('estudantes', [Cadastros::class, 'meusEstudantes']);
    Route::get('estudantes/{id}', [Cadastros::class, 'meuEstudante']);
});

Route::middleware($estudante)->group(function () {
    Route::post('vinculos/codigos', [Codigos::class, 'gerarVinculo']);
    Route::get('vinculos/codigos/atual', [Codigos::class, 'vinculoAtual']);
    Route::delete('vinculos/codigos/atual', [Codigos::class, 'cancelarVinculoAtual']);
    Route::get('vinculos/solicitacoes', [Codigos::class, 'solicitacoes']);
    Route::post('vinculos/solicitacoes/{id}/aceitar', [Codigos::class, 'responderVinculo'])->defaults('resposta', 'aceitar');
    Route::post('vinculos/solicitacoes/{id}/recusar', [Codigos::class, 'responderVinculo'])->defaults('resposta', 'recusar');
});
Route::middleware($escolares)->group(function () {
    Route::post('vinculos/resgatar', [Codigos::class, 'resgatar']);
    Route::get('vinculos/enviados', [Codigos::class, 'enviados']);
});

Route::middleware($admin)->prefix('admin')->group(function () {
    $perfis = ['estudantes' => 'estudante', 'professores' => 'professor',
        'psicologos-escolares' => 'psicologo_escolar', 'psicologos-clinicos' => 'psicologo_clinico'];
    foreach ($perfis as $rota => $tipo) {
        Route::get($rota, [Cadastros::class, 'listar'])->defaults('tipo', $tipo);
        Route::post($rota, [Cadastros::class, 'criar'])->defaults('tipo', $tipo);
        Route::get("{$rota}/{id}", [Cadastros::class, 'ver'])->defaults('tipo', $tipo);
        Route::patch("{$rota}/{id}", [Cadastros::class, 'atualizar'])->defaults('tipo', $tipo);
        Route::delete("{$rota}/{id}", [Cadastros::class, 'desativar'])->defaults('tipo', $tipo);
    }

    foreach (['professores', 'psicologos-escolares', 'psicologos-clinicos'] as $tipo) {
        Route::get("vinculos/{$tipo}", [Cadastros::class, 'listarVinculos'])->defaults('tipo', $tipo);
        Route::post("vinculos/{$tipo}", [Cadastros::class, 'criarVinculo'])->defaults('tipo', $tipo);
        Route::delete("vinculos/{$tipo}", [Cadastros::class, 'removerVinculo'])->defaults('tipo', $tipo);
    }

    Route::get('codigos-cadastro', [Codigos::class, 'listarCadastro']);
    Route::post('codigos-cadastro', [Codigos::class, 'criarCadastro']);
    Route::post('codigos-cadastro/{id}/revogar', [Codigos::class, 'revogarCadastro']);


    Route::get('emails', [Emails::class, 'emails']);
    Route::post('emails', [Emails::class, 'processarEmails']);
});

// Observações escolares agrupadas por estudante, sem expor alertas ao clínico.
Route::get('estudantes/{id}/observacoes', [Alertas::class, 'observacoesDoEstudante'])->middleware('conta:professor,psicologo_escolar,psicologo_clinico');
// Professor e psicólogo escolar registram observações mesmo sem alerta (V13).
Route::post('estudantes/{id}/observacoes', [Alertas::class, 'observarEstudante'])->middleware($escolares);
