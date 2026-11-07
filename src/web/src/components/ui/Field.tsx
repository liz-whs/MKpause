import { useId, type ChangeEvent, type ClipboardEvent, type ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';
import { t } from '../../i18n';
import { useAcaoAtual } from '../../state/acoes';
import { mascararData, mascararTelefone } from '../../domain/formularios';

type FieldProps = {
  label: string;
  /** Dica curta abaixo do rótulo. */
  hint?: string;
  /** Mensagem de erro: diz o que fazer. */
  error?: string;
  /** Mostra "(opcional)" ao lado do rótulo. */
  optional?: boolean;
  multiline?: boolean;
  mask?: 'data' | 'telefone';
  className?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'className'> &
  Pick<ComponentPropsWithoutRef<'textarea'>, 'rows'>;

/** Campo de texto com rótulo visível ligado ao input. Raio de 14 px. */
export function Field({ label, hint, error, optional, multiline, mask, className, id, rows = 3, ...rest }: FieldProps) {
  const { ocupado } = useAcaoAtual();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-dica` : undefined;
  const errorId = error ? `${fieldId}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const mascara = mask ?? (rest.type === 'tel' ? 'telefone' : undefined);
  const limite = rest.maxLength ?? (mascara === 'data' ? 10 : mascara === 'telefone' ? 15 : multiline ? 5000 : rest.type === 'email' ? 254 : rest.type === 'password' || rest.autoComplete?.includes('password') ? 128 : 150);
  const formatar = (valor: string) => mascara === 'data' ? mascararData(valor) : mascara === 'telefone' ? mascararTelefone(valor) : valor;
  const mudar = (e: ChangeEvent<HTMLInputElement>) => {
    if (mascara) {
      const input = e.currentTarget;
      const digitosAntes = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
      input.value = formatar(input.value);
      let posicao = 0, vistos = 0;
      while (posicao < input.value.length && vistos < digitosAntes) if (/\d/.test(input.value[posicao++])) vistos++;
      queueMicrotask(() => { if (document.activeElement === input) input.setSelectionRange(posicao, posicao); });
    }
    rest.onChange?.(e);
  };
  const colar = (e: ClipboardEvent<HTMLInputElement>) => {
    rest.onPaste?.(e);
    if (!mascara || e.defaultPrevented) return;
    e.preventDefault();
    const input = e.currentTarget;
    input.value = formatar(input.value.slice(0, input.selectionStart ?? 0) + e.clipboardData.getData('text') + input.value.slice(input.selectionEnd ?? input.value.length));
    // Os consumidores recebem o mesmo campo já formatado, inclusive em colagens longas.
    rest.onChange?.(e as unknown as ChangeEvent<HTMLInputElement>);
  };

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
          maxLength={limite}
          disabled={rest.disabled || ocupado}
        />
      ) : (
        <input
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...rest}
          maxLength={limite}
          inputMode={rest.inputMode ?? (mascara === 'data' ? 'numeric' : undefined)}
          onChange={mudar}
          onPaste={colar}
          disabled={rest.disabled || ocupado}
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
