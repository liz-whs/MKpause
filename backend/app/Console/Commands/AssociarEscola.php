<?php

namespace App\Console\Commands;

use App\Mkpause\CatalogoAtividades;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AssociarEscola extends Command
{
    protected $signature = 'mkpause:associar-escola {email} {escola : Nome da instituição}';

    protected $description = 'Associa explicitamente uma conta sem escola e prepara seu catálogo.';

    public function handle(): int
    {
        $email = mb_strtolower(trim($this->argument('email')));
        $nome = trim($this->argument('escola'));
        if ($nome === '' || mb_strlen($nome) > 160) {
            $this->error('Nome de escola inválido.');

            return self::FAILURE;
        }
        $ok = DB::transaction(function () use ($email, $nome) {
            $u = DB::table('usuario')->whereRaw('LOWER(email)=?', [$email])->lockForUpdate()->first();
            if (! $u) {
                $this->error('Conta não encontrada.');

                return false;
            }
            DB::table('escola')->insertOrIgnore(['nome' => $nome]);
            $id = (int) DB::table('escola')->where('nome', $nome)->value('id_escola');
            if ($u->id_escola !== null && (int) $u->id_escola !== $id) {
                $this->error('Conta já associada a outra escola. Transferência exige revisão dos vínculos existentes.');

                return false;
            }
            DB::table('usuario')->where('id_usuario', $u->id_usuario)->update(['id_escola' => $id]);
            CatalogoAtividades::sincronizar($id);

            return true;
        });
        if (! $ok) {
            return self::FAILURE;
        }
        $this->info('Escola associada. Faça login novamente.');

        return self::SUCCESS;
    }
}
