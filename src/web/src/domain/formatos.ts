/** Formatos de data e nome usados nas telas dos profissionais. */
import { t } from '../i18n';

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Datas sem horário são calendáricas: não devem mudar de dia pelo fuso UTC. */
function lerData(valor: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
}

/** Padrão brasileiro em qualquer idioma da interface. */
export function dataBrasileira(valor: string): string {
  if (!valor) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
  const data = lerData(valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function hora(iso: string): string {
  const d = lerData(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoje", "Ontem" ou "08/10/2026". */
export function dia(iso: string, agora = new Date()): string {
  const d = lerData(iso);
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, agora)) return t('Hoje');
  if (mesmoDia(d, ontem)) return t('Ontem');
  return dataBrasileira(iso);
}

/** "Hoje, 10:42". */
export function quando(iso: string, agora = new Date()): string {
  return `${dia(iso, agora)}, ${hora(iso)}`;
}

export function ehHoje(iso: string, agora = new Date()): boolean {
  return mesmoDia(lerData(iso), agora);
}

/** "há 16 min", "há 2 h". */
export function haQuanto(iso: string, agora = new Date()): string {
  const min = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return t('há {n} min', { n: min });
  return t('há {n} h', { n: Math.floor(min / 60) });
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** "Ana Lima" → "Ana L." (como no protótipo). */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : nome;
}
