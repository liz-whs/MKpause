<?php

namespace App\Console\Commands;

use App\Mkpause\Formato;
use App\Mkpause\SenhaPbkdf2;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CriarDemo extends Command
{
    protected $signature = 'mkpause:criar-demo {--senha= : Senha das contas de demonstração (padrão: DEMO_SENHA do .env)}';
    protected $description = 'Cria contas, vínculos e atividades de demonstração.';

    private const ESCOLA = 'Escola Modelo';

    private const ATIVIDADES = [
        ['Respire&Pause', 'RESPIRACAO', 'respiracao'],
        ['PianoPause', 'JOGO', '/jogos/pianopause/index.html'],
        ['MK Potion', 'JOGO', '/jogos/mkpotion/index.html'],
        ['MK Breath', 'VIDEO', 'video'],
    ];

    public function handle(): int
    {
        Banco::exigir($this);
        $senha = $this->option('senha') ?: config('mkpause.demo_senha');
        $minimo = config('mkpause.senha_tamanho_minimo');
        if (!$senha || mb_strlen($senha) < $minimo) {
            $this->error("Defina DEMO_SENHA no .env (pelo menos {$minimo} caracteres).");
            return self::FAILURE;
        }

        DB::transaction(function () use ($senha) {
            $agora = Formato::banco(Formato::agora());
            foreach (self::ATIVIDADES as [$nome, $tipo, $ref]) {
                if (!DB::table('atividade')->where('tipo', $tipo)->where('conteudo_ou_referencia', $ref)->exists()) {
                    DB::table('atividade')->insert(['nome' => $nome, 'tipo' => $tipo, 'conteudo_ou_referencia' => $ref,
                        'disponivel' => true, 'criado_em' => $agora, 'atualizado_em' => $agora]);
                }
                // Atualiza apenas nomes antigos conhecidos, preservando nomes personalizados.
                $antigos = $tipo === 'RESPIRACAO'
                    ? ['Respiração da chinchila', 'Chinchila respirando', 'Respiração']
                    : ($tipo === 'VIDEO' ? ['Vídeo: um minuto de calma', 'Respiração guiada em vídeo'] : []);
                if ($antigos) {
                    DB::table('atividade')->where('tipo', $tipo)->where('conteudo_ou_referencia', $ref)
                        ->whereIn('nome', $antigos)->update(['nome' => $nome, 'atualizado_em' => $agora]);
                }
            }
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

    private function usuario(string $email, string $nome, string $senha): int
    {
        $id = DB::table('usuario')->whereRaw('UPPER(email) = UPPER(?)', [$email])->value('id_usuario');
        if ($id === null) {
            $agora = Formato::banco(Formato::agora());
            $id = DB::table('usuario')->insertGetId(['nome_completo' => $nome, 'email' => $email,
                'senha_hash' => SenhaPbkdf2::criar($senha), 'ativo' => true, 'criado_em' => $agora, 'atualizado_em' => $agora],
                'id_usuario');
            $this->line("  conta {$email} criada");
        }
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
