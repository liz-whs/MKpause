import { Link } from 'react-router';
import type { NivelInfo } from '../../domain/niveis';
import { Icon } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';

const estilos = {
  3: { card: 'bg-rose text-dark hover:text-dark', icone: 'bg-surface', numero: 'bg-dark text-rose' },
  2: { card: 'bg-sky text-ink hover:text-ink', icone: 'bg-surface', numero: 'bg-ink text-sky' },
  1: { card: 'bg-surface text-ink hover:bg-surface-hover hover:text-ink', icone: 'bg-lavender', numero: 'bg-ink text-surface' },
} as const;

/**
 * Card de nível da tela inicial: 80 px de altura, ícone à esquerda,
 * título curto e "Nível N" à direita. O nível vai no texto, não só na cor.
 */
export function LevelCard({ info }: { info: NivelInfo }) {
  const e = estilos[info.nivel];
  return (
    <Link
      to={info.destino}
      className={cx('flex min-h-20 items-center gap-3.5 rounded-card px-4.5 no-underline transition-colors', e.card)}
    >
      <span className={cx('flex size-11.5 flex-none items-center justify-center rounded-full text-ink', e.icone)}>
        <Icon name={info.icone} />
      </span>
      {/* Nome acessível = texto visível: "Não estou bem, Nível 3" (WCAG 2.5.3). */}
      <strong className="flex-1 font-display text-button font-semibold">
        {info.titulo}
        <span className="sr-only">,</span>
      </strong>{' '}
      <span className="flex flex-none flex-col items-center gap-px">
        <span className="text-label font-bold tracking-wider uppercase">{t('Nível')}</span>{' '}
        <span className={cx('flex size-9.5 items-center justify-center rounded-full text-section font-semibold leading-none', e.numero)}>
          {info.nivel}
        </span>
      </span>
    </Link>
  );
}
