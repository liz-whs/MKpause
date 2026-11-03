import type {
  Alerta, AtividadeId, AvisoSaida, Conteudo, Estudante, Ficha, Observacao, PapelProfissional, Profissional,
  RegistroClinico, SessaoRegistrada,
} from '../domain/tipos';
import * as seed from './mocks/escola';
import * as servidor from './servidor';

/**
 * Única porta de dados da interface. As telas leem de forma síncrona do
 * `banco` (um cache em memória); o cache é carregado do backend Django no
 * login e cada escrita vai para o backend e depois recarrega o cache.
 * Nos testes (Vitest) não há backend: o banco começa com os dados de exemplo.
 *
 * Regras de acesso aplicadas aqui (e de novo no backend):
 * - o estudante não recebe contagem nem histórico de pausas;
 * - cada profissional só lê estudantes vinculados a ele;
 * - registros clínicos só para psicólogos clínicos vinculados.
 */

const copia = <T,>(v: T): T => structuredClone(v);

const OFFLINE = import.meta.env.MODE === 'test';

function bancoInicial(): servidor.Carga {
  if (!OFFLINE) {
    return {
      estudantes: [], profissionais: [], vinculos: [], sessoes: [], alertas: [], avisos: [],
      observacoes: [], registros: [], fichas: [], conteudos: [],
    };
  }
  return {
    estudantes: copia(seed.ESTUDANTES),
    profissionais: copia(seed.PROFISSIONAIS),
    vinculos: copia(seed.VINCULOS),
    sessoes: copia(seed.SESSOES),
    alertas: copia(seed.ALERTAS),
    avisos: copia(seed.AVISOS),
    observacoes: copia(seed.OBSERVACOES),
    registros: copia(seed.REGISTROS_CLINICOS),
    fichas: copia(seed.FICHAS),
    conteudos: copia(seed.CONTEUDOS),
  };
}

let banco = bancoInicial();

/* Assinatura para a interface atualizar quando os dados mudam. */
let versao = 0;
const ouvintes = new Set<() => void>();
function mudou() {
  versao++;
  ouvintes.forEach((f) => f());
}
export const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};
export const versaoAtual = () => versao;

let seq = 0;
const novoId = (prefixo: string) => `${prefixo}-${Date.now()}-${++seq}`;
const agora = () => new Date().toISOString();

/* ───────────── Conta e sincronização com o backend ───────────── */

let conta: servidor.Conta | null = null;
let carregado = OFFLINE;

const idEstudanteLogado = () => (conta?.perfil === 'estudante' ? `est-${conta.id_perfil}` : 'est-1');

/** Recarrega o cache a partir do backend. */
async function sincronizar() {
  if (OFFLINE) return;
  conta = await servidor.contaAtual();
  banco = conta ? await servidor.carregar(conta) : bancoInicial();
  carregado = true;
  mudou();
}

/** Manda uma escrita ao backend e recarrega; em caso de erro, avisa e volta ao que está no servidor. */
function enviar(acao: () => Promise<unknown>) {
  if (OFFLINE || !conta) return;
  acao()
    .catch((e: Error) => {
      console.error(e);
      window.alert(e.message);
    })
    .then(sincronizar);
}

/** Alertas criados aqui e ainda sem id do backend: id local -> promessa do id real. */
const pendentes = new Map<string, Promise<string>>();
const idReal = async (id: string) => (pendentes.has(id) ? pendentes.get(id)! : id);

const PERFIL_VAZIO: Estudante = { id: 'est-0', nome: '', apelido: '', matricula: '', turma: '', escola: '', ativo: true };

function estudante(id: string): Estudante | undefined {
  return banco.estudantes.find((e) => e.id === id);
}

function profissional(id: string): Profissional | undefined {
  return banco.profissionais.find((p) => p.id === id);
}

function vinculado(profissionalId: string, estudanteId: string) {
  return banco.vinculos.some((v) => v.profissionalId === profissionalId && v.estudanteId === estudanteId);
}

function exigirVinculo(profissionalId: string, estudanteId: string) {
  if (!vinculado(profissionalId, estudanteId)) throw new Error('Estudante não vinculado a este profissional.');
}

function profissionaisDoEstudante(estudanteId: string) {
  return banco.vinculos
    .filter((v) => v.estudanteId === estudanteId)
    .map((v) => profissional(v.profissionalId))
    .filter((p): p is Profissional => Boolean(p && p.ativo));
}

const recentesPrimeiro = <T extends { em?: string; criadoEm?: string; desde?: string }>(a: T, b: T) =>
  (b.em ?? b.criadoEm ?? b.desde ?? '').localeCompare(a.em ?? a.criadoEm ?? a.desde ?? '');

function estudanteParaApi(dados: Partial<Omit<Estudante, 'id'>>) {
  const corpo: Record<string, unknown> = {};
  if (dados.nome !== undefined) corpo.nome_completo = dados.nome;
  if (dados.email !== undefined) corpo.email = dados.email;
  if (dados.turma !== undefined) corpo.turma = dados.turma;
  if (dados.telefone !== undefined) corpo.telefone = dados.telefone || null;
  if (dados.nascimento) {
    const [d, m, a] = dados.nascimento.split('/');
    if (a) corpo.data_nascimento = `${a}-${m}-${d}`;
  }
  return corpo;
}

function corpoVinculo(estudanteId: string, profissionalId: string): [string, string, unknown] {
  const r = servidor.ROTA_ADMIN[profissional(profissionalId)!.papel];
  return [r.vinculo, r.campo, { [r.campo]: servidor.idDe(profissionalId), estudante: servidor.idDe(estudanteId) }];
}

const vincularNoServidor = (metodo: 'POST' | 'DELETE', estudanteId: string, profissionalId: string) => {
  const [rota, , corpo] = corpoVinculo(estudanteId, profissionalId);
  return servidor.chamar(metodo, rota, corpo);
};

export const api = {
  /** Só para testes: volta aos dados iniciais. */
  reiniciar() {
    banco = bancoInicial();
    mudou();
  },

  profissional,

  /* ───────────── Conta ───────────── */
  sincronizar,
  conta: () => conta,
  carregado: () => carregado,
  async entrar(email: string, senha: string) {
    conta = await servidor.entrar(email, senha);
    await sincronizar();
    return conta!;
  },
  async sair() {
    await servidor.sair();
    conta = null;
    banco = bancoInicial();
    mudou();
  },

  /* ───────────── Estudante ───────────── */
  estudante: {
    perfil: () => estudante(idEstudanteLogado()) ?? PERFIL_VAZIO,
    quemAcompanha: () => profissionaisDoEstudante(idEstudanteLogado()),
    /** Atividades disponíveis (a administração pode ocultar). */
    conteudos: () => banco.conteudos.filter((c) => c.disponivel),
    video: (): seed.VideoAtividade => {
      const c = banco.conteudos.find((x) => x.id === 'video');
      return { titulo: c?.nome ?? 'Vídeo', duracao: c?.duracao ?? '3 min' };
    },

    enviarAlertaNivel3(estudanteId: string): Alerta {
      const alerta: Alerta = { id: novoId('alerta'), estudanteId, tipo: 'nivel3', criadoEm: agora() };
      banco.alertas.push(alerta);
      mudou();
      if (!OFFLINE) {
        pendentes.set(alerta.id, servidor.emitirAlerta(3));
        enviar(() => pendentes.get(alerta.id)!);
      }
      return alerta;
    },
    cancelarAlerta(id: string) {
      const alerta = banco.alertas.find((a) => a.id === id);
      if (alerta) alerta.cancelado = true;
      mudou();
      enviar(async () => servidor.mudarStatusAlerta(await idReal(id), 'CANCELADO'));
    },
    avisarSaida(estudanteId: string, destino?: string): AvisoSaida {
      const aviso: AvisoSaida = { id: novoId('aviso'), estudanteId, desde: agora(), destino };
      banco.avisos.push(aviso);
      mudou();
      // No backend, o aviso de saída é o alerta de nível 2 (vai para os professores).
      if (!OFFLINE) {
        pendentes.set(aviso.id, servidor.emitirAlerta(2, destino ? `Destino: ${destino}` : undefined));
        enviar(() => pendentes.get(aviso.id)!);
      }
      return aviso;
    },
    registrarRetorno(avisoId: string) {
      const aviso = banco.avisos.find((a) => a.id === avisoId);
      if (aviso) aviso.voltouEm = agora();
      mudou();
      enviar(async () => servidor.mudarStatusAlerta(await idReal(avisoId), 'CANCELADO'));
    },
    registrarSessao(sessao: Omit<SessaoRegistrada, 'id' | 'em'>) {
      banco.sessoes.push({ ...sessao, id: novoId('sessao'), em: agora() });
      mudou();
      enviar(() => servidor.registrarSessao(sessao));
    },
  },

  /* ───────────── Professor, psicólogo escolar e clínico ───────────── */
  escola: {
    estudantes(profissionalId: string) {
      return banco.estudantes.filter((e) => vinculado(profissionalId, e.id));
    },
    estudante(profissionalId: string, estudanteId: string) {
      exigirVinculo(profissionalId, estudanteId);
      return estudante(estudanteId)!;
    },
    /** Alertas ativos (não cancelados) dos estudantes vinculados. */
    alertas(profissionalId: string) {
      return banco.alertas
        .filter((a) => !a.cancelado && vinculado(profissionalId, a.estudanteId))
        .sort(recentesPrimeiro);
    },
    marcarVisto(profissionalId: string, alertaId: string) {
      const alerta = banco.alertas.find((a) => a.id === alertaId);
      if (!alerta) return;
      exigirVinculo(profissionalId, alerta.estudanteId);
      alerta.vistoPor = [...new Set([...(alerta.vistoPor ?? []), profissionalId])];
      mudou();
      // O psicólogo clínico não é destinatário no banco: o "visto" dele fica só nesta tela.
      if (profissional(profissionalId)?.papel !== 'psicologo-clinico') enviar(() => servidor.marcarLido(alertaId));
    },
    avisos(profissionalId: string) {
      return banco.avisos.filter((a) => vinculado(profissionalId, a.estudanteId)).sort(recentesPrimeiro);
    },
    sessoes(profissionalId: string, estudanteId: string) {
      exigirVinculo(profissionalId, estudanteId);
      return banco.sessoes.filter((s) => s.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    observacoes(profissionalId: string, estudanteId: string) {
      exigirVinculo(profissionalId, estudanteId);
      return banco.observacoes.filter((o) => o.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    adicionarObservacao(profissionalId: string, estudanteId: string, texto: string): Observacao {
      exigirVinculo(profissionalId, estudanteId);
      const obs: Observacao = { id: novoId('obs'), estudanteId, autorId: profissionalId, em: agora(), texto };
      banco.observacoes.push(obs);
      mudou();
      // No banco a observação fica presa a um alerta: usa o mais recente do estudante.
      const alvo = [...banco.alertas, ...banco.avisos.map((a) => ({ ...a, criadoEm: a.desde }))]
        .filter((a) => a.estudanteId === estudanteId)
        .sort(recentesPrimeiro)[0];
      if (alvo) enviar(() => servidor.observar(alvo.id, texto));
      else if (!OFFLINE) window.alert('Este estudante ainda não tem alertas: a observação não foi salva no servidor.');
      return obs;
    },
    autor: (id: string) => profissional(id),
  },

  clinico: {
    registros(profissionalId: string, estudanteId: string): RegistroClinico[] {
      exigirVinculo(profissionalId, estudanteId);
      if (profissional(profissionalId)?.papel !== 'psicologo-clinico') return [];
      return banco.registros.filter((r) => r.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    adicionarRegistro(profissionalId: string, estudanteId: string, texto: string) {
      exigirVinculo(profissionalId, estudanteId);
      banco.registros.push({ id: novoId('reg'), estudanteId, autorId: profissionalId, em: agora(), texto });
      mudou();
      // O registro clínico vai junto na ficha (informacoes_acompanhamento).
      const ficha = banco.fichas.find((f) => f.estudanteId === estudanteId);
      if (ficha) {
        const registros = banco.registros.filter((r) => r.estudanteId === estudanteId);
        enviar(() => servidor.salvarFicha(estudanteId, servidor.conteudoDaFicha(ficha, registros), true));
      } else if (!OFFLINE) {
        window.alert('Este estudante ainda não tem ficha: peça à administração para criar.');
      }
    },
    ficha(profissionalId: string, estudanteId: string): Ficha | undefined {
      exigirVinculo(profissionalId, estudanteId);
      return banco.fichas.find((f) => f.estudanteId === estudanteId);
    },
  },

  /* ───────────── Administração ───────────── */
  admin: {
    estudantes: () => banco.estudantes,
    profissionais: (papel?: PapelProfissional) =>
      banco.profissionais.filter((p) => !papel || p.papel === papel),
    desativarEstudante(id: string) {
      const e = estudante(id);
      if (e) e.ativo = false;
      mudou();
      enviar(() => servidor.chamar('DELETE', `admin/estudantes/${servidor.idDe(id)}/`));
    },
    desativarProfissional(id: string) {
      const p = profissional(id);
      if (p) p.ativo = false;
      mudou();
      if (p) enviar(() => servidor.chamar('DELETE', `${servidor.ROTA_ADMIN[p.papel].rota}${servidor.idDe(id)}/`));
    },
    cadastrarEstudante(dados: Omit<Estudante, 'id' | 'apelido' | 'escola'>): Estudante {
      const novo: Estudante = { ...dados, id: novoId('est'), apelido: dados.nome.split(' ')[0], escola: seed.ESTUDANTES[0].escola };
      banco.estudantes.push(novo);
      mudou();
      enviar(() => servidor.chamar('POST', 'admin/estudantes/', {
        ...estudanteParaApi(dados),
        // Senha do primeiro acesso: mkpause-<matrícula>. O estudante troca depois.
        senha: `mkpause-${dados.matricula || Date.now()}`,
      }));
      return novo;
    },
    atualizarEstudante(id: string, dados: Partial<Omit<Estudante, 'id'>>) {
      banco.estudantes = banco.estudantes.map((e) => (e.id === id ? { ...e, ...dados } : e));
      mudou();
      enviar(() => servidor.chamar('PATCH', `admin/estudantes/${servidor.idDe(id)}/`, estudanteParaApi(dados)));
    },
    profissionaisDe: (estudanteId: string) =>
      banco.vinculos
        .filter((v) => v.estudanteId === estudanteId)
        .map((v) => profissional(v.profissionalId))
        .filter((p): p is Profissional => Boolean(p)),
    vincular(estudanteId: string, profissionalId: string) {
      if (!vinculado(profissionalId, estudanteId)) banco.vinculos.push({ estudanteId, profissionalId });
      mudou();
      enviar(() => vincularNoServidor('POST', estudanteId, profissionalId));
    },
    /** Remove o vínculo; o que já foi registrado continua no histórico. */
    desvincular(estudanteId: string, profissionalId: string) {
      banco.vinculos = banco.vinculos.filter((v) => !(v.estudanteId === estudanteId && v.profissionalId === profissionalId));
      mudou();
      enviar(() => vincularNoServidor('DELETE', estudanteId, profissionalId));
    },
    fichas: () => banco.fichas,
    ficha: (estudanteId: string) => banco.fichas.find((f) => f.estudanteId === estudanteId),
    /** Salva a ficha e define o psicólogo clínico (o vínculo acompanha a ficha). */
    salvarFicha(ficha: Omit<Ficha, 'atualizadaEm' | 'convite'>, psicologoClinicoId: string | null) {
      const existente = banco.fichas.find((f) => f.estudanteId === ficha.estudanteId);
      const atualizada = { ...ficha, atualizadaEm: agora(), convite: existente?.convite ?? null };
      banco.fichas = existente
        ? banco.fichas.map((f) => (f.estudanteId === ficha.estudanteId ? atualizada : f))
        : [...banco.fichas, atualizada];
      const clinicos = banco.profissionais.filter((p) => p.papel === 'psicologo-clinico').map((p) => p.id);
      const ehDoClinico = (v: { estudanteId: string; profissionalId: string }) =>
        v.estudanteId === ficha.estudanteId && clinicos.includes(v.profissionalId);
      const anteriores = banco.vinculos.filter(ehDoClinico).map((v) => v.profissionalId);
      banco.vinculos = banco.vinculos.filter((v) => !ehDoClinico(v));
      if (psicologoClinicoId) banco.vinculos.push({ estudanteId: ficha.estudanteId, profissionalId: psicologoClinicoId });
      mudou();
      enviar(async () => {
        // Os registros clínicos que já estão na ficha continuam lá (o admin não os vê nem apaga).
        const atual = await servidor.registrosDaFicha(ficha.estudanteId);
        await servidor.salvarFicha(ficha.estudanteId, servidor.conteudoDaFicha(ficha, atual), Boolean(existente));
        for (const id of anteriores) {
          if (id !== psicologoClinicoId) await vincularNoServidor('DELETE', ficha.estudanteId, id);
        }
        if (psicologoClinicoId && !anteriores.includes(psicologoClinicoId)) {
          await vincularNoServidor('POST', ficha.estudanteId, psicologoClinicoId);
        }
      });
    },
    reenviarConvite(estudanteId: string) {
      // Convite ao responsável ainda não existe no backend (RN24): fica só na tela.
      const f = banco.fichas.find((x) => x.estudanteId === estudanteId);
      if (f) f.convite = { enviadoEm: agora(), aceito: false };
      mudou();
    },
    conteudos: () => banco.conteudos,
    usos: (id: AtividadeId) => banco.sessoes.filter((s) => s.atividade === id).length,
    alternarConteudo(id: AtividadeId) {
      const c = banco.conteudos.find((x) => x.id === id);
      if (c) c.disponivel = !c.disponivel;
      mudou();
      const idApi = servidor.idAtividade(id);
      if (c && idApi) enviar(() => servidor.chamar('PATCH', `atividades/${idApi}/`, { disponivel: c.disponivel }));
    },
    /** Só conteúdos nunca usados podem ser excluídos; os outros, só ocultados. */
    excluirConteudo(id: AtividadeId) {
      if (api.admin.usos(id) > 0) throw new Error('Conteúdo já usado: oculte em vez de excluir.');
      banco.conteudos = banco.conteudos.filter((c) => c.id !== id);
      mudou();
      // O backend não apaga atividades: marca como indisponível.
      const idApi = servidor.idAtividade(id);
      if (idApi) enviar(() => servidor.chamar('DELETE', `atividades/${idApi}/`));
    },
  },
};

export type { Conteudo };
