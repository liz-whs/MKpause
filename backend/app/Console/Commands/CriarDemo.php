<?php

namespace App\Console\Commands;

use App\Mkpause\Formato;
use App\Mkpause\CatalogoAtividades;
use App\Mkpause\Senha;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CriarDemo extends Command
{
    protected $signature = 'mkpause:criar-demo {--senha= : Senha das contas de demonstração (padrão: DEMO_SENHA do .env)}
        {--migrar-senhas : Migra hashes PBKDF2 das contas demo existentes para Argon2id}';
    protected $description = 'Cria contas, vínculos e atividades de demonstração.';

    private const ESCOLA = 'Escola Modelo';

    public function handle(): int
    {
        if (!config('mkpause.demo_habilitada')) {
            $this->error('Contas de demonstração desabilitadas. Use MKPAUSE_DEMO=true apenas em ambiente isolado.');
            return self::FAILURE;
        }
        Banco::exigir($this);
        $senha = $this->option('senha') ?: config('mkpause.demo_senha');
        $minimo = config('mkpause.senha_tamanho_minimo');
        if (!$senha || mb_strlen($senha) < $minimo) {
            $this->error("Defina DEMO_SENHA no .env (pelo menos {$minimo} caracteres).");
            return self::FAILURE;
        }

        if ($this->option('migrar-senhas')) {
            return $this->migrarSenhas($senha);
        }

        DB::transaction(function () use ($senha) {
            $agora = Formato::banco(Formato::agora());
            DB::table('escola')->insertOrIgnore(['nome' => self::ESCOLA]);
            CatalogoAtividades::sincronizar((int) DB::table('escola')->where('nome', self::ESCOLA)->value('id_escola'));
            $est = $this->perfil('estudante', 'id_estudante', $this->usuario('ana.demo@mkpause.dev', 'Ana Lima', $senha),
                ['turma' => '8º A', 'instituicao_ensino' => self::ESCOLA]);
            $prof = $this->perfil('professor', 'id_professor', $this->usuario('professor.demo@mkpause.dev', 'Marcos Prado', $senha),
                ['cargo' => 'Matemática', 'instituicao_ensino' => self::ESCOLA]);
            $pe = $this->perfil('psicologo_escolar', 'id_psicologo_escolar',
                $this->usuario('psicologo.demo@mkpause.dev', 'Paula Esteves', $senha),
                ['registro_profissional' => '08/12345', 'estado_registro' => 'PR', 'instituicao_ensino' => self::ESCOLA]);
            $pc = $this->perfil('psicologo_clinico', 'id_psicologo_clinico',
                $this->usuario('clinico.demo@mkpause.dev', 'Carlos Pires', $senha),
                ['registro_profissional' => '08/54321', 'estado_registro' => 'PR']);
            $this->perfil('administrador', 'id_administrador', $this->usuario('admin.demo@mkpause.dev', 'Admin Demo', $senha), []);

            foreach ([['professor_estudante', 'id_professor', $prof], ['psicologo_escolar_estudante', 'id_psicologo_escolar', $pe],
                         ['psicologo_clinico_estudante', 'id_psicologo_clinico', $pc]] as [$tabela, $coluna, $id]) {
                $chave = [$coluna => $id, 'id_estudante' => $est];
                if (!DB::table($tabela)->where($chave)->exists()) {
                    DB::table($tabela)->insert($chave + ['ativo' => true, 'criado_em' => $agora]);
                }
            }
        });
        $this->info('Demonstração pronta.');
        return self::SUCCESS;
    }

    private function migrarSenhas(string $senha): int
    {
        if (!Senha::argon2idDisponivel()) {
            $this->error('mkpause.demo.migracao PHP sem suporte a Argon2id.');
            return self::FAILURE;
        }

        $escola = DB::table('escola')->where('nome', self::ESCOLA)->value('id_escola');
        if ($escola === null) {
            $this->error('mkpause.demo.migracao Escola Modelo não encontrada.');
            return self::FAILURE;
        }

        $contas = DB::table('usuario')->where('id_escola', $escola)
            ->whereRaw('LOWER(email) LIKE ?', ['%.demo@mkpause.dev'])
            ->orderBy('id_usuario')->get(['id_usuario', 'senha_hash']);
        $migradas = $prontas = $ignoradas = 0;
        foreach ($contas as $conta) {
            $hash = $conta->senha_hash;
            if (str_starts_with($hash, '$argon2id$')) {
                $prontas++;
                continue;
            }
            if (!str_starts_with($hash, 'pbkdf2_sha256$') || !Senha::conferir($senha, $hash)) {
                $ignoradas++;
                continue;
            }

            $novoHash = Senha::criar($senha);
            $alteradas = DB::table('usuario')->where('id_usuario', $conta->id_usuario)
                ->where('id_escola', $escola)->whereRaw('LOWER(email) LIKE ?', ['%.demo@mkpause.dev'])
                ->where('senha_hash', $hash)->update(['senha_hash' => $novoHash]);
            $migradas += $alteradas;
            $ignoradas += 1 - $alteradas;
        }

        $this->info("mkpause.demo.migracao total={$contas->count()} migradas={$migradas} ja_argon2id={$prontas} ignoradas={$ignoradas}");
        return $contas->isNotEmpty() && $ignoradas === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function usuario(string $email, string $nome, string $senha): int
    {
        $id = DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])->value('id_usuario');
        if ($id === null) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table('usuario')->insertGetId(['nome_completo' => $nome, 'email' => $email,
                'senha_hash' => Senha::criar($senha), 'ativo' => true, 'criado_em' => $agora, 'atualizado_em' => $agora],
                'id_usuario');
            $this->line("  conta {$email} criada");
        }
        DB::table('usuario')->where('id_usuario', $id)->update(['id_escola' => DB::table('escola')->where('nome', self::ESCOLA)->value('id_escola')]);
        return $id;
    }

    private function perfil(string $tabela, string $chave, int $idUsuario, array $padrao): int
    {
        $id = DB::table($tabela)->where('id_usuario', $idUsuario)->value($chave);
        if ($id === null) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table($tabela)->insertGetId($padrao + ['id_usuario' => $idUsuario, 'ativo' => true,
                'criado_em' => $agora, 'atualizado_em' => $agora], $chave);
        }
        return $id;
    }
}
