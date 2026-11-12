<?php

namespace App\Console\Commands;

use App\Mkpause\CatalogoAtividades;
use App\Mkpause\Escola;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * php artisan mkpause:escola-unica
 *
 * MVP: reúne todas as contas e códigos de cadastro na escola principal (a mais antiga),
 * para que contas antigas sem escola (V7) e de outras escolas voltem a aparecer e funcionar.
 * O nome da instituição de cada perfil (instituicao_ensino) não muda.
 * Roda a cada deploy; não faz nada com MKPAUSE_ESCOLA_UNICA=false.
 */
class EscolaUnica extends Command
{
    protected $signature = 'mkpause:escola-unica';

    protected $description = 'MVP: coloca todas as contas na mesma escola (MKPAUSE_ESCOLA_UNICA).';

    public function handle(): int
    {
        if (! Escola::unica()) {
            $this->line('Escola única desligada (MKPAUSE_ESCOLA_UNICA=false): nada a fazer.');

            return self::SUCCESS;
        }
        Banco::exigir($this);
        [$principal, $contas, $codigos] = DB::transaction(function () {
            // Evita dois deploys reorganizando ao mesmo tempo.
            if (DB::connection()->getDriverName() === 'pgsql') {
                DB::select('SELECT pg_advisory_xact_lock(72843004)');
            }
            $principal = Escola::principal();
            $contas = DB::table('usuario')->where(fn ($q) => $q->whereNull('id_escola')->orWhere('id_escola', '<>', $principal))
                ->update(['id_escola' => $principal]);
            $codigos = DB::table('codigo_cadastro')->where(fn ($q) => $q->whereNull('id_escola')->orWhere('id_escola', '<>', $principal))
                ->update(['id_escola' => $principal]);

            return [$principal, $contas, $codigos];
        });
        CatalogoAtividades::sincronizar($principal);
        $nome = DB::table('escola')->where('id_escola', $principal)->value('nome');
        $this->info("Escola única: \"{$nome}\". Contas movidas: {$contas}. Códigos movidos: {$codigos}.");

        return self::SUCCESS;
    }
}
