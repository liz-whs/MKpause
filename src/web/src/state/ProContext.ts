import { api } from '../data/api';
import { ADMINISTRADOR } from '../data/mocks/escola';
import { PAPEL_LABEL, type Profissional } from '../domain/tipos';

/**
 * Quem está usando a área de profissionais (dados de exemplo).
 * O login guarda o id; sem login, cada área usa um perfil padrão.
 */
const CHAVE = 'mkpause:profissional';

const PADRAO = { escola: 'prof-1', clinico: 'pc-1' } as const;

/** Sai da área dos profissionais: esquece quem estava usando. */
export function sairProfissional() {
  sessionStorage.removeItem(CHAVE);
}

export function entrarComoProfissional(id: string) {
  sessionStorage.setItem(CHAVE, id);
}

export function profissionalLogado(area: keyof typeof PADRAO): Profissional {
  const salvo = sessionStorage.getItem(CHAVE);
  const p = salvo ? api.profissional(salvo) : undefined;
  const aceito =
    area === 'escola' ? p?.papel === 'professor' || p?.papel === 'psicologo-escolar' : p?.papel === 'psicologo-clinico';
  return aceito && p ? p : api.profissional(PADRAO[area])!;
}

export const rotuloPerfil = (p: Profissional) => PAPEL_LABEL[p.papel];

export const administradorLogado = () => ADMINISTRADOR;
