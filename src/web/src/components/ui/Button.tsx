import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'help';
export type ButtonSize = 'lg' | 'md';

interface BaseProps {
  variant?: ButtonVariant;
  /** Os dois têm 56 px de altura (HANDOFF); md tem menos respiro lateral, para listas. */
  size?: ButtonSize;
  /** Ocupa toda a largura do contêiner. */
  block?: boolean;
  children: ReactNode;
  className?: string;
}

type AsButton = BaseProps & Omit<ComponentPropsWithoutRef<'button'>, keyof BaseProps> & { to?: never };
type AsLink = BaseProps & Omit<LinkProps, keyof BaseProps> & { to: LinkProps['to']; disabled?: never };

export type ButtonProps = AsButton | AsLink;

const base =
  'inline-flex items-center justify-center gap-2.5 text-center font-semibold no-underline ' +
  'transition-colors duration-150 box-border select-none';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface hover:bg-muted hover:text-surface',
  secondary: 'bg-jungle text-surface hover:bg-ink hover:text-surface',
  outline: 'bg-surface text-ink border-2 border-ink hover:bg-peony hover:text-ink',
  text: 'bg-transparent text-ink underline underline-offset-4 hover:decoration-2',
  help: 'bg-rose text-dark hover:bg-peony hover:text-dark',
};

const sizes: Record<ButtonSize, string> = {
  lg: 'min-h-14 px-5.5 rounded-button text-button',
  md: 'min-h-14 px-4 rounded-button text-button',
};

const disabledStyle = 'bg-disabled text-muted border-0 cursor-not-allowed hover:bg-disabled hover:text-muted';

export function buttonClasses({
  variant = 'primary',
  size = 'lg',
  block = false,
  disabled = false,
  className,
}: Pick<BaseProps, 'variant' | 'size' | 'block' | 'className'> & { disabled?: boolean }) {
  return cx(
    base,
    variant === 'text' ? 'min-h-12 px-1 text-body' : sizes[size],
    disabled ? disabledStyle : variants[variant],
    block && 'w-full',
    className,
  );
}

/**
 * Botão do sistema. Com `to`, vira link do React Router com a mesma aparência.
 * O rótulo sempre diz o que acontece ("Fazer uma pausa"), nunca "OK".
 */
export function Button(props: ButtonProps) {
  const { variant, size, block, className, children } = props;

  if (props.to !== undefined) {
    const { variant: _v, size: _s, block: _b, className: _c, children: _ch, ...rest } = props;
    return (
      <Link {...rest} className={buttonClasses({ variant, size, block, className })}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, block: _b, className: _c, children: _ch, type = 'button', ...rest } = props;
  return (
    <button {...rest} type={type} className={buttonClasses({ variant, size, block, disabled: rest.disabled, className })}>
      {children}
    </button>
  );
}
