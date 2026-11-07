import type { AtividadeId } from './tipos';

/** Nomes públicos; referências técnicas e progresso usam os IDs estáveis. */
export const NOMES_ATIVIDADES: Record<AtividadeId, string> = {
  respiracao: 'respire & pause',
  pianopause: 'piano pause',
  mkpotion: 'mk potion',
  mkconnection: 'mk connection',
  video: 'mk breath',
  espiral: 'spiral pause',
  chinchila: 'chinchilla pause',
};

const NOMES_ANTERIORES: Record<AtividadeId, readonly string[]> = {
  respiracao: ['Respire&Pause', 'Respiração da chinchila', 'Chinchila respirando', 'Respiração'],
  pianopause: ['PianoPause'],
  mkpotion: ['MK Potion'],
  mkconnection: ['MKconnection'],
  video: ['MK Breath', 'Respiração guiada em vídeo', 'Vídeo: um minuto de calma'],
  espiral: ['Respiração em espiral', 'Respiração com espiral'],
  chinchila: ['Respiração com a chinchila'],
};

export function nomeAtividade(id: AtividadeId, nome: string): string {
  return NOMES_ANTERIORES[id].includes(nome) ? NOMES_ATIVIDADES[id] : nome;
}
