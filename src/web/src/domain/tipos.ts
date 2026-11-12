import type { EmocaoId } from './emocoes';
import { t } from '../i18n';

export type PapelProfissional = 'professor' | 'psicologo-escolar' | 'psicologo-clinico';

export interface Profissional {
  id: string;
  nome: string;
  iniciais: string;
  papel: PapelProfissional;
  /** Disciplina e turmas (professor) ou registro profissional (psicólogos). */
  detalhe?: string;
  ativo: boolean;
}

/** Nome do papel no idioma escolhido (getters). */
export const PAPEL_LABEL: Record<PapelProfissional, string> = {
  get professor() { return t('Professor(a)'); },
  get 'psicologo-escolar'() { return t('Psicólogo(a) escolar'); },
  get 'psicologo-clinico'() { return t('Psicólogo(a) clínico(a)'); },
};

export interface Estudante {
  id: string;
  nome: string;
  apelido: string;
  matricula: string;
  turma: string;
  escola: string;
  email?: string;
  nascimento?: string;
  telefone?: string;
  ativo: boolean;
}

export interface Vinculo {
  estudanteId: string;
  profissionalId: string;
}

export type AtividadeId = 'respiracao' | 'pianopause' | 'mkpotion' | 'mkconnection' | 'video' | 'espiral' | 'chinchila';

/** Destinos do aviso de saída (nível 2). */
export const DESTINOS_SAIDA = ['Pátio', 'Sala da psicologia', 'Banheiro', 'Biblioteca', 'Outro lugar'] as const;

export interface AvisoSaida {
  id: string;
  estudanteId: string;
  desde: string; // ISO
  destino?: string;
  voltouEm?: string;
  /** Avisos encerrados antes da V12 não têm a hora da volta: mostra "Voltou" sem horário. */
  voltaSemHorario?: boolean;
}

/**
 * Só existe o alerta automático do nível 3: não há botão "Pedir ajuda",
 * a escola é avisada assim que o aluno toca em "Não estou bem".
 */
export interface Alerta {
  id: string;
  estudanteId: string;
  tipo: 'nivel3';
  criadoEm: string; // ISO
  cancelado?: boolean;
  /** Profissionais que marcaram como visto. */
  vistoPor?: string[];
}

/** Uma sessão de pausa. Sem intensidade: só a emoção. */
export interface SessaoRegistrada {
  id: string;
  estudanteId: string;
  em: string; // ISO
  antes: EmocaoId;
  atividade: AtividadeId;
  depois: EmocaoId;
  relato?: string;
}

/** Observação de professor ou psicólogo escolar. */
export interface Observacao {
  id: string;
  estudanteId: string;
  autorId: string;
  em: string;
  texto: string;
}

/** Registro do psicólogo clínico na ficha. Só psicólogos clínicos vinculados veem. */
export interface RegistroClinico {
  id: string;
  estudanteId: string;
  autorId: string;
  em: string;
  texto: string;
}

/** Ficha de acompanhamento: dados administrativos mantidos pela administração. */
export interface Ficha {
  clinicoIndicadoId?: string | null;
  estudanteId: string;
  responsavel: string;
  parentesco: string;
  contato: string;
  inicio: string;
  encaminhamento: string;
  atualizadaEm: string;
}

export interface Conteudo {
  id: AtividadeId;
  nome: string;
  tipo: 'Exercício' | 'Jogo' | 'Vídeo';
  disponivel: boolean;
}
