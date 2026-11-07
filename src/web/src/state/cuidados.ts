import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { chaveDia, CUIDADOS_DO_DIA, type CuidadoId } from '../domain/cuidados';

type Registros = Record<string, CuidadoId[]>;
const EVENTO = 'mkpause:cuidados-atualizados';
const ids = new Set<string>(CUIDADOS_DO_DIA.map((c) => c.id));

function validar(valor: unknown): Registros {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  const registros: Registros = {};
  for (const [dia, cuidados] of Object.entries(valor)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Array.isArray(cuidados)) continue;
    const data = new Date(`${dia}T12:00:00`);
    if (Number.isNaN(data.getTime()) || chaveDia(data) !== dia) continue;
    const feitos = [...new Set(cuidados.filter((id): id is CuidadoId => typeof id === 'string' && ids.has(id)))];
    if (feitos.length) registros[dia] = feitos;
  }
  return registros;
}

function ler(raw: string | null): Registros {
  try { return validar(JSON.parse(raw ?? '{}')); } catch { return {}; }
}

export function useCuidados(estudanteId: string) {
  const chave = estudanteId && estudanteId !== 'est-0' ? `mkpause:cuidados:v1:${estudanteId}` : null;
  const [hoje, setHoje] = useState(() => chaveDia(new Date()));
  const assinar = useCallback((avisar: () => void) => {
    const mudou = (evento: StorageEvent) => { if (!evento.key || evento.key === chave) avisar(); };
    window.addEventListener('storage', mudou);
    window.addEventListener(EVENTO, avisar);
    return () => { window.removeEventListener('storage', mudou); window.removeEventListener(EVENTO, avisar); };
  }, [chave]);
  const snapshot = useCallback(() => chave ? localStorage.getItem(chave) ?? '{}' : '{}', [chave]);
  const raw = useSyncExternalStore(assinar, snapshot, () => '{}');
  const registros = useMemo(() => ler(raw), [raw]);

  useEffect(() => {
    let timer: number;
    const atualizar = () => {
      const agora = new Date();
      setHoje(chaveDia(agora));
      const amanha = new Date(agora);
      amanha.setHours(24, 0, 0, 0);
      window.clearTimeout(timer);
      timer = window.setTimeout(atualizar, amanha.getTime() - agora.getTime());
    };
    atualizar();
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, []);

  const alternarCuidado = useCallback((id: CuidadoId) => {
    if (!chave || !ids.has(id)) return;
    const dia = chaveDia(new Date());
    const dados = ler(localStorage.getItem(chave));
    const feitos = dados[dia] ?? [];
    const proximos = feitos.includes(id) ? feitos.filter((c) => c !== id) : [...feitos, id];
    if (proximos.length) dados[dia] = proximos;
    else delete dados[dia];
    localStorage.setItem(chave, JSON.stringify(dados));
    setHoje(dia);
    window.dispatchEvent(new Event(EVENTO));
  }, [chave]);

  return { diasComCuidado: useMemo(() => new Set(Object.keys(registros)), [registros]),
    feitosHoje: registros[hoje] ?? [], alternarCuidado };
}
