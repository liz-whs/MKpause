import { useId } from 'react';
import { cx } from './cx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Rótulo visível, ligado ao interruptor. */
  label: string;
  /** Texto de apoio abaixo do rótulo. */
  description?: string;
}

/** Interruptor liga/desliga (role="switch"). */
export function Switch({ checked, onChange, label, description }: SwitchProps) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex flex-1 flex-col gap-0.5">
        <span id={id} className="font-semibold">
          {label}
        </span>
        {description && (
          <span id={descId} className="text-caption text-muted">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={descId}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-8.5 w-14 flex-none rounded-pill p-0 transition-colors',
          checked ? 'bg-ink' : 'bg-disabled',
        )}
      >
        <span
          className={cx(
            'absolute top-1 size-6.5 rounded-full bg-surface transition-[left] duration-200 motion-reduce:transition-none',
            checked ? 'left-6.5' : 'left-1',
          )}
        />
      </button>
    </div>
  );
}
