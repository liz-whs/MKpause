import { chamar, ErroApi } from './servidor';

/**
 * Códigos de cadastro (gerados pelo admin) e de vínculo (gerados pelo estudante).
 * Contrato: docs/codigos-de-acesso.md (seção 5).
 *
 * Enquanto o backend não tiver essas rotas (responde 404), a interface usa uma
 * SIMULAÇÃO local, guardada neste navegador, para os fluxos poderem ser vistos e
 * testados. Na simulação nada vai para o servidor: o cadastro não cria conta e o
 * aceite não cria vínculo no banco. As telas avisam quando estão simulando.
 * Nos testes (Vitest) a simulação é sempre usada, em memória.
 */

export type PerfilCodigo = 'ESTUDANTE' | 'PROFESSOR' | 'PSICOLOGO_ESCOLAR' | 'PSICOLOGO_CLINICO';
export type SituacaoCodigo = 'ATIVO' | 'ESGOTADO' | 'EXPIRADO' | 'REVOGADO';

export interface CodigoCadastro {
  id_codigo_cadastro: number;
  /** Só vem na resposta de criação. */
  codigo?: string;
  sufixo: string;
  perfil: PerfilCodigo;
  turma: string | null;
  instituicao_ensino: string | null;
  usos_maximos: number;
  usos: number;
  expira_em: string;
  revogado_em: string | null;
  situacao: SituacaoCodigo;
  criado_em: string;
  usado_por: { id_usuario: number; nome_completo: string; email: string; usado_em: string }[];
}

export interface NovoCodigoCadastro {
  perfil: PerfilCodigo;
  usos_maximos: number;
  validade_dias: number;
  turma?: string;
  instituicao_ensino?: string;
}

export interface CodigoVerificado {
  perfil: PerfilCodigo;
  turma: string | null;
  instituicao_ensino: string | null;
}

export interface DadosCadastro {
  codigo: string;
  nome_completo: string;
  email: string;
  senha: string;
  turma?: string;
  instituicao_ensino?: string;
  data_nascimento?: string;
  cargo?: string;
  telefone?: string;
  registro_profissional?: string;
  estado_registro?: string;
}

export interface CodigoVinculoAtual {
  id_codigo_vinculo: number;
  codigo?: string;
  expira_em: string;
}

export interface Solicitacao {
  id_codigo_vinculo: number;
  profissional: { nome_completo: string; perfil: 'professor' | 'psicologo_escolar'; detalhe: string };
  resgatado_em: string;
}

export interface PedidoEnviado {
  id_codigo_vinculo: number;
  estudante: { primeiro_nome: string; turma: string };
  resgatado_em: string;
}

/** Quem está usando, para a simulação saber de quem é cada código. */
export interface Quem {
  id: string;
  nome: string;
  perfil: 'estudante' | 'professor' | 'psicologo_escolar';
  detalhe?: string;
  turma?: string;
}

/** Erro com mensagem para mostrar na tela. */
export class ErroCodigo extends Error {}

const MSG_CADASTRO = 'Código inválido ou expirado. Peça um novo à escola.';
const MSG_VINCULO = 'Código inválido ou expirado. Peça um novo ao estudante.';
const MSG_JA_ACOMPANHA = 'Você já acompanha este estudante.';

/* ───────────── Formato dos códigos ───────────── */

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizar(codigo: string) {
  return codigo.toUpperCase().replace(/[\s-]/g, '');
}

function gerar(tamanho: number) {
  const bytes = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** "K7QM29XHPA" → "K7QM2-9XHPA"; "7HQK2M" → "7HQ-K2M". */
export function formatar(codigo: string) {
  const c = normalizar(codigo);
  const meio = Math.ceil(c.length / 2);
  return c.length > 3 ? `${c.slice(0, meio)}-${c.slice(meio)}` : c;
}

/* ───────────── Servidor ou simulação ───────────── */

const EM_TESTE = import.meta.env.MODE === 'test';
let simulando = EM_TESTE;
const ouvintes = new Set<() => void>();

/** Verdadeiro quando o backend ainda não tem as rotas de código. */
export const emSimulacao = () => simulando;
export function aoMudarModo(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Tenta o servidor; se a rota ainda não existe (404 sem corpo do DRF), passa para a simulação. */
async function tentar<T>(noServidor: () => Promise<T>, naSimulacao: () => T): Promise<T> {
  if (simulando) return naSimulacao();
  try {
    return await noServidor();
  } catch (e) {
    if (e instanceof ErroApi && e.status === 404 && /404/.test(e.message)) {
      simulando = true;
      ouvintes.forEach((f) => f());
      return naSimulacao();
    }
    throw new ErroCodigo(e instanceof Error ? e.message : String(e));
  }
}

/* ───────────── Simulação (localStorage; em memória nos testes) ───────────── */

interface CadastroSimulado extends Omit<CodigoCadastro, 'codigo' | 'situacao'> {
  codigo_normalizado: string;
}

interface VinculoSimulado {
  id_codigo_vinculo: number;
  codigo_normalizado: string;
  estudante: { id: string; primeiro_nome: string; turma: string };
  expira_em: string;
  revogado_em: string | null;
  status: 'ABERTO' | 'AGUARDANDO_ESTUDANTE' | 'ACEITO' | 'RECUSADO' | 'REVOGADO';
  profissional: { id: string; nome_completo: string; perfil: 'professor' | 'psicologo_escolar'; detalhe: string } | null;
  resgatado_em: string | null;
}

interface Estado {
  seq: number;
  cadastros: CadastroSimulado[];
  vinculos: VinculoSimulado[];
}

const CHAVE = 'mkpause:simulacao-codigos';
let memoria: Estado = { seq: 0, cadastros: [], vinculos: [] };

function ler(): Estado {
  if (EM_TESTE) return memoria;
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '') as Estado;
  } catch {
    return { seq: 0, cadastros: [], vinculos: [] };
  }
}
function gravar(e: Estado) {
  if (EM_TESTE) memoria = e;
  else localStorage.setItem(CHAVE, JSON.stringify(e));
}

/** Só para testes: apaga a simulação. */
export function reiniciarSimulacao() {
  memoria = { seq: 0, cadastros: [], vinculos: [] };
  simulando = EM_TESTE;
}

const agora = () => new Date();
const expirou = (iso: string) => new Date(iso) <= agora();

function situacao(c: CadastroSimulado): SituacaoCodigo {
  if (c.revogado_em) return 'REVOGADO';
  if (expirou(c.expira_em)) return 'EXPIRADO';
  if (c.usos >= c.usos_maximos) return 'ESGOTADO';
  return 'ATIVO';
}

function publico(c: CadastroSimulado): CodigoCadastro {
  const { codigo_normalizado: _c, ...resto } = c;
  return { ...resto, situacao: situacao(c) };
}

function vinculoAberto(v: VinculoSimulado) {
  return v.status === 'ABERTO' && !v.revogado_em && !expirou(v.expira_em);
}

/* ───────────── Admin: códigos de cadastro ───────────── */

export const codigosCadastro = {
  listar: () =>
    tentar(
      () => chamar<CodigoCadastro[]>('GET', 'admin/codigos-cadastro/'),
      () => ler().cadastros.slice().reverse().map(publico),
    ),

  gerar: (dados: NovoCodigoCadastro) =>
    tentar(
      () => chamar<CodigoCadastro>('POST', 'admin/codigos-cadastro/', dados),
      () => {
        const e = ler();
        const codigo = gerar(10);
        const criado = agora();
        const ehEstudante = dados.perfil === 'ESTUDANTE';
        const c: CadastroSimulado = {
          id_codigo_cadastro: ++e.seq,
          codigo_normalizado: codigo,
          sufixo: codigo.slice(-3),
          perfil: dados.perfil,
          turma: ehEstudante ? dados.turma?.trim() || null : null,
          instituicao_ensino: ehEstudante ? dados.instituicao_ensino?.trim() || null : null,
          usos_maximos: dados.usos_maximos,
          usos: 0,
          expira_em: new Date(criado.getTime() + dados.validade_dias * 86_400_000).toISOString(),
          revogado_em: null,
          criado_em: criado.toISOString(),
          usado_por: [],
        };
        e.cadastros.push(c);
        gravar(e);
        return { ...publico(c), codigo: formatar(codigo) };
      },
    ),

  revogar: (id: number) =>
    tentar(
      () => chamar<CodigoCadastro>('POST', `admin/codigos-cadastro/${id}/revogar/`),
      () => {
        const e = ler();
        const c = e.cadastros.find((x) => x.id_codigo_cadastro === id);
        if (!c) throw new ErroCodigo(MSG_CADASTRO);
        c.revogado_em ??= agora().toISOString();
        gravar(e);
        return publico(c);
      },
    ),
};

/* ───────────── Público: cadastro com código ───────────── */

export const cadastro = {
  verificar: (codigo: string) =>
    tentar(
      () => chamar<CodigoVerificado>('POST', 'auth/codigo-cadastro/verificar/', { codigo }),
      () => {
        const c = ler().cadastros.find((x) => x.codigo_normalizado === normalizar(codigo));
        if (!c || situacao(c) !== 'ATIVO') throw new ErroCodigo(MSG_CADASTRO);
        return { perfil: c.perfil, turma: c.turma, instituicao_ensino: c.instituicao_ensino };
      },
    ),

  /** No servidor, cria a conta e já entra (resposta igual à do login). Na simulação, só consome o código. */
  enviar: (dados: DadosCadastro) =>
    tentar<{ simulado: boolean; conta: { perfil: string } | null }>(
      () => chamar<{ perfil: string }>('POST', 'auth/cadastro/', dados).then((conta) => ({ simulado: false, conta })),
      () => {
        const e = ler();
        const c = e.cadastros.find((x) => x.codigo_normalizado === normalizar(dados.codigo));
        if (!c || situacao(c) !== 'ATIVO') throw new ErroCodigo(MSG_CADASTRO);
        const email = dados.email.trim().toLowerCase();
        if (e.cadastros.some((x) => x.usado_por.some((u) => u.email === email))) {
          throw new ErroCodigo('Já existe uma conta com este e-mail.');
        }
        c.usos += 1;
        c.usado_por.push({ id_usuario: ++e.seq, nome_completo: dados.nome_completo.trim(), email, usado_em: agora().toISOString() });
        gravar(e);
        return { simulado: true, conta: null };
      },
    ),
};

/* ───────────── Estudante: código de vínculo ───────────── */

export const codigoVinculo = {
  atual: (eu: Quem) =>
    tentar(
      async () => {
        try {
          return await chamar<CodigoVinculoAtual | null>('GET', 'vinculos/codigos/atual/');
        } catch (e) {
          if (e instanceof ErroApi && e.status === 204) return null;
          throw e;
        }
      },
      () => {
        const v = ler().vinculos.find((x) => x.estudante.id === eu.id && vinculoAberto(x));
        return v ? { id_codigo_vinculo: v.id_codigo_vinculo, expira_em: v.expira_em } : null;
      },
    ),

  /** Gera um novo código (revoga o anterior, se houver). */
  gerar: (eu: Quem) =>
    tentar(
      () => chamar<CodigoVinculoAtual>('POST', 'vinculos/codigos/'),
      () => {
        const e = ler();
        for (const x of e.vinculos) {
          if (x.estudante.id === eu.id && vinculoAberto(x)) {
            x.status = 'REVOGADO';
            x.revogado_em = agora().toISOString();
          }
        }
        const codigo = gerar(6);
        const v: VinculoSimulado = {
          id_codigo_vinculo: ++e.seq,
          codigo_normalizado: codigo,
          estudante: { id: eu.id, primeiro_nome: eu.nome.split(' ')[0] ?? eu.nome, turma: eu.turma ?? '' },
          expira_em: new Date(agora().getTime() + 24 * 3_600_000).toISOString(),
          revogado_em: null,
          status: 'ABERTO',
          profissional: null,
          resgatado_em: null,
        };
        e.vinculos.push(v);
        gravar(e);
        return { id_codigo_vinculo: v.id_codigo_vinculo, codigo: formatar(codigo), expira_em: v.expira_em };
      },
    ),

  cancelar: (eu: Quem) =>
    tentar(
      () => chamar('DELETE', 'vinculos/codigos/atual/').then(() => undefined),
      () => {
        const e = ler();
        for (const x of e.vinculos) {
          if (x.estudante.id === eu.id && vinculoAberto(x)) {
            x.status = 'REVOGADO';
            x.revogado_em = agora().toISOString();
          }
        }
        gravar(e);
      },
    ),

  solicitacoes: (eu: Quem) =>
    tentar(
      () => chamar<Solicitacao[]>('GET', 'vinculos/solicitacoes/'),
      () =>
        ler()
          .vinculos.filter((x) => x.estudante.id === eu.id && x.status === 'AGUARDANDO_ESTUDANTE' && !expirou(x.expira_em))
          .map((x) => ({ id_codigo_vinculo: x.id_codigo_vinculo, profissional: x.profissional!, resgatado_em: x.resgatado_em! })),
    ),

  /** Responde a uma solicitação. Na simulação devolve o id do profissional, para a interface ligar o vínculo localmente. */
  responder: (eu: Quem, id: number, aceitar: boolean) =>
    tentar(
      () =>
        chamar('POST', `vinculos/solicitacoes/${id}/${aceitar ? 'aceitar' : 'recusar'}/`).then(() => ({
          simulado: false,
          profissionalId: null as string | null,
        })),
      () => {
        const e = ler();
        const x = e.vinculos.find((v) => v.id_codigo_vinculo === id && v.estudante.id === eu.id);
        if (!x || x.status !== 'AGUARDANDO_ESTUDANTE') throw new ErroCodigo('Este pedido não está mais disponível.');
        x.status = aceitar ? 'ACEITO' : 'RECUSADO';
        gravar(e);
        return { simulado: true, profissionalId: aceitar ? x.profissional!.id : null };
      },
    ),
};

/* ───────────── Profissional: usar o código ───────────── */

export const resgate = {
  /** `jaAcompanha`: o profissional já tem vínculo com o estudante (a simulação não vê o banco). */
  usar: (eu: Quem, codigo: string, jaAcompanha: (estudanteId: string) => boolean) =>
    tentar(
      () => chamar<{ status: string; estudante: { primeiro_nome: string; turma: string } }>('POST', 'vinculos/resgatar/', { codigo }),
      () => {
        const e = ler();
        const x = e.vinculos.find((v) => v.codigo_normalizado === normalizar(codigo));
        if (!x || !vinculoAberto(x)) throw new ErroCodigo(MSG_VINCULO);
        if (jaAcompanha(x.estudante.id)) throw new ErroCodigo(MSG_JA_ACOMPANHA);
        x.status = 'AGUARDANDO_ESTUDANTE';
        x.resgatado_em = agora().toISOString();
        x.profissional = {
          id: eu.id,
          nome_completo: eu.nome,
          perfil: eu.perfil === 'psicologo_escolar' ? 'psicologo_escolar' : 'professor',
          detalhe: eu.detalhe ?? '',
        };
        gravar(e);
        return { status: 'AGUARDANDO_ESTUDANTE', estudante: { primeiro_nome: x.estudante.primeiro_nome, turma: x.estudante.turma } };
      },
    ),

  enviados: (eu: Quem) =>
    tentar(
      () => chamar<PedidoEnviado[]>('GET', 'vinculos/enviados/'),
      () =>
        ler()
          .vinculos.filter((x) => x.profissional?.id === eu.id && x.status === 'AGUARDANDO_ESTUDANTE' && !expirou(x.expira_em))
          .map((x) => ({
            id_codigo_vinculo: x.id_codigo_vinculo,
            estudante: { primeiro_nome: x.estudante.primeiro_nome, turma: x.estudante.turma },
            resgatado_em: x.resgatado_em!,
          })),
    ),
};
