import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Logo } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Switch } from '../../components/ui/Switch';
import { cx } from '../../components/ui/cx';
import { BackButton } from '../../components/student/FocusTopBar';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { ScreenTitle } from '../../components/student/Bits';
import { useEstudante } from '../../state/EstudanteContext';
import { emocaoPorId } from '../../domain/emocoes';
import { entrarComoProfissional } from '../../state/ProContext';
import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { agir } from '../../state/acoes';
import type { Perfil } from '../../data/servidor';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';
import { Abertura, useAbertura } from './Abertura';
import './onboarding.css';

/** Página de onboarding: coluna única, ações no fim da tela. */
export function Pagina({ children, centro, abertura = false, apresentacao = false, boasVindas = false }: { children: ReactNode; centro?: boolean; abertura?: boolean; apresentacao?: boolean; boasVindas?: boolean }) {
  return <div className={cx("flex min-h-dvh flex-col bg-bg", apresentacao && "onboarding-tela onboarding-etapas", boasVindas && "onboarding-tela onboarding-boas-vindas")}>
    <header className="flex items-center justify-between gap-4 px-4 pt-4 md:px-8">
      {abertura ? <span /> : <Link to="/" aria-label={t('mkpause, início')} className="no-underline"><Logo size={36} /></Link>}
      <BotaoPreferencias />
    </header>
    <main id="conteudo" tabIndex={-1} className={cx('mx-auto flex w-full flex-1 flex-col gap-5 px-6 pt-4 pb-8', abertura ? 'max-w-none' : 'max-w-xl', centro && 'items-center text-center')}>
      {children}
    </main>
  </div>;
}

/** Navegação das etapas; as preferências já ficam no cabeçalho comum. */
export function BarraOnboarding({ back, children }: { back?: ReactNode; children?: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 self-stretch py-1">{back ?? <span />}<span className="flex items-center gap-2.5">{children}</span></div>;
}

export function Rodape({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex w-full flex-col gap-3">{children}</div>;
}

export function BoasVindas() {
  const abertura = useAbertura();
  if (abertura.ativa) return <Pagina abertura><Abertura terminar={abertura.terminar} estatica={abertura.estatica} /></Pagina>;
  return (
    <Pagina centro boasVindas>
      <span className="boas-vindas-mascote mt-4.5 flex size-65 items-center justify-center rounded-full bg-surface">
        <img src={mascote} alt={t('Chinchila, mascote do MKpause')} className="h-54 w-55 object-contain" />
      </span>
      <ScreenTitle className="mt-2.5">{t('Uma pausa no seu ritmo.')}</ScreenTitle>
      <p className="text-muted">{t('Explore atividades, perceba como você está e procure apoio quando precisar.')}</p>
      <Rodape>
        <Button to="/apresentacao/1" block>
          {t('Começar')}
        </Button>
        <Button to="/entrar" variant="outline" block>
          {t('Já tenho conta · Entrar')}
        </Button>
      </Rodape>
    </Pagina>
  );
}

const PASSOS = 3;

function Pontos({ atual }: { atual: number }) {
  return (
    <div aria-hidden="true" className="flex justify-center gap-2">
      {Array.from({ length: PASSOS }, (_, i) => (
        <span key={i} className={cx('h-2.5 rounded-pill', i + 1 === atual ? 'w-7 bg-ink' : 'w-2.5 bg-surface')} />
      ))}
    </div>
  );
}

function Apresentacao({ passo, children, titulo, texto, proximo, rotulo = t('Próximo'), extra, icone }: {
  passo: number;
  children: ReactNode;
  titulo: string;
  texto: string;
  proximo: string;
  rotulo?: string;
  extra?: ReactNode;
  icone?: IconName;
}) {
  return (
    <Pagina apresentacao>
      <BarraOnboarding back={<BackButton to={passo === 1 ? '/' : `/apresentacao/${passo - 1}`} />}>
        <Link to="/entrar" className="px-1 py-3 font-semibold">{t('Pular')}</Link>
      </BarraOnboarding>
      <div className="apresentacao-corpo">
        <div className="apresentacao-intro">
          {icone && <span className="apresentacao-ilustracao" data-etapa={passo}><Icon name={icone} size={36} /></span>}
          <span className="text-caption font-semibold text-muted">{t('{passo} de {total}', { passo, total: PASSOS })}</span>
          <ScreenTitle>{titulo}</ScreenTitle>
          <p className="apresentacao-descricao text-muted">{texto}</p>
          {extra && <div className="apresentacao-extra">{extra}</div>}
        </div>
        <div className="apresentacao-paineis">{children}</div>
      </div>
      <footer className="apresentacao-rodape">
        <Pontos atual={passo} />
        <Button to={proximo} block>{rotulo}</Button>
      </footer>
    </Pagina>
  );
}

const CAMINHOS: { titulo: string; texto: string; icone: IconName }[] = [
  { titulo: 'Início', texto: 'Conte como está antes, escolha uma atividade e avalie seu humor depois.', icone: 'inicio' },
  { titulo: 'Atividades', texto: 'Explore jogos, vídeos e exercícios livremente, sem avaliação de humor.', icone: 'atividades' },
  { titulo: 'Cuidados', texto: 'Escolha ações do cotidiano e marque o que você fez, inclusive em mais ideias.', icone: 'broto' },
];

export function Apresentacao1() {
  return <Apresentacao passo={1} icone="atividades" titulo={t('Seu espaço para fazer uma pausa')} texto={t('Você pode usar cada espaço de um jeito, sem pressa e sem um resultado obrigatório.')} proximo="/apresentacao/2">
    <ul className="flex flex-col gap-3">{CAMINHOS.map((c) => <li key={c.titulo} className="flex items-start gap-3 rounded-card bg-surface p-4"><Icon name={c.icone} className="shrink-0" /><span><strong>{t(c.titulo)}</strong><p className="text-caption text-muted">{t(c.texto)}</p></span></li>)}</ul>
  </Apresentacao>;
}

const JEITOS: { nivel: 1 | 2 | 3; titulo: string; texto: string; icone: IconName; card: string; circulo: string; numero: string }[] = [
  { nivel: 1, titulo: 'Quero uma pausa', texto: 'Fico na sala e escolho uma atividade.', icone: 'pausa', card: 'bg-surface text-ink', circulo: 'bg-lavender', numero: 'bg-ink text-surface' },
  { nivel: 2, titulo: 'Preciso sair da sala', texto: 'Informe o destino e avise seus profissionais vinculados.', icone: 'porta', card: 'bg-sky text-ink', circulo: 'bg-surface', numero: 'bg-ink text-sky' },
  { nivel: 3, titulo: 'Não estou bem', texto: 'Avise seus profissionais vinculados e siga a respiração guiada.', icone: 'respiracao', card: 'bg-rose text-dark', circulo: 'bg-surface', numero: 'bg-dark text-rose' },
];

export function Apresentacao2() {
  return (
    <Apresentacao passo={2} icone="pausa" titulo={t('Três jeitos de pausar')} texto={t('Escolha o que faz sentido para você agora.')} proximo="/apresentacao/3" extra={<p className="rounded-card bg-surface p-4 text-caption text-muted">{t('Seu pedido de apoio fica registrado. A resposta pode levar um pouco. Se precisar de ajuda agora, chame um adulto em quem confia.')}</p>}>
      <ol className="flex flex-col gap-2.5">
        {JEITOS.map((j) => (
          <li key={j.nivel} className={cx('flex items-center gap-3 rounded-card p-3.5', j.card)}>
            <span className={cx('flex size-11.5 flex-none items-center justify-center rounded-full text-ink', j.circulo)}>
              <Icon name={j.icone} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <strong>{t(j.titulo)}</strong>
              <span className="text-caption">{t(j.texto)}</span>
            </span>
            <span className={cx('flex size-8.5 flex-none items-center justify-center rounded-full text-button font-semibold', j.numero)}>
              <span className="sr-only">{t('Nível')} </span>
              {j.nivel}
            </span>
          </li>
        ))}
      </ol>
    </Apresentacao>
  );
}

const QUEM_VE: { icone: IconName; quem: string; o_que: string }[] = [
  { icone: 'pessoas', quem: 'Profissionais escolares vinculados', o_que: 'Professores e psicólogos escolares autorizados consultam pausas, humores e avisos dos estudantes vinculados e recebem seus alertas.' },
  { icone: 'ficha', quem: 'Psicólogo clínico vinculado', o_que: 'Consulta histórico, humores e observações escolares e registra o acompanhamento clínico. Não recebe os alertas escolares.' },
  { icone: 'cadeado', quem: 'Administração', o_que: 'Gerencia cadastros e vínculos e consulta indicadores agregados. Não consulta sessões e humores individuais nem registros clínicos.' },
];

const PRIVACIDADE_COMPACTA = [
  { quem: 'Profissionais escolares', texto: 'Com vínculo: pausas, humores, avisos e alertas. Sem acesso aos registros clínicos.' },
  { quem: 'Psicólogo clínico', texto: 'Com vínculo: histórico, humores, observações escolares e acompanhamento clínico. Sem alertas escolares.' },
  { quem: 'Administração', texto: 'Cadastros, vínculos e indicadores agregados. Sem sessões, humores individuais ou registros clínicos.' },
];

/** Lista "Quem vê o quê" (também usada no Perfil). */
export function QuemVeOQue({ compacto = false }: { compacto?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {QUEM_VE.map((q, i) => (
        <li key={q.quem} className="flex items-start gap-3 rounded-[18px] bg-surface px-3.5 py-3">
          <Icon name={q.icone} size={22} />
          <span className="flex flex-col">
            <strong>{t(compacto ? PRIVACIDADE_COMPACTA[i].quem : q.quem)}</strong>
            <span className="text-caption text-muted">{t(compacto ? PRIVACIDADE_COMPACTA[i].texto : q.o_que)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Apresentacao3() {
  return (
    <Apresentacao
      passo={3}
      titulo={t('Quem vê o quê?')}
      texto={t('O acesso depende do perfil e do vínculo. Colegas de turma não consultam seus registros.')}
      proximo="/entrar"
      rotulo={t('Entendi, continuar')}
      icone="escudo"
    >
      <QuemVeOQue compacto />
    </Apresentacao>
  );
}

export const DESTINO_DO_PERFIL: Record<Perfil, string> = {
  estudante: '/primeiro-acesso',
  professor: '/escola',
  psicologo_escolar: '/escola',
  psicologo_clinico: '/clinico',
  administrador: '/admin',
};

/**
 * Login de exemplo dos testes (sem backend): qualquer senha entra.
 * "professor", "psicologo", "clinico" e "admin" abrem as áreas dos profissionais;
 * qualquer outra matrícula entra como estudante.
 */
function destinoDoLogin(usuario: string): string {
  const u = usuario.trim().toLowerCase();
  if (u.startsWith('admin')) return '/admin';
  if (u.startsWith('clinico')) {
    entrarComoProfissional('pc-1');
    return '/clinico';
  }
  if (u.startsWith('psicologo')) {
    entrarComoProfissional('pe-1');
    return '/escola';
  }
  if (u.startsWith('professor')) {
    entrarComoProfissional('prof-1');
    return '/escola';
  }
  return api.estudante.primeiroAcessoPendente() ? '/primeiro-acesso' : '/estudante';
}

export function Entrar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [tentou, setTentou] = useState(false);

  const erroUsuario = tentou && !usuario.trim() ? t('Digite sua matrícula ou e-mail.') : undefined;
  const erroSenha = tentou && !senha.trim() ? t('Digite sua senha.') : undefined;

  const [erroLogin, setErroLogin] = useState<string>();
  // No servidor grátis o login pode levar alguns segundos (hash da senha).
  const [entrando, setEntrando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (!usuario.trim() || !senha.trim()) return;
    if (import.meta.env.MODE === 'test') {
      navigate(destinoDoLogin(usuario));
      return;
    }
    try {
      setErroLogin(undefined);
      setEntrando(true);
      const conta = await api.entrar(usuario, senha);
      navigate(conta.perfil === 'estudante' && !conta.primeiro_acesso_pendente ? '/estudante' : DESTINO_DO_PERFIL[conta.perfil]);
    } catch (erro) {
      setErroLogin((erro as Error).message);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <Pagina>
      <BarraOnboarding back={<BackButton to="/" />} />
      <div className="flex items-center gap-3">
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-16 object-contain" />
        <ScreenTitle>{t('Entrar')}</ScreenTitle>
      </div>
      <p className="text-muted">{t('Use a conta que a sua escola cadastrou.')}</p>
      {(location.state as { aviso?: string } | null)?.aviso && <p role="status">{t((location.state as { aviso: string }).aviso)}</p>}

      <form noValidate onSubmit={enviar} className="flex flex-col gap-4.5">
        <Field
          label={t('Matrícula ou e-mail')}
          autoComplete="username"
          placeholder={t('seu.nome@escola.edu.br')}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          error={erroUsuario}
        />
        <div className="flex flex-col gap-2">
          <Field
            label={t('Senha')}
            type={mostrar ? 'text' : 'password'}
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={erroSenha}
          />
          <button
            type="button"
            aria-pressed={mostrar}
            onClick={() => setMostrar((v) => !v)}
            className="min-h-12 self-start px-1 font-semibold underline underline-offset-4"
          >
            {mostrar ? t('Ocultar senha') : t('Mostrar senha')}
          </button>
        </div>
        {erroLogin && (
          <p role="alert" className="font-semibold text-dark">
            {erroLogin}
          </p>
        )}
        <Button type="submit" block disabled={entrando} aria-busy={entrando}>
          {entrando ? t('Entrando…') : t('Entrar')}
        </Button>
      </form>

      {/* Ninguém cria conta sozinho: o cadastro é feito com um código gerado pela escola. */}
      <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
        <p className="font-semibold">{t('Ainda não tem conta?')}</p>
        <p className="text-caption text-muted">{t('Use o código de cadastro que a escola te entregou.')}</p>
        <Button to="/cadastro" variant="outline" block>
          <Icon name="chave" size={22} />
          {t('Tenho um código de cadastro')}
        </Button>
      </div>
    </Pagina>
  );
}

export function PrimeiroAcesso() {
  const navigate = useNavigate();
  const { perfil, notificacoes, definirApelido, definirNotificacoes } = useEstudante();
  const [apelido, setApelido] = useState('');
  const conta = useDados(() => api.conta());
  const pendente = useDados(() => api.estudante.primeiroAcessoPendente());
  if (conta && conta.perfil !== 'estudante') return <Navigate to={DESTINO_DO_PERFIL[conta.perfil]} replace />;
  if (!conta && import.meta.env.MODE !== 'test') return <Navigate to="/entrar" replace />;
  if (!pendente) return <Navigate to="/estudante" replace />;
  const finalizar = (salvarApelido: boolean) => {
    void agir(async () => {
      await api.estudante.concluirPrimeiroAcesso();
      if (salvarApelido) definirApelido(apelido);
      navigate('/estudante');
    }, '');
  };

  return (
    <Pagina>
      <BarraOnboarding back={<BackButton to="/entrar" />} />
      <img src={emocaoPorId('feliz').imagem} alt="" className="size-24 object-contain" />
      <ScreenTitle>{t('Que bom ter você aqui!')}</ScreenTitle>
      <p className="text-muted">{t('Duas coisinhas rápidas antes de começar. Dá para mudar depois no Perfil.')}</p>
      <Field
        label={t('Como você quer ser chamado(a)?')}
        hint={t('Aparece só para você, na tela inicial.')}
        placeholder={t('Ex.: {apelido}', { apelido: perfil.apelido })}
        value={apelido}
        onChange={(e) => setApelido(e.target.value)}
      />
      <div className="rounded-card bg-surface p-4">
        <Switch
          label={t('Notificações do navegador')}
          description={t('Para receber os avisos do MKpause.')}
          checked={notificacoes}
          onChange={definirNotificacoes}
        />
      </div>
      <Rodape>
        <Button
          block
          onClick={() => finalizar(true)}
        >
          {t('Concluir')}
        </Button>
        <Button onClick={() => finalizar(false)} variant="text" className="self-center">
          {t('Pular por agora')}
        </Button>
      </Rodape>
    </Pagina>
  );
}
