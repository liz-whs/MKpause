/** Formatos de data e nome usados nas telas dos profissionais. */
import { locale, t } from '../i18n';

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoje", "Ontem" ou "08/10". */
export function dia(iso: string, agora = new Date()): string {
  const d = new Date(iso);
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, agora)) return t('Hoje');
  if (mesmoDia(d, ontem)) return t('Ontem');
  // Dia e mês na ordem do idioma (inglês: mês/dia).
  return d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' });
}

/** "Hoje, 10:42". */
export function quando(iso: string, agora = new Date()): string {
  return `${dia(iso, agora)}, ${hora(iso)}`;
}

export function ehHoje(iso: string, agora = new Date()): boolean {
  return mesmoDia(new Date(iso), agora);
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
