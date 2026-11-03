import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';

type BadgeTone = 'surface' | 'rose' | 'lavender' | 'sky' | 'leaf' | 'peony' | 'ink';

const tones: Record<BadgeTone, string> = {
  surface: 'bg-surface text-ink',
  rose: 'bg-rose text-dark',
  lavender: 'bg-lavender text-ink',
  sky: 'bg-sky text-ink',
  leaf: 'bg-leaf text-ink',
  peony: 'bg-peony text-ink',
  ink: 'bg-ink text-surface',
};

interface BadgeProps {
  tone?: BadgeTone;
  /** Ícone obrigatório quando o selo indica estado (nível, alerta): nada só pela cor. */
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** Selo em pílula (raio 999), como "Alerta · Nível 3". */
export function Badge({ tone = 'surface', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 self-start rounded-pill px-3 py-1.5 text-caption font-semibold',
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}
