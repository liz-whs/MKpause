import { EMOCOES, type EmocaoId } from '../../domain/emocoes';
import { Icon } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';

interface EmotionGridProps {
  value: EmocaoId | null;
  onChange: (emocao: EmocaoId) => void;
  /** Rótulo do grupo para leitores de tela. */
  label?: string;
}

/**
 * Grade de emoções em 3 colunas, sem intensidade.
 * A selecionada fica com fundo Leaf, borda Cacao e check.
 */
export function EmotionGrid({ value, onChange, label = t('Emoção') }: EmotionGridProps) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2.5">
      {EMOCOES.map((emocao) => {
        const selecionada = value === emocao.id;
        return (
          <button
            key={emocao.id}
            type="button"
            aria-pressed={selecionada}
            onClick={() => onChange(emocao.id)}
            className={cx(
              'relative flex flex-col items-center gap-1 rounded-card border-3 px-1 pt-3 pb-2.5',
              'text-caption font-semibold text-ink transition-colors',
              selecionada ? 'border-ink bg-leaf' : 'border-surface bg-surface hover:bg-surface-hover',
            )}
          >
            {selecionada && (
              <span className="absolute top-1.5 right-1.5 flex size-5.5 items-center justify-center rounded-full bg-ink text-surface">
                <Icon name="check" size={14} strokeWidth={3} />
              </span>
            )}
            <img src={emocao.imagem} alt="" className="size-17 object-contain" />
            {emocao.label}
          </button>
        );
      })}
    </div>
  );
}
