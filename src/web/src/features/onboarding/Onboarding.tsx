import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogoSymbol } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Switch } from '../../components/ui/Switch';
import { cx } from '../../components/ui/cx';
import { BackButton, FocusTopBar } from '../../components/student/FocusTopBar';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { ScreenTitle } from '../../components/student/Bits';
import { useEstudante } from '../../state/EstudanteContext';
import { emocaoPorId } from '../../domain/emocoes';
import { entrarComoProfissional } from '../../state/ProContext';
import { api } from '../../data/api';
import type { Perfil } from '../../data/servidor';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';

/** Página de onboarding: coluna única, ações no fim da tela. */
export function Pagina({ children, centro }: { children: ReactNode; centro?: boolean }) {
  return (
    <main id="conteudo" tabIndex={-1}
      className={cx(
        'mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-6 pb-8',
        centro && 'items-center pt-14 text-center',
      )}
    >
      {children}
    </main>
  );
}

export function Rodape({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex w-full flex-col gap-3">{children}</div>;
}

export function BoasVindas() {
  return (
    <Pagina centro>
      {/* Primeira tela: idioma e acessibilidade já à vista, com texto. */}
      <div className="-mt-10 flex justify-end self-stretch">
        <BotaoPreferencias rotulo />
      </div>
      <div className="flex items-center gap-2.5">
        <LogoSymbol size={34} />
        <span className="font-display text-section font-semibold">MKpause</span>
      </div>
      <span className="mt-4.5 flex size-65 items-center justify-center rounded-full bg-surface">
        <img src={mascote} alt={t('Chinchila, mascote do MKpause')} className="h-54 w-55 object-contain" />
      </span>
      <ScreenTitle className="mt-2.5">{t('Uma pausa para respirar e voltar mais leve.')}</ScreenTitle>
      <p className="text-muted">{t('Respire, faça algo calmo e volte mais leve.')}</p>
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

function Apresentacao({ passo, children, titulo, texto, proximo, rotulo = t('Próximo'), extra }: {
  passo: number;
  children: ReactNode;
  titulo: string;
  texto: string;
  proximo: string;
  rotulo?: string;
  extra?: ReactNode;
}) {
  return (
    <Pagina>
      <FocusTopBar back={<BackButton to={passo === 1 ? '/' : `/apresentacao/${passo - 1}`} />}>
        <Link to="/entrar" className="px-1 py-3 font-semibold">
          {t('Pular')}
        </Link>
      </FocusTopBar>
      {children}
      <span className="text-caption font-semibold text-muted">
        {t('{passo} de {total}', { passo, total: PASSOS })}
      </span>
      <ScreenTitle>{titulo}</ScreenTitle>
      <p className="text-muted">{texto}</p>
      {extra}
      <Rodape>
        <Pontos atual={passo} />
        <Button to={proximo} block>
          {rotulo}
        </Button>
      </Rodape>
    </Pagina>
  );
}

export function Apresentacao1() {
  return (
    <Apresentacao
      passo={1}
      titulo={t('Quando a cabeça pesar, faça uma pausa')}
      texto={t('Poucos minutos. Depois, volte para a aula.')}
      proximo="/apresentacao/2"
    >
      <div className="flex h-62.5 items-center justify-center gap-1 rounded-sheet bg-surface">
        <img src={emocaoPorId('ansioso').imagem} alt="" className="size-27.5 object-contain" />
        <Icon name="seta" size={30} className="text-muted" />
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-27.5 object-contain" />
      </div>
    </Apresentacao>
  );
}

const JEITOS: { nivel: 1 | 2 | 3; titulo: string; texto: string; icone: IconName; card: string; circulo: string; numero: string }[] = [
  { nivel: 1, titulo: 'Quero uma pausa', texto: 'Fico na sala e escolho uma atividade.', icone: 'pausa', card: 'bg-surface text-ink', circulo: 'bg-lavender', numero: 'bg-ink text-surface' },
  { nivel: 2, titulo: 'Preciso sair da sala', texto: 'Aviso a escola e saio um pouco.', icone: 'porta', card: 'bg-sky text-ink', circulo: 'bg-surface', numero: 'bg-ink text-sky' },
  { nivel: 3, titulo: 'Não estou bem', texto: 'Um toque. A escola é avisada sozinha.', icone: 'respiracao', card: 'bg-rose text-dark', circulo: 'bg-surface', numero: 'bg-dark text-rose' },
];

export function Apresentacao2() {
  return (
    <Apresentacao passo={2} titulo={t('Três jeitos de pausar')} texto={t('Quanto mais pesado, menos passos.')} proximo="/apresentacao/3">
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
  { icone: 'pessoa', quem: 'Você', o_que: 'Escolhe quando pausar.' },
  { icone: 'pessoas', quem: 'Quem acompanha você', o_que: 'Vê suas pausas e avisos.' },
  { icone: 'cadeado', quem: 'Sua turma', o_que: 'Não vê nada.' },
];

/** Lista "Quem vê o quê" (também usada no Perfil). */
export function QuemVeOQue() {
  return (
    <ul className="flex flex-col gap-2">
      {QUEM_VE.map((q) => (
        <li key={q.quem} className="flex items-start gap-3 rounded-[18px] bg-surface px-3.5 py-3">
          <Icon name={q.icone} size={22} />
          <span className="flex flex-col">
            <strong>{t(q.quem)}</strong>
            <span className="text-caption text-muted">{t(q.o_que)}</span>
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
      titulo={t('Quem vê o quê')}
      texto={t('Fica entre você e a escola.')}
      proximo="/entrar"
      rotulo={t('Entendi, continuar')}
      extra={
        <>
          <QuemVeOQue />
          <p className="text-caption text-muted">{t('Emergência:')} 188 (CVV) · 192 (SAMU)</p>
        </>
      }
    >
      <div className="flex h-37.5 items-center justify-center rounded-sheet bg-surface">
        <span className="flex size-24 items-center justify-center rounded-full bg-sky">
          <Icon name="escudo" size={48} />
        </span>
      </div>
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
  return '/primeiro-acesso';
}

export function Entrar() {
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
      navigate(DESTINO_DO_PERFIL[conta.perfil]);
    } catch (erro) {
      setErroLogin((erro as Error).message);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <Pagina>
      <FocusTopBar back={<BackButton to="/" />} />
      <div className="flex items-center gap-3">
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-16 object-contain" />
        <ScreenTitle>{t('Entrar')}</ScreenTitle>
      </div>
      <p className="text-muted">{t('Use a conta que a sua escola cadastrou.')}</p>

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

  return (
    <Pagina>
      <FocusTopBar back={<BackButton to="/entrar" />}>
        <span className="text-caption font-semibold text-muted">{t('Primeiro acesso')}</span>
      </FocusTopBar>
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
          onClick={() => {
            definirApelido(apelido);
            navigate('/estudante');
          }}
        >
          {t('Concluir')}
        </Button>
        <Button to="/estudante" variant="text" className="self-center">
          {t('Pular por agora')}
        </Button>
      </Rodape>
    </Pagina>
  );
}
