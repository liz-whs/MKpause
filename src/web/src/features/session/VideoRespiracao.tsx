import { useEffect, useId, useRef, useState } from 'react';
import { BackButton, FocusTopBar, SairDaPausa } from '../../components/student/FocusTopBar';
import { Icon } from '../../components/ui/Icon';
import { usePreferencias } from '../../preferencias/preferencias';
import { t } from '../../i18n';
import { cx } from '../../components/ui/cx';

const LEGENDAS = [
  { lang: 'pt-BR', rotulo: 'Português' },
  { lang: 'en', rotulo: 'English' },
  { lang: 'es', rotulo: 'Español' },
] as const;

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

/** Vídeo em toda a janela, sem recortar as instruções e sem reprodução automática. */
export function VideoRespiracao() {
  const video = useRef<HTMLVideoElement>(null);
  const formato = useFormatoVideo();
  const anterior = useRef(formato);
  const retomar = useRef<{ tempo: number; rodando: boolean } | null>(null);
  const { idioma } = usePreferencias();
  const [rodando, setRodando] = useState(false);
  const legendas = idioma !== 'pt-BR';
  const [erro, setErro] = useState(false);
  const instrucoes = useId();

  const aplicarLegendas = () => {
    if (!video.current) return;
    for (const faixa of Array.from(video.current.textTracks)) {
      faixa.mode = legendas && faixa.language === idioma ? 'showing' : 'disabled';
    }
  };
  useEffect(aplicarLegendas, [legendas, idioma]);

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

  return <section aria-label={t('MK Breath')} className="relative h-dvh w-full overflow-hidden bg-bg">
    <h1 className="sr-only">{t('MK Breath')}</h1>
    <p id={instrucoes} className="sr-only">{t('O vídeo se repete até você pausar. Use o botão central para reproduzir ou pausar.')}</p>
    <video ref={video} loop playsInline preload="auto" poster={`/videos/respiracao-${formato}.jpg?v=3`}
      aria-label={t('Vídeo de respiração guiada: acompanhe os movimentos para inspirar e soltar o ar no seu ritmo.')}
      aria-describedby={instrucoes} className="absolute inset-0 size-full object-contain"
      onPlay={() => setRodando(true)} onPause={() => setRodando(false)}
      onError={() => { setRodando(false); setErro(true); }}
      onLoadedMetadata={() => {
        aplicarLegendas();
        const elemento = video.current;
        const estado = retomar.current;
        retomar.current = null;
        if (!elemento || !estado) return;
        elemento.currentTime = Math.min(estado.tempo, Number.isFinite(elemento.duration) ? elemento.duration : estado.tempo);
        if (estado.rodando) void reproduzir();
      }}>
      <source src={`/videos/respiracao-${formato}.mp4?v=3`} type="video/mp4" />
      {LEGENDAS.map((l) => <track key={l.lang} kind="captions" srcLang={l.lang} label={l.rotulo}
        src={`/videos/respiracao.${l.lang}.vtt`} default={idioma !== 'pt-BR' && l.lang === idioma} onLoad={aplicarLegendas} />)}
    </video>
    <div className="absolute inset-x-0 top-0 bg-bg/95 px-4 pb-2 md:px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <FocusTopBar back={<BackButton to="/estudante/pausa/atividade" />}><SairDaPausa /></FocusTopBar>
    </div>
    <button type="button" aria-label={rodando ? t('Pausar vídeo') : t('Reproduzir vídeo')} aria-describedby={instrucoes}
      className={cx('absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full md:size-24',
        rodando ? 'bg-transparent text-transparent' : 'border-2 border-surface bg-ink text-surface shadow-lg hover:bg-muted')}
      onClick={() => {
        if (rodando) video.current?.pause();
        else {
          if (erro) video.current?.load();
          void reproduzir();
        }
      }}>
      {!rodando && <Icon name="play" size={36} />}
    </button>
    {erro && <p role="alert" className="absolute inset-x-0 bottom-0 bg-bg/95 p-4 md:p-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {t('Não foi possível reproduzir o vídeo. Toque em reproduzir para tentar novamente.')}
    </p>}
  </section>;
}
