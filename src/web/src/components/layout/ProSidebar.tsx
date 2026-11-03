import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { LogoSymbol } from '../brand/Logo';
import { Icon, type IconName } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { sairProfissional } from '../../state/ProContext';

export interface ProMenuItem {
  to: string;
  label: string;
  icon: IconName;
  /** Pendências: aparece como contador à direita. */
  count?: number;
  end?: boolean;
}

export interface ProSidebarProps {
  /** Perfil exibido sob o logo, ex.: "Professor(a)". */
  perfil: string;
  items: ProMenuItem[];
  usuario: { nome: string; iniciais: string };
  /** Página de perfil de quem está usando (o cartão do usuário leva até ela). */
  perfilTo: string;
}

function MenuLinks({ items }: { items: ProMenuItem[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex min-h-12 items-center gap-3 rounded-field px-3.5 text-body no-underline',
                isActive ? 'bg-peony font-semibold hover:text-ink' : 'font-medium hover:bg-surface-hover hover:text-ink',
              )
            }
          >
            <Icon name={item.icon} size={22} />
            {t(item.label)}
            {item.count !== undefined && item.count > 0 && (
              <span className="ml-auto min-w-6.5 rounded-pill bg-ink px-2 py-0.5 text-center text-caption text-surface">
                {item.count}
                <span className="sr-only"> {t('pendentes')}</span>
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function Usuario({ perfil, usuario, perfilTo }: Pick<ProSidebarProps, 'perfil' | 'usuario' | 'perfilTo'>) {
  return (
    <>
      {/* O cartão do usuário é o caminho para o Perfil (nome visível + "Perfil" para o leitor de tela). */}
      <NavLink
        to={perfilTo}
        className={({ isActive }) =>
          cx(
            'flex items-center gap-2.5 rounded-2xl p-3 no-underline hover:text-ink',
            isActive ? 'bg-peony outline-2 outline-ink' : 'bg-peony hover:bg-surface-hover',
          )
        }
      >
        <span
          aria-hidden="true"
          className="flex size-10.5 flex-none items-center justify-center rounded-full bg-lavender font-bold"
        >
          {usuario.iniciais}
        </span>
        <span className="flex min-w-0 flex-col text-caption">
          <strong className="truncate">{usuario.nome}</strong>
          <span className="text-muted">{perfil}</span>
        </span>
        <span className="sr-only">, {t('Perfil')}</span>
        <Icon name="seguir" size={18} className="ml-auto flex-none" />
      </NavLink>
      <Link to="/" onClick={sairProfissional} className="flex min-h-12 items-center gap-2 px-2.5 font-semibold no-underline">
        <Icon name="sair" size={20} />
        {t('Sair')}
      </Link>
    </>
  );
}

function Marca({ perfil }: { perfil: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <LogoSymbol size={34} />
      <span className="flex flex-col">
        <span className="font-display text-section font-semibold leading-tight">mkpause</span>
        <span className="text-caption font-semibold text-muted">{perfil}</span>
      </span>
    </div>
  );
}

/**
 * Menu lateral dos profissionais e da administração.
 * Abaixo de 1024 px vira uma barra no topo com o botão "Menu".
 */
export function ProSidebar({ perfil, items, usuario, perfilTo }: ProSidebarProps) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();
  const { pathname } = useLocation();

  // Fecha o menu do topo ao trocar de página.
  useEffect(() => setAberto(false), [pathname]);

  return (
    <>
      {/* Computador: coluna fixa à esquerda */}
      <aside className="hidden w-68 flex-none flex-col gap-6 bg-surface px-4 py-6 lg:flex">
        <Marca perfil={perfil} />
        <nav aria-label={t('Menu')}>
          <MenuLinks items={items} />
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <BotaoPreferencias rotulo className="w-full justify-start bg-transparent hover:bg-surface-hover" />
          <Usuario perfil={perfil} usuario={usuario} perfilTo={perfilTo} />
        </div>
      </aside>

      {/* Telas menores: barra no topo */}
      <header className="bg-surface px-5 py-3 lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Marca perfil={perfil} />
          <span className="ml-auto flex items-center gap-1.5">
          <BotaoPreferencias className="bg-transparent hover:bg-surface-hover" />
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={painelId}
            onClick={() => setAberto((v) => !v)}
            className="inline-flex min-h-12 items-center gap-2 rounded-field px-3 font-semibold hover:bg-surface-hover"
          >
            <Icon name={aberto ? 'fechar' : 'menu'} />
            {t('Menu')}
          </button>
          </span>
        </div>
        <div id={painelId} hidden={!aberto} className="flex flex-col gap-4 pt-4">
          <nav aria-label={t('Menu')}>
            <MenuLinks items={items} />
          </nav>
          <Usuario perfil={perfil} usuario={usuario} perfilTo={perfilTo} />
        </div>
      </header>
    </>
  );
}
