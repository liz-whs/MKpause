import type { IconName } from '../components/ui/Icon';
import { t } from '../i18n';

/**
 * Sequência de cuidados (HANDOFF 5).
 * - Um cuidado por dia (útil) mantém a sequência; fim de semana não conta.
 * - Conta cuidados, nunca pausas.
 * - Sem "perdeu", pontos ou ranking. Só o aluno vê.
 */

export type CuidadoId = 'agua' | 'alongar' | 'longe';

export interface Cuidado {
  id: CuidadoId;
  label: string;
  icone: IconName;
  /** Classe de fundo do ícone. */
  fundo: string;
}

// `label` é um getter: devolve o texto no idioma escolhido.
export const CUIDADOS_DO_DIA: readonly Cuidado[] = [
  { id: 'agua', get label() { return t('Beber água'); }, icone: 'agua', fundo: 'bg-sky' },
  { id: 'alongar', get label() { return t('Alongar 1 min'); }, icone: 'alongar', fundo: 'bg-lavender' },
  { id: 'longe', get label() { return t('Olhar para longe'); }, icone: 'sol', fundo: 'bg-peony' },
];

export const MAIS_IDEIAS: readonly Omit<Cuidado, 'id'>[] = [
  { get label() { return t('Comer uma fruta'); }, icone: 'fruta', fundo: 'bg-peony' },
  { get label() { return t('Caminhar 5 min'); }, icone: 'caminhar', fundo: 'bg-sky' },
  { get label() { return t('Falar com alguém querido'); }, icone: 'conversa', fundo: 'bg-lavender' },
  { get label() { return t('Dormir mais cedo'); }, icone: 'lua', fundo: 'bg-bg' },
];

/** Data local no formato AAAA-MM-DD. */
export function chaveDia(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

export function ehDiaUtil(data: Date): boolean {
  const dia = data.getDay();
  return dia !== 0 && dia !== 6;
}

function diaAnterior(data: Date): Date {
  const d = new Date(data);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Dias úteis seguidos com pelo menos um cuidado.
 * Se hoje ainda não teve cuidado, a contagem começa ontem:
 * o dia de hoje ainda está em aberto, não interrompe nada.
 */
export function calcularSequencia(diasComCuidado: ReadonlySet<string>, hoje: Date): number {
  let dia = new Date(hoje);
  if (!diasComCuidado.has(chaveDia(dia))) dia = diaAnterior(dia);

  let total = 0;
  while (true) {
    if (ehDiaUtil(dia)) {
      if (!diasComCuidado.has(chaveDia(dia))) break;
      total++;
    }
    dia = diaAnterior(dia);
  }
  return total;
}

export type EstadoDia = 'feito' | 'hoje' | 'aberto';

export interface DiaDaSemana {
  chave: string;
  rotulo: string;
  numero: number;
  estado: EstadoDia;
  feito: boolean;
}

const ROTULOS = () => [t('Seg'), t('Ter'), t('Qua'), t('Qui'), t('Sex')];

/**
 * Segunda a sexta da semana atual. No fim de semana mostra a semana que acabou.
 * Dias sem cuidado aparecem só com o número: nunca como "perdidos".
 */
export function semanaAtual(diasComCuidado: ReadonlySet<string>, hoje: Date): DiaDaSemana[] {
  const segunda = new Date(hoje);
  const diaSemana = hoje.getDay(); // 0 = domingo
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  segunda.setDate(hoje.getDate() - recuo);

  const chaveHoje = chaveDia(hoje);
  return ROTULOS().map((rotulo, i) => {
    const dia = new Date(segunda);
    dia.setDate(segunda.getDate() + i);
    const chave = chaveDia(dia);
    const feito = diasComCuidado.has(chave);
    return {
      chave,
      rotulo,
      numero: dia.getDate(),
      feito,
      estado: feito ? 'feito' : chave === chaveHoje ? 'hoje' : 'aberto',
    };
  });
}
