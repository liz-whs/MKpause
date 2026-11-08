const PREFIXO = 'mkpause:estudante:v2:';

export const chaveEstadoEstudante = (id: string) => id && id !== 'est-0' ? `${PREFIXO}${id}` : null;

/** Estados sem identificação não são atribuídos à próxima pessoa que entrar. */
export function limparPausasLocais(exceto?: string) {
  const manter = exceto ? chaveEstadoEstudante(exceto) : null;
  for (const chave of Object.keys(localStorage)) {
    if (chave.startsWith('mkpause:cuidados:') && (!exceto || chave !== `mkpause:cuidados:v1:${exceto}`)) localStorage.removeItem(chave);
  }
  for (const chave of Object.keys(sessionStorage)) {
    if (chave === 'mkpause:estudante' || (chave.startsWith(PREFIXO) && chave !== manter)) sessionStorage.removeItem(chave);
  }
}
