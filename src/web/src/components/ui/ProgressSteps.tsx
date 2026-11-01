import { cx } from './cx';
import { t } from '../../i18n';

interface ProgressStepsProps {
  current: number;
  total: number;
  /** Nome da etapa atual, ex.: "Como você está". */
  label: string;
}

/** Barra de etapas da sessão (role="progressbar"). */
export function ProgressSteps({ current, total, label }: ProgressStepsProps) {
  const texto = t('Etapa {atual} de {total}', { atual: current, total });
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`${texto}: ${label}`}
        aria-label={t('Progresso da pausa')}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cx('h-2 flex-1 rounded-pill', i < current ? 'bg-ink' : 'bg-surface')} />
        ))}
      </div>
      <span className="text-caption font-semibold text-muted" aria-hidden="true">
        {texto} · {label}
      </span>
    </div>
  );
}
