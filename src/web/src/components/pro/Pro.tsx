import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link, type To } from 'react-router';
import { emocaoPorId, type EmocaoId } from '../../domain/emocoes';
import type { Alerta } from '../../domain/tipos';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';

/** Título da página (40 px no computador) com descrição curta e ação opcional. */
export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-screen md:text-screen-lg">{titulo}</h1>
        {descricao && <p className="text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function BackLink({ to, children }: { to: To; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-12 items-center gap-1.5 self-start font-semibold">
      <Icon name="voltar" size={20} />
      {children}
    </Link>
  );
}

export function Avatar({ iniciais, tamanho = 'md', tom = 'lavender' }: { iniciais: string; tamanho?: 'sm' | 'md' | 'lg'; tom?: 'lavender' | 'surface' | 'sky' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex flex-none items-center justify-center rounded-full font-bold',
        tom === 'lavender' && 'bg-lavender',
        tom === 'surface' && 'bg-surface',
        tom === 'sky' && 'bg-sky',
        tamanho === 'sm' && 'size-9.5 text-label',
        tamanho === 'md' && 'size-11 text-caption',
        tamanho === 'lg' && 'size-16 text-section',
      )}
    >
      {iniciais}
    </span>
  );
}

/** Campo de busca com rótulo visível. */
export function SearchField({ label, placeholder, value, onChange, className = 'flex-1 basis-64' }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; className?: string }) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-caption font-semibold">
        {label}
      </label>
      <div className="flex min-h-12 items-center gap-2 rounded-field border-2 border-line bg-surface px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
        <Icon name="busca" size={20} className="text-muted" />
        <input
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}

/** Seleção com rótulo visível. */
export function SelectField({
  label, value, onChange, options, className,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-caption font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 rounded-field border-2 border-line bg-surface px-3 text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Confirmação de sucesso (fundo Leaf). */
export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-[18px] bg-leaf px-4.5 py-3.5 font-semibold">
      <Icon name="check" size={22} />
      {children}
    </div>
  );
}

/** Nota curta com cadeado (o que não aparece, quem vê). */
export function LockNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-caption text-muted">
      <Icon name="cadeado" size={18} className="mt-0.5 flex-none" />
      <span>{children}</span>
    </p>
  );
}

export function StatCard({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="flex flex-1 basis-44 flex-col gap-1 rounded-card bg-surface px-5 py-4.5">
      <span className="font-display text-screen font-semibold">{valor}</span>
      <span className="text-caption font-semibold text-muted">{rotulo}</span>
    </div>
  );
}

/** Selo do alerta (só existe o do nível 3): sempre com ícone e texto, nunca só cor. */
export function AlertBadge(_props: { alerta: Pick<Alerta, 'tipo'> }) {
  return (
    <Badge tone="rose" icon="alerta">
      {t('Alerta · Nível 3')}
    </Badge>
  );
}

/** Emoção registrada pelo próprio aluno (sem intensidade). */
export function EmocaoTag({ id }: { id: EmocaoId }) {
  const e = emocaoPorId(id);
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <img src={e.imagem} alt="" className="size-8 flex-none object-contain" />
      {e.label}
    </span>
  );
}

export function EmocaoAntesDepois({ antes, depois }: { antes: EmocaoId; depois: EmocaoId }) {
  return (
    <span className="relative flex flex-wrap items-center gap-1.5 text-caption">
      <span className="sr-only">{t('Antes:')}</span>
      <EmocaoTag id={antes} />
      <Icon name="seta" size={16} className="text-muted" />
      <span className="sr-only">{t('Depois:')}</span>
      <EmocaoTag id={depois} />
    </span>
  );
}

/**
 * Janela de confirmação para ações que não têm volta fácil.
 * Foco vai para "Cancelar" ao abrir, Esc fecha e o foco volta para quem abriu.
 */
export function ConfirmDialog({
  aberto, titulo, texto, confirmar, onConfirmar, onCancelar,
}: { aberto: boolean; titulo: string; texto: string; confirmar: string; onConfirmar: () => void; onCancelar: () => void }) {
  const tituloId = useId();
  const textoId = useId();
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const anterior = useRef<Element | null>(null);

  useEffect(() => {
    if (!aberto) return;
    anterior.current = document.activeElement;
    cancelarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      (anterior.current as HTMLElement | null)?.focus?.();
    };
  }, [aberto, onCancelar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-dark/45 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={textoId}
        className="flex w-full max-w-115 flex-col gap-3.5 rounded-[28px] bg-surface p-7"
      >
        <h2 id={tituloId} className="text-section md:text-section-lg">
          {titulo}
        </h2>
        <p id={textoId} className="text-muted">
          {texto}
        </p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            className="min-h-14 rounded-button border-2 border-ink bg-surface px-4 text-button font-semibold hover:bg-peony"
          >
            {t('Cancelar')}
          </button>
          <Button size="md" onClick={onConfirmar}>
            {confirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
