import type {
  Alerta, AtividadeId, AvisoSaida, Conteudo, Estudante, Ficha, Observacao, PapelProfissional, Profissional,
  RegistroClinico, SessaoRegistrada,
} from '../domain/tipos';
import * as seed from './mocks/escola';
import * as servidor from './servidor';
import { limparPausasLocais } from '../state/armazenamentoEstudante';

/**
 * Única porta de dados da interface. As telas leem de forma síncrona do
 * `banco` (um cache em memória); o cache é carregado da API Laravel no
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
const primeirosAcessosConcluidos = new Set<string>();
let carregado = OFFLINE;
let erroCarga: string | null = null;

const idEstudanteLogado = () => (conta?.perfil === 'estudante' ? `est-${conta.id_perfil}` : 'est-1');

/** Recarrega o cache a partir do backend. */
async function sincronizar(contaConfirmada?: servidor.Conta) {
  if (OFFLINE) return;
  try {
    erroCarga = null;
    conta = contaConfirmada ?? await servidor.contaAtual();
    limparPausasLocais(conta?.perfil === 'estudante' ? `est-${conta.id_perfil}` : undefined);
    banco = conta ? await servidor.carregar(conta) : bancoInicial();
  } catch (erro) {
    erroCarga = 'Não foi possível carregar seus dados. Confira a conexão e tente novamente.';
    throw erro;
  } finally {
    carregado = true;
    mudou();
  }
}

/** Em produção o cache só muda depois da confirmação da API. */
function gravar<T>(remoto: () => Promise<unknown>, local: (resposta?: unknown) => T): Promise<T> {
  if (OFFLINE) return Promise.resolve(local());
  if (!conta) return Promise.reject(new servidor.ErroApi(401, 'Entre novamente para continuar.'));
  return remoto().then(async (resposta) => {
    const resultado = local(resposta);
    // A escrita já foi confirmada. Uma falha ao atualizar a lista não deve induzir reenvio.
    try { await sincronizar(); } catch { window.dispatchEvent(new Event('mkpause:atualizacao-pendente')); }
    return resultado;
  }).catch(async (erro) => {
    // Reconciliamos também operações administrativas compostas parcialmente confirmadas.
    try { await sincronizar(); } catch { /* O formulário mantém o rascunho para nova tentativa. */ }
    throw erro;
  });
}

window.addEventListener('mkpause:sessao-expirada', () => {
  limparPausasLocais();
  conta = null;
  erroCarga = null;
  banco = bancoInicial();
  carregado = true;
  mudou();
});

const PERFIL_VAZIO: Estudante = { id: 'est-0', nome: '', apelido: '', matricula: '', turma: '', escola: '', ativo: true };

export interface NovoProfissional {
  nome_completo: string;
  email: string;
  senha: string;
  telefone?: string;
  cargo?: string;
  instituicao_ensino?: string;
  registro_profissional?: string;
  estado_registro?: string;
}

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
    primeirosAcessosConcluidos.clear();
    banco = bancoInicial();
    mudou();
  },

  profissional,

  /**
   * Simulação dos códigos de vínculo (data/codigos.ts): liga estudante e profissional
   * só no cache desta tela, sem ir ao servidor. Some na próxima sincronização.
   */
  vincularLocal(estudanteId: string, profissionalId: string) {
    if (!vinculado(profissionalId, estudanteId)) banco.vinculos.push({ estudanteId, profissionalId });
    mudou();
  },

  /* ───────────── Conta ───────────── */
  sincronizar: () => sincronizar(),
  conta: () => conta,
  carregado: () => carregado,
  erroCarga: () => erroCarga,
  async entrar(email: string, senha: string) {
    const contaConfirmada = await servidor.entrar(email, senha);
    await sincronizar(contaConfirmada);
    return conta!;
  },
  async sair() {
    if (!OFFLINE) await servidor.sair();
    limparPausasLocais();
    conta = null;
    banco = bancoInicial();
    mudou();
  },

  /* ───────────── Estudante ───────────── */
  estudante: {
    primeiroAcessoPendente: () => OFFLINE ? !primeirosAcessosConcluidos.has(idEstudanteLogado()) : conta?.primeiro_acesso_pendente === true,
    concluirPrimeiroAcesso: () => gravar(() => servidor.chamar('POST', 'auth/primeiro-acesso/concluir/', {}), () => {
      primeirosAcessosConcluidos.add(idEstudanteLogado());
      if (conta) conta = { ...conta, primeiro_acesso_pendente: false };
      mudou();
    }),

    perfil: () => estudante(idEstudanteLogado()) ?? PERFIL_VAZIO,
    quemAcompanha: () => profissionaisDoEstudante(idEstudanteLogado()),
    /** Atividades disponíveis (a administração pode ocultar). */
    conteudos: () => banco.conteudos.filter((c) => c.disponivel),
    video: (): seed.VideoAtividade => {
      const c = banco.conteudos.find((x) => x.id === 'video');
      return { titulo: c?.nome ?? 'mk breath' };
    },

    enviarAlertaNivel3(estudanteId: string): Promise<Alerta> {
      return gravar(() => servidor.emitirAlerta(3), (id) => {
        const alerta: Alerta = { id: typeof id === 'string' ? id : novoId('alerta'), estudanteId, tipo: 'nivel3', criadoEm: agora() };
        banco.alertas.push(alerta); mudou(); return alerta;
      });
    },
    avisarSaida(estudanteId: string, destino?: string): Promise<AvisoSaida> {
      return gravar(() => servidor.emitirAlerta(2, destino ? `Destino: ${destino}` : undefined), (id) => {
        const aviso: AvisoSaida = { id: typeof id === 'string' ? id : novoId('aviso'), estudanteId, desde: agora(), destino };
        banco.avisos.push(aviso); mudou(); return aviso;
      });
    },
    registrarRetorno(avisoId: string) {
      return gravar(() => servidor.mudarStatusAlerta(avisoId, 'CANCELADO'), () => {
        const aviso = banco.avisos.find((a) => a.id === avisoId);
        if (aviso) aviso.voltouEm = agora();
        mudou();
      });
    },
    registrarSessao(sessao: Omit<SessaoRegistrada, 'id' | 'em'>) {
      return gravar(() => servidor.registrarSessao(sessao), () => {
        banco.sessoes.push({ ...sessao, id: novoId('sessao'), em: agora() }); mudou();
      });
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
      if (profissional(profissionalId)?.papel === 'psicologo-clinico') return [];
      return banco.alertas
        .filter((a) => !a.cancelado && vinculado(profissionalId, a.estudanteId))
        .sort(recentesPrimeiro);
    },
    marcarVisto(profissionalId: string, alertaId: string) {
      const alerta = banco.alertas.find((a) => a.id === alertaId);
      if (!alerta || profissional(profissionalId)?.papel === 'psicologo-clinico') return Promise.resolve();
      exigirVinculo(profissionalId, alerta.estudanteId);
      return gravar(() => servidor.marcarLido(alertaId), () => {
        alerta.vistoPor = [...new Set([...(alerta.vistoPor ?? []), profissionalId])]; mudou();
      });
    },
    avisos(profissionalId: string) {
      if (profissional(profissionalId)?.papel === 'psicologo-clinico') return [];
      return banco.avisos.filter((a) => vinculado(profissionalId, a.estudanteId)).sort(recentesPrimeiro);
    },
    sessoes(profissionalId: string, estudanteId: string) {
      exigirVinculo(profissionalId, estudanteId);
      if (!['psicologo-escolar', 'psicologo-clinico'].includes(profissional(profissionalId)?.papel ?? '')) return [];
      return banco.sessoes.filter((s) => s.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    observacoes(profissionalId: string, estudanteId: string) {
      exigirVinculo(profissionalId, estudanteId);
      return banco.observacoes.filter((o) => o.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    adicionarObservacao(profissionalId: string, estudanteId: string, texto: string): Promise<Observacao> {
      exigirVinculo(profissionalId, estudanteId);
      const alvo = [...banco.alertas, ...banco.avisos.map((a) => ({ ...a, criadoEm: a.desde }))]
        .filter((a) => a.estudanteId === estudanteId).sort(recentesPrimeiro)[0];
      return gravar(() => {
        if (!alvo) throw new Error('Este estudante ainda não tem alertas. Não foi possível salvar a observação.');
        return servidor.observar(alvo.id, texto);
      }, () => {
        const obs: Observacao = { id: novoId('obs'), estudanteId, autorId: profissionalId, em: agora(), texto };
        banco.observacoes.push(obs); mudou(); return obs;
      });
    },
    autor: (id: string) => profissional(id),
  },

  clinico: {
    registros(profissionalId: string, estudanteId: string): RegistroClinico[] {
      exigirVinculo(profissionalId, estudanteId);
      if (profissional(profissionalId)?.papel !== 'psicologo-clinico') return [];
      return banco.registros.filter((r) => r.estudanteId === estudanteId).sort(recentesPrimeiro);
    },
    adicionarRegistro(profissionalId: string, estudanteId: string, texto: string, chave: string) {
      exigirVinculo(profissionalId, estudanteId);
      if (profissional(profissionalId)?.papel !== 'psicologo-clinico') throw new Error('Apenas psicólogos clínicos podem registrar acompanhamentos.');
      if (!banco.fichas.some((f) => f.estudanteId === estudanteId)) throw new Error('Peça à administração para criar a ficha antes de registrar.');
      return gravar(() => servidor.chamar('POST', `estudantes/${servidor.idDe(estudanteId)}/registros/`, { texto, chave }), (resposta) => {
        const r = resposta as Omit<RegistroClinico, 'estudanteId'> | undefined;
        if (!banco.registros.some((reg) => reg.id === r?.id)) banco.registros.push(r ? { ...r, estudanteId } : {
          id: chave, estudanteId, autorId: profissionalId, em: agora(), texto,
        });
        mudou();
      });
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
    cadastrarProfissional(papel: PapelProfissional, dados: NovoProfissional): Promise<Profissional> {
      const rota = servidor.ROTA_ADMIN[papel];
      return gravar(() => servidor.chamar('POST', rota.rota, dados), (resposta) => {
        const id = (resposta as Record<string, number> | undefined)?.[`id_${rota.campo}`];
        const novo: Profissional = {
          id: id ? `${rota.prefixo}-${id}` : novoId(rota.prefixo), nome: dados.nome_completo,
          iniciais: dados.nome_completo.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
          papel, ativo: true, detalhe: papel === 'professor' ? dados.cargo : `CRP ${dados.registro_profissional}`,
        };
        banco.profissionais.push(novo); mudou(); return novo;
      });
    },
    desativarEstudante(id: string) {
      return gravar(() => servidor.chamar('DELETE', `admin/estudantes/${servidor.idDe(id)}/`), () => {
        const e = estudante(id); if (e) e.ativo = false; mudou();
      });
    },
    desativarProfissional(id: string) {
      const p = profissional(id);
      return gravar(() => servidor.chamar('DELETE', `${servidor.ROTA_ADMIN[p!.papel].rota}${servidor.idDe(id)}/`), () => {
        if (p) p.ativo = false; mudou();
      });
    },
    cadastrarEstudante(dados: Omit<Estudante, 'id' | 'apelido' | 'escola'>, senha: string): Promise<Estudante> {
      return gravar(() => servidor.chamar('POST', 'admin/estudantes/', { ...estudanteParaApi(dados), senha }), (resposta) => {
        const id = (resposta as { id_estudante?: number } | undefined)?.id_estudante;
        const novo: Estudante = { ...dados, id: id ? `est-${id}` : novoId('est'), apelido: dados.nome.split(' ')[0], escola: '' };
        banco.estudantes.push(novo); mudou(); return novo;
      });
    },
    atualizarEstudante(id: string, dados: Partial<Omit<Estudante, 'id'>>) {
      return gravar(() => servidor.chamar('PATCH', `admin/estudantes/${servidor.idDe(id)}/`, estudanteParaApi(dados)), () => {
        banco.estudantes = banco.estudantes.map((e) => e.id === id ? { ...e, ...dados } : e); mudou();
      });
    },
    profissionaisDe: (estudanteId: string) =>
      banco.vinculos
        .filter((v) => v.estudanteId === estudanteId)
        .map((v) => profissional(v.profissionalId))
        .filter((p): p is Profissional => Boolean(p)),
    vincular(estudanteId: string, profissionalId: string) {
      return gravar(() => vincularNoServidor('POST', estudanteId, profissionalId), () => {
        if (!vinculado(profissionalId, estudanteId)) banco.vinculos.push({ estudanteId, profissionalId }); mudou();
      });
    },
    desvincular(estudanteId: string, profissionalId: string) {
      return gravar(() => vincularNoServidor('DELETE', estudanteId, profissionalId), () => {
        banco.vinculos = banco.vinculos.filter((v) => !(v.estudanteId === estudanteId && v.profissionalId === profissionalId)); mudou();
      });
    },
    fichas: () => banco.fichas,
    ficha: (estudanteId: string) => banco.fichas.find((f) => f.estudanteId === estudanteId),
    /** Salva a ficha e define o psicólogo clínico (o vínculo acompanha a ficha). */
    salvarFicha(ficha: Omit<Ficha, 'atualizadaEm'>, psicologoClinicoId: string | null) {
      const existente = banco.fichas.find((f) => f.estudanteId === ficha.estudanteId);
      const paraSalvar = { ...ficha, clinicoIndicadoId: psicologoClinicoId };
      const anteriores = banco.vinculos.filter((v) => v.estudanteId === ficha.estudanteId && profissional(v.profissionalId)?.papel === 'psicologo-clinico').map((v) => v.profissionalId);
      return gravar(async () => {
        await servidor.salvarFicha(ficha.estudanteId, servidor.conteudoDaFicha(paraSalvar, []), Boolean(existente));
        for (const id of anteriores) if (id !== psicologoClinicoId) await vincularNoServidor('DELETE', ficha.estudanteId, id);
        if (psicologoClinicoId && !anteriores.includes(psicologoClinicoId)) await vincularNoServidor('POST', ficha.estudanteId, psicologoClinicoId);
      }, () => {
      const atualizada = { ...paraSalvar, atualizadaEm: agora() };
      banco.fichas = existente
        ? banco.fichas.map((f) => (f.estudanteId === ficha.estudanteId ? atualizada : f))
        : [...banco.fichas, atualizada];
      const clinicos = banco.profissionais.filter((p) => p.papel === 'psicologo-clinico').map((p) => p.id);
      const ehDoClinico = (v: { estudanteId: string; profissionalId: string }) =>
        v.estudanteId === ficha.estudanteId && clinicos.includes(v.profissionalId);
      banco.vinculos = banco.vinculos.filter((v) => !ehDoClinico(v));
      if (psicologoClinicoId) {
        banco.vinculos.push({ estudanteId: ficha.estudanteId, profissionalId: psicologoClinicoId });
      }
      mudou();
      });
    },
    conteudos: () => banco.conteudos,
    usos: (id: AtividadeId) => banco.sessoes.filter((s) => s.atividade === id).length,
    alternarConteudo(id: AtividadeId) {
      const c = banco.conteudos.find((x) => x.id === id);
      return gravar(() => servidor.chamar('PATCH', `atividades/${servidor.idAtividade(id)}/`, { disponivel: !c?.disponivel }), () => {
        if (c) c.disponivel = !c.disponivel; mudou();
      });
    },
    excluirConteudo(id: AtividadeId) {
      if (api.admin.usos(id) > 0) throw new Error('Conteúdo já usado: oculte em vez de excluir.');
      return gravar(() => servidor.chamar('DELETE', `atividades/${servidor.idAtividade(id)}/`), () => {
        banco.conteudos = banco.conteudos.filter((c) => c.id !== id); mudou();
      });
    },
  },
};

export type { Conteudo };
