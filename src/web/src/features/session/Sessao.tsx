import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { useFluxoAtividade } from './useFluxoAtividade';
import { agir } from '../../state/acoes';
import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { emocaoPorId, sugereEscalada, type Emocao, type EmocaoId } from '../../domain/emocoes';
import type { AtividadeId } from '../../domain/tipos';
import { useEstudante } from '../../state/EstudanteContext';
import { EmotionGrid } from '../../components/student/EmotionGrid';
import { BackButton, FocusTopBar, SairDaPausa, TerminarExercicio, NomeAtividade } from '../../components/student/FocusTopBar';
import { AtividadesPorCategoria } from '../../components/student/AtividadesPorCategoria';
import { ActivityRow, Confirmacao, ScreenTitle } from '../../components/student/Bits';
import { BreathingCircle, BreathingStage, useBreathClock, usePrefersReducedMotion } from '../../components/student/Breathing';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { atividades } from '../student/Paginas';
import { EspacoDoJogo } from './JogoPianoPause';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';
import { VideoRespiracao } from './VideoRespiracao';
import { RetornoSala } from '../../components/student/RetornoSala';

const ROTA_ATIVIDADE: Record<AtividadeId, string> = {
  respiracao: '/estudante/pausa/respiracao',
  pianopause: '/estudante/pausa/pianopause',
  mkpotion: '/estudante/pausa/mkpotion',
  video: '/estudante/pausa/video',
  mkconnection: '/estudante/pausa/mkconnection',
  espiral: '/estudante/pausa/espiral',
  chinchila: '/estudante/pausa/chinchila',
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
  const { iniciarSessao, avisoSaida } = useEstudante();
  const [emocao, setEmocao] = useState<EmocaoId | null>(null);

  const continuar = () => {
    if (!emocao) return;
    // Cada pausa começa do zero: nada da pausa anterior é reaproveitado.
    iniciarSessao(emocao);
    navigate('/estudante/pausa/atividade');
  };

  return (
    <>
      <FocusTopBar back={<BackButton to="/estudante" />}>
        <SairDaPausa />
      </FocusTopBar>
      {/* Nível 2: o aviso de saída fica confirmado enquanto o estudante estiver fora da sala. */}
      {avisoSaida && <Confirmacao>{t('Seu professor foi avisado da sua saída.')}</Confirmacao>}
      <ProgressSteps current={1} total={3} label={t('Como você está')} />
      <ScreenTitle>{t('Como você está?')}</ScreenTitle>
      <EmotionGrid value={emocao} onChange={setEmocao} />

      <div className="mt-1 flex flex-col gap-2.5">
        {emocao ? (
          <Button block onClick={continuar}>
            {t('Continuar')}
          </Button>
        ) : (
          <Desativado>{t('Escolha como está')}</Desativado>
        )}
      </div>
    </>
  );
}

/** Garante que existe uma sessão iniciada (com a emoção de antes). */
function useSessaoValida() {
  const { sessao } = useEstudante();
  const { livre } = useFluxoAtividade();
  return livre || Boolean(sessao.antes);
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
      <AtividadesPorCategoria atividades={atividades()} gradeClassName="md:grid-cols-2" renderAtividade={(a) => (
        <ActivityRow
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
      )} />
    </>
  );
}

function CabecalhoAtividade({ titulo }: { titulo: string }) {
  const fluxo = useFluxoAtividade();
  return (
    <>
      <FocusTopBar back={<NomeAtividade titulo={titulo} />}>
        <TerminarExercicio to={fluxo.terminar} />
      </FocusTopBar>
      {!fluxo.livre && <ProgressSteps current={2} total={3} label={t('Atividade')} />}
    </>
  );
}

/** Respiração contínua: o estudante decide quando pausar ou encerrar. */
export function Respiracao() {
  const valida = useSessaoValida();
  const reduzir = usePrefersReducedMotion();
  const [rodando, setRodando] = useState(true);
  const { t: tempo } = useBreathClock(rodando, reduzir);
  if (!valida) return <Navigate to="/estudante/pausa" replace />;
  return <>
    <CabecalhoAtividade titulo="respire & pause" />
    <BreathingStage>
        <BreathingCircle t={tempo} reduzir={reduzir} tamanho={320} fluido texto={rodando ? undefined : ''} />
        <button type="button" aria-label={rodando ? t('Pausar') : t('Continuar')}
          className={`pointer-events-auto absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink md:size-20 ${rodando ? 'bg-transparent text-transparent' : 'border border-surface/35 bg-surface/15 text-surface/90 backdrop-blur-[2px] hover:bg-surface/25'}`}
          onClick={() => setRodando((v) => !v)}>
          {!rodando && <Icon name="play" size={28} className="drop-shadow-sm" />}
        </button>
        {!rodando && <span role="status" className="sr-only">{t('Pausado')}</span>}
    </BreathingStage>
  </>;
}

/**
 * PianoPause: o jogo original (src/jogos/pianopause/main.py, em pygame) compilado
 * para o navegador com o pygbag. O build fica em public/jogos/pianopause;
 * para refazer, `npm run build:pianopause`.
 *
 * O iframe vem pré-carregado do JogoPianoPauseProvider e ocupa o EspacoDoJogo.
 * A cópia integrada adapta o canvas à janela sem recarregar a partida.
 */
export function PianoPause() {
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return <>
    <CabecalhoAtividade titulo="piano pause" />
    <EspacoDoJogo className="min-h-0 w-full flex-1" />
  </>;
}

/**
 * MK Potion: jogo de organizar líquidos da Ana (src/MKpotion/mk_potion, em pygame),
 * compilado com o pygbag para public/jogos/mkpotion (`npm run build:mkpotion`).
 * O jogo é deitado (1000 × 700) e se ajusta ao tamanho da janela; o progresso fica no navegador.
 */
export function MKPotion({ jogo = 'mkpotion' }: { jogo?: 'mkpotion' | 'mkconnection' }) {
  const titulo = jogo === 'mkconnection' ? 'mk connection' : 'mk potion';
  const { perfil } = useEstudante();
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return (
    <>
      <CabecalhoAtividade titulo={titulo} />

      <div className="flex min-h-0 w-full flex-1 flex-col">
        {/* Ocupa a altura que sobra na tela (vertical no celular, horizontal no computador):
            com ?mkpause=1 o jogo desenha nesse tamanho exato, nítido, e se reorganiza ao redimensionar. */}
        <div className="min-h-0 w-full flex-1 overflow-hidden rounded-sheet bg-bg">
          <iframe
            src={`/jogos/${jogo}/index.html?mkpause=1&estudante=${encodeURIComponent(perfil.id)}`}
            title={t(jogo === 'mkconnection' ? 'Jogo mk connection' : 'Jogo mk potion')}
            allow="autoplay; fullscreen"
            className="size-full border-0"
          />
        </div>

      </div>
    </>
  );
}

/** Atividade de respiração em vídeo, com controles acessíveis. */
export function Video({ atividade = 'video' }: { atividade?: 'video' | 'espiral' | 'chinchila' }) {
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return <VideoRespiracao key={atividade} atividade={atividade} />;
}

/** Conteúdo livre preserva as mesmas regras de disponibilidade do catálogo. */
export function AtividadeLivre({ atividade, children }: { atividade: AtividadeId; children: ReactNode }) {
  const disponivel = useDados(() => api.estudante.conteudos().some((c) => c.id === atividade && c.disponivel));
  return disponivel ? children : <Navigate to="/estudante/atividades" replace />;
}

/** Etapa 3 de 3: E agora? Se ainda não está bem, leva ao nível 3. */
export function ComoFicou() {
  const navigate = useNavigate();
  const { sessao, atualizarSessao, concluirSessao } = useEstudante();
  const [emocao, setEmocao] = useState(sessao.depois ?? null);
  const [relato, setRelato] = useState('');
  const [jaConcluida] = useState(Boolean(sessao.concluida));
  if (!sessao.antes) return <Navigate to="/estudante/pausa" replace />;
  if (!sessao.atividade) return <Navigate to="/estudante/pausa/atividade" replace />;
  if (jaConcluida) return <Navigate to="/estudante/pausa/concluida" replace />;
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
              void agir(async () => {
                await concluirSessao(relato, emocao);
                atualizarSessao({ depois: emocao });
                navigate('/estudante/pausa/concluida');
              }, 'Sessão concluída.');
            }}
          >
            {t('Finalizar')}
          </Button>
        ) : (
          <Desativado>{t('Escolha como está')}</Desativado>
        )}
        {/* Não há "Pedir ajuda": o nível 3 já avisa a escola automaticamente. */}
        <Button variant="help" block disabled={!emocao} onClick={() => {
          if (!emocao) return;
          void agir(async () => {
            const relatoRegistrado = await concluirSessao(relato, emocao);
            navigate('/estudante/agora', { state: { relatoRegistrado } });
          }, 'Sessão concluída.');
        }}>
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
  const { sessao } = useEstudante();
  if (!sessao.antes || !sessao.depois) return <Navigate to="/estudante" replace />;
  const antes = emocaoPorId(sessao.antes);
  const depois = emocaoPorId(sessao.depois);

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col items-center gap-4.5 text-center">
      <FocusTopBar />
      <img src={mascote} alt={t('Chinchila, mascote do mkpause')} className="h-47 w-47.5 object-contain" />
      <ScreenTitle>{t('Pausa feita!')}</ScreenTitle>
      {sessao.relatoRegistrado && <Confirmacao>{t('Sua observação foi registrada.')}</Confirmacao>}
      <div className="flex w-full items-center justify-center gap-3 rounded-card-lg bg-surface p-4.5">
        <EmocaoRegistrada rotulo={t('Antes')} emocao={antes} />
        <Icon name="seta" size={26} className="text-muted" />
        <EmocaoRegistrada rotulo={t('Depois')} emocao={depois} />
      </div>
      <div className="w-full"><RetornoSala /></div>
      <div className="mt-auto flex w-full flex-col gap-2.5">
        <Button to="/estudante" block>
          {t('Início')}
        </Button>
      </div>
    </div>
  );
}
