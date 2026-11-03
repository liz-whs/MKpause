import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** Linha que abre e fecha (details/summary), usada nos perfis. */
export function Linha({ icone, titulo, valor, children }: { icone: IconName; titulo: string; valor?: string; children?: ReactNode }) {
  return (
    <details className="group rounded-2xl">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3.5 rounded-2xl px-1.5 py-3.5 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <Icon name={icone} size={22} />
        <span className="flex flex-1 flex-col">
          <strong>{titulo}</strong>
          {valor && <span className="text-caption text-muted">{valor}</span>}
        </span>
        <Icon name="seguir" size={20} className="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="px-1.5 pt-1 pb-3">{children}</div>
    </details>
  );
}
