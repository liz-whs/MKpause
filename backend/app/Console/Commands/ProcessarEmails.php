<?php

namespace App\Console\Commands;

use App\Mkpause\Emails;
use Illuminate\Console\Command;

class ProcessarEmails extends Command
{
    protected $signature = 'mkpause:processar-emails {--limite=50}';
    protected $description = 'Processa a fila de e-mail pendente e tenta novamente falhas disponíveis (até cinco tentativas).';

    public function handle(): int
    {
        $enviados = Emails::processar(max(0, min((int) $this->option('limite'), 500)));
        $this->line("{$enviados} e-mail(s) aceito(s) pelo backend de envio configurado.");
        return self::SUCCESS;
    }
}
