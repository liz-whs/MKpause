import { dataBrasileira } from '../../domain/formatos';
import { useEffect, useState } from 'react';
import { buscarIndicadores, type ResumoIndicadores } from '../../data/indicadores';
import { PageHeader, SelectField } from '../../components/pro/Pro';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { t } from '../../i18n';

function Distribuicao({titulo,linhas,oculto}:{titulo:string; linhas:{rotulo:string; pausas:number}[]; oculto?:boolean}) {
  const maximo=Math.max(1,...linhas.map((l)=>l.pausas));
  return <Card as="section" aria-label={titulo} className="flex flex-col gap-3">
    <h2 className="text-section">{titulo}</h2>
    {oculto ? <p>{t('Distribuição protegida: há grupos com menos de cinco estudantes.')}</p>
      : linhas.length===0 ? <p>{t('Sem registros neste período.')}</p>
      : <ul tabIndex={0} aria-label={titulo} className="flex max-h-96 flex-col gap-3 overflow-auto pr-2">{linhas.map((l)=><li key={l.rotulo}>
        <div className="flex justify-between gap-3"><span>{l.rotulo}</span><strong>{l.pausas}</strong></div>
        <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-bg"><div className="h-2 rounded-full bg-jungle" style={{width:`${l.pausas/maximo*100}%`}} /></div>
      </li>)}</ul>}
  </Card>;
}

export function AdminIndicadores() {
  const [dias,setDias]=useState('30');
  const [tentativa,setTentativa]=useState(0);
  const [dados,setDados]=useState<ResumoIndicadores>();
  const [erro,setErro]=useState('');
  const [carregando,setCarregando]=useState(true);
  useEffect(()=>{
    const controle=new AbortController();
    setCarregando(true); setErro(''); setDados(undefined);
    buscarIndicadores(Number(dias),controle.signal).then((valor)=>{if (!controle.signal.aborted) setDados(valor);}).catch((e:Error)=>{
      if (!controle.signal.aborted) setErro(e.message);
    }).finally(()=>{if (!controle.signal.aborted) setCarregando(false);});
    return ()=>controle.abort();
  },[dias,tentativa]);
  const totais=dados?.totais;
  return <>
    <PageHeader titulo={t('Indicadores da escola')} descricao={t('Números agregados, sem nomes ou registros individuais.')} />
    <div className="flex flex-wrap items-end gap-4">
      <SelectField label={t('Período')} value={dias} onChange={setDias} options={[
        {value:'7',label:t('7 dias completos')},{value:'30',label:t('30 dias completos')},{value:'90',label:t('90 dias completos')},
      ]} />
      <Button variant="outline" className="min-h-12! text-body!" disabled={carregando} onClick={()=>setTentativa((n)=>n+1)}>{t('Atualizar')}</Button>
    </div>
    <p className="text-caption text-muted">{t('Os dados terminam ontem. Grupos pequenos são protegidos para reduzir a identificação de estudantes.')}</p>
    {carregando && <p role="status">{t('Carregando indicadores…')}</p>}
    {erro && <p role="alert">{erro}</p>}
    {dados && <p>{t('De {inicio} a {fim}',{inicio:dataBrasileira(dados.periodo.inicio),fim:dataBrasileira(dados.periodo.fim)})}</p>}
    {dados && !dados.suficiente && <Card><p role="status">{t('Ainda não há dados suficientes. É necessário ter pelo menos {n} estudantes no período.',{n:dados.minimo_estudantes})}</p></Card>}
    {totais && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {nome:t('Pausas no período'),valor:totais.pausas}, {nome:t('Estudantes no período'),valor:totais.estudantes},
          {nome:t('Avisos de saída'),valor:totais.avisos_de_saida},{nome:t('Alertas de nível 3'),valor:totais.alertas_nivel_3},
        ].map((item)=><Card key={item.nome}><p>{item.nome}</p><strong className="text-section">{item.valor??t('Protegido')}</strong></Card>)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Distribuicao titulo={t('Pausas por dia')} linhas={(dados?.pausas_por_dia??[]).map((l)=>({rotulo:dataBrasileira(l.dia),pausas:l.pausas}))} oculto={dados?.ocultos?.dias} />
        <Distribuicao titulo={t('Pausas por horário')} linhas={(dados?.pausas_por_hora??[]).map((l)=>({rotulo:`${l.hora}h`,pausas:l.pausas}))} oculto={dados?.ocultos?.horas} />
        <Distribuicao titulo={t('Atividades escolhidas')} linhas={dados?.atividades??[]} oculto={dados?.ocultos?.atividades} />
        <Distribuicao titulo={t('Pausas por turma')} linhas={dados?.turmas??[]} oculto={dados?.ocultos?.turmas} />
        <Card as="section" aria-label={t('Humor após a pausa')} className="flex flex-col gap-3">
          <h2 className="text-section">{t('Humor após a pausa')}</h2>
          <p className="text-caption text-muted">{t('Comparação disponível apenas para registros anteriores com escala numérica de humor.')}</p>
          {dados?.humor ? <ul><li>{t('Mais leve')}: {dados.humor.melhor}%</li><li>{t('Igual')}: {dados.humor.igual}%</li><li>{t('Mais pesado')}: {dados.humor.pior}%</li></ul>
            : <p>{t('Sem dados suficientes para mostrar esta distribuição com segurança.')}</p>}
        </Card>
      </div>
    </>}
  </>;
}
