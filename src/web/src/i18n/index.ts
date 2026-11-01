import { preferencias, type Idioma } from '../preferencias/preferencias';
import { en } from './en';
import { es } from './es';

/**
 * Tradução: a chave é o próprio texto em português.
 * `t('Oi, {nome}!', { nome })` → "Hi, Ana!" em inglês.
 * Sem tradução (ou em português), devolve o texto original: dados cadastrados
 * pela escola (nomes, turmas) podem passar por t() sem quebrar nada.
 *
 * A raiz do app remonta as telas quando o idioma muda (ver Raiz no router),
 * por isso t() pode ser uma função comum, sem hook.
 */
const DICIONARIOS: Record<Exclude<Idioma, 'pt-BR'>, Record<string, string>> = { en, es };

export function t(texto: string, vars?: Record<string, string | number>): string {
  const { idioma } = preferencias();
  const traduzido = idioma === 'pt-BR' ? texto : (DICIONARIOS[idioma][texto] ?? texto);
  if (!vars) return traduzido;
  return traduzido.replace(/\{(\w+)\}/g, (m, chave: string) => (chave in vars ? String(vars[chave]) : m));
}

/** Locale para datas e números (Intl). */
export function locale(): string {
  return preferencias().idioma;
}

export { DICIONARIOS };
