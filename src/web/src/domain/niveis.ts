import type { IconName } from '../components/ui/Icon';
import { t } from '../i18n';

/** Os três níveis de pausa do estudante (HANDOFF 5). */
export type Nivel = 1 | 2 | 3;

export interface NivelInfo {
  nivel: Nivel;
  titulo: string;
  icone: IconName;
  /** Rota para onde o card leva. */
  destino: string;
}

/** Ordem de exibição na tela inicial: 1, 2, 3 (do mais leve ao mais pesado). `titulo` é traduzido na leitura. */
export const NIVEIS: readonly NivelInfo[] = [
  { nivel: 1, get titulo() { return t('Quero fazer uma pausa'); }, icone: 'pausa', destino: '/estudante/pausa' },
  { nivel: 2, get titulo() { return t('Preciso sair da sala'); }, icone: 'porta', destino: '/estudante/aviso-de-saida' },
  { nivel: 3, get titulo() { return t('Não estou bem'); }, icone: 'respiracao', destino: '/estudante/agora' },
];
