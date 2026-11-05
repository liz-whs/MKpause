import { useEffect, useState } from 'react';
import { dashboardClinico, type DashboardClinico, type PeriodoDashboard } from '../../data/servidor';

interface Estado { chave: string; dados?: DashboardClinico; erro?: Error }

export function useDashboardClinico(estudanteId: string, habilitado: boolean) {
  const [dias, setDias] = useState<PeriodoDashboard>(14);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<Estado>();
  const chave = `${estudanteId}:${dias}:${tentativa}`;
  useEffect(() => {
    if (!habilitado) return;
    const controle = new AbortController();
    dashboardClinico(estudanteId, dias, controle.signal).then((dados) => {
      if (!controle.signal.aborted) setEstado({chave, dados});
    }).catch((erro: Error) => {
      if (!controle.signal.aborted) setEstado({chave, erro});
    });
    return () => controle.abort();
  }, [chave, estudanteId, dias, habilitado]);
  useEffect(() => {
    if (!habilitado) return;
    const atualizar = () => setTentativa((n) => n + 1);
    const visivel = () => { if (document.visibilityState === 'visible') atualizar(); };
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', visivel);
    const intervalo = window.setInterval(visivel, 30_000);
    return () => {
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', visivel);
      window.clearInterval(intervalo);
    };
  }, [habilitado]);
  const atual = estado?.chave === chave ? estado : undefined;
  return {dias, setDias, dados:atual?.dados, erro:atual?.erro,
    carregando:habilitado && !atual, atualizar:() => setTentativa((n) => n + 1)};
}
