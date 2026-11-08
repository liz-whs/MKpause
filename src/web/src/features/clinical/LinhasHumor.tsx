import { useState } from 'react';
import type { DashboardClinico } from '../../data/servidor';
import { EMOCOES, type EmocaoId } from '../../domain/emocoes';
import { dataBrasileira } from '../../domain/formatos';
import { Card } from '../../components/ui/Card';
import { t } from '../../i18n';

export function contagensDiarias(dados: Pick<DashboardClinico, 'periodo' | 'evolucao'>, emocao: EmocaoId) {
  const dias: { data: string; antes: number; depois: number }[] = [];
  const fim = new Date(`${dados.periodo.fim}T00:00:00Z`);
  for (const dia = new Date(`${dados.periodo.inicio}T00:00:00Z`); dia <= fim; dia.setUTCDate(dia.getUTCDate() + 1)) {
    dias.push({ data: dia.toISOString().slice(0, 10), antes: 0, depois: 0 });
  }
  const porDia = new Map(dias.map((dia) => [dia.data, dia]));
  for (const sessao of dados.evolucao) {
    const dia = porDia.get(sessao.data);
    if (!dia) continue;
    if (sessao.humor_antes === emocao) dia.antes++;
    if (sessao.humor_depois === emocao) dia.depois++;
  }
  return dias;
}

export function LinhasHumor({ dados }: { dados: DashboardClinico }) {
  const [emocao, setEmocao] = useState<EmocaoId>('calmo');
  const dias = contagensDiarias(dados, emocao);
  const [selecao, setSelecao] = useState(() => dias.reduce((ultimo, dia, i) => dia.antes + dia.depois > 0 ? i : ultimo, 0));
  const indice = Math.min(selecao, Math.max(0, dias.length - 1));
  const dia = dias[indice];
  const maximo = Math.max(1, ...dias.flatMap((d) => [d.antes, d.depois]));
  const x = (i: number) => dias.length === 1 ? 360 : 48 + i * 624 / Math.max(1, dias.length - 1);
  const y = (valor: number) => 226 - valor * 180 / maximo;
  const marcas = [...new Set([0, Math.floor(maximo / 2), maximo])];
  const datasVisiveis = new Set([0, Math.floor((dias.length - 1) / 4), Math.floor((dias.length - 1) / 2), Math.floor((dias.length - 1) * 3 / 4), dias.length - 1]);
  return <Card as="section" aria-label={t('Emoções ao longo dos dias')} className="flex w-full min-w-0 flex-col gap-3 self-start p-4!">
    <h2 className="text-section">{t('Emoções ao longo dos dias')}</h2>
    <p className="text-caption text-muted">{t('Escolha uma emoção para comparar a quantidade de registros antes e depois em cada dia.')}</p>
    <div role="group" aria-label={t('Emoção do gráfico')} className="flex flex-wrap gap-2">
      {EMOCOES.map((e) => <button key={e.id} type="button" aria-pressed={emocao === e.id} onClick={() => setEmocao(e.id)}
        className={`flex min-h-11 items-center gap-2 rounded-pill border px-3 text-caption font-semibold text-ink transition-colors ${emocao === e.id ? 'border-ink bg-leaf hover:bg-leaf ring-1 ring-ink' : 'border-line bg-bg hover:border-ink hover:bg-peony'}`}>
        <img src={e.imagem} alt="" className="size-7 object-contain" />{e.label}
      </button>)}
    </div>
    <div className="flex flex-wrap gap-5 text-caption" aria-label={t('Legenda')}>
      <span className="flex items-center gap-2"><span aria-hidden="true" className="h-1 w-7 rounded bg-ink" />{t('Antes')}</span>
      <span className="flex items-center gap-2"><span aria-hidden="true" className="w-7 border-t-3 border-dashed border-jungle" />{t('Depois')}</span>
    </div>
    <div className="overflow-x-auto rounded-field bg-bg/60" tabIndex={0} aria-label={t('Gráfico de linhas dos registros diários')}>
      <svg viewBox="0 0 720 270" className="mx-auto block w-full min-w-[35rem] max-w-[46rem] text-ink" role="group" aria-label={t('Quantidade de registros por dia')}>
        <text x="48" y="23" fontSize="14" fill="currentColor">{t('Quantidade de registros')}</text>
        {marcas.map((valor) => <g key={valor} aria-hidden="true"><line x1="48" x2="672" y1={y(valor)} y2={y(valor)} stroke="currentColor" opacity="0.15" /><text x="32" y={y(valor) + 5} textAnchor="end" fontSize="14" fill="currentColor">{valor}</text></g>)}
        {dia && <line x1={x(indice)} x2={x(indice)} y1="38" y2="226" stroke="currentColor" strokeDasharray="3 5" opacity="0.3" />}
        {(['antes', 'depois'] as const).map((etapa) => <g key={etapa} className={etapa === 'antes' ? 'text-ink' : 'text-jungle'}>
          <polyline aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeDasharray={etapa === 'depois' ? '8 5' : undefined} points={dias.map((d, i) => `${x(i)},${y(d[etapa])}`).join(' ')} />
          {dias.map((d, i) => <g key={d.data}>
            <circle cx={x(i)} cy={y(d[etapa])} r={indice === i ? 6 : 4} fill={etapa === 'antes' ? 'currentColor' : 'var(--color-surface)'} stroke="currentColor" strokeWidth="2" pointerEvents="none" />
            <circle role="button" tabIndex={0} aria-label={`${dataBrasileira(d.data)}, ${t(etapa === 'antes' ? 'Antes' : 'Depois')}: ${d[etapa]}`} cx={x(i)} cy={y(d[etapa])} r="12" fill="transparent" className="cursor-pointer focus:stroke-current focus:outline-none" onMouseEnter={() => setSelecao(i)} onFocus={() => setSelecao(i)} onClick={() => setSelecao(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelecao(i); } }} />
          </g>)}
        </g>)}
        {dias.map((d, i) => datasVisiveis.has(i) && <text aria-hidden="true" key={d.data} x={x(i)} y="253" textAnchor="middle" fontSize="14" fill="currentColor">{dataBrasileira(d.data).slice(0, 5)}</text>)}
      </svg>
    </div>
    {dia && <>
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center justify-between gap-3 rounded-field bg-bg px-4 py-3 text-caption">
        <strong>{dataBrasileira(dia.data)}</strong><span>{t('Antes')}: <strong>{dia.antes}</strong></span><span>{t('Depois')}: <strong>{dia.depois}</strong></span>
      </div>
    </>}
    <p className="text-caption text-muted">{t('Zero significa nenhum registro dessa emoção no dia. As linhas mostram contagens, não intensidade emocional.')}</p>
  </Card>;
}
