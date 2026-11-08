import { useEffect, useRef } from 'react';
import { fecharFeedback, useAcaoAtual } from '../../state/acoes';
import { t } from '../../i18n';

export function FeedbackAcoes() {
  const estado = useAcaoAtual();
  const aviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (estado.erro) aviso.current?.scrollIntoView?.({ block: 'nearest' });
  }, [estado.erro]);

  // Confirmações e progresso são anunciados sem criar um pop-up sobre a página.
  if (!estado.erro) return estado.mensagem
    ? <span className="sr-only" role="status" aria-atomic="true">{t(estado.mensagem)}</span>
    : null;

  // Erros permanecem visíveis no fluxo da página, sem cobrir os controles.
  return <div ref={aviso} className="mx-auto my-4 flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-4 rounded-card border-2 border-ink bg-surface p-4"
    role="alert" aria-atomic="true">
    <span>{t(estado.erro)}</span>
    <button type="button" className="min-h-12 px-3 font-semibold underline" onClick={fecharFeedback}>{t('Fechar')}</button>
  </div>;
}
