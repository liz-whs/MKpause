import type {
  Alerta, AvisoSaida, Conteudo, Estudante, Ficha, Observacao, Profissional, RegistroClinico, SessaoRegistrada, Vinculo,
} from '../../domain/tipos';

/** Dados fictícios até a API existir. Datas relativas a "agora". */

const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const atras = (ms: number) => new Date(Date.now() - ms).toISOString();
const diasAtras = (dias: number, hora: number, minuto = 0) => {
  const d = new Date(Date.now() - dias * DIA);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};

const ESCOLA = 'Escola Modelo';

export const ESTUDANTES: Estudante[] = [
  { id: 'est-1', nome: 'Ana Lima', apelido: 'Ana', matricula: '2026001', turma: '8º A', escola: ESCOLA, email: 'ana.lima@escola.edu.br', nascimento: '12/03/2012', ativo: true },
  { id: 'est-2', nome: 'Bruno Martins', apelido: 'Bruno', matricula: '2026002', turma: '8º A', escola: ESCOLA, ativo: true },
  { id: 'est-3', nome: 'Carla Souza', apelido: 'Carla', matricula: '2026003', turma: '9º B', escola: ESCOLA, ativo: true },
  { id: 'est-4', nome: 'Diego Rocha', apelido: 'Diego', matricula: '2026004', turma: '9º B', escola: ESCOLA, ativo: true },
  { id: 'est-5', nome: 'Eva Teixeira', apelido: 'Eva', matricula: '2026005', turma: '8º A', escola: ESCOLA, ativo: true },
  { id: 'est-6', nome: 'Felipe Nunes', apelido: 'Felipe', matricula: '2026006', turma: '7º C', escola: ESCOLA, ativo: true },
  { id: 'est-7', nome: 'Gabriel Prado', apelido: 'Gabriel', matricula: '2026007', turma: '7º C', escola: ESCOLA, ativo: false },
];

export const TURMAS = ['7º C', '8º A', '8º B', '9º A', '9º B'];

export const PROFISSIONAIS: Profissional[] = [
  { id: 'prof-1', nome: 'Marcos Prado', iniciais: 'MP', papel: 'professor', detalhe: 'Matemática · 8º A, 9º B', ativo: true },
  { id: 'prof-2', nome: 'Rita Campos', iniciais: 'RC', papel: 'professor', detalhe: 'Ciências · 8º A', ativo: true },
  { id: 'prof-3', nome: 'Júlio Freitas', iniciais: 'JF', papel: 'professor', detalhe: 'Português · 7º C', ativo: true },
  { id: 'pe-1', nome: 'Paula Esteves', iniciais: 'PE', papel: 'psicologo-escolar', detalhe: 'CRP 08/12345', ativo: true },
  { id: 'pc-1', nome: 'Carlos Pires', iniciais: 'CP', papel: 'psicologo-clinico', detalhe: 'CRP 08/54321', ativo: true },
];

export const ADMINISTRADOR = { id: 'admin-1', nome: 'Lia Andrade', iniciais: 'LA' };

const vinc = (profissionalId: string, ...estudantes: string[]): Vinculo[] =>
  estudantes.map((estudanteId) => ({ estudanteId, profissionalId }));

export const VINCULOS: Vinculo[] = [
  ...vinc('prof-1', 'est-1', 'est-2', 'est-3', 'est-4', 'est-5'),
  ...vinc('prof-2', 'est-1', 'est-2', 'est-5'),
  ...vinc('prof-3', 'est-6', 'est-7'),
  ...vinc('pe-1', 'est-1', 'est-2', 'est-3', 'est-4', 'est-5', 'est-6', 'est-7'),
  ...vinc('pc-1', 'est-1', 'est-3'),
];

export const SESSOES: SessaoRegistrada[] = [
  { id: 's-1', estudanteId: 'est-1', em: diasAtras(1, 10, 20), antes: 'ansioso', atividade: 'respiracao', depois: 'calmo' },
  { id: 's-2', estudanteId: 'est-1', em: diasAtras(8, 14, 5), antes: 'cansado', atividade: 'pianopause', depois: 'cansado' },
  { id: 's-3', estudanteId: 'est-1', em: diasAtras(10, 9, 30), antes: 'irritado', atividade: 'pianopause', depois: 'calmo', relato: 'Ajudou a desligar um pouco.' },
  { id: 's-4', estudanteId: 'est-2', em: atras(3 * 60 * MIN), antes: 'irritado', atividade: 'respiracao', depois: 'irritado' },
  { id: 's-5', estudanteId: 'est-3', em: diasAtras(1, 14, 30), antes: 'triste', atividade: 'video', depois: 'triste' },
  { id: 's-6', estudanteId: 'est-3', em: diasAtras(3, 11, 0), antes: 'triste', atividade: 'respiracao', depois: 'calmo' },
  { id: 's-7', estudanteId: 'est-4', em: diasAtras(20, 8, 0), antes: 'cansado', atividade: 'pianopause', depois: 'feliz' },
  { id: 's-8', estudanteId: 'est-6', em: diasAtras(12, 10, 10), antes: 'ansioso', atividade: 'respiracao', depois: 'calmo' },
];

export const ALERTAS: Alerta[] = [
  { id: 'a-1', estudanteId: 'est-2', tipo: 'nivel3', criadoEm: atras(2 * 60 * MIN + 50 * MIN) },
  { id: 'a-2', estudanteId: 'est-3', tipo: 'nivel3', criadoEm: diasAtras(1, 14, 25), vistoPor: ['prof-1', 'pe-1'] },
];

export const AVISOS: AvisoSaida[] = [
  { id: 'v-1', estudanteId: 'est-5', desde: atras(25 * MIN), destino: 'Pátio' },
  { id: 'v-2', estudanteId: 'est-2', desde: atras(4 * 60 * MIN), voltouEm: atras(3 * 60 * MIN + 46 * MIN), destino: 'Banheiro' },
  { id: 'v-3', estudanteId: 'est-3', desde: atras(3 * 60 * MIN + 10 * MIN), voltouEm: atras(2 * 60 * MIN + 52 * MIN), destino: 'Sala da psicologia' },
  { id: 'v-4', estudanteId: 'est-4', desde: atras(2 * 60 * MIN), voltouEm: atras(1 * 60 * MIN + 49 * MIN) },
];

export const OBSERVACOES: Observacao[] = [
  { id: 'o-1', estudanteId: 'est-1', autorId: 'pe-1', em: diasAtras(1, 15, 10), texto: 'Conversamos depois da pausa. Está preocupada com a prova de quinta.' },
  { id: 'o-2', estudanteId: 'est-1', autorId: 'prof-1', em: diasAtras(10, 11, 30), texto: 'Ficou mais quieta durante a aula, mas participou da atividade em grupo.' },
];

export const REGISTROS_CLINICOS: RegistroClinico[] = [
  { id: 'r-1', estudanteId: 'est-1', autorId: 'pc-1', em: diasAtras(14, 16, 0), texto: 'Sessão de acompanhamento. Trabalhamos estratégias para antes de provas.' },
  { id: 'r-2', estudanteId: 'est-1', autorId: 'pc-1', em: diasAtras(21, 16, 0), texto: 'Primeiro encontro após o encaminhamento da escola.' },
];

export const FICHAS: Ficha[] = [
  {
    estudanteId: 'est-1', responsavel: 'Rosa Lima', parentesco: 'Mãe', contato: '(41) 99999-0000 · rosa.lima@email.com',
    inicio: '07/10/2026', encaminhamento: 'Ansiedade em períodos de prova.', atualizadaEm: diasAtras(14, 16, 0),
    convite: { enviadoEm: diasAtras(20, 9, 0), aceito: false },
  },
  {
    estudanteId: 'est-3', responsavel: 'Jorge Souza', parentesco: 'Pai', contato: '(41) 98888-1111',
    inicio: '02/09/2026', encaminhamento: 'Tristeza frequente relatada pela família.', atualizadaEm: diasAtras(28, 10, 0),
    convite: { enviadoEm: diasAtras(40, 9, 0), aceito: true },
  },
  {
    estudanteId: 'est-6', responsavel: 'Marta Nunes', parentesco: 'Mãe', contato: '(41) 97777-2222',
    inicio: '', encaminhamento: '', atualizadaEm: '', convite: null,
  },
];

export const CONTEUDOS: Conteudo[] = [
  { id: 'respiracao', nome: 'Respiração', tipo: 'Exercício', duracao: '2 ou 5 min', disponivel: true },
  { id: 'pianopause', nome: 'PianoPause', tipo: 'Jogo', duracao: '2 min', disponivel: true },
  { id: 'video', nome: 'Respirar com o mar', tipo: 'Vídeo', duracao: '3 min', disponivel: true },
];

export interface VideoAtividade {
  titulo: string;
  duracao: string;
  /** Endereço do vídeo cadastrado pela escola. Vazio enquanto não há cadastro. */
  src?: string;
  legendas?: string;
}
