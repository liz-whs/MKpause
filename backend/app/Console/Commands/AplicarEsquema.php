<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * php artisan mkpause:aplicar-esquema
 *
 * Para hospedagem sem Flyway (ex.: Render + Neon): roda as migrações SQL de
 * database/migrations/ num banco vazio ou aplica V2/V3/V4 que faltam num banco com V1.
 * A V2 exige `responsavel` vazia; registros antigos precisam de migração de dados.
 * A V5 preserva valores antigos em estado e grava novas emoções em emocao.
 */
class AplicarEsquema extends Command
{
    protected $signature = 'mkpause:aplicar-esquema';
    protected $description = 'Aplica V1 a V13 ausentes no banco do mkpause (sem Flyway).';

    private const VERSOES = [
        ['V1__criacao_do_esquema_inicial.sql', ['usuario']],
        ['V2__ajusta_responsavel_como_contato.sql', ['responsavel']],
        ['V3__codigos_de_cadastro_e_vinculo.sql', ['codigo_cadastro', 'uso_codigo_cadastro', 'codigo_vinculo']],
        ['V4__convites_responsaveis_e_fila_email.sql', ['convite_responsavel', 'notificacao_email']],
        ['V5__emocoes_categoricas.sql', ['registro_humor']],
        ['V6__sessoes_autenticacao.sql', ['sessions']],
        ['V7__isolamento_escolas.sql', ['escola']],
        ['V8__cuidados_estudante.sql', ['cuidado_estudante']],
        ['V9__amplia_catalogo_cuidados.sql', ['cuidado_estudante']],
        ['V10__cuidados_adolescentes.sql', ['cuidado_estudante']],
        ['V11__primeiro_acesso_estudante.sql', ['estudante']],
        ['V12__horario_fim_alerta.sql', ['alerta']],
        ['V13__observacao_por_estudante.sql', ['observacao']],
    ];

    public function handle(): int
    {
        Banco::exigir($this);
        $pasta = dirname(base_path()).'/database/migrations';
        DB::transaction(function () use ($pasta) {
            // Evita dois deploys aplicarem o mesmo SQL ao mesmo tempo.
            DB::select('SELECT pg_advisory_xact_lock(72843003)');
            $tabelas = array_flip(array_column(Schema::getTables(), 'name'));
            foreach (self::VERSOES as [$nome, $marcas]) {
                $porColuna = ['V11__' => ['estudante', 'primeiro_acesso_concluido'], 'V12__' => ['alerta', 'finalizado_em'],
                    'V13__' => ['observacao', 'id_estudante']];
                if (isset($porColuna[strstr($nome, '__', true).'__'])) {
                    [$tabela, $coluna] = $porColuna[strstr($nome, '__', true).'__'];
                    if (Schema::hasColumn($tabela, $coluna)) {
                        $this->line("{$nome}: já aplicado.");
                        continue;
                    }
                    $this->line("Aplicando {$nome}...");
                    DB::unprepared(file_get_contents("{$pasta}/{$nome}"));
                    continue;
                }
                if (str_starts_with($nome, 'V9__') || str_starts_with($nome, 'V10__')) {
                    $marcador = str_starts_with($nome, 'V10__') ? 'reconhecer' : 'careta';
                    $regra = DB::selectOne("SELECT pg_get_constraintdef(oid) AS definicao FROM pg_constraint WHERE conrelid = 'cuidado_estudante'::regclass AND conname = 'cuidado_estudante_cuidado_check'");
                    if ($regra && str_contains($regra->definicao, $marcador)) {
                        $this->line("{$nome}: já aplicado.");
                        continue;
                    }
                    $this->line("Aplicando {$nome}...");
                    DB::unprepared(file_get_contents("{$pasta}/{$nome}"));
                    continue;
                }
                if (str_starts_with($nome, 'V5__')) {
                    $colunas = array_flip(Schema::getColumnListing('registro_humor'));
                    if (isset($colunas['emocao'])) {
                        $this->line("{$nome}: já aplicado.");
                        continue;
                    }
                    $this->line("Aplicando {$nome}...");
                    DB::unprepared(file_get_contents("{$pasta}/{$nome}"));
                    continue;
                }
                if (str_starts_with($nome, 'V2__')) {
                    $colunas = array_flip(Schema::getColumnListing('responsavel'));
                    if (isset($colunas['nome_completo'], $colunas['email']) && !isset($colunas['id_usuario'])) {
                        $this->line("{$nome}: já aplicado.");
                        continue;
                    }
                    if (!isset($colunas['id_usuario']) || isset($colunas['nome_completo']) || isset($colunas['email'])) {
                        throw new RuntimeException("Esquema parcial de {$nome}. Confira as colunas de responsavel.");
                    }
                    if (DB::table('responsavel')->exists()) {
                        throw new RuntimeException('V2 não aplicada: responsavel possui registros legados. '
                            .'Migre os dados antes de remover id_usuario; nenhum registro foi apagado.');
                    }
                    $this->line("Aplicando {$nome}...");
                    DB::unprepared(file_get_contents("{$pasta}/{$nome}"));
                    continue;
                }
                $presentes = array_filter($marcas, fn ($t) => isset($tabelas[$t]));
                if (count($presentes) === count($marcas)) {
                    $this->line("{$nome}: já aplicado.");
                    continue;
                }
                if ($presentes) {
                    throw new RuntimeException("Esquema parcial de {$nome}. Confira as tabelas antes de continuar.");
                }
                $this->line("Aplicando {$nome}...");
                DB::unprepared(file_get_contents("{$pasta}/{$nome}"));
                foreach ($marcas as $t) {
                    $tabelas[$t] = true;
                }
            }
        });
        $this->info('Esquema pronto (V1 a V13).');
        return self::SUCCESS;
    }
}
