import { Link } from 'react-router';
import { CUIDADOS_DO_DIA, calcularSequencia, semanaAtual } from '../../domain/cuidados';
import { useEstudante } from '../../state/EstudanteContext';
import { Icon } from '../ui/Icon';
import { cx } from '../ui/cx';
import { t } from '../../i18n';

function Cabecalho({ dias, verMais }: { dias: number; verMais?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-13 flex-none items-center justify-center rounded-[18px] bg-leaf">
          <Icon name="broto" size={30} />
        </span>
        <div className="flex flex-col">
          <span className="font-display text-section font-semibold leading-tight">
            {dias === 1 ? t('{n} dia', { n: dias }) : t('{n} dias', { n: dias })}
          </span>
          <span className="text-caption font-semibold text-muted">{dias === 1 ? t('seguido') : t('seguidos')}</span>
        </div>
      </div>
      {verMais && (
        <Link to="/estudante/cuidados" className="inline-flex min-h-12 items-center px-2 text-caption font-semibold" aria-label={t('Ver cuidados')}>
          {t('Ver')}
        </Link>
      )}
    </div>
  );
}

/**
 * Dias da semana. Os dias dividem a largura do card; com `largo`, a partir de 1024 px
 * cada dia tem tamanho fixo, para não esticar quando o card ocupa a página toda.
 */
function Semana({ largo = false }: { largo?: boolean }) {
  const { diasComCuidado } = useEstudante();
  const semana = semanaAtual(diasComCuidado, new Date());
  return (
    <ol aria-label={t('Dias da semana com cuidado')} className={cx('flex gap-1', largo && 'lg:gap-2')}>
      {semana.map((d) => (
        <li
          key={d.chave}
          aria-current={d.estado === 'hoje' ? 'date' : undefined}
          className={cx(
            'flex flex-1 flex-col items-center gap-1.5 rounded-field py-1.5',
            largo && 'lg:w-16 lg:flex-none',
            d.estado === 'hoje' && 'bg-peony',
          )}
        >
          <span className="text-label font-bold text-muted">{d.rotulo}</span>
          <span
            role="img"
            aria-label={`${d.rotulo} ${d.numero}${d.feito ? t(', fez cuidado') : ''}${d.estado === 'hoje' ? t(', hoje') : ''}`}
            className={cx(
              'flex size-8.5 items-center justify-center rounded-full border-2 text-caption font-bold',
              d.feito ? 'border-transparent bg-leaf' : 'border-transparent',
              d.estado === 'hoje' && 'border-dashed border-ink',
            )}
          >
            {d.feito ? <Icon name="check" size={17} strokeWidth={3} /> : d.numero}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Card da sequência na tela inicial: dias seguidos, semana e o próximo cuidado do dia. */
export function CareStreakCard() {
  const { diasComCuidado, feitosHoje, alternarCuidado } = useEstudante();
  const dias = calcularSequencia(diasComCuidado, new Date());
  const proximo = CUIDADOS_DO_DIA.find((c) => !feitosHoje.includes(c.id));

  return (
    <section aria-label={t('Sua sequência de cuidados')} className="flex flex-col gap-3.5 rounded-[26px] bg-surface p-4">
      <Cabecalho dias={dias} verMais />
      <Semana />
      <div className="h-px bg-line" />
      <div role="status">
        {proximo ? (
          <div className="flex items-center gap-3">
            <span className={cx('flex size-11 flex-none items-center justify-center rounded-field', proximo.fundo)}>
              <Icon name={proximo.icone} size={22} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-label font-bold text-muted">
                {t('Hoje · {feitos} de {total}', { feitos: feitosHoje.length, total: CUIDADOS_DO_DIA.length })}
              </span>
              <strong>{proximo.label}</strong>
            </span>
            <button
              type="button"
              onClick={() => alternarCuidado(proximo.id)}
              aria-label={t('Feito: {cuidado}', { cuidado: proximo.label })}
              className="min-h-12 rounded-pill bg-ink px-4 font-semibold text-surface hover:bg-muted"
            >
              {t('Feito')}
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-full bg-leaf">
              <Icon name="check" size={17} strokeWidth={3} />
            </span>
            {t('Tudo feito hoje!')}
          </p>
        )}
      </div>
    </section>
  );
}

/** Versão da página Cuidados: dias seguidos, semana e se hoje já conta. */
export function CareStreakSummary() {
  const { diasComCuidado, feitosHoje } = useEstudante();
  const dias = calcularSequencia(diasComCuidado, new Date());
  return (
    // No computador o card ocupa a página toda: dias seguidos à esquerda, semana à direita.
    <section
      aria-label={t('Sua sequência de cuidados')}
      className="flex flex-col gap-3.5 rounded-[28px] bg-surface p-4.5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-6"
    >
      <div className="flex flex-col gap-3.5 lg:gap-2">
        <Cabecalho dias={dias} />
        <p className="text-caption text-muted">{feitosHoje.length > 0 ? t('Hoje já conta!') : t('Falta o de hoje')}</p>
      </div>
      <Semana largo />
    </section>
  );
}
