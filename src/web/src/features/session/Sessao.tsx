import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { emocaoPorId, sugereEscalada, type Emocao, type EmocaoId } from '../../domain/emocoes';
import type { AtividadeId } from '../../domain/tipos';
import { api } from '../../data/api';
import { useEstudante } from '../../state/EstudanteContext';
import { EmotionGrid } from '../../components/student/EmotionGrid';
import { BackButton, FocusTopBar, SairDaPausa } from '../../components/student/FocusTopBar';
import { ActivityRow, ScreenTitle, PrivacyNote } from '../../components/student/Bits';
import { BreathingCircle, useBreathClock, usePrefersReducedMotion } from '../../components/student/Breathing';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { atividades } from '../student/Paginas';
import { EspacoDoJogo, useTelaGrande } from './JogoPianoPause';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';

const ROTA_ATIVIDADE: Record<AtividadeId, string> = {
  respiracao: '/estudante/pausa/respiracao',
  pianopause: '/estudante/pausa/pianopause',
  video: '/estudante/pausa/video',
};

/** Botão desativado com o motivo no próprio rótulo ("Escolha como está"). */
function Desativado({ children }: { children: string }) {
  return (
    <Button block disabled>
      {children}
    </Button>
  );
}

/** Etapa 1 de 3: Como você está? */
export function Humor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { iniciarSessao, avisoSaida } = useEstudante();
  // Vindo de Atividades, a atividade já chega escolhida; senão, escolhe na etapa 2.
  const escolhida = (location.state as { atividade?: AtividadeId } | null)?.atividade;
  // "Voltar" leva de onde a pausa começou: Atividades, Fora da sala ou Início.
  const voltar = escolhida ? '/estudante/atividades' : avisoSaida ? '/estudante/fora-da-sala' : '/estudante';
  const [emocao, setEmocao] = useState<EmocaoId | null>(null);
  const [dispensou, setDispensou] = useState(false);

  const continuar = () => {
    if (!emocao) return;
    // Cada pausa começa do zero: nada da pausa anterior é reaproveitado.
    iniciarSessao(emocao, escolhida);
    navigate(escolhida ? ROTA_ATIVIDADE[escolhida] : '/estudante/pausa/atividade');
  };

  return (
    <>
      <FocusTopBar back={<BackButton to={voltar} />}>
        <SairDaPausa />
      </FocusTopBar>
      <ProgressSteps current={1} total={3} label={t('Como você está')} />
      <ScreenTitle>{t('Como você está?')}</ScreenTitle>
      <EmotionGrid
        value={emocao}
        onChange={(e) => {
          setEmocao(e);
          setDispensou(false);
        }}
      />

      {sugereEscalada(emocao) && !dispensou && (
        <section role="status" className="flex flex-col gap-3 rounded-card-lg bg-surface p-4.5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 flex-none items-center justify-center rounded-full bg-rose text-dark">
              <Icon name="mao" size={22} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-button">{t('Está pesado demais?')}</h2>
              <p className="text-muted">{t('Vá direto para a respiração.')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button to="/estudante/agora">{t('Ir direto')}</Button>
            <Button variant="outline" onClick={() => setDispensou(true)}>
              {t('Agora não')}
            </Button>
          </div>
        </section>
      )}

      <div className="mt-1 flex flex-col gap-2.5">
        {emocao ? (
          <Button block onClick={continuar}>
            {t('Continuar')}
          </Button>
        ) : (
          <Desativado>{t('Escolha como está')}</Desativado>
        )}
        <PrivacyNote>{t('Sua turma não vê o que você responde.')}</PrivacyNote>
      </div>
    </>
  );
}

/** Garante que existe uma sessão iniciada (com a emoção de antes). */
function useSessaoValida() {
  const { sessao } = useEstudante();
  return Boolean(sessao.antes);
}

/** Etapa 2 de 3: escolher a atividade. */
export function EscolherAtividade() {
  const { sessao, atualizarSessao } = useEstudante();
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  // "Para você": respiração quando a emoção de antes é ansioso, triste ou irritado.
  const recomendaRespiracao = sugereEscalada(sessao.antes ?? null);

  return (
    <>
      <FocusTopBar back={<BackButton to="/estudante/pausa" />}>
        <SairDaPausa />
      </FocusTopBar>
      <ProgressSteps current={2} total={3} label={t('Atividade')} />
      <ScreenTitle>{t('Escolha uma atividade')}</ScreenTitle>
      <div className="flex flex-col gap-3">
        {atividades().map((a) => (
          <ActivityRow
            key={a.id}
            to={a.rota}
            onClick={() => atualizarSessao({ atividade: a.id })}
            icone={a.icone}
            fundo={a.fundo}
            titulo={a.titulo}
            detalhe={a.detalhe}
            selo={
              a.id === 'respiracao' && recomendaRespiracao ? (
                <Badge tone="leaf" icon="coracao">
                  {t('Para você')}
                </Badge>
              ) : undefined
            }
          />
        ))}
      </div>
    </>
  );
}

function CabecalhoAtividade() {
  return (
    <>
      <FocusTopBar back={<BackButton to="/estudante/pausa/atividade" />}>
        <SairDaPausa />
      </FocusTopBar>
      <ProgressSteps current={2} total={3} label={t('Atividade')} />
    </>
  );
}

const DURACOES = ['2 min', '5 min'] as const;
type Duracao = (typeof DURACOES)[number];
const SEGUNDOS: Record<Duracao, number> = { '2 min': 120, '5 min': 300 };

function mmss(segundos: number) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Respiração: 4 s para inspirar, 4 s para soltar, com 2 ou 5 min. */
export function Respiracao() {
  const valida = useSessaoValida();
  const reduzir = usePrefersReducedMotion();
  const [duracao, setDuracao] = useState<Duracao>('5 min');
  const [rodando, setRodando] = useState(true);
  const total = SEGUNDOS[duracao];
  const { t: tempo, reiniciar } = useBreathClock(rodando, reduzir);
  const restante = total - tempo;
  const pronto = restante <= 0;

  useEffect(() => {
    if (pronto) setRodando(false);
  }, [pronto]);

  if (!valida) return <Navigate to="/estudante/pausa" replace />;

  const recomecar = (d: Duracao = duracao) => {
    setDuracao(d);
    reiniciar();
    setRodando(true);
  };

  return (
    <>
      <CabecalhoAtividade />
      <ScreenTitle className="text-center">{t('Respiração')}</ScreenTitle>
      <ChoiceChips
        label={t('Duração')}
        columns={2}
        options={DURACOES}
        value={duracao}
        onChange={(d) => d && recomecar(d)}
      />
      <BreathingCircle t={tempo} reduzir={reduzir} texto={pronto ? t('Pronto!') : rodando ? undefined : t('Pausado')} />
      <p className="text-center font-semibold" aria-label={t('Faltam {tempo}', { tempo: mmss(restante) })}>
        {mmss(restante)}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {pronto ? (
          <Button variant="outline" onClick={() => recomecar()}>
            {t('De novo')}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setRodando((v) => !v)}>
            {rodando ? t('Pausar') : t('Continuar')}
          </Button>
        )}
        <Button to="/estudante/pausa/fim">{t('Terminei')}</Button>
      </div>
    </>
  );
}

/**
 * PianoPause: o jogo original (src/jogos/pianopause/main.py, em pygame) compilado
 * para o navegador com o pygbag. O build fica em public/jogos/pianopause;
 * para refazer, `npm run build:pianopause`.
 *
 * No celular o jogo usa o layout em pé (480 × 720). No computador abre com
 * `?modo=computador` e usa o layout deitado (1200 × 720). O iframe vem
 * pré-carregado do JogoPianoPauseProvider e aparece sobre o EspacoDoJogo.
 */
export function PianoPause() {
  const computador = useTelaGrande();
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return (
    <>
      <CabecalhoAtividade />
      <h1 className="sr-only">{t('PianoPause')}</h1>
      <div className="flex flex-col gap-5 lg:w-[min(64rem,calc(100vw-4rem))] lg:self-center">
        {computador ? (
          // Deitado (5:3), do tamanho que couber sem rolar a página.
          <EspacoDoJogo key="computador" className="mx-auto aspect-[5/3] w-[min(100%,calc((100dvh-16rem)*5/3))]" />
        ) : (
          // Em pé (2:3), na largura do celular.
          <EspacoDoJogo key="celular" className="mx-auto aspect-[2/3] w-full max-w-120" />
        )}
        <div className="flex flex-col gap-5 lg:mx-auto lg:w-[min(100%,calc((100dvh-16rem)*5/3))] lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center justify-center gap-2 text-caption text-muted lg:text-body">
            <Icon name="info" size={16} className="flex-none" />
            {t('Toque na tela do jogo para começar. Na sala, use fones.')}
          </p>
          <Button to="/estudante/pausa/fim" block className="lg:w-auto lg:px-10">
            {t('Terminei')}
          </Button>
        </div>
      </div>
    </>
  );
}

/** Vídeo cadastrado pela escola, com legenda. */
export function Video() {
  const video = api.estudante.video();
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return (
    <>
      <CabecalhoAtividade />
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card-lg bg-sky">
        {video.src ? (
          <video controls className="size-full" src={video.src}>
            {video.legendas && <track kind="captions" srcLang="pt-BR" label="Português" src={video.legendas} default />}
          </video>
        ) : (
          <span className="flex size-18 items-center justify-center rounded-full bg-ink text-surface" aria-hidden="true">
            <Icon name="play" size={30} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Badge icon="play">{t('Vídeo')} · {video.duracao}</Badge>
        <ScreenTitle>{t(video.titulo)}</ScreenTitle>
      </div>
      <div className="flex items-center gap-2.5 rounded-[18px] bg-surface px-4 py-3.5">
        <Icon name="info" size={22} />
        <span className="text-muted">{t('Na sala, use fones.')}</span>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <Button to="/estudante/pausa/fim" block>
          {t('Terminei')}
        </Button>
        <Button to="/estudante/pausa/atividade" variant="text" className="self-center">
          {t('Trocar')}
        </Button>
      </div>
    </>
  );
}

/** Etapa 3 de 3: E agora? Se ainda não está bem, leva ao nível 3. */
export function ComoFicou() {
  const navigate = useNavigate();
  const { sessao, atualizarSessao, concluirSessao } = useEstudante();
  const [emocao, setEmocao] = useState(sessao.depois ?? null);
  const [relato, setRelato] = useState('');
  if (!sessao.antes) return <Navigate to="/estudante/pausa" replace />;
  const antes = emocaoPorId(sessao.antes);

  return (
    <>
      <FocusTopBar back={<BackButton to={sessao.atividade ? ROTA_ATIVIDADE[sessao.atividade] : '/estudante/pausa/atividade'} />}>
        <SairDaPausa />
      </FocusTopBar>
      <ProgressSteps current={3} total={3} label={t('Como ficou')} />
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 self-start rounded-pill bg-surface py-1.5 pr-3.5 pl-1.5 text-caption font-semibold">
          <img src={antes.imagem} alt="" className="size-8 object-contain" />
          {t('Antes: {emocao}', { emocao: antes.label })}
        </span>
        <ScreenTitle>{t('E agora?')}</ScreenTitle>
      </div>
      <EmotionGrid value={emocao} onChange={setEmocao} />
      <Field label={t('Quer contar algo?')} optional multiline placeholder={t('Escreva aqui')} value={relato} onChange={(e) => setRelato(e.target.value)} />
      <div className="flex flex-col gap-2">
        {emocao ? (
          <Button
            block
            onClick={() => {
              atualizarSessao({ depois: emocao });
              concluirSessao(relato, emocao);
              navigate('/estudante/pausa/concluida');
            }}
          >
            {t('Finalizar')}
          </Button>
        ) : (
          <Desativado>{t('Escolha como está')}</Desativado>
        )}
        {/* Não há "Pedir ajuda": o nível 3 já avisa a escola automaticamente. */}
        <p className="mt-1.5 text-center font-semibold text-muted">{t('Ainda não está bem?')}</p>
        <Button to="/estudante/agora" variant="help" block>
          <Icon name="respiracao" size={22} />
          {t('Não estou bem')}
        </Button>
      </div>
    </>
  );
}

function EmocaoRegistrada({ rotulo, emocao }: { rotulo: string; emocao: Emocao }) {
  return (
    <span className="flex flex-col items-center gap-1 text-caption font-semibold">
      <img src={emocao.imagem} alt="" className="size-16 object-contain" />
      {rotulo}
      <span className="font-normal text-muted">{emocao.label}</span>
    </span>
  );
}

/** Pausa feita! Antes → depois. */
export function PausaFeita() {
  const { sessao, avisoSaida } = useEstudante();
  if (!sessao.antes || !sessao.depois) return <Navigate to="/estudante" replace />;
  const antes = emocaoPorId(sessao.antes);
  const depois = emocaoPorId(sessao.depois);

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col items-center gap-4.5 text-center">
      <FocusTopBar />
      <img src={mascote} alt={t('Chinchila, mascote do MKpause')} className="h-47 w-47.5 object-contain" />
      <ScreenTitle>{t('Pausa feita!')}</ScreenTitle>
      <div className="flex w-full items-center justify-center gap-3 rounded-card-lg bg-surface p-4.5">
        <EmocaoRegistrada rotulo={t('Antes')} emocao={antes} />
        <Icon name="seta" size={26} className="text-muted" />
        <EmocaoRegistrada rotulo={t('Depois')} emocao={depois} />
      </div>
      {avisoSaida && (
        <Link
          to="/estudante/fora-da-sala"
          className="flex w-full items-center gap-2.5 rounded-[18px] bg-sky px-4 py-3.5 text-left font-semibold no-underline hover:text-ink"
        >
          <Icon name="porta" size={22} />
          <span className="flex-1">{t('Voltei para a sala')}</span>
          <Icon name="seguir" size={20} />
        </Link>
      )}
      <div className="mt-auto flex w-full flex-col gap-2.5">
        <Button to="/estudante" block>
          {t('Início')}
        </Button>
      </div>
    </div>
  );
}
