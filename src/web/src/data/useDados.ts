import { useSyncExternalStore } from 'react';
import { assinar, versaoAtual } from './api';

/**
 * Lê dados da api e redesenha quando eles mudam.
 * Ex.: const alertas = useDados(() => api.escola.alertas(id));
 */
export function useDados<T>(ler: () => T): T {
  useSyncExternalStore(assinar, versaoAtual, versaoAtual);
  return ler();
}
