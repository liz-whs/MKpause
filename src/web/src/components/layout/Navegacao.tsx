import { useEffect, useRef } from 'react';
import { useLocation, useMatches } from 'react-router';
import { t } from '../../i18n';
import { usePreferencias } from '../../preferencias/preferencias';

/** Título de cada rota, em `handle: { titulo }`. */
export interface HandleRota {
  titulo?: string;
}

/**
 * A cada troca de página: atualiza o título da aba (WCAG 2.4.2) e leva o foco
 * ao título da tela, para o leitor de tela anunciar a página nova.
 * No primeiro carregamento o foco fica onde o navegador colocou.
 */
export function useTituloEFoco() {
  const matches = useMatches();
  const { pathname } = useLocation();
  const primeira = useRef(true);
  const { idioma } = usePreferencias();

  const titulo = [...matches].reverse().map((m) => (m.handle as HandleRota | undefined)?.titulo).find(Boolean);

  useEffect(() => {
    document.title = titulo ? `${t(titulo)} · mkpause` : 'mkpause';
  }, [titulo, idioma]);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [pathname]);
}

/** Primeiro item da página no Tab: pula menus e vai direto ao conteúdo (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only z-30 rounded-field bg-ink font-semibold text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-12 focus:items-center focus:px-4"
    >
      {t('Pular para o conteúdo')}
    </a>
  );
}
