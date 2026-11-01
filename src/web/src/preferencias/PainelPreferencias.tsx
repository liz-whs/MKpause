import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { t } from '../i18n';
import { Icon } from '../components/ui/Icon';
import { Switch } from '../components/ui/Switch';
import { cx } from '../components/ui/cx';
import {
  IDIOMAS,
  PADRAO,
  TAMANHOS,
  definirPreferencias,
  usePreferencias,
  type Idioma,
  type TamanhoTexto,
} from './preferencias';

/* ───────────── Abrir e fechar o painel (de qualquer tela) ───────────── */

let aberto = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function abrirPreferencias() {
  aberto = true;
  avisar();
}

export function fecharPreferencias() {
  aberto = false;
  avisar();
}

function usePainelAberto() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => aberto,
    () => false,
  );
}

/* ───────────── Escolha única em pílulas (rádios nativos) ───────────── */

function Pilulas<T extends string | number>({
  legenda,
  opcoes,
  valor,
  onChange,
}: {
  legenda: string;
  opcoes: { valor: T; rotulo: string; lang?: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  const nome = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 font-semibold">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label
            key={String(o.valor)}
            lang={o.lang}
            className={cx(
              'inline-flex min-h-12 cursor-pointer items-center rounded-pill border-3 px-4 font-semibold',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
              o.valor === valor ? 'border-ink bg-leaf' : 'border-surface bg-surface hover:bg-surface-hover',
            )}
          >
            <input
              type="radio"
              name={nome}
              value={String(o.valor)}
              checked={o.valor === valor}
              onChange={() => onChange(o.valor)}
              className="sr-only"
            />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ROTULO_TAMANHO: Record<TamanhoTexto, string> = { 100: 'Normal', 125: 'Grande', 150: 'Muito grande' };

/** Controles de idioma e acessibilidade (no painel e no Perfil). */
export function OpcoesPreferencias() {
  const p = usePreferencias();
  return (
    <div className="flex flex-col gap-5">
      <Pilulas<Idioma>
        legenda={t('Idioma')}
        // O nome de cada idioma fica na própria língua (e com lang, para o leitor de tela).
        opcoes={IDIOMAS.map((i) => ({ valor: i.id, rotulo: i.nome, lang: i.id }))}
        valor={p.idioma}
        onChange={(idioma) => definirPreferencias({ idioma })}
      />
      <Pilulas<TamanhoTexto>
        legenda={t('Tamanho do texto')}
        opcoes={TAMANHOS.map((n) => ({ valor: n, rotulo: `${t(ROTULO_TAMANHO[n])} · ${n}%` }))}
        valor={p.tamanhoTexto}
        onChange={(tamanhoTexto) => definirPreferencias({ tamanhoTexto })}
      />
      <div className="flex flex-col gap-4 rounded-card bg-surface p-4">
        <Switch
          label={t('Alto contraste')}
          description={t('Texto preto, fundo branco e bordas marcadas.')}
          checked={p.altoContraste}
          onChange={(altoContraste) => definirPreferencias({ altoContraste })}
        />
        <Switch
          label={t('Menos movimento')}
          description={t('Desliga animações, como o círculo da respiração.')}
          checked={p.menosMovimento}
          onChange={(menosMovimento) => definirPreferencias({ menosMovimento })}
        />
        <Switch
          label={t('Fonte mais legível')}
          description={t('Atkinson Hyperlegible, pensada para dislexia e baixa visão.')}
          checked={p.fonteLegivel}
          onChange={(fonteLegivel) => definirPreferencias({ fonteLegivel })}
        />
        <Switch
          label={t('Libras (VLibras)')}
          description={t('Um avatar traduz para Libras o texto em português. Usa o VLibras, do governo federal, e precisa de internet. Ao ligar, a página recarrega.')}
          checked={p.libras}
          onChange={(libras) => definirPreferencias({ libras })}
        />
      </div>
      <button
        type="button"
        onClick={() => definirPreferencias(PADRAO)}
        className="min-h-12 self-start font-semibold underline underline-offset-4 hover:decoration-2"
      >
        {t('Voltar ao padrão')}
      </button>
    </div>
  );
}

/* ───────────── Botão e painel ───────────── */

/**
 * Botão "Acessibilidade e idioma" (48 px). Fica no topo de todas as telas.
 * `rotulo` mostra o texto ao lado do ícone (menu dos profissionais).
 */
export function BotaoPreferencias({ rotulo = false, className }: { rotulo?: boolean; className?: string }) {
  const nome = t('Acessibilidade e idioma');
  return (
    <button
      type="button"
      data-abre-preferencias=""
      onClick={abrirPreferencias}
      aria-label={rotulo ? undefined : nome}
      aria-haspopup="dialog"
      className={cx(
        'flex flex-none items-center justify-center rounded-full bg-surface text-ink hover:bg-peony',
        rotulo ? 'min-h-12 gap-2.5 rounded-field px-3.5 font-medium' : 'size-12',
        className,
      )}
    >
      <Icon name="acessibilidade" />
      {rotulo && nome}
    </button>
  );
}

/**
 * Painel modal. Mora na raiz do app (fora das telas), assim continua aberto
 * quando o idioma muda e as telas são remontadas.
 */
export function PainelPreferencias() {
  const abertoAgora = usePainelAberto();
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  usePreferencias(); // renderiza de novo quando o idioma muda

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abertoAgora && !dialogo.open) {
      // showModal prende o foco no painel e fecha com Esc. (jsdom não tem showModal.)
      if (typeof dialogo.showModal === 'function') dialogo.showModal();
      else dialogo.setAttribute('open', '');
    } else if (!abertoAgora && dialogo.open) {
      if (typeof dialogo.close === 'function') dialogo.close();
      else dialogo.removeAttribute('open');
      // Devolve o foco ao botão (ele pode ter sido remontado se o idioma mudou).
      document.querySelector<HTMLElement>('[data-abre-preferencias]')?.focus();
    }
  }, [abertoAgora]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={fecharPreferencias}
      onCancel={fecharPreferencias}
      onClick={(e) => {
        // Clique no fundo escuro fecha.
        if (e.target === e.currentTarget) fecharPreferencias();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border-0 bg-bg p-0 text-ink backdrop:bg-dark/45"
    >
      {abertoAgora && (
        <div className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <h2 id={tituloId} className="flex items-center gap-2.5 text-section md:text-section-lg">
              <Icon name="acessibilidade" size={28} />
              {t('Acessibilidade e idioma')}
            </h2>
            <button
              type="button"
              onClick={fecharPreferencias}
              aria-label={t('Fechar')}
              className="flex size-12 flex-none items-center justify-center rounded-full bg-surface hover:bg-peony"
            >
              <Icon name="fechar" />
            </button>
          </div>
          <p className="text-muted">{t('Fica salvo neste aparelho.')}</p>
          <OpcoesPreferencias />
        </div>
      )}
    </dialog>
  );
}
