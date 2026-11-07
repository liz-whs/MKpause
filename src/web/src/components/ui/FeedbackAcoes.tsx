import { fecharFeedback, useAcaoAtual } from '../../state/acoes';
import { t } from '../../i18n';

export function FeedbackAcoes() {
  const estado = useAcaoAtual();
  if (!estado.erro && !estado.mensagem) return null;
  return <div className="fixed right-4 bottom-4 left-4 z-[100] mx-auto flex max-w-xl items-center justify-between gap-4 rounded-card border-2 border-ink bg-surface p-4 shadow-lg"
    role={estado.erro ? 'alert' : 'status'} aria-atomic="true">
    <span>{t(estado.erro ?? estado.mensagem ?? '')}</span>
    {!estado.ocupado && <button type="button" className="min-h-12 px-3 font-semibold underline" onClick={fecharFeedback}>{t('Fechar')}</button>}
  </div>;
}
