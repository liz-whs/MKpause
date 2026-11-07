<?php

namespace App\Http\Controllers;

use App\Mkpause\Emails;
use App\Mkpause\Formato;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Consulta e processamento da fila de avisos escolares. */
class EmailsController extends Controller
{
    public function emails(Request $request)
    {
        $lista = DB::table('notificacao_email')->whereNull('id_convite')->orderByDesc('criado_em')->orderByDesc('id_notificacao')->limit(100)->get();
        return $this->json(['caixa_local' => Emails::caixaLocal(), 'emails' => $lista->map(fn ($e) => [
            'id' => (int) $e->id_notificacao, 'para' => $e->email_destino, 'tipo' => 'ALERTA',
            'status' => $e->status, 'tentativas' => (int) $e->tentativas, 'criado_em' => Formato::utc($e->criado_em),
            'enviado_em' => Formato::utc($e->enviado_em), 'erro' => $e->erro,
        ])->all()]);
    }

    public function processarEmails(Request $request)
    {
        return $this->json(['processados' => Emails::processar(20), 'caixa_local' => Emails::caixaLocal()]);
    }
}
