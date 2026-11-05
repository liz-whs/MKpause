<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

/**
 * Convite ao responsável (RN23–RN25). O banco não guarda o token do link nem cria login
 * para o responsável: o link é assinado com a DJANGO_SECRET_KEY (formato do Django).
 */
class Convites
{
    public const SAL = 'mkpause.convite-responsavel.v1';
    public const INVALIDO = 'Convite indisponível. Peça um novo à escola.';
    public const VERSAO = '2026-11-v1';
    public const VALIDADE_SEGUNDOS = 7 * 24 * 3600;

    public static function link(object $c): string
    {
        $token = AssinaturaDjango::assinar(['id' => (int) $c->id_convite, 'nonce' => (string) $c->nonce], self::SAL);
        return config('mkpause.public_base_url').'/convite-responsavel#token='.$token;
    }

    /** O link aparece na resposta só em desenvolvimento com a caixa local (para testar sem e-mail). */
    private static function testeLocal(): bool
    {
        return config('mkpause.debug') && Emails::caixaLocal();
    }

    public static function dados(object $c): array
    {
        $envio = DB::table('notificacao_email')->where('id_convite', $c->id_convite)->value('status');
        $nome = DB::table('responsavel')->where('id_responsavel', $c->id_responsavel)->value('nome_completo');
        $expirado = $c->status === 'PENDENTE' && Formato::instante($c->expira_em) <= Formato::agora();
        return [
            'id_convite' => (int) $c->id_convite, 'estudante' => (int) $c->id_estudante,
            'responsavel' => (int) $c->id_responsavel, 'nome_responsavel' => $nome,
            'email_destino' => $c->email_destino,
            'psicologo_clinico' => $c->id_psicologo_clinico === null ? null : (int) $c->id_psicologo_clinico,
            'status' => $expirado ? 'EXPIRADO' : $c->status,
            'criado_em' => Formato::utc($c->criado_em), 'expira_em' => Formato::utc($c->expira_em),
            'respondido_em' => Formato::utc($c->respondido_em),
            'envio' => $envio, 'caixa_local' => Emails::caixaLocal(),
            'link_teste' => self::testeLocal() && $c->status === 'PENDENTE' ? self::link($c) : null,
        ];
    }

    public static function buscar(int $id): ?object
    {
        return DB::table('convite_responsavel')->where('id_convite', $id)->first();
    }

    /** Revoga e, se estava aceito, desfaz os vínculos que só ele sustentava. */
    public static function revogar(object $c): void
    {
        $eraAceito = $c->status === 'ACEITO';
        DB::table('convite_responsavel')->where('id_convite', $c->id_convite)
            ->update(['status' => 'REVOGADO', 'revogado_em' => Formato::banco(Formato::agora())]);
        DB::table('notificacao_email')->where('id_convite', $c->id_convite)->whereIn('status', ['PENDENTE', 'FALHA'])
            ->update(['status' => 'CANCELADA']);
        if (!$eraAceito) {
            return;
        }
        $outros = fn () => DB::table('convite_responsavel as c')->join('responsavel as r', 'r.id_responsavel', '=', 'c.id_responsavel')
            ->where('c.id_estudante', $c->id_estudante)->where('c.status', 'ACEITO')->where('r.ativo', true)
            ->where('c.id_convite', '!=', $c->id_convite);
        if (!$outros()->where('c.id_responsavel', $c->id_responsavel)->exists()) {
            DB::table('estudante_responsavel')->where('id_estudante', $c->id_estudante)
                ->where('id_responsavel', $c->id_responsavel)->update(['ativo' => false]);
        }
        if ($c->id_psicologo_clinico && !$outros()->where('c.id_psicologo_clinico', $c->id_psicologo_clinico)->exists()) {
            DB::table('psicologo_clinico_estudante')->where('id_estudante', $c->id_estudante)
                ->where('id_psicologo_clinico', $c->id_psicologo_clinico)->update(['ativo' => false]);
        }
    }

    /** Abre o convite do token; lança 400 com a mensagem única se não puder ser usado. */
    public static function obter(Entrada $e, bool $bloquear = false): object
    {
        $token = $e->texto('token', max: 1000);
        $e->falharSeHouverErros();
        $dados = AssinaturaDjango::abrir($token, self::SAL, self::VALIDADE_SEGUNDOS);
        $c = null;
        if ($dados && isset($dados['id'], $dados['nonce']) && is_int($dados['id'])
            && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $dados['nonce'])) {
            $c = DB::table('convite_responsavel')->where('id_convite', $dados['id'])->where('nonce', $dados['nonce'])->first();
        }
        if ($c && $bloquear) {
            DB::table('estudante')->where('id_estudante', $c->id_estudante)->lockForUpdate()->first();
            $c = DB::table('convite_responsavel')->where('id_convite', $c->id_convite)->lockForUpdate()->first();
        }
        if ($c === null || !self::utilizavel($c)) {
            throw ErroApi::invalido(self::INVALIDO);
        }
        return $c;
    }

    private static function utilizavel(object $c): bool
    {
        if ($c->status !== 'PENDENTE' || Formato::instante($c->expira_em) <= Formato::agora()) {
            return false;
        }
        $responsavel = DB::table('responsavel')->where('id_responsavel', $c->id_responsavel)->first();
        $estudante = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', $c->id_estudante)->select('e.ativo', 'u.ativo as usuario_ativo')->first();
        if (!$responsavel || !$responsavel->ativo || $c->email_destino !== $responsavel->email
            || !$estudante || !$estudante->ativo || !$estudante->usuario_ativo) {
            return false;
        }
        if ($c->id_psicologo_clinico) {
            $clinico = DB::table('psicologo_clinico as p')->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
                ->where('p.id_psicologo_clinico', $c->id_psicologo_clinico)->select('p.ativo', 'u.ativo as usuario_ativo')->first();
            if (!$clinico || !$clinico->ativo || !$clinico->usuario_ativo) {
                return false;
            }
        }
        return true;
    }
}
