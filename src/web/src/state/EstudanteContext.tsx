import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../data/api';
import { useDados } from '../data/useDados';
import type { EmocaoId } from '../domain/emocoes';
import type { AtividadeId, AvisoSaida } from '../domain/tipos';
import { useCuidados } from './cuidados';
import { iniciais } from '../domain/formatos';
import { chaveEstadoEstudante } from './armazenamentoEstudante';

/** Sessão de autorregulação em andamento. */
export interface SessaoEmAndamento {
  antes?: EmocaoId;
  atividade?: AtividadeId;
  depois?: EmocaoId;
  nivel3?: boolean;
  etapaNivel3?: 'respiracao' | 'avaliacao';
  concluida?: boolean;
  /** O estudante escreveu em "Quer contar algo?" e o texto foi salvo. */
  relatoRegistrado?: boolean;
}

interface EstadoPersistido {
  apelido: string;
  notificacoes: boolean;
  sessao: SessaoEmAndamento;
  avisoSaida: AvisoSaida | null;
}

function estadoInicial(chave: string | null): EstadoPersistido {
  const salvo = chave ? sessionStorage.getItem(chave) : null;
  if (salvo) {
    try {
      const dados = JSON.parse(salvo) as EstadoPersistido;
      return { apelido: dados.apelido ?? '', notificacoes: dados.notificacoes ?? true,
        sessao: dados.sessao ?? {}, avisoSaida: dados.avisoSaida ?? null };
    } catch {
      if (chave) sessionStorage.removeItem(chave);
    }
  }
  return {
    apelido: '',
    notificacoes: true,
    sessao: {},
    avisoSaida: null,
  };
}

function useEstadoEstudante(estudanteId: string) {
  const chave = chaveEstadoEstudante(estudanteId);
  const [estado, setEstado] = useState<EstadoPersistido>(() => estadoInicial(chave));

  const perfil = useDados(() => api.estudante.perfil());
  // O aviso guardado nesta aba vale primeiro; sem ele, usa o que continua aberto no servidor.
  const avisoNoServidor = useDados(() => api.estudante.avisoAberto());
  const local = estado.avisoSaida;
  const localEncerrado = useDados(() => Boolean(local && api.estudante.avisoEncerrado(local.id)));
  const avisoSaida = local && !localEncerrado ? local : avisoNoServidor;
  const cuidados = useCuidados(estudanteId);

  useEffect(() => {
    if (chave) sessionStorage.setItem(chave, JSON.stringify(estado));
  }, [estado, chave]);

  return {
    perfil: { ...perfil, apelido: estado.apelido || perfil.apelido },
    iniciais: iniciais(perfil.nome),
    notificacoes: estado.notificacoes,
    ...cuidados,
    sessao: estado.sessao,
    avisoSaida,

    definirApelido: (apelido: string) => setEstado((s) => ({ ...s, apelido: apelido.trim() || s.apelido })),
    definirNotificacoes: (notificacoes: boolean) => setEstado((s) => ({ ...s, notificacoes })),

    /** Começa uma pausa nova com a emoção de antes (e a atividade, se veio de Atividades). */
    iniciarSessao: (antes: EmocaoId, atividade?: AtividadeId) => setEstado((s) => ({ ...s, sessao: { antes, atividade } })),
    iniciarNivel3: (antes: EmocaoId) => setEstado((s) => ({
      ...s, sessao: { antes, atividade: 'respiracao', nivel3: true, etapaNivel3: 'respiracao' },
    })),
    atualizarSessao: (parcial: Partial<SessaoEmAndamento>) =>
      setEstado((s) => ({ ...s, sessao: { ...s.sessao, ...parcial } })),
    // As chamadas à api ficam fora do setEstado: no StrictMode o atualizador roda duas vezes.
    /** `depois` vem do clique: o setEstado de atualizarSessao ainda não foi aplicado aqui. */
    concluirSessao: async (relato?: string, depoisAgora?: EmocaoId) => {
      const { antes, atividade } = estado.sessao;
      const depois = depoisAgora ?? estado.sessao.depois;
      if (!antes || !atividade || !depois) throw new Error('Selecione o humor inicial e final antes de enviar.');
      if (estado.sessao.concluida) return;
      const texto = relato?.trim() || undefined;
      await api.estudante.registrarSessao({ estudanteId: perfil.id, antes, atividade, depois, relato: texto });
      setEstado((s) => ({ ...s, sessao: { ...s.sessao, depois, concluida: true, relatoRegistrado: Boolean(texto) } }));
      return Boolean(texto);
    },

    avisarSaida: async (destino?: string) => {
      const aviso = await api.estudante.avisarSaida(perfil.id, destino);
      setEstado((s) => ({ ...s, avisoSaida: aviso }));
    },
    voltei: async () => {
      if (avisoSaida) await api.estudante.registrarRetorno(avisoSaida.id);
      setEstado((s) => ({ ...s, avisoSaida: null }));
    },


    sair: async () => {
      await api.sair();
      if (chave) sessionStorage.removeItem(chave);
      setEstado(estadoInicial(null));
    },
  };
}


export type EstudanteStore = ReturnType<typeof useEstadoEstudante>;

const Ctx = createContext<EstudanteStore | null>(null);

export function EstudanteProvider({ children }: { children: ReactNode }) {
  const conta = useDados(() => api.conta());
  const id = conta?.perfil === 'estudante' ? `est-${conta.id_perfil}` :
    import.meta.env.MODE === 'test' && !conta ? api.estudante.perfil().id : '';
  return <EstadoDoEstudante key={id || 'sem-conta'} estudanteId={id}>{children}</EstadoDoEstudante>;
}

function EstadoDoEstudante({ estudanteId, children }: { estudanteId: string; children: ReactNode }) {
  const store = useEstadoEstudante(estudanteId);
  return <Ctx.Provider value={store}>{store.erroCuidados && <p role="alert">{store.erroCuidados}</p>}{children}</Ctx.Provider>;
}

export function useEstudante(): EstudanteStore {
  const store = useContext(Ctx);
  if (!store) throw new Error('useEstudante precisa estar dentro de <EstudanteProvider>');
  return store;
}
