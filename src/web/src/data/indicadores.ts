export interface ResumoIndicadores {
  suficiente: boolean;
  minimo_estudantes: number;
  periodo: {dias:number; inicio:string; fim:string};
  totais?: {pausas:number; estudantes:number; avisos_de_saida:number|null; alertas_nivel_3:number|null};
  pausas_por_dia?: {dia:string; pausas:number}[];
  pausas_por_hora?: {hora:number; pausas:number}[];
  atividades?: {rotulo:string; pausas:number}[];
  turmas?: {rotulo:string; pausas:number}[];
  humor?: {melhor:number; igual:number; pior:number; sessoes:number}|null;
  ocultos?: Record<string,boolean>;
}

export async function buscarIndicadores(dias:number, signal:AbortSignal): Promise<ResumoIndicadores> {
  const resposta=await fetch(`/indicadores/api/resumo?dias=${dias}`,{credentials:'same-origin',headers:{Accept:'application/json'},signal});
  const corpo=await resposta.json().catch(()=>null);
  if (!resposta.ok) throw new Error(corpo?.detail ?? 'Não foi possível carregar os indicadores. Tente novamente.');
  if (!corpo || typeof corpo.suficiente !== 'boolean') throw new Error('Não foi possível carregar os indicadores. Tente novamente.');
  return corpo;
}
