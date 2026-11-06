import feliz from '../assets/chinchila/feliz.svg';
import calmo from '../assets/chinchila/calmo.svg';
import ansioso from '../assets/chinchila/ansioso.svg';
import triste from '../assets/chinchila/triste.svg';
import irritado from '../assets/chinchila/irritado.svg';
import cansado from '../assets/chinchila/cansado.svg';
import { t } from '../i18n';

/**
 * As 6 emoções do registro de humor (HANDOFF 5 · Humor).
 * Não existe intensidade: o registro é só a emoção.
 */
export type EmocaoId = 'feliz' | 'calmo' | 'ansioso' | 'triste' | 'irritado' | 'cansado';

export interface Emocao {
  id: EmocaoId;
  label: string;
  /** Chinchila com essa emoção. Só aparece quando o próprio aluno escolhe. */
  imagem: string;
}

// `label` é um getter: devolve o nome no idioma escolhido.
export const EMOCOES: readonly Emocao[] = [
  { id: 'feliz', get label() { return t('Feliz'); }, imagem: feliz },
  { id: 'calmo', get label() { return t('Calmo(a)'); }, imagem: calmo },
  { id: 'ansioso', get label() { return t('Ansioso(a)'); }, imagem: ansioso },
  { id: 'triste', get label() { return t('Triste'); }, imagem: triste },
  { id: 'irritado', get label() { return t('Irritado(a)'); }, imagem: irritado },
  { id: 'cansado', get label() { return t('Cansado(a)'); }, imagem: cansado },
];

/** Emoções usadas para recomendar a atividade de respiração. */
const EMOCOES_PESADAS: readonly EmocaoId[] = ['ansioso', 'triste', 'irritado'];

export function sugereEscalada(emocao: EmocaoId | null): boolean {
  return emocao !== null && EMOCOES_PESADAS.includes(emocao);
}

/** Feliz e calmo(a): usado para "terminou mais leve" nos resumos dos profissionais. */
export function ehLeve(emocao: EmocaoId): boolean {
  return emocao === 'feliz' || emocao === 'calmo';
}

/** Emoção que mais aparece no início das pausas. */
export function emocaoMaisComum(lista: EmocaoId[]): EmocaoId | null {
  const contagem = new Map<EmocaoId, number>();
  for (const e of lista) contagem.set(e, (contagem.get(e) ?? 0) + 1);
  let melhor: EmocaoId | null = null;
  for (const [e, n] of contagem) if (melhor === null || n > contagem.get(melhor)!) melhor = e;
  return melhor;
}

export function emocaoPorId(id: EmocaoId): Emocao {
  const emocao = EMOCOES.find((e) => e.id === id);
  if (!emocao) throw new Error(`Emoção desconhecida: ${id}`);
  return emocao;
}
