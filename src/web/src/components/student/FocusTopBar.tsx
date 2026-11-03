import type { ReactNode } from 'react';
import { Link, type To } from 'react-router';
import { Icon } from '../ui/Icon';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { t } from '../../i18n';

/**
 * Botão redondo de voltar (48 px). O destino é sempre fixo (nunca o histórico
 * do navegador), para o "Voltar" de uma tela levar sempre ao mesmo lugar.
 */
export function BackButton({ to, label = t('Voltar') }: { to: To; label?: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex size-12 flex-none items-center justify-center rounded-full bg-surface text-ink hover:bg-peony hover:text-ink"
    >
      <Icon name="voltar" />
    </Link>
  );
}

export function SairDaPausa() {
  return (
    <Link to="/estudante" className="px-1 py-3 font-semibold">
      {t('Sair da pausa')}
    </Link>
  );
}

/**
 * Barra do topo das telas de foco: voltar à esquerda; ações e o botão
 * "Acessibilidade e idioma" à direita.
 */
export function FocusTopBar({ back, children }: { back?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 self-stretch pt-4 pb-1">
      {back ?? <span />}
      <span className="flex items-center gap-2.5">
        {children}
        <BotaoPreferencias />
      </span>
    </div>
  );
}
