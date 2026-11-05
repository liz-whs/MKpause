import { useId } from 'react';
import type { DashboardClinico, PeriodoDashboard } from '../../data/servidor';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SelectField, StatCard } from '../../components/pro/Pro';
import { locale, t } from '../../i18n';
import { hora } from '../../domain/formatos';

export function FiltroDashboard({dias, setDias, atualizar, carregando}: {
  dias:PeriodoDashboard; setDias:(dias:PeriodoDashboard)=>void; atualizar:()=>void; carregando:boolean;
}) {
  return <div className="flex flex-wrap items-end gap-3">
    <SelectField label={t('Período dos gráficos')} value={String(dias)}
      onChange={(valor) => setDias(Number(valor) as PeriodoDashboard)} options={[
        {value:'7',label:t('7 dias')},{value:'14',label:t('14 dias')},
        {value:'30',label:t('30 dias')},{value:'90',label:t('90 dias')},
      ]} />
    <Button size="md" variant="outline" disabled={carregando} onClick={atualizar}>{t('Atualizar gráficos')}</Button>
  </div>;
}

function Evolucao({sessoes}: {sessoes:DashboardClinico['evolucao']}) {
  const titulo=useId();
  const descricao=useId();
  const x=(i:number)=>sessoes.length===1 ? 310 : 40+i*540/(sessoes.length-1);
  const y=(valor:number)=>220-(valor-1)*45;
  const pontos=(campo:'humor_antes'|'humor_depois')=>sessoes.map((s,i)=>`${x(i)},${y(s[campo])}`).join(' ');
  return <Card as="section" aria-label={t('Evolução por sessão')} className="flex flex-col gap-3">
    <h2 className="text-section">{t('Evolução por sessão')}</h2>
    <p>{t('Um ponto por sessão, na ordem dos registros. Sessões no mesmo dia continuam separadas.')}</p>
    <svg viewBox="0 0 620 260" role="img" aria-labelledby={`${titulo} ${descricao}`} className="w-full">
      <title id={titulo}>{t('Valores antes e depois de cada sessão')}</title>
      <desc id={descricao}>{t('Escala de 1 a 5. Os valores de cada sessão também estão na tabela abaixo.')}</desc>
      {[1,2,3,4,5].map((valor)=><g key={valor}>
        <line x1="40" x2="580" y1={y(valor)} y2={y(valor)} stroke="#E6D8C6" />
        <text x="15" y={y(valor)+5} fontSize="14" fill="#594131">{valor}</text>
      </g>)}
      <polyline points={pontos('humor_antes')} fill="none" stroke="#594131" strokeWidth="3" strokeDasharray="7 5" />
      <polyline points={pontos('humor_depois')} fill="none" stroke="#65613F" strokeWidth="3" />
      {sessoes.map((s,i)=><g key={s.id_sessao}>
        <circle cx={x(i)} cy={y(s.humor_antes)} r="5" fill="#FFFAF7" stroke="#594131" strokeWidth="2" />
        <rect x={x(i)-4} y={y(s.humor_depois)-4} width="8" height="8" fill="#65613F" />
        {(sessoes.length<=8 || i===0 || i===sessoes.length-1) && <text x={x(i)} y="245" textAnchor="middle" fontSize="14" fill="#594131">{i+1}</text>}
      </g>)}
    </svg>
    <div className="flex flex-wrap gap-4 text-caption">
      <span>{t('Antes: linha tracejada e círculos')}</span><span>{t('Depois: linha contínua e quadrados')}</span>
    </div>
    <details><summary className="min-h-12 cursor-pointer py-3 font-semibold">{t('Ver valores por sessão')}</summary>
      <div className="max-h-96 overflow-auto" tabIndex={0} aria-label={t('Valores por sessão')}>
        <table className="w-full text-left text-caption">
          <caption className="py-2 text-left">{t('Registros individuais do período selecionado')}</caption>
          <thead><tr><th scope="col">{t('Sessão')}</th><th scope="col">{t('Data')}</th><th scope="col">{t('Antes')}</th><th scope="col">{t('Depois')}</th></tr></thead>
          <tbody>{sessoes.map((s,i)=><tr key={s.id_sessao}><th scope="row" className="py-2">{i+1}</th>
            <td>{s.data} · {hora(s.iniciada_em)}</td><td>{s.humor_antes}</td><td>{s.humor_depois}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </Card>;
}

export function Dashboard({dados}: {dados:DashboardClinico}) {
  const r=dados.resumo;
  const percentual=r.percentual_aumento===null ? '—' : `${r.percentual_aumento.toLocaleString(locale(),{maximumFractionDigits:1})}%`;
  const maximo=Math.max(1,...dados.distribuicao_humor.flatMap((d)=>[d.antes,d.depois]));
  const tipos:Record<string,string>={RESPIRACAO:t('Respiração'),JOGO:t('Jogos'),VIDEO:t('Vídeos')};
  return <>
    <p>{t('De {inicio} a {fim}',{inicio:dados.periodo.inicio,fim:dados.periodo.fim})}</p>
    <p className="text-caption text-muted">{t('Os gráficos usam os valores de autorrelato de 1 a 5 registrados em cada sessão.')}</p>
    <div className="flex flex-wrap gap-3.5">
      <StatCard valor={String(r.sessoes_concluidas)} rotulo={t('sessões concluídas no período')} />
      <StatCard valor={String(r.humor_aumentou)} rotulo={t('valor aumentou')} />
      <StatCard valor={String(r.humor_manteve)} rotulo={t('valor se manteve')} />
      <StatCard valor={String(r.humor_diminuiu)} rotulo={t('valor diminuiu')} />
      <StatCard valor={percentual} rotulo={t('com valor maior após a pausa')} />
    </div>
    <p className="text-caption text-muted">{t('A comparação numérica descreve os registros e não mede efeito terapêutico.')}</p>
    <p className="text-caption text-muted">{t('Indicadores descritivos de autorrelato; não constituem diagnóstico.')}</p>
    {r.sessoes_concluidas===0 ? <p role="status">{t('Nenhuma sessão concluída com registros completos neste período.')}</p> : <>
      <Evolucao sessoes={dados.evolucao} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card as="section" aria-label={t('Distribuição dos valores de humor')} className="flex flex-col gap-3">
          <h2 className="text-section">{t('Distribuição dos valores de humor')}</h2>
          <table className="w-full text-left">
            <caption className="text-left text-caption">{t('Quantidade de registros antes e depois em cada valor')}</caption>
            <thead><tr><th scope="col">{t('Valor')}</th><th scope="col">{t('Antes')}</th><th scope="col">{t('Depois')}</th></tr></thead>
            <tbody>{dados.distribuicao_humor.map((d)=><tr key={d.estado}><th scope="row" className="py-2">{d.estado}</th>
              <td className="pr-3"><span>{d.antes}</span><div aria-hidden="true" className="h-2 rounded bg-ink" style={{width:`${d.antes/maximo*100}%`}} /></td>
              <td><span>{d.depois}</span><div aria-hidden="true" className="h-2 rounded bg-jungle" style={{width:`${d.depois/maximo*100}%`}} /></td>
            </tr>)}</tbody>
          </table>
        </Card>
        <Card as="section" aria-label={t('Sessões por tipo de atividade')} className="flex flex-col gap-3">
          <h2 className="text-section">{t('Sessões por tipo de atividade')}</h2>
          <p className="text-caption text-muted">{t('Jogos diferentes são contados juntos no tipo Jogos.')}</p>
          <ul className="flex flex-col gap-3">{dados.atividades.map((a)=><li key={a.tipo} className="flex justify-between gap-3"><span>{tipos[a.tipo]??a.tipo}</span><strong>{a.quantidade}</strong></li>)}</ul>
        </Card>
      </div>
    </>}
  </>;
}
