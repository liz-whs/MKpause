<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class AplicarEsquema extends Command
{
    protected $signature = 'mkpause:aplicar-esquema';
    protected $description = 'Aplica V1 a V4 ausentes no banco do MKpause (sem Flyway).';

    private const VERSOES = [
        ['V1__criacao_do_esquema_inicial.sql', ['usuario']],
        ['V2__ajusta_responsavel_como_contato.sql', ['responsavel']],
        ['V3__codigos_de_cadastro_e_vinculo.sql', ['codigo_cadastro', 'uso_codigo_cadastro', 'codigo_vinculo']],
        ['V4__convites_responsaveis_e_fila_email.sql', ['convite_responsavel', 'notificacao_email']],
    ];

    public function handle(): int
    {
        Banco::exigir($this);
        $pasta = dirname(base_path()).'/database/migrations';
        DB::transaction(function () use ($pasta) {
            DB::select('SELECT pg_advisory_xact_lock(72843003)');
            $tabelas = array_flip(array_column(Schema::getTables(), 'name'));
            foreach (self::VERSOES as [$nome, $marcas]) {
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
        $this->info('Esquema pronto (V1 a V4).');
        return self::SUCCESS;
    }
}
