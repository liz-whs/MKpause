import { useLocation } from 'react-router';

/** Rotas livres são independentes da sessão guiada, inclusive após recarregar. */
export function useFluxoAtividade() {
  const livre = useLocation().pathname.startsWith('/estudante/atividades/');
  return {
    livre,
    voltar: livre ? '/estudante/atividades' : '/estudante/pausa/atividade',
    terminar: livre ? '/estudante/atividades' : '/estudante/pausa/fim',
  };
}
