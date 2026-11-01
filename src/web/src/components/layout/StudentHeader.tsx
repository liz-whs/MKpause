import { Link, NavLink } from 'react-router';
import { Logo } from '../brand/Logo';
import { Icon, type IconName } from '../ui/Icon';
import { cx } from '../ui/cx';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { t } from '../../i18n';

const ITENS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/estudante', label: 'Início', icon: 'inicio', end: true },
  { to: '/estudante/atividades', label: 'Atividades', icon: 'atividades' },
  { to: '/estudante/cuidados', label: 'Cuidados', icon: 'broto' },
];

interface StudentHeaderProps {
  /** Iniciais do apelido, mostradas no avatar. */
  iniciais: string;
}

/**
 * Cabeçalho do site do estudante: logo à esquerda, avatar (Perfil) à direita
 * e menu em pílulas centralizado. A partir de 1024 px tudo fica numa linha só.
 */
export function StudentHeader({ iniciais }: StudentHeaderProps) {
  return (
    // A partir de 1024 px, grade de 3 colunas (laterais iguais) para o menu ficar no centro da página.
    <header className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-5 pt-3.5 pb-1 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-6 md:px-8 md:pt-6 lg:max-w-5xl">
      <div className="flex items-center justify-between lg:contents">
        <Link to="/estudante" aria-label={t('mkpause, início')} className="no-underline lg:order-1 lg:justify-self-start">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 lg:order-3 lg:justify-self-end">
          <BotaoPreferencias />
          <Link
            to="/estudante/perfil"
            className="flex size-12 items-center justify-center rounded-full bg-surface text-caption font-bold no-underline hover:bg-peony"
          >
            {iniciais}
            <span className="sr-only">{t(', Perfil')}</span>
          </Link>
        </div>
      </div>
      <nav aria-label={t('Navegação principal')} className="lg:order-2">
        {/* Com texto grande, as pílulas quebram linha em vez de vazar da tela. */}
        <ul className="flex flex-wrap justify-center gap-1.5">
          {ITENS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'inline-flex min-h-12 items-center gap-1.5 rounded-pill px-3.5 text-caption font-semibold no-underline',
                    isActive ? 'bg-ink text-surface hover:text-surface' : 'bg-surface text-ink hover:bg-peony',
                  )
                }
              >
                <Icon name={item.icon} size={18} />
                {t(item.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
