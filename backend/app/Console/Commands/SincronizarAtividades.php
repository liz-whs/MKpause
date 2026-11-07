<?php

namespace App\Console\Commands;

use App\Mkpause\CatalogoAtividades;
use Illuminate\Console\Command;

class SincronizarAtividades extends Command
{
    protected $signature = 'mkpause:sincronizar-atividades';
    protected $description = 'Acrescenta atividades do catálogo sem criar usuários ou alterar suas senhas.';

    public function handle(): int
    {
        Banco::exigir($this);
        CatalogoAtividades::sincronizar();
        $this->info('Catálogo de atividades sincronizado.');
        return self::SUCCESS;
    }
}
