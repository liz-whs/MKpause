import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../data/api';
import { useDados } from '../data/useDados';
import type { EmocaoId } from '../domain/emocoes';
import type { AtividadeId, AvisoSaida } from '../domain/tipos';
import { chaveDia, ehDiaUtil, type CuidadoId } from '../domain/cuidados';
import { iniciais } from '../domain/formatos';

/** Sessão de pausa em andamento (nível 1). */
export interface SessaoEmAndamento {
  antes?: EmocaoId;
  atividade?: AtividadeId;
  depois?: EmocaoId;
}

interface EstadoPersistido {
  apelido: string;
  notificacoes: boolean;
  /** Dias (AAAA-MM-DD) com pelo menos um cuidado. */
  diasComCuidado: string[];
  /** Cuidados marcados hoje: { 'AAAA-MM-DD': ['agua', ...] }. */
  cuidadosHoje: Record<string, CuidadoId[]>;
  sessao: SessaoEmAndamento;
  avisoSaida: AvisoSaida | null;
}

const CHAVE = 'mkpause:estudante';

/** Dados de exemplo: os 5 dias úteis antes de hoje tiveram cuidado. */
function historicoExemplo(): string[] {
  const dias: string[] = [];
  const d = new Date();
  while (dias.length < 5) {
    d.setDate(d.getDate() - 1);
    if (ehDiaUtil(d)) dias.push(chaveDia(d));
  }
  return dias;
}

function estadoInicial(): EstadoPersistido {
  const salvo = sessionStorage.getItem(CHAVE);
  if (salvo) {
    try {
      return JSON.parse(salvo) as EstadoPersistido;
    } catch {
      sessionStorage.removeItem(CHAVE);
    }
  }
  return {
    apelido: '',
    notificacoes: true,
    diasComCuidado: historicoExemplo(),
    cuidadosHoje: {},
    sessao: {},
    avisoSaida: null,
  };
}

function useEstadoEstudante() {
  const [estado, setEstado] = useState<EstadoPersistido>(estadoInicial);

  useEffect(() => {
    sessionStorage.setItem(CHAVE, JSON.stringify(estado));
  }, [estado]);

  const perfil = useDados(() => api.estudante.perfil());
  const hoje = chaveDia(new Date());
  const feitosHoje = estado.cuidadosHoje[hoje] ?? [];

  const alternarCuidado = useCallback(
    (id: CuidadoId) =>
      setEstado((s) => {
        const atuais = s.cuidadosHoje[hoje] ?? [];
        const proximos = atuais.includes(id) ? atuais.filter((c) => c !== id) : [...atuais, id];
        const dias = new Set(s.diasComCuidado);
        if (proximos.length > 0) dias.add(hoje);
        else dias.delete(hoje);
        return { ...s, cuidadosHoje: { [hoje]: proximos }, diasComCuidado: [...dias] };
      }),
    [hoje],
  );

  return {
    perfil: { ...perfil, apelido: estado.apelido || perfil.apelido },
    iniciais: iniciais(perfil.nome),
    notificacoes: estado.notificacoes,
    diasComCuidado: useMemo(() => new Set(estado.diasComCuidado), [estado.diasComCuidado]),
    feitosHoje,
    sessao: estado.sessao,
    avisoSaida: estado.avisoSaida,

    definirApelido: (apelido: string) => setEstado((s) => ({ ...s, apelido: apelido.trim() || s.apelido })),
    definirNotificacoes: (notificacoes: boolean) => setEstado((s) => ({ ...s, notificacoes })),
    alternarCuidado,

    /** Começa uma pausa nova com a emoção de antes (e a atividade, se veio de Atividades). */
    iniciarSessao: (antes: EmocaoId, atividade?: AtividadeId) => setEstado((s) => ({ ...s, sessao: { antes, atividade } })),
    atualizarSessao: (parcial: Partial<SessaoEmAndamento>) =>
      setEstado((s) => ({ ...s, sessao: { ...s.sessao, ...parcial } })),
    // As chamadas à api ficam fora do setEstado: no StrictMode o atualizador roda duas vezes.
    concluirSessao: (relato?: string) => {
      const { antes, atividade, depois } = estado.sessao;
      if (antes && atividade && depois) {
        api.estudante.registrarSessao({ estudanteId: perfil.id, antes, atividade, depois, relato: relato || undefined });
      }
    },

    avisarSaida: (destino?: string) => {
      const aviso = api.estudante.avisarSaida(perfil.id, destino);
      setEstado((s) => ({ ...s, avisoSaida: aviso }));
    },
    voltei: () => {
      if (estado.avisoSaida) api.estudante.registrarRetorno(estado.avisoSaida.id);
      setEstado((s) => ({ ...s, avisoSaida: null }));
    },


    sair: () => {
      void api.sair();
      sessionStorage.removeItem(CHAVE);
      setEstado(estadoInicial());
    },
  };
}


export type EstudanteStore = ReturnType<typeof useEstadoEstudante>;

const Ctx = createContext<EstudanteStore | null>(null);

export function EstudanteProvider({ children }: { children: ReactNode }) {
  const store = useEstadoEstudante();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useEstudante(): EstudanteStore {
  const store = useContext(Ctx);
  if (!store) throw new Error('useEstudante precisa estar dentro de <EstudanteProvider>');
  return store;
}
