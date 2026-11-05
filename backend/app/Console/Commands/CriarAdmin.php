<?php

namespace App\Console\Commands;

use App\Mkpause\Formato;
use App\Mkpause\SenhaDjango;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * php artisan mkpause:criar-admin --email=admin@escola.br --nome="Administração"
 *
 * Cria um administrador (usuario + administrador). Sem cadastro público de admin,
 * é a forma de entrar no sistema pela primeira vez. A senha é pedida no terminal.
 */
class CriarAdmin extends Command
{
    protected $signature = 'mkpause:criar-admin {--email= : E-mail do administrador} {--nome= : Nome}
                            {--senha= : Evite em produção: fica no histórico do terminal}';
    protected $description = 'Cria um usuário administrador.';

    public function handle(): int
    {
        $email = mb_strtolower((string) $this->option('email'));
        $nome = (string) $this->option('nome');
        if ($email === '' || $nome === '') {
            $this->error('Informe --email e --nome.');
            return self::FAILURE;
        }
        Banco::exigir($this); // antes de pedir a senha, para não parecer travado
        if (DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])->exists()) {
            $this->error('Já existe uma conta com este e-mail.');
            return self::FAILURE;
        }
        $senha = $this->option('senha') ?: $this->secret('Senha (o que você digita não aparece na tela, é normal)');
        $minimo = config('mkpause.senha_tamanho_minimo');
        if (mb_strlen((string) $senha) < $minimo) {
            $this->error("A senha precisa de pelo menos {$minimo} caracteres.");
            return self::FAILURE;
        }
        DB::transaction(function () use ($email, $nome, $senha) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table('usuario')->insertGetId(['nome_completo' => $nome, 'email' => $email,
                'senha_hash' => SenhaDjango::criar($senha), 'ativo' => true, 'criado_em' => $agora,
                'atualizado_em' => $agora], 'id_usuario');
            DB::table('administrador')->insert(['id_usuario' => $id, 'ativo' => true, 'criado_em' => $agora,
                'atualizado_em' => $agora]);
        });
        $this->info("Administrador {$email} criado.");
        return self::SUCCESS;
    }
}
