<?php

namespace App\Console\Commands;

use App\Mkpause\Formato;
use App\Mkpause\Senha;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CriarAdmin extends Command
{
    protected $signature = 'mkpause:criar-admin {--email= : E-mail do administrador} {--nome= : Nome} {--escola= : Nome da escola independente}
                            {--senha= : Evite em produção: fica no histórico do terminal}';
    protected $description = 'Cria um usuário administrador.';

    public function handle(): int
    {
        $email = mb_strtolower((string) $this->option('email'));
        $nome = (string) $this->option('nome');
        $escola = trim((string) $this->option('escola'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $nome === '' || $escola === '' || mb_strlen($escola) > 160) {
            $this->error('Informe --email válido, --nome e --escola.');
            return self::FAILURE;
        }
        Banco::exigir($this);
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
        DB::transaction(function () use ($email, $nome, $senha, $escola) {
            $agora = Formato::banco(Formato::agora());
            DB::table('escola')->insertOrIgnore(['nome' => $escola]);
            $idEscola = (int) DB::table('escola')->where('nome', $escola)->value('id_escola');
            \App\Mkpause\CatalogoAtividades::sincronizar($idEscola);
            $id = DB::table('usuario')->insertGetId(['id_escola' => $idEscola, 'nome_completo' => $nome, 'email' => $email,
                'senha_hash' => Senha::criar($senha), 'ativo' => true, 'criado_em' => $agora,
                'atualizado_em' => $agora], 'id_usuario');
            DB::table('administrador')->insert(['id_usuario' => $id, 'ativo' => true, 'criado_em' => $agora,
                'atualizado_em' => $agora]);
        });
        $this->info("Administrador {$email} criado.");
        return self::SUCCESS;
    }
}
