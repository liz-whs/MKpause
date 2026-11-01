import { useId, type ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';
import { t } from '../../i18n';

type FieldProps = {
  label: string;
  /** Dica curta abaixo do rótulo. */
  hint?: string;
  /** Mensagem de erro: diz o que fazer. */
  error?: string;
  /** Mostra "(opcional)" ao lado do rótulo. */
  optional?: boolean;
  multiline?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'className'> &
  Pick<ComponentPropsWithoutRef<'textarea'>, 'rows'>;

/** Campo de texto com rótulo visível ligado ao input. Raio de 14 px. */
export function Field({ label, hint, error, optional, multiline, className, id, rows = 3, ...rest }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-dica` : undefined;
  const errorId = error ? `${fieldId}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const inputClass = cx(
    'w-full min-h-14 rounded-field bg-surface px-4 text-body text-ink placeholder:text-muted',
    'border-2 outline-none focus-visible:outline-3 focus-visible:outline-ink focus-visible:outline-offset-2',
    error ? 'border-dark' : 'border-line',
    multiline && 'py-3 min-h-28 resize-y',
  );

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={fieldId} className="text-body font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> {t('(opcional)')}</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea
          id={fieldId}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...(rest as ComponentPropsWithoutRef<'textarea'>)}
        />
      ) : (
        <input
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...rest}
        />
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-2 text-caption font-semibold text-dark">
          {error}
        </p>
      )}
    </div>
  );
}
