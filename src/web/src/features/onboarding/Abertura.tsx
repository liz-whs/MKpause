import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { usePreferencias } from '../../preferencias/preferencias';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';
import './abertura.css';

const CHAVE = 'mkpause:abertura-vista';
function jaViu() {
  try { return sessionStorage.getItem(CHAVE) === String(performance.timeOrigin); } catch { return false; }
}
function marcarVista() {
  try { sessionStorage.setItem(CHAVE, String(performance.timeOrigin)); } catch { /* A abertura não depende do armazenamento. */ }
}

export function useAbertura() {
  const { menosMovimento } = usePreferencias();
  const [sistemaReduzido, setSistemaReduzido] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [manual, setManual] = useState(false);
  const [ativa, setAtiva] = useState(() => !jaViu() && !menosMovimento && !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const atualizar = () => setSistemaReduzido(media?.matches ?? false);
    media?.addEventListener('change', atualizar);
    return () => media?.removeEventListener('change', atualizar);
  }, []);
  useEffect(() => {
    if (!ativa) return;
    if (menosMovimento || sistemaReduzido) {
      if (!manual) setAtiva(false);
      return;
    }
    marcarVista();
    const timer = window.setTimeout(() => setAtiva(false), 6000);
    return () => window.clearTimeout(timer);
  }, [ativa, menosMovimento, sistemaReduzido, manual]);
  return { ativa: ativa && (manual || (!menosMovimento && !sistemaReduzido)), estatica: menosMovimento || sistemaReduzido, rever: () => { setManual(true); setAtiva(true); }, terminar: () => { marcarVista(); setAtiva(false); } };
}

export function Abertura({ terminar, estatica = false }: { terminar: () => void; estatica?: boolean }) {
  const palco = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let ativo = true;
    const medir = () => {
      if (!ativo) return;
      const prefixo = palco.current?.querySelector<HTMLElement>('.abertura-prefixo');
      const texto = prefixo?.querySelector('.abertura-medida')?.firstChild;
      if (!prefixo || !texto) return;
      const faixa = document.createRange();
      if (typeof faixa.getBoundingClientRect !== 'function') return;
      prefixo.querySelectorAll<HTMLElement>('.abertura-caractere').forEach((letra, i) => {
        faixa.setStart(texto, i);
        faixa.setEnd(texto, i + 1);
        letra.style.setProperty('--largura-letra', `${faixa.getBoundingClientRect().width}px`);
      });
    };
    medir();
    void document.fonts?.ready.then(medir);
    return () => { ativo = false; };
  }, []);
  return <div ref={palco} className="flex flex-1 flex-col items-center gap-6" data-abertura data-estatica={estatica || undefined}>
    <h1 className="sr-only">make a pause. mkpause.</h1>
    <div className="abertura-palco" aria-hidden="true">
      <div className="abertura-marca">
        <div className="abertura-nome font-display">
          <span className="abertura-prefixo">
            <span className="abertura-medida">make a</span>
            {Array.from('make a').map((letra, i) => {
              const ordem = [5, 4, 3, 1].indexOf(i);
              return <span key={i} className={`abertura-caractere${ordem >= 0 ? ' abertura-remove' : ''}${i > 2 ? ' abertura-cauda' : ''}`} 
                style={{ '--atraso': `${1000 + ordem * 30}ms` } as CSSProperties}>
                <span>{letra}</span>
              </span>;
            })}
          </span>
          <span className="abertura-pausa">pause</span>
        </div>
        <span className="abertura-companheira"><img src={mascote} alt="" className="abertura-mascote" /></span>
      </div>
    </div>
    <div className="mt-auto flex flex-wrap justify-center gap-x-6 gap-y-2 pb-4 text-caption font-semibold">
      <button type="button" onClick={terminar} className="min-h-12 rounded-pill px-4 underline underline-offset-4 hover:bg-peony">{t(estatica ? 'Continuar' : 'Pular abertura')}</button>
      <Link to="/entrar" className="inline-flex min-h-12 items-center rounded-pill px-4 hover:bg-peony">{t('Já tenho conta · Entrar')}</Link>
    </div>
  </div>;
}
