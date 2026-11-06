<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class Emails
{
    public static function agendar(): void
    {
        if (config('mkpause.email.envio_automatico')) {
            app()->terminating(function () {
                try {
                    self::processar();
                } catch (Throwable $erro) {
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

    private static function mensagem(object $item): ?array
    {
        if ($item->id_convite) {
            $c = DB::table('convite_responsavel as c')
                ->join('responsavel as r', 'r.id_responsavel', '=', 'c.id_responsavel')
                ->join('estudante as e', 'e.id_estudante', '=', 'c.id_estudante')
                ->join('usuario as ue', 'ue.id_usuario', '=', 'e.id_usuario')
                ->where('c.id_convite', $item->id_convite)
                ->select('c.*', 'r.ativo as responsavel_ativo', 'r.email as responsavel_email',
                    'e.ativo as estudante_ativo', 'ue.ativo as usuario_estudante_ativo')->first();
            if (!$c || $c->status !== 'PENDENTE' || Formato::instante($c->expira_em) <= Formato::agora()
                || !$c->responsavel_ativo || !$c->estudante_ativo || !$c->usuario_estudante_ativo
                || $c->responsavel_email !== $item->email_destino) {
                return null;
            }
            return ['MKpause: convite para responsável',
                "A escola enviou um convite para confirmar sua responsabilidade e conhecer a autorização proposta.\n\n"
                .'Leia e responda pelo link: '.Convites::link($c)."\n\n"
                .'O link é pessoal e vale por sete dias. Se não reconhecer o convite, não aceite. '
                .'Nenhuma conta será criada para você.'];
        }

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

    private static function remetente(string $texto): array
    {
        return preg_match('/^\s*(.*?)\s*<([^>]+)>\s*$/', $texto, $m) ? [$m[1] ?: null, $m[2]] : [null, trim($texto)];
    }
}
