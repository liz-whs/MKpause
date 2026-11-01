import type { ReactNode } from 'react';
import { Link, type To } from 'react-router';
import { PAPEL_LABEL, type Profissional } from '../../domain/tipos';
import { Icon, type IconName } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';

/** Linha de atividade (Atividades e "Escolha uma atividade"). */
export function ActivityRow({
  to,
  state,
  onClick,
  icone,
  fundo,
  titulo,
  detalhe,
  selo,
}: {
  to: To;
  /** Estado da navegação (ex.: a atividade escolhida em Atividades). */
  state?: unknown;
  onClick?: () => void;
  icone: IconName;
  fundo: string;
  titulo: string;
  detalhe: string;
  selo?: ReactNode;
}) {
  return (
    <Link
      to={to}
      state={state}
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-card-lg bg-surface p-4 no-underline hover:bg-surface-hover hover:text-ink"
    >
      <span className={cx('flex size-15 flex-none items-center justify-center rounded-[20px]', fundo)}>
        <Icon name={icone} size={30} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {selo}
        <strong className="font-display text-button font-semibold">{titulo}</strong>
        <span className="text-caption font-semibold text-muted">{detalhe}</span>
      </span>
      <Icon name="seguir" size={22} />
    </Link>
  );
}

/** Lista de profissionais (Quem vai saber, Quem sabe, Quem acompanha você). */
export function PeopleList({ pessoas, detalhe }: { pessoas: Profissional[]; detalhe?: (p: Profissional) => string }) {
  return (
    <ul className="flex flex-col gap-2">
      {pessoas.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-[18px] bg-surface px-3.5 py-3">
          <span
            aria-hidden="true"
            className="flex size-10 flex-none items-center justify-center rounded-full bg-lavender text-caption font-bold"
          >
            {p.iniciais}
          </span>
          <span className="flex flex-col">
            <strong>{p.nome}</strong>
            <span className="text-caption text-muted">
              {detalhe ? detalhe(p) : [PAPEL_LABEL[p.papel], p.papel === 'professor' && p.detalhe].filter(Boolean).join(' · ')}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Linha fixa de emergência. O MKpause não é serviço de emergência. */
export function EmergencyLine() {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-surface px-4 py-3.5">
      <Icon name="telefone" size={22} />
      <p className="font-semibold">
        {t('Emergência:')} <a href="tel:188">188 (CVV)</a> · <a href="tel:192">192 (SAMU)</a>
      </p>
    </div>
  );
}

/** Botão flutuante "Me acalmar agora" (Atividades e Cuidados): leva ao nível 3. */
export function CalmFab() {
  return (
    <Link
      to="/estudante/agora"
      className={cx(
        'fixed right-4 bottom-5 z-10 flex min-h-14 items-center gap-2 rounded-pill bg-rose py-0 pr-5 pl-4',
        'font-semibold text-dark no-underline shadow-[0_6px_18px_rgba(89,65,49,0.22)]',
        'hover:bg-peony hover:text-dark md:right-8 md:bottom-8',
      )}
    >
      <Icon name="respiracao" size={22} />
      {t('Me acalmar agora')}
    </Link>
  );
}

/** Aviso curto de privacidade com cadeado. */
export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-caption text-muted">
      <Icon name="cadeado" size={16} />
      {children}
    </p>
  );
}

/** Título de seção do estudante (22 px no celular, 24 no computador). */
export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <h2 className="text-section md:text-section-lg">
      {children}
      {extra && <span className="font-sans text-body font-normal text-muted"> {extra}</span>}
    </h2>
  );
}

/** Título de tela (30 px no celular, 40 no computador). */
export function ScreenTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cx('text-screen md:text-screen-lg', className)}>{children}</h1>;
}
