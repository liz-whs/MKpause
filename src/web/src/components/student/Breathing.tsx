import { useEffect, useRef, useState } from 'react';
import { t as traduzir } from '../../i18n';
import { usePreferencias } from '../../preferencias/preferencias';

/** Ciclo da respiração: 4 s para inspirar, 4 s para soltar. */
const FASE = 4;

/** Menos movimento: vale a configuração do sistema ou a opção "Menos movimento" do MKpause. */
export function usePrefersReducedMotion() {
  const { menosMovimento } = usePreferencias();
  const [reduzir, setReduzir] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const ouvir = () => setReduzir(mq.matches);
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, []);
  return reduzir || menosMovimento;
}

/**
 * Relógio em segundos que avança só enquanto `rodando`.
 * Com movimento reduzido, atualiza uma vez por segundo em vez de a cada quadro.
 */
export function useBreathClock(rodando: boolean, reduzir: boolean) {
  const [t, setT] = useState(0);
  const ultimo = useRef<number | null>(null);

  useEffect(() => {
    if (!rodando) {
      ultimo.current = null;
      return;
    }
    if (reduzir) {
      const id = window.setInterval(() => setT((v) => v + 1), 1000);
      return () => window.clearInterval(id);
    }
    let raf = 0;
    const loop = (agora: number) => {
      const dt = ultimo.current === null ? 0 : Math.min((agora - ultimo.current) / 1000, 0.05);
      ultimo.current = agora;
      setT((v) => v + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rodando, reduzir]);

  return { t, reiniciar: () => setT(0) };
}

export function faseDaRespiracao(t: number) {
  const f = t % (FASE * 2);
  const inspirando = f < FASE;
  // 0 → 1 ao inspirar, 1 → 0 ao soltar, com aceleração suave.
  const e = inspirando ? (1 - Math.cos((Math.PI * f) / FASE)) / 2 : (1 + Math.cos((Math.PI * (f - FASE)) / FASE)) / 2;
  return { rotulo: inspirando ? traduzir('Inspire') : traduzir('Solte o ar'), e };
}

interface BreathingCircleProps {
  t: number;
  /** Texto no centro no lugar da fase (ex.: "Pausado", "Pronto!"). */
  texto?: string;
  /** Tamanho da área em px (290 na sessão, 320 no nível 3). */
  tamanho?: number;
  reduzir: boolean;
}

/**
 * Círculo de respiração. Com prefers-reduced-motion, mostra só o texto
 * alternado "Inspire / Solte o ar", sem animação.
 */
export function BreathingCircle({ t, texto, tamanho = 290, reduzir }: BreathingCircleProps) {
  const { rotulo, e } = faseDaRespiracao(t);
  const fala = texto ?? rotulo;

  if (reduzir) {
    return (
      <div
        className="flex items-center justify-center self-center rounded-full bg-lavender"
        style={{ width: tamanho * 0.75, height: tamanho * 0.75 }}
      >
        <span aria-live="polite" className="font-display text-screen font-semibold">
          {fala}
        </span>
      </div>
    );
  }

  const r = tamanho / 2;
  const escala = 0.75 + 0.4 * e;
  const externo = 2 * (r * 0.69) * escala;
  const interno = 2 * (r * 0.48) * escala;
  const halo = externo + 2 * (6 + 10 * e);

  const circulo = (d: number, classe: string, opacidade?: number) => (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 left-1/2 rounded-full ${classe}`}
      style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, opacity: opacidade }}
    />
  );

  return (
    <div className="relative flex-none self-center" style={{ width: tamanho, height: tamanho }}>
      {circulo(halo, 'bg-lavender', (45 + 55 * e) / 255)}
      {circulo(externo, 'bg-lavender')}
      {circulo(interno, 'bg-sky')}
      <span aria-live="polite" className="absolute inset-0 flex items-center justify-center font-display text-section font-semibold md:text-section-lg">
        {fala}
      </span>
    </div>
  );
}
