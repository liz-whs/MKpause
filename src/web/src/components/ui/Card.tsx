import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from './cx';

type CardTone = 'surface' | 'peony' | 'sky' | 'lavender' | 'rose';

const tones: Record<CardTone, string> = {
  surface: 'bg-surface text-ink',
  peony: 'bg-peony text-ink',
  sky: 'bg-sky text-ink',
  lavender: 'bg-lavender text-ink',
  rose: 'bg-rose text-dark',
};

type CardProps<T extends ElementType> = {
  as?: T;
  tone?: CardTone;
  /** compact = 16 px de respiro; normal = 20 px. */
  padding?: 'compact' | 'normal' | 'none';
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/** Cartão com raio de 22 a 24 px sobre o fundo creme. */
export function Card<T extends ElementType = 'div'>({
  as,
  tone = 'surface',
  padding = 'normal',
  children,
  className,
  ...rest
}: CardProps<T>) {
  const Tag = as ?? 'div';
  return (
    <Tag
      {...rest}
      className={cx(
        'rounded-card-lg',
        tones[tone],
        padding === 'normal' && 'p-5',
        padding === 'compact' && 'p-4',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
