import { useSyncExternalStore } from 'react';

/**
 * Preferências de idioma e acessibilidade. Ficam no aparelho (localStorage),
 * valem antes do login e são aplicadas no <html> (atributos e tamanho da fonte).
 */

export type Idioma = 'pt-BR' | 'en' | 'es';
export type TamanhoTexto = 100 | 125 | 150;

export interface Preferencias {
  idioma: Idioma;
  tamanhoTexto: TamanhoTexto;
  altoContraste: boolean;
  menosMovimento: boolean;
  fonteLegivel: boolean;
  /** VLibras: tradução do texto em português para Libras. */
  libras: boolean;
}

export const IDIOMAS: { id: Idioma; nome: string }[] = [
  { id: 'pt-BR', nome: 'Português' },
  { id: 'en', nome: 'English' },
  { id: 'es', nome: 'Español' },
];

export const TAMANHOS: TamanhoTexto[] = [100, 125, 150];

const CHAVE = 'mkpause:preferencias';

export const PADRAO: Preferencias = {
  idioma: 'pt-BR',
  tamanhoTexto: 100,
  altoContraste: false,
  menosMovimento: false,
  fonteLegivel: false,
  libras: false,
};

function carregar(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return { ...PADRAO, ...(JSON.parse(salvo) as Partial<Preferencias>) };
  } catch {
    // localStorage indisponível ou valor inválido: usa o padrão.
  }
  return PADRAO;
}

let atual: Preferencias = carregar();
const ouvintes = new Set<() => void>();

/** Leva as preferências para o documento: idioma, fonte, contraste e movimento. */
function aplicarNoDocumento(p: Preferencias) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.lang = p.idioma;
  html.style.fontSize = `${p.tamanhoTexto}%`;
  html.toggleAttribute('data-alto-contraste', p.altoContraste);
  html.toggleAttribute('data-menos-movimento', p.menosMovimento);
  html.toggleAttribute('data-fonte-legivel', p.fonteLegivel);
}

aplicarNoDocumento(atual);

export function preferencias(): Preferencias {
  return atual;
}

export function definirPreferencias(parcial: Partial<Preferencias>) {
  atual = { ...atual, ...parcial };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // Sem localStorage: vale só nesta visita.
  }
  aplicarNoDocumento(atual);
  ouvintes.forEach((f) => f());
}

/** Volta ao padrão (usado nos testes). */
export function reiniciarPreferencias() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
  definirPreferencias(PADRAO);
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function usePreferencias(): Preferencias {
  return useSyncExternalStore(assinar, preferencias, preferencias);
}
