import { useState } from 'react';
import type { DashboardClinico } from '../../data/servidor';
import { Card } from '../../components/ui/Card';
import { emocaoPorId, type EmocaoId } from '../../domain/emocoes';
import { t } from '../../i18n';

type Modo = 'comparar' | 'antes' | 'depois';

export function ComparacaoHumor({ linhas }: { linhas: DashboardClinico['distribuicao_humor'] }) {
  const [modo, setModo] = useState<Modo>('comparar');
  const maximo = Math.max(1, ...linhas.flatMap((d) => [d.antes, d.depois]));
  return <Card as="section" aria-label={t('Distribuição das emoções')} className="flex min-w-0 flex-col gap-4">
    <h2 className="text-section">{t('Distribuição das emoções')}</h2>
    <p className="text-caption text-muted">{t('Quantidade de registros antes e depois para cada emoção')}</p>
    <div role="group" aria-label={t('Visualização dos humores')} className="flex flex-wrap gap-2">
      {(['comparar', 'antes', 'depois'] as const).map((valor) => <button key={valor} type="button" aria-pressed={modo === valor} onClick={() => setModo(valor)}
        className={`min-h-11 rounded-pill border px-4 text-caption font-semibold transition-colors ${modo === valor ? 'border-ink bg-ink text-surface' : 'border-line bg-bg hover:bg-peony'}`}>
        {t(valor === 'comparar' ? 'Comparar' : valor === 'antes' ? 'Antes' : 'Depois')}
      </button>)}
    </div>
    <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{linhas.map((d) => {
      const emocao = emocaoPorId(d.emocao as EmocaoId);
      const diferenca = d.depois - d.antes;
      return <li key={d.emocao} className="rounded-field bg-bg/60 p-3 transition-colors hover:bg-peony/40">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-semibold"><img src={emocao.imagem} alt="" className="size-8 object-contain" />{emocao.label}</span>
          {modo === 'comparar' && <span className="rounded-pill bg-surface px-2 py-1 text-caption tabular-nums" aria-label={t('Diferença depois menos antes')}>
            {t('Diferença')}: {diferenca > 0 ? '+' : ''}{diferenca}
          </span>}
        </div>
        <div className="flex flex-col gap-2">{(['antes', 'depois'] as const).filter((etapa) => modo === 'comparar' || modo === etapa).map((etapa) =>
          <div key={etapa} className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-2 text-caption">
            <span>{t(etapa === 'antes' ? 'Antes' : 'Depois')}</span>
            <div aria-hidden="true" className="h-4 overflow-hidden rounded-pill bg-line/50"><div
              className={`h-full rounded-pill motion-safe:transition-[width] motion-safe:duration-500 ${etapa === 'antes' ? 'bg-ink' : 'bg-jungle'}`}
              style={{ width: `${d[etapa] / maximo * 100}%` }} /></div>
            <strong className="text-right tabular-nums">{d[etapa]}</strong>
          </div>)}</div>
      </li>;
    })}</ul>
  </Card>;
}
