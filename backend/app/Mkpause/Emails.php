<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Fila durável de e-mails (tabela notificacao_email). O sucesso do SMTP indica aceitação
 * pelo servidor, não leitura ou entrega final.
 *
 * Com EMAIL_ENVIO_AUTOMATICO=1 a fila é processada logo depois da resposta; senão, pelo
 * comando `php artisan mkpause:processar-emails` ou pelo botão da tela de e-mails do admin.
 */
class Emails
{
    public static function agendar(): void
    {
        if (config('mkpause.email.envio_automatico')) {
            app()->terminating(function () {
                try {
                    self::processar();
                } catch (Throwable $erro) {
                    // Não registra corpos de e-mail, tokens nem endereços pessoais.
                    Log::error('Falha ao processar fila de e-mail: '.class_basename($erro));
                }
            });
        }
    }

    public static function caixaLocal(): bool
    {
        return config('mkpause.email.modo') === 'arquivo';
    }

    public static function processar(int $limite = 50): int
    {
        $enviados = 0;
        $agora = Formato::agora();
        // Recupera trabalho interrompido por reinício do processo. SMTP não oferece exactly-once.
        DB::table('notificacao_email')->where('status', 'PROCESSANDO')
            ->where('processando_em', '<', Formato::banco($agora->subMinutes(5)))
            ->update(['status' => 'FALHA', 'disponivel_em' => Formato::banco($agora), 'erro' => 'Processamento interrompido']);

        for ($i = 0; $i < $limite; $i++) {
            $item = DB::transaction(function () {
                $item = DB::table('notificacao_email')->whereIn('status', ['PENDENTE', 'FALHA'])->where('tentativas', '<', 5)
                    ->where('disponivel_em', '<=', Formato::banco(Formato::agora()))
                    ->orderBy('criado_em')->orderBy('id_notificacao')->lock('FOR UPDATE SKIP LOCKED')->first();
                if ($item) {
                    DB::table('notificacao_email')->where('id_notificacao', $item->id_notificacao)->update([
                        'status' => 'PROCESSANDO', 'processando_em' => Formato::banco(Formato::agora()),
                        'tentativas' => $item->tentativas + 1]);
                }
                return $item;
            });
            if ($item === null) {
                break;
            }
            try {
                $conteudo = self::mensagem($item);
                if ($conteudo === null) {
                    DB::table('notificacao_email')->where('id_notificacao', $item->id_notificacao)
                        ->where('status', 'PROCESSANDO')->update(['status' => 'CANCELADA']);
                    continue;
                }
                self::enviar($item->email_destino, ...$conteudo);
            } catch (Throwable $erro) {
                DB::table('notificacao_email')->where('id_notificacao', $item->id_notificacao)->where('status', 'PROCESSANDO')
                    ->update(['status' => 'FALHA', 'erro' => mb_substr(class_basename($erro), 0, 120),
                        'disponivel_em' => Formato::banco(Formato::agora()->addMinutes(5))]);
                if ($item->id_destinatario_alerta) {
                    DB::table('destinatario_alerta')->where('id_destinatario_alerta', $item->id_destinatario_alerta)
                        ->where('status_notificacao', '!=', 'LIDA')->update(['status_notificacao' => 'FALHA']);
                }
                continue;
            }
            $enviado = Formato::banco(Formato::agora());
            DB::table('notificacao_email')->where('id_notificacao', $item->id_notificacao)->where('status', 'PROCESSANDO')
                ->update(['status' => 'ENVIADA', 'enviado_em' => $enviado, 'erro' => null]);
            if ($item->id_destinatario_alerta) {
                DB::table('destinatario_alerta')->where('id_destinatario_alerta', $item->id_destinatario_alerta)
                    ->update(['enviado_em' => $enviado]);
                DB::table('destinatario_alerta')->where('id_destinatario_alerta', $item->id_destinatario_alerta)
                    ->where('status_notificacao', '!=', 'LIDA')->update(['status_notificacao' => 'ENVIADA']);
            }
            $enviados++;
        }
        return $enviados;
    }

    /** [assunto, corpo], ou null quando o e-mail não deve mais sair. */
    private static function mensagem(object $item): ?array
    {
        if ($item->id_convite || !$item->id_destinatario_alerta) return null;

        // Confere o vínculo de novo antes de enviar uma notificação pendente.
        $d = DB::table('destinatario_alerta as d')->join('alerta as a', 'a.id_alerta', '=', 'd.id_alerta')
            ->join('usuario as u', 'u.id_usuario', '=', 'd.id_usuario')
            ->where('d.id_destinatario_alerta', $item->id_destinatario_alerta)
            ->select('a.status as status_alerta', 'a.id_estudante', 'u.*')->first();
        $conta = $d && $d->ativo ? Conta::comPerfil($d) : null;
        if (!$d || in_array($d->status_alerta, ['CANCELADO', 'RESOLVIDO'], true) || !$d->ativo
            || $d->email !== $item->email_destino || $conta === null
            || !Permissoes::estudantesVinculados($conta)->where('e.id_estudante', $d->id_estudante)->exists()) {
            return null;
        }
        return ['MKpause: novo aviso para acompanhar',
            "Há um novo aviso no MKpause para você acompanhar. Entre com sua conta para consultar.\n\n"
            .config('mkpause.public_base_url')."/entrar\n\n"
            .'Este e-mail não substitui o acompanhamento presencial. Não contém dados emocionais do estudante.'];
    }

    private static function enviar(string $para, string $assunto, string $corpo): void
    {
        $cfg = config('mkpause.email');
        if (self::caixaLocal()) {
            // Desenvolvimento: cada mensagem vira um arquivo em backend/.emails.
            if (!is_dir($cfg['pasta'])) {
                mkdir($cfg['pasta'], 0775, true);
            }
            $nome = date('Ymd-His').'-'.bin2hex(random_bytes(4)).'.log';
            file_put_contents($cfg['pasta'].DIRECTORY_SEPARATOR.$nome,
                "From: {$cfg['remetente']}\nTo: {$para}\nSubject: {$assunto}\n\n{$corpo}\n");
            return;
        }
        config(['mail.mailers.mkpause' => [
            'transport' => 'smtp', 'host' => $cfg['host'], 'port' => $cfg['porta'],
            'username' => $cfg['usuario'] ?: null, 'password' => $cfg['senha'] ?: null,
            'scheme' => $cfg['ssl'] ? 'smtps' : 'smtp', 'timeout' => 10,
            'require_tls' => $cfg['tls'],
        ]]);
        [$nome, $endereco] = self::remetente($cfg['remetente']);
        Mail::mailer('mkpause')->raw($corpo, function ($m) use ($para, $assunto, $nome, $endereco) {
            $m->from($endereco, $nome)->to($para)->subject($assunto);
        });
    }

    /** "MKpause <nao-responda@x>" -> [nome, endereço]. */
    private static function remetente(string $texto): array
    {
        return preg_match('/^\s*(.*?)\s*<([^>]+)>\s*$/', $texto, $m) ? [$m[1] ?: null, $m[2]] : [null, trim($texto)];
    }
}
