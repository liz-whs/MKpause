import { useEffect, useSyncExternalStore } from 'react';
import { api, assinar, versaoAtual } from './api';

/**
 * Lê dados da api e redesenha quando eles mudam.
 * Ex.: const alertas = useDados(() => api.escola.alertas(id));
 */
export function useDados<T>(ler: () => T): T {
  useSyncExternalStore(assinar, versaoAtual, versaoAtual);
  return ler();
}

/** Intervalo da atualização automática dos painéis (o mesmo da tela de vínculos). */
export const INTERVALO_ATUALIZACAO = 20_000;

/**
 * Busca as novidades sozinha (alertas, saídas e retornos) a cada 20 s e ao voltar para a aba.
 * Com a aba escondida, não busca: economiza bateria e dados.
 */
export function useAtualizacaoAutomatica() {
  useEffect(() => {
    const atualizar = () => { if (!document.hidden) void api.atualizarEmSegundoPlano(); };
    const id = window.setInterval(atualizar, INTERVALO_ATUALIZACAO);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, []);
}
