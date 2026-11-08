import type { IconName } from '../components/ui/Icon';
import { t } from '../i18n';

/**
 * Sequência de cuidados (HANDOFF 5).
 * - Um cuidado por dia mantém a sequência, incluindo sábado e domingo.
 * - Conta cuidados, nunca pausas.
 * - Sem "perdeu", pontos ou ranking. Só o aluno vê.
 */

export const META_DIARIA_CUIDADOS = 3;

export type CuidadoId = 'agua' | 'alongar' | 'longe' | 'fruta' | 'caminhar' | 'conversar' | 'sono' | 'desenhar' | 'cores' | 'musica' | 'gentileza' | 'gratidao' | 'natureza' | 'dancar' | 'arrumar' | 'careta' | 'notificacoes' | 'playlist' | 'escrever' | 'limites' | 'hobby' | 'pausatela' | 'prioridade' | 'reconhecer';

export interface Cuidado {
  id: CuidadoId;
  label: string;
  icone: IconName;
  fundo: string;
}

// Os rótulos acompanham o idioma escolhido. IDs antigos permanecem válidos.
export const CUIDADOS: readonly Cuidado[] = [
  { id: 'agua', get label() { return t('Beber água'); }, icone: 'agua', fundo: 'bg-sky' },
  { id: 'alongar', get label() { return t('Alongar 1 min'); }, icone: 'alongar', fundo: 'bg-lavender' },
  { id: 'longe', get label() { return t('Olhar para longe'); }, icone: 'sol', fundo: 'bg-peony' },
  { id: 'fruta', get label() { return t('Comer uma fruta'); }, icone: 'fruta', fundo: 'bg-peony' },
  { id: 'caminhar', get label() { return t('Caminhar 5 min'); }, icone: 'caminhar', fundo: 'bg-sky' },
  { id: 'conversar', get label() { return t('Falar com alguém querido'); }, icone: 'conversa', fundo: 'bg-lavender' },
  { id: 'sono', get label() { return t('Dormir mais cedo'); }, icone: 'lua', fundo: 'bg-bg' },
  { id: 'desenhar', get label() { return t('Desenhar sem se preocupar com o resultado'); }, icone: 'lapis', fundo: 'bg-lavender' },
  { id: 'cores', get label() { return t('Encontrar três coisas da sua cor favorita'); }, icone: 'busca', fundo: 'bg-peony' },
  { id: 'musica', get label() { return t('Ouvir uma música que dá vontade de sorrir'); }, icone: 'musica', fundo: 'bg-sky' },
  { id: 'gentileza', get label() { return t('Fazer uma gentileza'); }, icone: 'coracao', fundo: 'bg-peony' },
  { id: 'gratidao', get label() { return t('Lembrar de um momento bom'); }, icone: 'coracao', fundo: 'bg-lavender' },
  { id: 'natureza', get label() { return t('Observar uma nuvem ou uma plantinha'); }, icone: 'broto', fundo: 'bg-sky' },
  { id: 'dancar', get label() { return t('Dançar do seu jeito'); }, icone: 'musica', fundo: 'bg-lavender' },
  { id: 'arrumar', get label() { return t('Arrumar um cantinho para você'); }, icone: 'inicio', fundo: 'bg-sky' },
  { id: 'careta', get label() { return t('Inventar uma careta divertida'); }, icone: 'pessoa', fundo: 'bg-peony' },
  { id: 'notificacoes', get label() { return t('Pausar as notificações por um momento'); }, icone: 'sino', fundo: 'bg-sky' },
  { id: 'playlist', get label() { return t('Montar uma playlist com músicas que você gosta'); }, icone: 'musica', fundo: 'bg-lavender' },
  { id: 'escrever', get label() { return t('Escrever um pensamento só para você'); }, icone: 'lapis', fundo: 'bg-peony' },
  { id: 'limites', get label() { return t('Respeitar um limite seu hoje'); }, icone: 'coracao', fundo: 'bg-lavender' },
  { id: 'hobby', get label() { return t('Reservar um momento para um hobby'); }, icone: 'atividades', fundo: 'bg-sky' },
  { id: 'pausatela', get label() { return t('Fazer uma pausa das telas'); }, icone: 'pausa', fundo: 'bg-peony' },
  { id: 'prioridade', get label() { return t('Organizar uma pequena prioridade do dia'); }, icone: 'ficha', fundo: 'bg-sky' },
  { id: 'reconhecer', get label() { return t('Reconhecer algo que você fez bem'); }, icone: 'broto', fundo: 'bg-lavender' },
];

/** Baralho pessoal estável: três sugestões novas a cada dia de calendário. */
export function cuidadosDoDia(dia: string, estudanteId: string): readonly Cuidado[] {
  const baralho = [...CUIDADOS];
  let seed = 2166136261;
  for (const caractere of estudanteId) seed = Math.imul(seed ^ caractere.charCodeAt(0), 16777619) >>> 0;
  for (let i = baralho.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  const [ano, mes, numero] = dia.split('-').map(Number);
  const ordinal = Math.floor(Date.UTC(ano, mes - 1, numero) / 86400000);
  const inicio = ((ordinal * 3) % baralho.length + baralho.length) % baralho.length;
  return [0, 1, 2].map((offset) => baralho[(inicio + offset) % baralho.length]);
}

/** Data local no formato AAAA-MM-DD. */
export function chaveDia(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

function diaAnterior(data: Date): Date {
  const d = new Date(data);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Dias corridos seguidos com pelo menos um cuidado.
 * Se hoje ainda não teve cuidado, a contagem começa ontem:
 * o dia de hoje ainda está em aberto, não interrompe nada.
 */
export function calcularSequencia(diasComCuidado: ReadonlySet<string>, hoje: Date): number {
  let dia = new Date(hoje);
  if (!diasComCuidado.has(chaveDia(dia))) dia = diaAnterior(dia);

  let total = 0;
  while (true) {
    if (!diasComCuidado.has(chaveDia(dia))) break;
    total++;
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

const ROTULOS = () => [t('Seg'), t('Ter'), t('Qua'), t('Qui'), t('Sex'), t('Sáb'), t('Dom')];

/**
 * Segunda a domingo da semana atual, incluindo o fim de semana.
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
