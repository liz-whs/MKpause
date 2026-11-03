import { cx } from './cx';
import { t } from '../../i18n';

interface ChoiceChipsProps<T extends string> {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Rótulo do grupo para leitores de tela. */
  label: string;
  /** Tocar de novo na opção marcada desmarca (para escolhas opcionais). */
  allowDeselect?: boolean;
  /**
   * leaf = escolha do aluno (fundo Leaf e borda Cacao);
   * ink = filtro (fundo Cacao).
   */
  tone?: 'leaf' | 'ink';
  /** Divide em colunas iguais em vez de quebrar linha. */
  columns?: 2;
  /** Texto de cada opção (traduzido na tela; sem rótulo, a própria opção). */
  labels?: Partial<Record<T, string>>;
}

/** Escolha única em pílulas, com aria-pressed. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  tone = 'leaf',
  columns,
  labels,
}: ChoiceChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cx(columns ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2')}>
      {options.map((opcao) => {
        const marcada = value === opcao;
        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={marcada}
            onClick={() => onChange(marcada && allowDeselect ? null : opcao)}
            className={cx(
              'min-h-12 rounded-pill px-4 font-semibold transition-colors',
              tone === 'leaf' && 'border-3',
              tone === 'leaf' && (marcada ? 'border-ink bg-leaf' : 'border-surface bg-surface hover:bg-surface-hover'),
              tone === 'ink' && (marcada ? 'bg-ink text-surface' : 'bg-surface hover:bg-surface-hover'),
            )}
          >
            {t(labels?.[opcao] ?? opcao)}
          </button>
        );
      })}
    </div>
  );
}
