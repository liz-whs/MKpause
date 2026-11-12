<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class VerificarEsquema extends Command
{
    protected $signature = 'mkpause:verificar-esquema';
    protected $description = 'Compara as colunas usadas pelo backend com as tabelas do banco.';

    private const IGNORADAS = ['flyway_schema_history'];

    public const COLUNAS = [
        'escola' => ['id_escola', 'nome'],
        'cuidado_estudante' => ['id_estudante', 'dia', 'cuidado'],
        'sessions' => ['id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity'],
        'usuario' => ['id_escola', 'id_usuario', 'nome_completo', 'email', 'senha_hash', 'ativo', 'criado_em', 'atualizado_em'],
        'estudante' => ['primeiro_acesso_concluido', 'id_estudante', 'id_usuario', 'data_nascimento', 'telefone', 'instituicao_ensino', 'turma', 'ativo', 'criado_em', 'atualizado_em'],
        'professor' => ['id_professor', 'id_usuario', 'telefone', 'instituicao_ensino', 'cargo', 'ativo', 'criado_em', 'atualizado_em'],
        'psicologo_escolar' => ['id_psicologo_escolar', 'id_usuario', 'telefone', 'registro_profissional', 'estado_registro', 'instituicao_ensino', 'ativo', 'criado_em', 'atualizado_em'],
        'psicologo_clinico' => ['id_psicologo_clinico', 'id_usuario', 'telefone', 'registro_profissional', 'estado_registro', 'ativo', 'criado_em', 'atualizado_em'],
        'responsavel' => ['id_responsavel', 'nome_completo', 'email', 'telefone', 'ativo', 'criado_em', 'atualizado_em'],
        'administrador' => ['id_administrador', 'id_usuario', 'ativo', 'criado_em', 'atualizado_em'],
        'professor_estudante' => ['id_professor', 'id_estudante', 'ativo', 'criado_em'],
        'psicologo_escolar_estudante' => ['id_psicologo_escolar', 'id_estudante', 'ativo', 'criado_em'],
        'psicologo_clinico_estudante' => ['id_psicologo_clinico', 'id_estudante', 'ativo', 'criado_em'],
        'estudante_responsavel' => ['id_estudante', 'id_responsavel', 'grau_parentesco', 'ativo', 'criado_em'],
        'atividade' => ['id_escola', 'id_atividade', 'nome', 'descricao', 'tipo', 'conteudo_ou_referencia', 'disponivel', 'criado_em', 'atualizado_em'],
        'sessao' => ['id_sessao', 'id_estudante', 'id_atividade', 'iniciada_em', 'terminada_em', 'nivel_avaliado', 'duracao_segundos', 'observacoes_sessao', 'status'],
        'registro_humor' => ['id_registro_humor', 'id_sessao', 'estado', 'emocao', 'momento', 'registrado_em'],
        'alerta' => ['id_alerta', 'id_estudante', 'id_sessao', 'nivel', 'criado_em', 'status', 'descricao', 'finalizado_em'],
        'destinatario_alerta' => ['id_destinatario_alerta', 'id_alerta', 'id_usuario', 'tipo_destinatario', 'status_notificacao', 'enviado_em', 'lido_em'],
        'observacao' => ['id_observacao', 'id_alerta', 'id_autor', 'conteudo', 'criado_em', 'atualizado_em', 'id_estudante'],
        'ficha_acompanhamento' => ['id_ficha', 'id_estudante', 'informacoes_acompanhamento', 'criada_em', 'atualizada_em', 'ativo'],
        'aviso' => ['id_aviso', 'titulo', 'conteudo', 'publicado_em', 'id_autor', 'publico_destinatario', 'ativo'],
        'codigo_cadastro' => ['id_escola', 'id_codigo_cadastro', 'codigo_hash', 'sufixo', 'perfil', 'id_administrador', 'turma', 'instituicao_ensino', 'usos_maximos', 'usos', 'expira_em', 'revogado_em', 'criado_em'],
        'uso_codigo_cadastro' => ['id_codigo_cadastro', 'id_usuario', 'usado_em'],
        'codigo_vinculo' => ['id_codigo_vinculo', 'codigo_hash', 'id_estudante', 'expira_em', 'revogado_em', 'id_professor', 'id_psicologo_escolar', 'resgatado_em', 'status', 'respondido_em', 'criado_em'],
        'convite_responsavel' => ['id_convite', 'nonce', 'id_estudante', 'id_responsavel', 'id_psicologo_clinico', 'id_administrador', 'email_destino', 'parentesco', 'termo_versao', 'termo_texto', 'status', 'criado_em', 'expira_em', 'respondido_em', 'revogado_em'],
        'notificacao_email' => ['id_notificacao', 'id_convite', 'id_destinatario_alerta', 'email_destino', 'status', 'tentativas', 'criado_em', 'disponivel_em', 'processando_em', 'enviado_em', 'erro'],
    ];

    public function handle(): int
    {
        Banco::exigir($this);
        $tabelasBanco = array_column(Schema::getTables(), 'name');
        $erros = $avisos = [];
        foreach (self::COLUNAS as $tabela => $usadas) {
            if (!in_array($tabela, $tabelasBanco, true)) {
                $erros[] = "a tabela '{$tabela}' não existe no banco.";
                continue;
            }
            $colunas = collect(Schema::getColumns($tabela))->keyBy('name');
            foreach (array_diff($usadas, $colunas->keys()->all()) as $coluna) {
                $erros[] = "{$tabela}.{$coluna}: o backend usa, mas não existe no banco.";
            }
            foreach ($colunas->except($usadas) as $nome => $c) {
                if (!$c['nullable'] && $c['default'] === null && !$c['auto_increment']) {
                    $erros[] = "{$tabela}.{$nome}: coluna nova NOT NULL sem valor padrão; inserções pelo backend vão falhar até o código ser atualizado.";
                } else {
                    $avisos[] = "{$tabela}.{$nome}: coluna nova no banco, ainda não usada pelo backend.";
                }
            }
        }
        foreach (array_diff($tabelasBanco, array_keys(self::COLUNAS), self::IGNORADAS) as $tabela) {
            $avisos[] = "{$tabela}: tabela nova no banco, sem uso no backend.";
        }
        foreach ($avisos as $a) {
            $this->warn("AVISO  {$a}");
        }
        foreach ($erros as $e) {
            $this->error("ERRO   {$e}");
        }
        if ($erros) {
            $this->error(count($erros).' diferença(s) que quebram o backend. Ajuste o código.');
            return self::FAILURE;
        }
        $this->info('Backend e banco conferem ('.count(self::COLUNAS).' tabelas).');
        return self::SUCCESS;
    }
}
