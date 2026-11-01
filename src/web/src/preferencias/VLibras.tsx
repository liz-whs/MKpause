import { useEffect, useRef } from 'react';
import { preferencias, usePreferencias } from './preferencias';

/**
 * VLibras (vlibras.gov.br): avatar do governo federal que traduz para Libras
 * o texto em português da página. É um serviço externo: o script só é baixado
 * quando o estudante liga a opção "Libras".
 *
 * Esta versão do VLibras só se monta se o script carregar junto com a página.
 * Por isso: com a opção já ligada, o main.tsx chama iniciarVLibras() na partida;
 * ao ligar no meio da visita, a página recarrega uma vez (as preferências ficam
 * no localStorage e a pausa em andamento no sessionStorage, nada se perde).
 */
const SCRIPT = 'https://vlibras.gov.br/app/vlibras-plugin.js';
const APP = 'https://vlibras.gov.br/app';

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

let iniciado = false;

/** Baixa e inicia o VLibras (uma vez por carregamento da página). */
export function iniciarVLibras() {
  if (iniciado || typeof document === 'undefined') return;
  iniciado = true;
  const script = document.createElement('script');
  script.src = SCRIPT;
  script.async = true;
  script.onload = () => {
    if (window.VLibras) new window.VLibras.Widget(APP);
  };
  document.head.appendChild(script);
}

/** Na partida do app: liga o VLibras se a opção já estiver ligada. */
export function iniciarVLibrasSeLigado() {
  if (preferencias().libras) iniciarVLibras();
}

/** Acompanha a opção "Libras": recarrega para ligar e esconde ao desligar. */
export function VLibras() {
  const { libras } = usePreferencias();
  const anterior = useRef(libras);

  useEffect(() => {
    // Esconde o avatar quando a opção está desligada (o script não sai da página).
    document.documentElement.toggleAttribute('data-sem-libras', !libras);
    if (libras && !anterior.current && !iniciado) window.location.reload();
    anterior.current = libras;
  }, [libras]);

  return null;
}
