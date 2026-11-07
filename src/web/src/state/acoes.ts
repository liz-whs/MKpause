import { useSyncExternalStore } from 'react';

type Estado = { ocupado: boolean; erro?: string; mensagem?: string };
let estado: Estado = { ocupado: false };
const ouvintes = new Set<() => void>();
const publicar = (novo: Estado) => { estado = novo; ouvintes.forEach((f) => f()); };
export const useAcaoAtual = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);
export const fecharFeedback = () => publicar({ ocupado: false });

/** Mantém os formulários preenchidos em falhas e impede envios repetidos. */
export async function agir(acao: () => unknown | Promise<unknown>, mensagem = 'Alteração salva.') {
  if (estado.ocupado) return false;
  publicar({ ocupado: true, mensagem: 'Salvando…' });
  try {
    await acao();
    publicar({ ocupado: false, mensagem });
    return true;
  } catch (erro) {
    publicar({ ocupado: false, erro: erro instanceof Error ? erro.message : 'Não foi possível salvar. Tente novamente.' });
    return false;
  }
}
