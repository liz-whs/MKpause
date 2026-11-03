import type { EmocaoId } from '../domain/emocoes';
import type {
  Alerta, AtividadeId, AvisoSaida, Conteudo, Estudante, Ficha, Observacao, PapelProfissional, Profissional,
  RegistroClinico, SessaoRegistrada, Vinculo,
} from '../domain/tipos';
import { iniciais } from '../domain/formatos';

/**
 * Conversa com o backend Django (/api/, ver backend/README.md).
 * Em desenvolvimento o Vite repassa /api para 127.0.0.1:8000 (vite.config.ts),
 * então o cookie de sessão e o CSRF funcionam sem CORS.
 *
 * Os ids do backend são números; aqui viram texto com prefixo ('est-3', 'alerta-7')
 * para não colidirem entre tabelas.
 */

export type Perfil = 'estudante' | 'professor' | 'psicologo_escolar' | 'psicologo_clinico' | 'administrador';

export interface Conta {
  id_usuario: number;
  nome_completo: string;
  email: string;
  perfil: Perfil;
  id_perfil: number;
}

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

function lerCookie(nome: string) {
  return document.cookie.split('; ').find((c) => c.startsWith(`${nome}=`))?.split('=')[1];
}

async function garantirCsrf() {
  if (!lerCookie('csrftoken')) await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
  return lerCookie('csrftoken') ?? '';
}

function mensagemDeErro(corpo: unknown, status: number): string {
  if (corpo && typeof corpo === 'object') {
    const c = corpo as Record<string, unknown>;
    if (typeof c.detail === 'string') return c.detail;
    const primeiro = Object.values(c)[0];
    if (Array.isArray(primeiro) && typeof primeiro[0] === 'string') return primeiro[0];
  }
  return `Erro ${status} ao falar com o servidor.`;
}

export async function chamar<T = unknown>(metodo: string, rota: string, corpo?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (metodo !== 'GET') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRFToken'] = await garantirCsrf();
  }
  const r = await fetch(`/api/${rota}`, {
    method: metodo,
    headers,
    credentials: 'same-origin',
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi(r.status, mensagemDeErro(dados, r.status));
  return dados as T;
}

/* ───────────── Conta ───────────── */

export const contaAtual = () => chamar<Conta>('GET', 'auth/eu/').catch(() => null);

export async function entrar(email: string, senha: string) {
  const conta = await chamar<Conta>('POST', 'auth/login/', { email: email.trim(), senha });
  // O Django troca o token de CSRF no login.
  await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
  return conta;
}

export const sair = () => chamar('POST', 'auth/logout/').catch(() => undefined);

/* ───────────── Conversões ───────────── */

export const idDe = (texto: string) => Number(texto.split('-').pop());

/** Emoção ↔ humor 1–5 do banco (1 = pior). A emoção exata vai junto na observação da sessão. */
const HUMOR: Record<EmocaoId, number> = { feliz: 5, calmo: 4, cansado: 3, ansioso: 2, irritado: 2, triste: 1 };
const EMOCAO_DO_HUMOR: EmocaoId[] = ['triste', 'triste', 'ansioso', 'cansado', 'calmo', 'feliz'];
const MARCA = /^\[mkpause antes=(\w+) depois=(\w+)\]\n?/;

const TIPO_PARA_ATIVIDADE: Record<string, AtividadeId> = { RESPIRACAO: 'respiracao', JOGO: 'pianopause', VIDEO: 'video' };
const ATIVIDADE_PARA_TIPO: Record<AtividadeId, string> = { respiracao: 'RESPIRACAO', pianopause: 'JOGO', mkpotion: 'JOGO', video: 'VIDEO' };
const TIPO_LABEL: Record<AtividadeId, Conteudo['tipo']> = { respiracao: 'Exercício', pianopause: 'Jogo', mkpotion: 'Jogo', video: 'Vídeo' };
const DURACAO: Record<AtividadeId, string> = { respiracao: '2 min', pianopause: '3 min', mkpotion: '5 min', video: '3 min' };

/**
 * Há dois jogos com tipo JOGO no banco: o que diferencia é a referência
 * (`conteudo_ou_referencia`, ex.: /jogos/mkpotion/index.html). Sem referência, é o PianoPause.
 */
function atividadeDe(a: { tipo: string; conteudo_ou_referencia?: string | null }): AtividadeId | undefined {
  if (a.tipo === 'JOGO' && a.conteudo_ou_referencia?.includes('mkpotion')) return 'mkpotion';
  return TIPO_PARA_ATIVIDADE[a.tipo];
}

interface AtividadeApi { id_atividade: number; nome: string; tipo: string; conteudo_ou_referencia?: string | null; disponivel: boolean }
interface SessaoApi {
  id_sessao: number; estudante: number; atividade: AtividadeApi; iniciada_em: string; status: string;
  observacoes_sessao: string | null; registros_humor: { estado: number; momento: 'PRE' | 'POS' }[];
}
interface AlertaApi {
  id_alerta: number; estudante: number; nome_estudante: string; nivel: number; criado_em: string; status: string;
  descricao: string | null; destinatarios: { usuario: number; lido_em: string | null }[];
}
interface EstudanteApi {
  id_estudante: number; nome_completo: string; email: string; turma: string | null; instituicao_ensino: string | null;
  data_nascimento?: string | null; telefone?: string | null; ativo?: boolean;
}

/** Ids das atividades no banco, por tipo da interface. */
const idsAtividade = new Map<AtividadeId, number>();

function converterAtividades(lista: AtividadeApi[]): Conteudo[] {
  const conteudos: Conteudo[] = [];
  for (const a of lista) {
    const id = atividadeDe(a);
    if (!id || idsAtividade.has(id)) continue;
    idsAtividade.set(id, a.id_atividade);
    conteudos.push({ id, nome: a.nome, tipo: TIPO_LABEL[id], duracao: DURACAO[id], disponivel: a.disponivel });
  }
  return conteudos;
}

function converterEstudante(e: EstudanteApi): Estudante {
  return {
    id: `est-${e.id_estudante}`,
    nome: e.nome_completo,
    apelido: e.nome_completo.split(' ')[0],
    matricula: String(e.id_estudante),
    turma: e.turma ?? '',
    escola: e.instituicao_ensino ?? '',
    email: e.email,
    nascimento: e.data_nascimento ? e.data_nascimento.split('-').reverse().join('/') : undefined,
    telefone: e.telefone ?? undefined,
    ativo: e.ativo ?? true,
  };
}

function converterSessao(s: SessaoApi): SessaoRegistrada | null {
  const atividade = atividadeDe(s.atividade);
  const pre = s.registros_humor.find((h) => h.momento === 'PRE');
  const pos = s.registros_humor.find((h) => h.momento === 'POS');
  if (s.status !== 'CONCLUIDA' || !atividade || !pre || !pos) return null;
  const obs = s.observacoes_sessao ?? '';
  const marca = obs.match(MARCA);
  const relato = obs.replace(MARCA, '').trim();
  return {
    id: `sessao-${s.id_sessao}`,
    estudanteId: `est-${s.estudante}`,
    em: s.iniciada_em,
    antes: (marca?.[1] as EmocaoId) ?? EMOCAO_DO_HUMOR[pre.estado],
    depois: (marca?.[2] as EmocaoId) ?? EMOCAO_DO_HUMOR[pos.estado],
    atividade,
    relato: relato || undefined,
  };
}

const ehSaida = (a: AlertaApi) => a.nivel === 2;

/** Nível 2 do backend = aviso de saída da interface (vai para os professores). */
function converterAviso(a: AlertaApi): AvisoSaida {
  return {
    id: `alerta-${a.id_alerta}`,
    estudanteId: `est-${a.estudante}`,
    desde: a.criado_em,
    destino: a.descricao?.replace(/^Destino: /, '') || undefined,
    voltouEm: a.status === 'ABERTO' || a.status === 'EM_ACOMPANHAMENTO' ? undefined : a.criado_em,
  };
}

function converterAlerta(a: AlertaApi): Alerta {
  return {
    id: `alerta-${a.id_alerta}`,
    estudanteId: `est-${a.estudante}`,
    tipo: 'nivel3',
    criadoEm: a.criado_em,
    cancelado: a.status === 'CANCELADO' || a.status === 'RESOLVIDO',
    vistoPor: a.destinatarios.filter((d) => d.lido_em).map((d) => `u-${d.usuario}`),
  };
}

/** A ficha da interface tem campos que o banco ainda não tem: vão em JSON em informacoes_acompanhamento. */
interface ConteudoFicha extends Omit<Ficha, 'estudanteId' | 'atualizadaEm' | 'convite'> {
  registros?: { autorId: string; em: string; texto: string }[];
}

function lerFicha(estudanteId: string, f: { informacoes_acompanhamento: string | null; atualizada_em: string }) {
  let c: Partial<ConteudoFicha> = {};
  try {
    c = JSON.parse(f.informacoes_acompanhamento ?? '{}');
  } catch {
    c = { encaminhamento: f.informacoes_acompanhamento ?? '' };
  }
  const ficha: Ficha = {
    estudanteId,
    responsavel: c.responsavel ?? '',
    parentesco: c.parentesco ?? '',
    contato: c.contato ?? '',
    inicio: c.inicio ?? '',
    encaminhamento: c.encaminhamento ?? '',
    atualizadaEm: f.atualizada_em,
    convite: null,
  };
  const registros: RegistroClinico[] = (c.registros ?? []).map((r, i) => ({ id: `reg-${estudanteId}-${i}`, estudanteId, ...r }));
  return { ficha, registros };
}

export function conteudoDaFicha(ficha: Omit<Ficha, 'atualizadaEm' | 'convite'>, registros: RegistroClinico[]) {
  const { estudanteId: _, ...campos } = ficha;
  const c: ConteudoFicha = { ...campos, registros: registros.map(({ autorId, em, texto }) => ({ autorId, em, texto })) };
  return JSON.stringify(c);
}

async function lerFichaDe(estudanteId: string) {
  try {
    const f = await chamar<{ informacoes_acompanhamento: string | null; atualizada_em: string }>(
      'GET', `estudantes/${idDe(estudanteId)}/ficha/`);
    return lerFicha(estudanteId, f);
  } catch {
    return null; // sem ficha ou sem acesso
  }
}

export const registrosDaFicha = async (estudanteId: string) => (await lerFichaDe(estudanteId))?.registros ?? [];

/* ───────────── Carga inicial por perfil ───────────── */

export interface Carga {
  estudantes: Estudante[];
  profissionais: Profissional[];
  vinculos: Vinculo[];
  sessoes: SessaoRegistrada[];
  alertas: Alerta[];
  avisos: AvisoSaida[];
  observacoes: Observacao[];
  registros: RegistroClinico[];
  fichas: Ficha[];
  conteudos: Conteudo[];
}

const vazia = (): Carga => ({
  estudantes: [], profissionais: [], vinculos: [], sessoes: [], alertas: [], avisos: [],
  observacoes: [], registros: [], fichas: [], conteudos: [],
});

const PAPEL: Partial<Record<Perfil, PapelProfissional>> = {
  professor: 'professor', psicologo_escolar: 'psicologo-escolar', psicologo_clinico: 'psicologo-clinico',
};

/** O profissional logado vira um Profissional com id 'u-<id_usuario>' (é o que os alertas registram). */
export function profissionalDaConta(conta: Conta): Profissional | null {
  const papel = PAPEL[conta.perfil];
  if (!papel) return null;
  return { id: `u-${conta.id_usuario}`, nome: conta.nome_completo, iniciais: iniciais(conta.nome_completo), papel, ativo: true };
}

export async function carregar(conta: Conta): Promise<Carga> {
  const carga = vazia();
  idsAtividade.clear();
  carga.conteudos = converterAtividades(await chamar<AtividadeApi[]>('GET', 'atividades/'));

  if (conta.perfil === 'estudante') {
    carga.estudantes = [converterEstudante({
      id_estudante: conta.id_perfil, nome_completo: conta.nome_completo, email: conta.email, turma: null, instituicao_ensino: null,
    })];
    const alertas = await chamar<AlertaApi[]>('GET', 'alertas/');
    carga.alertas = alertas.filter((a) => !ehSaida(a)).map(converterAlerta);
    carga.avisos = alertas.filter(ehSaida).map(converterAviso);
    return carga;
  }

  if (conta.perfil === 'administrador') return carregarAdmin(carga);

  const eu = profissionalDaConta(conta)!;
  carga.profissionais = [eu];
  carga.estudantes = (await chamar<EstudanteApi[]>('GET', 'estudantes/')).map(converterEstudante);
  carga.vinculos = carga.estudantes.map((e) => ({ estudanteId: e.id, profissionalId: eu.id }));

  const alertas = await chamar<AlertaApi[]>('GET', 'alertas/');
  carga.alertas = alertas.filter((a) => !ehSaida(a)).map(converterAlerta);
  carga.avisos = alertas.filter(ehSaida).map(converterAviso);

  // Observações ficam presas a alertas no banco; a interface mostra por estudante.
  const obs = await Promise.all(alertas.map((a) =>
    chamar<{ id_observacao: number; autor: number; nome_autor: string; conteudo: string; criado_em: string }[]>(
      'GET', `alertas/${a.id_alerta}/observacoes/`).catch(() => []).then((l) => l.map((o) => ({ ...o, estudante: a.estudante })))));
  for (const o of obs.flat()) {
    carga.observacoes.push({ id: `obs-${o.id_observacao}`, estudanteId: `est-${o.estudante}`, autorId: `u-${o.autor}`, em: o.criado_em, texto: o.conteudo });
    if (!carga.profissionais.some((p) => p.id === `u-${o.autor}`)) {
      carga.profissionais.push({ id: `u-${o.autor}`, nome: o.nome_autor, iniciais: iniciais(o.nome_autor), papel: 'professor', ativo: true });
    }
  }

  // O professor não vê histórico nem ficha (contas/permissoes.py).
  if (conta.perfil !== 'professor') {
    const historicos = await Promise.all(carga.estudantes.map((e) =>
      chamar<SessaoApi[]>('GET', `sessoes/?estudante=${idDe(e.id)}`).catch(() => [])));
    carga.sessoes = historicos.flat().map(converterSessao).filter((s): s is SessaoRegistrada => s !== null);
    for (const e of carga.estudantes) {
      const f = await lerFichaDe(e.id);
      if (f) {
        carga.fichas.push(f.ficha);
        carga.registros.push(...f.registros);
      }
    }
  }
  return carga;
}

/* ───────────── Administração ───────────── */

interface ProfissionalApi {
  id_professor?: number; id_psicologo_escolar?: number; id_psicologo_clinico?: number;
  nome_completo: string; ativo: boolean; cargo?: string | null; registro_profissional?: string; estado_registro?: string;
}

export const ROTA_ADMIN: Record<PapelProfissional, { rota: string; vinculo: string; campo: string; prefixo: string }> = {
  professor: { rota: 'admin/professores/', vinculo: 'admin/vinculos/professores/', campo: 'professor', prefixo: 'prof' },
  'psicologo-escolar': { rota: 'admin/psicologos-escolares/', vinculo: 'admin/vinculos/psicologos-escolares/', campo: 'psicologo_escolar', prefixo: 'pe' },
  'psicologo-clinico': { rota: 'admin/psicologos-clinicos/', vinculo: 'admin/vinculos/psicologos-clinicos/', campo: 'psicologo_clinico', prefixo: 'pc' },
};

async function carregarAdmin(carga: Carga): Promise<Carga> {
  carga.estudantes = (await chamar<EstudanteApi[]>('GET', 'admin/estudantes/')).map(converterEstudante);
  for (const [papel, r] of Object.entries(ROTA_ADMIN) as [PapelProfissional, (typeof ROTA_ADMIN)[PapelProfissional]][]) {
    const lista = await chamar<ProfissionalApi[]>('GET', r.rota);
    for (const p of lista) {
      const id = p.id_professor ?? p.id_psicologo_escolar ?? p.id_psicologo_clinico;
      carga.profissionais.push({
        id: `${r.prefixo}-${id}`, nome: p.nome_completo, iniciais: iniciais(p.nome_completo), papel, ativo: p.ativo,
        detalhe: p.registro_profissional ? `CRP ${p.registro_profissional}` : p.cargo ?? undefined,
      });
    }
    const vinculos = await chamar<(Record<string, number> & { ativo: boolean })[]>('GET', r.vinculo);
    for (const v of vinculos) {
      if (v.ativo) carga.vinculos.push({ estudanteId: `est-${v.estudante}`, profissionalId: `${r.prefixo}-${v[r.campo]}` });
    }
  }
  for (const e of carga.estudantes) {
    const f = await lerFichaDe(e.id);
    if (f) carga.fichas.push(f.ficha);
  }
  return carga;
}

/* ───────────── Escritas ───────────── */

export async function registrarSessao(s: Omit<SessaoRegistrada, 'id' | 'em' | 'estudanteId'>) {
  const id_atividade = idsAtividade.get(s.atividade);
  if (!id_atividade) throw new Error(`Atividade "${s.atividade}" não cadastrada no backend (rode criar_demo).`);
  const { sessao } = await chamar<{ sessao: SessaoApi }>('POST', 'sessoes/', { id_atividade, humor_pre: HUMOR[s.antes] });
  await chamar('POST', `sessoes/${sessao.id_sessao}/concluir/`, {
    humor_pos: HUMOR[s.depois],
    observacoes_sessao: `[mkpause antes=${s.antes} depois=${s.depois}]\n${s.relato ?? ''}`,
  });
}

export const emitirAlerta = async (nivel: 2 | 3, descricao?: string) =>
  `alerta-${(await chamar<{ alerta: AlertaApi }>('POST', 'alertas/', { nivel, descricao })).alerta.id_alerta}`;

export const mudarStatusAlerta = (id: string, status: string) => chamar('PATCH', `alertas/${idDe(id)}/`, { status });

export const marcarLido = (id: string) => chamar('POST', `alertas/${idDe(id)}/lido/`);

export const observar = (alertaId: string, conteudo: string) =>
  chamar('POST', `alertas/${idDe(alertaId)}/observacoes/`, { conteudo });

export const salvarFicha = async (estudanteId: string, conteudo: string, existe: boolean) =>
  chamar(existe ? 'PATCH' : 'POST', `estudantes/${idDe(estudanteId)}/ficha/`, { informacoes_acompanhamento: conteudo });

export const idAtividade = (id: AtividadeId) => idsAtividade.get(id);
export const tipoAtividade = (id: AtividadeId) => ATIVIDADE_PARA_TIPO[id];
