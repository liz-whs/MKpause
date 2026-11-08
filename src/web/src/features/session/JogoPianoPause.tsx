import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { cx } from '../../components/ui/cx';
import { t } from '../../i18n';

/**
 * O PianoPause (pygame no navegador, via pygbag) leva alguns segundos para
 * iniciar. Para o aluno não esperar, o jogo começa a carregar escondido
 * nas telas anteriores da pausa e só aparece na tela do PianoPause.
 *
 * Um iframe recarrega se mudar de lugar no DOM; por isso ele mora no layout
 * das telas de pausa (que não desmonta entre elas) e, na tela do jogo,
 * é posicionado por cima do espaço reservado (<EspacoDoJogo />).
 */

/** Verdadeiro a partir de 1024 px (o mesmo `lg` do Tailwind). */
export function useTelaGrande() {
  const consulta = '(min-width: 1024px)';
  const [grande, setGrande] = useState(() => window.matchMedia?.(consulta).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return;
    const ouvir = () => setGrande(mq.matches);
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, []);
  return grande;
}

const ROTA_JOGO = '/estudante/pausa/pianopause';
const ROTA_LIVRE = '/estudante/atividades/pianopause';

/** Telas em que vale a pena já ir carregando o jogo. */
function deveCarregar(pathname: string) {
  return pathname === ROTA_JOGO || pathname === ROTA_LIVRE || pathname === '/estudante/pausa/atividade';
}

const EspacoCtx = createContext<(el: HTMLElement | null) => void>(() => {});

/** Envolve as telas de pausa e mantém o iframe do jogo vivo entre elas. */
export function JogoPianoPauseProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const computador = useTelaGrande();
  const [espaco, setEspaco] = useState<HTMLElement | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [caixa, setCaixa] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const naPausa = pathname.startsWith('/estudante/pausa') || pathname === ROTA_LIVRE;
  const visivel = (pathname === ROTA_JOGO || pathname === ROTA_LIVRE) && espaco !== null;

  // Começa a carregar na hora certa e mantém enquanto o aluno estiver na pausa.
  useEffect(() => {
    if (!naPausa) setCarregado(false);
    else if (deveCarregar(pathname)) setCarregado(true);
  }, [naPausa, pathname]);

  // Acompanha a posição e o tamanho do espaço reservado na tela do jogo.
  useLayoutEffect(() => {
    if (!visivel || !espaco) {
      setCaixa(null);
      return;
    }
    const medir = () => {
      const r = espaco.getBoundingClientRect();
      setCaixa({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(espaco);
    ro?.observe(document.body);
    window.addEventListener('resize', medir);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [visivel, espaco]);

  return (
    <EspacoCtx.Provider value={setEspaco}>
      {children}
      {carregado && (
        <div
          aria-hidden={!visivel}
          inert={!visivel}
          className={cx('overflow-hidden rounded-sheet bg-bg', !visivel && 'invisible')}
          style={
            visivel && caixa
              ? { position: 'absolute', ...caixa }
              : // Escondido fora da tela, já no tamanho certo para iniciar no layout certo.
                { position: 'fixed', top: 0, left: '-300vw', width: computador ? 1000 : 480, height: computador ? 600 : 720 }
          }
        >
          <iframe
            src="/jogos/pianopause/index.html?mkpause=1"
            title={t('Jogo piano pause')}
            allow="autoplay; fullscreen"
            tabIndex={visivel ? 0 : -1}
            className="size-full border-0"
          />
        </div>
      )}
    </EspacoCtx.Provider>
  );
}

/** Espaço onde o jogo aparece (o iframe é posicionado por cima dele). */
export function EspacoDoJogo({ className }: { className?: string }) {
  const registrar = useContext(EspacoCtx);
  return <div ref={registrar} className={cx('rounded-sheet bg-bg', className)} />;
}
