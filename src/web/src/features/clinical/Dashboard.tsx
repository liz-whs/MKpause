import type { DashboardClinico, PeriodoDashboard } from '../../data/servidor';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SelectField, StatCard } from '../../components/pro/Pro';
import { locale, t } from '../../i18n';
import { hora } from '../../domain/formatos';
import { emocaoPorId, type EmocaoId } from '../../domain/emocoes';

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
  return <Card as="section" aria-label={t('Evolução por sessão')} className="flex flex-col gap-3">
    <h2 className="text-section">{t('Evolução por sessão')}</h2>
    <p>{t('Um registro por sessão, na ordem cronológica. Não existe escala de intensidade entre emoções.')}</p>
    <div className="max-h-96 overflow-auto" tabIndex={0} aria-label={t('Valores por sessão')}>
      <table className="w-full text-left text-caption">
        <caption className="py-2 text-left">{t('Registros individuais do período selecionado')}</caption>
        <thead><tr><th scope="col">{t('Sessão')}</th><th scope="col">{t('Data')}</th><th scope="col">{t('Antes')}</th><th scope="col">{t('Depois')}</th></tr></thead>
        <tbody>{sessoes.map((s,i)=><tr key={s.id_sessao}>
          <th scope="row" className="py-2">{i+1}</th>
          <td>{s.data} · {hora(s.iniciada_em)}</td>
          <td>{emocaoPorId(s.humor_antes).label}</td>
          <td>{emocaoPorId(s.humor_depois).label}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </Card>;
}

export function Dashboard({dados}: {dados:DashboardClinico}) {
  const r=dados.resumo;
  const percentual=r.percentual_terminou_leve===null ? '—' : `${r.percentual_terminou_leve.toLocaleString(locale(),{maximumFractionDigits:1})}%`;
  const maximo=Math.max(1,...dados.distribuicao_humor.flatMap((d)=>[d.antes,d.depois]));
  const tipos:Record<string,string>={RESPIRACAO:t('Respiração'),JOGO:t('Jogos'),VIDEO:t('Vídeos')};
  return <>
    <p>{t('De {inicio} a {fim}',{inicio:dados.periodo.inicio,fim:dados.periodo.fim})}</p>
    <p className="text-caption text-muted">{t('Os gráficos mostram as seis emoções escolhidas pelo estudante, sem escala de intensidade.')}</p>
    <div className="flex flex-wrap gap-3.5">
      <StatCard valor={String(r.sessoes_concluidas)} rotulo={t('sessões concluídas no período')} />
      <StatCard valor={String(r.mesma_emocao)} rotulo={t('mesma emoção antes e depois')} />
      <StatCard valor={String(r.terminou_leve)} rotulo={t('terminaram felizes ou calmos')} />
      <StatCard valor={percentual} rotulo={t('terminaram felizes ou calmos (%)')} />
    </div>
    <p className="text-caption text-muted">{t('As emoções são categorias. Terminar feliz ou calmo não mede efeito terapêutico.')}</p>
    <p className="text-caption text-muted">{t('Emoções autorrelatadas; não constituem diagnóstico nem medem melhora clínica.')}</p>
    {r.sessoes_concluidas===0 ? <p role="status">{t('Nenhuma sessão concluída com registros completos neste período.')}</p> : <>
      <Evolucao sessoes={dados.evolucao} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card as="section" aria-label={t('Distribuição das emoções')} className="flex flex-col gap-3">
          <h2 className="text-section">{t('Distribuição das emoções')}</h2>
          <table className="w-full text-left">
            <caption className="text-left text-caption">{t('Quantidade de registros antes e depois para cada emoção')}</caption>
            <thead><tr><th scope="col">{t('Emoção')}</th><th scope="col">{t('Antes')}</th><th scope="col">{t('Depois')}</th></tr></thead>
            <tbody>{dados.distribuicao_humor.map((d)=><tr key={d.emocao}><th scope="row" className="py-2">{emocaoPorId(d.emocao as EmocaoId).label}</th>
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
