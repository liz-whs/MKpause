import { useEffect, useRef, useState } from 'react';
import { dashboardClinico, type DashboardClinico, type PeriodoDashboard } from '../../data/servidor';

interface Estado { chave: string; identidade: string; dados?: DashboardClinico; erro?: Error }

export function useDashboardClinico(estudanteId: string, habilitado: boolean) {
  const [dias, setDias] = useState<PeriodoDashboard>(14);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<Estado>();
  const emConsulta = useRef(false);
  const ultimaConsulta = useRef(0);
  const identidade = `${estudanteId}:${dias}`;
  const chave = `${identidade}:${tentativa}`;
  useEffect(() => {
    if (!habilitado) return;
    const controle = new AbortController();
    emConsulta.current = true;
    ultimaConsulta.current = Date.now();
    dashboardClinico(estudanteId, dias, controle.signal).then((dados) => {
      if (!controle.signal.aborted) setEstado({chave, identidade, dados});
    }).catch((erro: Error) => {
      // Uma recusa de acesso remove também os dados que já estavam na tela.
      if (!controle.signal.aborted) setEstado({chave, identidade, erro});
    }).finally(() => {
      if (!controle.signal.aborted) emConsulta.current = false;
    });
    return () => { controle.abort(); emConsulta.current = false; };
  }, [chave, identidade, estudanteId, dias, habilitado]);
  useEffect(() => {
    if (!habilitado) return;
    const atualizarAoVoltar = () => {
      if (document.visibilityState !== 'visible' || emConsulta.current || Date.now() - ultimaConsulta.current < 30_000) return;
      // Focus e visibilitychange podem ocorrer juntos: só iniciam uma consulta.
      ultimaConsulta.current = Date.now();
      setTentativa((n) => n + 1);
    };
    window.addEventListener('focus', atualizarAoVoltar);
    document.addEventListener('visibilitychange', atualizarAoVoltar);
    return () => {
      window.removeEventListener('focus', atualizarAoVoltar);
      document.removeEventListener('visibilitychange', atualizarAoVoltar);
    };
  }, [habilitado]);
  const atual = habilitado && estado?.identidade === identidade ? estado : undefined;
  const pendente = habilitado && atual?.chave !== chave;
  return {dias, setDias, dados:atual?.dados, erro:pendente ? undefined : atual?.erro,
    carregando:pendente && !atual?.dados, atualizando:pendente,
    atualizar:() => setTentativa((n) => n + 1)};
}
