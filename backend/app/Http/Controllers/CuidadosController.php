<?php

namespace App\Http\Controllers;

use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CuidadosController extends Controller
{
    public function listar(Request $request)
    {
        $registros = [];
        foreach (DB::table('cuidado_estudante')->where('id_estudante', $this->conta($request)->idPerfil())->orderBy('dia')->get() as $r) {
            $registros[$r->dia][] = $r->cuidado;
        }

        return $this->json((object) $registros);
    }

    public function atualizar(Request $request)
    {
        $e = $this->entrada($request);
        $c = $e->escolha('cuidado', ['agua', 'alongar', 'longe', 'fruta', 'caminhar', 'conversar', 'sono', 'desenhar', 'cores', 'musica', 'gentileza', 'gratidao', 'natureza', 'dancar', 'arrumar', 'careta', 'notificacoes', 'playlist', 'escrever', 'limites', 'hobby', 'pausatela', 'prioridade', 'reconhecer']);
        $feito = $e->booleano('feito');
        $e->falharSeHouverErros();
        if ($request->input('id_estudante') !== $this->conta($request)->idPerfil()) {
            throw ErroApi::proibido('A conta mudou. Entre novamente.');
        }
        $chave = ['id_estudante' => $this->conta($request)->idPerfil(), 'dia' => Formato::agora()->setTimezone(Formato::FUSO)->format('Y-m-d'), 'cuidado' => $c];
        if (!$feito) {
            throw ErroApi::campos(['feito' => ['Um cuidado concluído não pode ser desmarcado.']]);
        }
        DB::table('cuidado_estudante')->insertOrIgnore($chave);

        return $this->listar($request);
    }
}
