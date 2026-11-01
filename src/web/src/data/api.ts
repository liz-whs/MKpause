import type {
  Alerta, AtividadeId, AvisoSaida, Conteudo, Estudante, Ficha, Observacao, PapelProfissional, Profissional,
  RegistroClinico, SessaoRegistrada,
} from '../domain/tipos';
import * as seed from './mocks/escola';

/**
 * Única porta de dados da interface. Hoje guarda tudo em memória;
 * quando o backend existir, só este arquivo muda.
 *
 * Regras de acesso aplicadas aqui:
 * - o estudante não recebe contagem nem histórico de pausas;
 * - cada profissional só lê estudantes vinculados a ele;
 * - registros clínicos só para psicólogos clínicos vinculados.
 */

const copia = <T,>(v: T): T => structuredClone(v);

function bancoInicial() {
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

const ID_ESTUDANTE_LOGADO = 'est-1';

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

export const api = {
  /** Só para testes: volta aos dados iniciais. */
  reiniciar() {
    banco = bancoInicial();
    mudou();
  },

  /** Perfis com acesso de profissional, para o login de exemplo. */
  profissional,

  /* ───────────── Estudante ───────────── */
  estudante: {
    perfil: () => estudante(ID_ESTUDANTE_LOGADO)!,
    quemAcompanha: () => profissionaisDoEstudante(ID_ESTUDANTE_LOGADO),
    /** Atividades disponíveis (a administração pode ocultar). */
    conteudos: () => banco.conteudos.filter((c) => c.disponivel),
    video: (): seed.VideoAtividade => {
      const c = banco.conteudos.find((x) => x.id === 'video')!;
      return { titulo: c.nome, duracao: c.duracao };
    },

    enviarAlertaNivel3(estudanteId: string): Alerta {
      const alerta: Alerta = { id: novoId('alerta'), estudanteId, tipo: 'nivel3', criadoEm: agora() };
      banco.alertas.push(alerta);
      mudou();
      return alerta;
    },
    cancelarAlerta(id: string) {
      const alerta = banco.alertas.find((a) => a.id === id);
      if (alerta) alerta.cancelado = true;
      mudou();
    },
    avisarSaida(estudanteId: string, destino?: string): AvisoSaida {
      const aviso: AvisoSaida = { id: novoId('aviso'), estudanteId, desde: agora(), destino };
      banco.avisos.push(aviso);
      mudou();
      return aviso;
    },
    registrarRetorno(avisoId: string) {
      const aviso = banco.avisos.find((a) => a.id === avisoId);
      if (aviso) aviso.voltouEm = agora();
      mudou();
    },
    registrarSessao(sessao: Omit<SessaoRegistrada, 'id' | 'em'>) {
      banco.sessoes.push({ ...sessao, id: novoId('sessao'), em: agora() });
      mudou();
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
    },
    desativarProfissional(id: string) {
      const p = profissional(id);
      if (p) p.ativo = false;
      mudou();
    },
    cadastrarEstudante(dados: Omit<Estudante, 'id' | 'apelido' | 'escola'>): Estudante {
      const novo: Estudante = { ...dados, id: novoId('est'), apelido: dados.nome.split(' ')[0], escola: seed.ESTUDANTES[0].escola };
      banco.estudantes.push(novo);
      mudou();
      return novo;
    },
    atualizarEstudante(id: string, dados: Partial<Omit<Estudante, 'id'>>) {
      banco.estudantes = banco.estudantes.map((e) => (e.id === id ? { ...e, ...dados } : e));
      mudou();
    },
    profissionaisDe: (estudanteId: string) =>
      banco.vinculos
        .filter((v) => v.estudanteId === estudanteId)
        .map((v) => profissional(v.profissionalId))
        .filter((p): p is Profissional => Boolean(p)),
    vincular(estudanteId: string, profissionalId: string) {
      if (!vinculado(profissionalId, estudanteId)) banco.vinculos.push({ estudanteId, profissionalId });
      mudou();
    },
    /** Remove o vínculo; o que já foi registrado continua no histórico. */
    desvincular(estudanteId: string, profissionalId: string) {
      banco.vinculos = banco.vinculos.filter((v) => !(v.estudanteId === estudanteId && v.profissionalId === profissionalId));
      mudou();
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
      banco.vinculos = banco.vinculos.filter((v) => !(v.estudanteId === ficha.estudanteId && clinicos.includes(v.profissionalId)));
      if (psicologoClinicoId) banco.vinculos.push({ estudanteId: ficha.estudanteId, profissionalId: psicologoClinicoId });
      mudou();
    },
    reenviarConvite(estudanteId: string) {
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
    },
    /** Só conteúdos nunca usados podem ser excluídos; os outros, só ocultados. */
    excluirConteudo(id: AtividadeId) {
      if (api.admin.usos(id) > 0) throw new Error('Conteúdo já usado: oculte em vez de excluir.');
      banco.conteudos = banco.conteudos.filter((c) => c.id !== id);
      mudou();
    },
  },
};

export type { Conteudo };
