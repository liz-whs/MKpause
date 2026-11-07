import { api } from '../data/api';
import { ADMINISTRADOR } from '../data/mocks/escola';
import { profissionalDaConta } from '../data/servidor';
import { iniciais } from '../domain/formatos';
import { PAPEL_LABEL, type Profissional } from '../domain/tipos';

/**
 * Quem está usando a área de profissionais.
 * Com backend, é a conta logada; nos testes (sem backend), o login guarda o id
 * de um perfil de exemplo e, sem login, cada área usa um perfil padrão.
 */
const CHAVE = 'mkpause:profissional';

const PADRAO = { escola: 'prof-1', clinico: 'pc-1' } as const;

/** Sai da área dos profissionais: esquece quem estava usando. */
export async function sairProfissional() {
  await api.sair();
  sessionStorage.removeItem(CHAVE);
}

export function entrarComoProfissional(id: string) {
  sessionStorage.setItem(CHAVE, id);
}

const SEM_CONTA: Profissional = { id: 'u-0', nome: '', iniciais: '', papel: 'professor', ativo: false };

export function profissionalLogado(area: keyof typeof PADRAO): Profissional {
  const conta = api.conta();
  if (conta) return profissionalDaConta(conta) ?? SEM_CONTA;
  if (!import.meta.env.MODE.startsWith('test')) return SEM_CONTA;
  const salvo = sessionStorage.getItem(CHAVE);
  const p = salvo ? api.profissional(salvo) : undefined;
  const aceito =
    area === 'escola' ? p?.papel === 'professor' || p?.papel === 'psicologo-escolar' : p?.papel === 'psicologo-clinico';
  return aceito && p ? p : api.profissional(PADRAO[area])!;
}

export const rotuloPerfil = (p: Profissional) => PAPEL_LABEL[p.papel];

export const administradorLogado = () => {
  const conta = api.conta();
  return conta?.perfil === 'administrador'
    ? { id: `adm-${conta.id_perfil}`, nome: conta.nome_completo, iniciais: iniciais(conta.nome_completo) }
    : ADMINISTRADOR;
};
