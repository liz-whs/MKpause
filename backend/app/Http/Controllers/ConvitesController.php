<?php

namespace App\Http\Controllers;

use App\Mkpause\Convites;
use App\Mkpause\Emails;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use App\Mkpause\Formato;
use App\Mkpause\Limite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Convite ao responsável e e-mails.
 *
 * GET/POST /api/admin/estudantes/<id>/convites-responsavel/   admin lista e envia
 * POST     /api/admin/convites-responsavel/<id>/revogar/       admin
 * POST     /api/convites-responsavel/verificar/ {"token"}      público (link do e-mail)
 * POST     /api/convites-responsavel/aceitar/ | recusar/       público
 * GET/POST /api/admin/emails/                                  admin vê a fila / processa agora
 */
class ConvitesController extends Controller
{
    public function listar(Request $request, $id)
    {
        $estudante = self::id($id);
        DB::table('estudante')->where('id_estudante', $estudante)->exists() ?: throw ErroApi::semRegistro('Estudante');
        $lista = DB::table('convite_responsavel')->where('id_estudante', $estudante)
            ->orderByDesc('criado_em')->orderByDesc('id_convite')->get();
        return $this->json($lista->map(fn ($c) => Convites::dados($c))->all());
    }

    public function criar(Request $request, $id)
    {
        $e = $this->entrada($request);
        $d = [
            'responsavel' => $e->inteiro('responsavel', obrigatorio: false),
            'nome_completo' => $e->texto('nome_completo', max: 150, obrigatorio: false),
            'email' => $e->email('email', obrigatorio: false),
            'telefone' => $e->texto('telefone', max: 30, obrigatorio: false, vazio: true),
            'parentesco' => $e->texto('parentesco', max: 60, obrigatorio: false, vazio: true),
            'psicologo_clinico' => $e->inteiro('psicologo_clinico', obrigatorio: false, nulo: true),
        ];
        $e->falharSeHouverErros();
        $d = array_map(fn ($v) => $v === Entrada::AUSENTE ? null : $v, $d);
        if (!$d['responsavel'] && !($d['nome_completo'] && $d['email'])) {
            throw ErroApi::campos(['non_field_errors' => ['Informe nome e e-mail do responsável.']]);
        }
        $idEstudante = self::id($id);
        $admin = $this->conta($request)->idPerfil();

        $c = DB::transaction(function () use ($d, $idEstudante, $admin) {
            $estudante = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
                ->where('e.id_estudante', $idEstudante)->where('e.ativo', true)->where('u.ativo', true)
                ->lockForUpdate()->select('e.*')->first() ?? throw ErroApi::semRegistro('Estudante');
            $clinico = null;
            if ($d['psicologo_clinico']) {
                $clinico = DB::table('psicologo_clinico as p')->join('usuario as u', 'u.id_usuario', '=', 'p.id_usuario')
                    ->where('p.id_psicologo_clinico', $d['psicologo_clinico'])->where('p.ativo', true)->where('u.ativo', true)
                    ->select('p.*', 'u.nome_completo')->first() ?? throw ErroApi::semRegistro('PsicologoClinico');
            }
            $agora = Formato::agora();
            if ($d['responsavel']) {
                $contato = DB::table('responsavel')->where('id_responsavel', $d['responsavel'])->where('ativo', true)->first()
                    ?? throw ErroApi::semRegistro('Responsavel');
                if (!$contato->email) {
                    throw ErroApi::campos(['email' => 'Cadastre um e-mail para o responsável.']);
                }
            } else {
                $contato = DB::table('responsavel')->where('nome_completo', $d['nome_completo'])
                    ->whereRaw('UPPER(email) = UPPER(?)', [$d['email']])->where('ativo', true)->orderBy('id_responsavel')->first();
                if ($contato === null) {
                    $idContato = DB::table('responsavel')->insertGetId([
                        'nome_completo' => $d['nome_completo'], 'email' => mb_strtolower($d['email']),
                        'telefone' => $d['telefone'] ?: null, 'ativo' => true,
                        'criado_em' => Formato::banco($agora), 'atualizado_em' => Formato::banco($agora),
                    ], 'id_responsavel');
                    $contato = DB::table('responsavel')->where('id_responsavel', $idContato)->first();
                }
            }
            DB::table('convite_responsavel')->where('id_estudante', $estudante->id_estudante)
                ->where(fn ($q) => $clinico ? $q->where('id_psicologo_clinico', $clinico->id_psicologo_clinico)
                    : $q->whereNull('id_psicologo_clinico'))
                ->where('status', 'PENDENTE')->update(['status' => 'REVOGADO', 'revogado_em' => Formato::banco($agora)]);

            $termo = 'Confirmo que sou responsável pelo estudante indicado e autorizo o vínculo do meu contato com ele no MKpause.';
            if ($clinico) {
                $termo .= " Autorizo {$clinico->nome_completo}, CRP {$clinico->registro_profissional}/{$clinico->estado_registro}, "
                    .'a acompanhar o estudante no MKpause e acessar seus registros de pausas, humores, alertas e ficha de acompanhamento.';
            }
            $termo .= ' Posso solicitar à escola a revogação desta autorização. Não preciso criar uma conta.';

            $idConvite = DB::table('convite_responsavel')->insertGetId([
                'nonce' => (string) Str::uuid(), 'id_estudante' => $estudante->id_estudante,
                'id_responsavel' => $contato->id_responsavel, 'id_psicologo_clinico' => $clinico?->id_psicologo_clinico,
                'id_administrador' => $admin, 'email_destino' => $contato->email, 'parentesco' => $d['parentesco'] ?: null,
                'termo_versao' => Convites::VERSAO, 'termo_texto' => $termo, 'status' => 'PENDENTE',
                'criado_em' => Formato::banco($agora), 'expira_em' => Formato::banco($agora->addDays(7)),
            ], 'id_convite');
            DB::table('notificacao_email')->insert([
                'id_convite' => $idConvite, 'email_destino' => $contato->email, 'status' => 'PENDENTE', 'tentativas' => 0,
                'criado_em' => Formato::banco($agora), 'disponivel_em' => Formato::banco($agora),
            ]);
            return Convites::buscar($idConvite);
        });
        Emails::agendar();
        return $this->json(Convites::dados($c), 201);
    }

    public function revogar(Request $request, $id)
    {
        $c = DB::transaction(function () use ($id) {
            $inicial = Convites::buscar(self::id($id)) ?? throw ErroApi::semRegistro('ConviteResponsavel');
            DB::table('estudante')->where('id_estudante', $inicial->id_estudante)->lockForUpdate()->first();
            $c = DB::table('convite_responsavel')->where('id_convite', $inicial->id_convite)->lockForUpdate()->first();
            Convites::revogar($c);
            return Convites::buscar($c->id_convite);
        });
        return $this->json(Convites::dados($c));
    }

    // ----------------------------------------------------- público (link do e-mail)

    public function verificar(Request $request)
    {
        Limite::exigir($request, 'convite');
        $c = Convites::obter($this->entrada($request));
        $estudante = DB::table('estudante as e')->join('usuario as u', 'u.id_usuario', '=', 'e.id_usuario')
            ->where('e.id_estudante', $c->id_estudante)->value('u.nome_completo');
        $responsavel = DB::table('responsavel')->where('id_responsavel', $c->id_responsavel)->value('nome_completo');
        return $this->json(['estudante' => self::primeiroNome($estudante), 'responsavel' => self::primeiroNome($responsavel),
            'termo' => $c->termo_texto, 'versao' => $c->termo_versao, 'expira_em' => Formato::utc($c->expira_em)]);
    }

    public function responder(Request $request, string $resposta)
    {
        Limite::exigir($request, 'convite');
        $e = $this->entrada($request);
        $status = DB::transaction(function () use ($e, $resposta) {
            $c = Convites::obter($e, bloquear: true);
            if ($resposta === 'aceitar') {
                if ($e->bruto('confirmo_responsabilidade') !== true || $e->bruto('aceito_termo') !== true) {
                    throw ErroApi::invalido('Confirme sua responsabilidade e leia a autorização antes de aceitar.');
                }
                $agora = Formato::banco(Formato::agora());
                self::ativarVinculo('estudante_responsavel', ['id_estudante' => $c->id_estudante,
                    'id_responsavel' => $c->id_responsavel], ['grau_parentesco' => $c->parentesco], $agora);
                if ($c->id_psicologo_clinico) {
                    self::ativarVinculo('psicologo_clinico_estudante', ['id_estudante' => $c->id_estudante,
                        'id_psicologo_clinico' => $c->id_psicologo_clinico], [], $agora);
                }
            }
            $status = $resposta === 'aceitar' ? 'ACEITO' : 'RECUSADO';
            DB::table('convite_responsavel')->where('id_convite', $c->id_convite)
                ->update(['status' => $status, 'respondido_em' => Formato::banco(Formato::agora())]);
            return $status;
        });
        return $this->json(['status' => $status]);
    }

    private static function ativarVinculo(string $tabela, array $chave, array $extras, string $agora): void
    {
        if (DB::table($tabela)->where($chave)->exists()) {
            DB::table($tabela)->where($chave)->update(['ativo' => true] + $extras);
        } else {
            DB::table($tabela)->insert($chave + $extras + ['ativo' => true, 'criado_em' => $agora]);
        }
    }

    private static function primeiroNome(?string $nome): string
    {
        return preg_split('/\s+/', trim((string) $nome))[0] ?? '';
    }

    // ------------------------------------------------------------------ e-mails

    public function emails(Request $request)
    {
        $lista = DB::table('notificacao_email')->orderByDesc('criado_em')->orderByDesc('id_notificacao')->limit(100)->get();
        return $this->json(['caixa_local' => Emails::caixaLocal(), 'emails' => $lista->map(fn ($e) => [
            'id' => (int) $e->id_notificacao, 'para' => $e->email_destino, 'tipo' => $e->id_convite ? 'CONVITE' : 'ALERTA',
            'status' => $e->status, 'tentativas' => (int) $e->tentativas, 'criado_em' => Formato::utc($e->criado_em),
            'enviado_em' => Formato::utc($e->enviado_em), 'erro' => $e->erro,
        ])->all()]);
    }

    public function processarEmails(Request $request)
    {
        return $this->json(['processados' => Emails::processar(20), 'caixa_local' => Emails::caixaLocal()]);
    }
}
