import { agir } from '../../state/acoes';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { emocaoPorId, sugereEscalada, type Emocao, type EmocaoId } from '../../domain/emocoes';
import type { AtividadeId } from '../../domain/tipos';
import { useEstudante } from '../../state/EstudanteContext';
import { EmotionGrid } from '../../components/student/EmotionGrid';
import { BackButton, FocusTopBar, SairDaPausa } from '../../components/student/FocusTopBar';
import { AtividadesPorCategoria } from '../../components/student/AtividadesPorCategoria';
import { ActivityRow, ScreenTitle } from '../../components/student/Bits';
import { BreathingCircle, useBreathClock, usePrefersReducedMotion } from '../../components/student/Breathing';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { atividades } from '../student/Paginas';
import { EspacoDoJogo, useTelaGrande } from './JogoPianoPause';
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
  const location = useLocation();
  const { iniciarSessao } = useEstudante();
  // Vindo de Atividades, a atividade já chega escolhida; senão, escolhe na etapa 2.
  const escolhida = (location.state as { atividade?: AtividadeId } | null)?.atividade;
  // "Voltar" leva de onde a pausa começou: Atividades ou Início.
  const voltar = escolhida ? '/estudante/atividades' : '/estudante';
  const [emocao, setEmocao] = useState<EmocaoId | null>(null);

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

/** Respiração contínua: o estudante decide quando pausar ou encerrar. */
export function Respiracao() {
  const navigate = useNavigate();
  const valida = useSessaoValida();
  const reduzir = usePrefersReducedMotion();
  const [rodando, setRodando] = useState(true);
  const { t: tempo } = useBreathClock(rodando, reduzir);
  if (!valida) return <Navigate to="/estudante/pausa" replace />;
  return <>
    <CabecalhoAtividade />
    <ScreenTitle className="text-center">{t('respire & pause')}</ScreenTitle>
    <BreathingCircle t={tempo} reduzir={reduzir} texto={rodando ? undefined : t('Pausado')} />
    <div className="grid grid-cols-2 gap-2.5">
      <Button variant="outline" onClick={() => setRodando((v) => !v)}>{rodando ? t('Pausar') : t('Continuar')}</Button>
      <Button onClick={() => {
        // Interrompe as atualizações da animação antes da transição de página.
        setRodando(false);
        void navigate('/estudante/pausa/fim');
      }}>{t('Terminei')}</Button>
    </div>
  </>;
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
      <IntroducaoJogo titulo="piano pause" instrucao="Toque nas teclas e acompanhe as notas no seu ritmo." />
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
            {t('Na sala, use fones.')}
          </p>
          <Button to="/estudante/pausa/fim" block className="lg:w-auto lg:px-10">
            {t('Terminei')}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * MK Potion: jogo de organizar líquidos da Ana (src/MKpotion/mk_potion, em pygame),
 * compilado com o pygbag para public/jogos/mkpotion (`npm run build:mkpotion`).
 * O jogo é deitado (1000 × 700) e se ajusta ao tamanho da janela; o progresso fica no navegador.
 */
function IntroducaoJogo({ titulo, instrucao }: { titulo: string; instrucao: string }) {
  return <div className="space-y-2 text-center">
    <ScreenTitle>{t(titulo)}</ScreenTitle>
    <p className="text-body text-muted">{t(instrucao)}</p>
  </div>;
}

export function MKPotion({ jogo = 'mkpotion' }: { jogo?: 'mkpotion' | 'mkconnection' }) {
  const titulo = jogo === 'mkconnection' ? 'mk connection' : 'mk potion';
  const { perfil } = useEstudante();
  if (!useSessaoValida()) return <Navigate to="/estudante/pausa" replace />;
  return (
    <>
      <CabecalhoAtividade />
      <IntroducaoJogo titulo={titulo} instrucao={jogo === 'mkconnection'
        ? 'Conecte os pontos da mesma cor, sem pressa.'
        : 'Organize as cores nas garrafas, uma de cada vez.'} />
      <div className="flex flex-col gap-5 lg:w-[min(64rem,calc(100vw-4rem))] lg:self-center">
        {/* Ocupa a altura que sobra na tela (vertical no celular, horizontal no computador):
            com ?mkpause=1 o jogo desenha nesse tamanho exato, nítido, e se reorganiza ao redimensionar. */}
        <div className="h-[max(26rem,calc(100dvh-21rem))] w-full overflow-hidden rounded-sheet bg-bg lg:h-[max(28rem,calc(100dvh-19rem))]">
          <iframe
            src={`/jogos/${jogo}/index.html?mkpause=1&estudante=${encodeURIComponent(perfil.id)}`}
            title={t(jogo === 'mkconnection' ? 'Jogo mk connection' : 'Jogo mk potion')}
            allow="autoplay; fullscreen"
            className="size-full border-0"
          />
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center justify-center gap-2 text-caption text-muted lg:text-body">
            <Icon name="info" size={16} className="flex-none" />
            {t('Na sala, use fones.')}
          </p>
          <Button to="/estudante/pausa/fim" block className="lg:w-auto lg:px-10">
            {t('Terminei')}
          </Button>
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
  const { sessao } = useEstudante();
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
      <div className="w-full"><RetornoSala /></div>
      <div className="mt-auto flex w-full flex-col gap-2.5">
        <Button to="/estudante" block>
          {t('Início')}
        </Button>
      </div>
    </div>
  );
}
