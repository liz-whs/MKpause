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

/** Identifica a atividade sem ocupar a área de execução. */
export function NomeAtividade({ titulo }: { titulo: string }) {
  return <h1 className="min-w-0 max-w-32 font-sans text-label leading-snug font-semibold break-words md:max-w-none md:text-caption">{t(titulo)}</h1>;
}

/** Encerramento comum aos players; mantém o destino definido pelo fluxo da atividade. */
export function TerminarExercicio({ to, onClick }: { to: To; onClick?: () => void }) {
  return <Link to={to} onClick={onClick}
    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-pill border border-ink/40 bg-peony px-3 py-2 text-caption font-semibold text-ink transition-colors hover:bg-ink hover:text-surface focus-visible:bg-ink focus-visible:text-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink md:px-4 md:text-body">
    {t('Terminar exercício')}
  </Link>;
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
      <span className="flex shrink-0 items-center gap-2.5">
        {children}
        <BotaoPreferencias />
      </span>
    </div>
  );
}
