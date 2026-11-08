import { useFluxoAtividade } from './useFluxoAtividade';
import { useEffect, useId, useRef, useState } from 'react';
import { FocusTopBar, TerminarExercicio, NomeAtividade } from '../../components/student/FocusTopBar';
import { Icon } from '../../components/ui/Icon';
import { usePreferencias } from '../../preferencias/preferencias';
import { t } from '../../i18n';
import { cx } from '../../components/ui/cx';

/** Usa a orientação da janela, inclusive em celulares deitados e janelas estreitas. */
function useFormatoVideo() {
  const consulta = '(orientation: landscape)';
  const [horizontal, setHorizontal] = useState(() => window.matchMedia?.(consulta).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(consulta);
    if (!media) return;
    const atualizar = () => setHorizontal(media.matches);
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);
  return horizontal ? 'computador' : 'celular';
}

/** Vídeo em toda a janela, com início imediato e pausa manual. */
export function VideoRespiracao({ atividade = 'video' }: { atividade?: 'video' | 'espiral' | 'chinchila' }) {
  const fluxo = useFluxoAtividade();
  const dados = { video: { titulo: 'mk breath', arquivo: 'respiracao', versao: 4 }, espiral: { titulo: 'spiral pause', arquivo: 'espiral', versao: 2 }, chinchila: { titulo: 'chinchilla pause', arquivo: 'chinchila', versao: 11 } }[atividade];
  const video = useRef<HTMLVideoElement>(null);
  const formato = useFormatoVideo();
  const anterior = useRef(formato);
  const retomar = useRef<{ tempo: number; rodando: boolean } | null>(null);
  const { idioma } = usePreferencias();
  const [tempo, setTempo] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState(false);
  const instrucoes = useId();
  useEffect(() => {
    const elemento = video.current;
    // Inicia ao abrir a atividade; se o navegador bloquear, mantém o play manual.
    void elemento?.play()?.catch(() => { if (elemento.paused) setRodando(false); });
    return () => { elemento?.pause(); };
  }, []);

  useEffect(() => {
    const elemento = video.current;
    if (!elemento || anterior.current === formato) return;
    anterior.current = formato;
    retomar.current = { tempo: elemento.currentTime, rodando: !elemento.paused };
    // A troca de source precisa de load(); preserva o ponto e a escolha de play/pausa.
    elemento.load();
  }, [formato]);

  const reproduzir = async () => {
    try {
      setErro(false);
      await video.current?.play();
    } catch {
      setRodando(false);
      setErro(true);
    }
  };

  const horizontal = formato === 'computador';
  const proporcao = horizontal ? 16 / 9 : atividade === 'video' ? 9 / 16 : 3 / 4;
  const inspirar = atividade === 'chinchila' ? 4 : 5;
  const ciclo = atividade === 'espiral' ? 12.5 : 10;
  const inspirando = tempo % ciclo < inspirar;
  const frase = atividade === 'video'
    ? (inspirando ? 'Inspire' : 'Solte o ar')
    : (inspirando ? 'Inspire devagar' : 'Solte o ar devagar');
  const topo = atividade === 'video' ? (horizontal ? 79 : 76)
    : atividade === 'espiral' ? 85 : horizontal ? 940 / 1080 * 100 : 800 / 960 * 100;
  const tamanho = atividade === 'video' ? (horizontal ? 5.5 : 10.5)
    : horizontal ? (atividade === 'chinchila' ? 44 / 1920 * 100 : 2.34375) : 40 / 720 * 100;

  return <section aria-label={t(dados.titulo)} className="relative h-dvh w-full overflow-hidden bg-bg">
    <p id={instrucoes} className="sr-only">{t('O vídeo começa ao abrir a atividade e se repete até você pausar. Use o botão central para reproduzir ou pausar.')}</p>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: `min(100vw, calc(100dvh * ${proporcao}))`, aspectRatio: String(proporcao), containerType: 'inline-size' }}>
    <video ref={video} loop muted playsInline preload="auto" poster={`/videos/${dados.arquivo}-${formato}.jpg?v=${dados.versao}`}
      aria-label={t('Vídeo de respiração guiada: acompanhe os movimentos para inspirar e soltar o ar no seu ritmo.')}
      aria-describedby={instrucoes} className="absolute inset-0 size-full object-contain"
      onTimeUpdate={(evento) => setTempo(evento.currentTarget.currentTime)}
      onSeeked={(evento) => setTempo(evento.currentTarget.currentTime)}
      onPlay={() => setRodando(true)} onPause={() => setRodando(false)}
      onError={() => { setRodando(false); setErro(true); }}
      onLoadedMetadata={() => {
        const elemento = video.current;
        const estado = retomar.current;
        retomar.current = null;
        if (!elemento || !estado) return;
        elemento.currentTime = Math.min(estado.tempo, Number.isFinite(elemento.duration) ? elemento.duration : estado.tempo);
        setTempo(elemento.currentTime);
        if (estado.rodando) void reproduzir();
      }}>
      <source src={`/videos/${dados.arquivo}-${formato}.mp4?v=${dados.versao}`} type="video/mp4" />
    </video>
    <p lang={idioma} data-instrucao-respiracao className="pointer-events-none absolute inset-x-0 m-0 px-2 text-center font-display font-semibold leading-none text-ink"
      style={{ top: `${topo}%`, fontSize: `${tamanho}cqw`, transform: atividade === 'video' ? 'translateY(-50%)' : undefined }}>
      {t(frase)}
    </p>
    </div>
    <div className="absolute inset-x-0 top-0 bg-bg/95 px-4 pb-2 md:px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <FocusTopBar back={<NomeAtividade titulo={dados.titulo} />}>
        <TerminarExercicio to={fluxo.terminar} />
      </FocusTopBar>
    </div>
    <button type="button" aria-label={rodando ? t('Pausar vídeo') : t('Reproduzir vídeo')} aria-describedby={instrucoes}
      className={cx('absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors md:size-20',
        rodando ? 'bg-transparent text-transparent' : 'border border-surface/35 bg-surface/15 text-surface/90 backdrop-blur-[2px] hover:bg-surface/25')}
      onClick={() => {
        if (rodando) video.current?.pause();
        else {
          if (erro) video.current?.load();
          void reproduzir();
        }
      }}>
      {!rodando && <Icon name="play" size={28} className="drop-shadow-sm" />}
    </button>
    {erro && <p role="alert" className="absolute inset-x-0 bottom-0 bg-bg/95 p-4 md:p-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {t('Não foi possível reproduzir o vídeo. Toque em reproduzir para tentar novamente.')}
    </p>}
  </section>;
}
