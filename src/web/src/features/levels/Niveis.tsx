import { agir } from '../../state/acoes';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { api } from '../../data/api';
import { DESTINOS_SAIDA, type Alerta } from '../../domain/tipos';
import type { EmocaoId } from '../../domain/emocoes';
import { useEstudante } from '../../state/EstudanteContext';
import { BackButton, FocusTopBar } from '../../components/student/FocusTopBar';
import { EmergencyLine, PeopleList, ScreenTitle, SectionTitle } from '../../components/student/Bits';
import { BreathingCircle, useBreathClock, usePrefersReducedMotion } from '../../components/student/Breathing';
import { EmotionGrid } from '../../components/student/EmotionGrid';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { emocaoPorId } from '../../domain/emocoes';
import { t } from '../../i18n';

/* ───────────── Nível 2 ───────────── */

/** Aviso de saída: destino opcional, quem vai saber, "Avisar e sair". */
export function AvisoSaida() {
  const { avisoSaida, avisarSaida } = useEstudante();
  const [destino, setDestino] = useState<string | null>(null);
  if (avisoSaida) return <Navigate to="/estudante/pausa" replace />;

  return (
    <>
      <FocusTopBar back={<BackButton to="/estudante" />} />
      <span className="flex size-16 items-center justify-center rounded-full bg-sky">
        <Icon name="porta" size={32} />
      </span>
      <ScreenTitle>{t('Sair da sala')}</ScreenTitle>
      <section aria-labelledby="titulo-destino" className="flex flex-col gap-2">
        <SectionTitle extra={t('(opcional)')}>
          <span id="titulo-destino">{t('Para onde?')}</span>
        </SectionTitle>
        <ChoiceChips label={t('Destino')} options={DESTINOS_SAIDA} value={destino} onChange={setDestino} allowDeselect />
      </section>
      <section aria-labelledby="titulo-quem" className="flex flex-col gap-2">
        <SectionTitle>
          <span id="titulo-quem">{t('Quem vai saber')}</span>
        </SectionTitle>
        <PeopleList pessoas={api.estudante.quemAcompanha()} />
      </section>
      <Button
        block
        onClick={() => {
          void agir(() => avisarSaida(destino ?? undefined), 'Aviso enviado à escola.');
        }}
      >
        <Icon name="porta" size={22} />
        {t('Avisar e sair')}
      </Button>
    </>
  );
}

/* ───────────── Nível 3 ───────────── */

/**
 * Um toque: a respiração começa na hora, sem perguntas, e o alerta
 * vai para a escola automaticamente. "Respirar mais" e "Respirar enquanto isso"
 * chegam com { semAviso: true } para não repetir o alerta.
 */
export function AgoraRespira() {
  const { perfil } = useEstudante();
  const location = useLocation();
  const semAviso = Boolean((location.state as { semAviso?: boolean } | null)?.semAviso);
  const reduzir = usePrefersReducedMotion();
  const { t: tempo } = useBreathClock(true, reduzir);

  const [alerta, setAlerta] = useState<Alerta | null>(null);
  const [cancelado, setCancelado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const enviou = useRef(false);

  const enviarAviso = () => {
    setFalhou(false);
    return agir(async () => { setAlerta(await api.estudante.enviarAlertaNivel3(perfil.id)); }, 'Aviso enviado à escola.')
      .then((ok) => { if (!ok) { enviou.current = false; setFalhou(true); } });
  };

  useEffect(() => {
    if (semAviso || enviou.current) return;
    enviou.current = true;
    void enviarAviso();
  }, [semAviso, perfil.id]);

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
      <FocusTopBar />
      {falhou && <div role="alert" className="rounded-card bg-surface p-4">
        <p>{t('O aviso ainda não foi enviado. Você pode continuar respirando e tentar novamente.')}</p>
        <Button onClick={() => { void enviarAviso(); }}>{t('Tentar enviar o aviso novamente')}</Button>
      </div>}
      {alerta && !cancelado && (
        <div role="status" className="flex flex-col gap-1.5 rounded-card bg-surface px-4 py-3.5">
          <span className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-7 flex-none items-center justify-center rounded-full bg-leaf">
              <Icon name="check" size={16} strokeWidth={3} />
            </span>
            {t('Aviso enviado à escola')}
          </span>
          <button
            type="button"
            onClick={() => {
              void agir(async () => { await api.estudante.cancelarAlerta(alerta.id); setCancelado(true); }, '');
            }}
            className="min-h-12 self-start font-semibold underline underline-offset-4"
          >
            {t('Cancelar aviso')}
          </button>
        </div>
      )}
      {cancelado && (
        <div role="status" className="flex items-center gap-2.5 rounded-card bg-surface px-4 py-3.5 font-semibold">
          <Icon name="info" size={22} />
          {t('Aviso cancelado.')}
        </div>
      )}
      <div className="mt-2 flex justify-center">
        <BreathingCircle t={tempo} reduzir={reduzir} tamanho={320} />
      </div>
      <div className="mt-auto flex flex-col gap-2.5">
        <Button to="/estudante/agora/fim" block>
          {t('Terminei')}
        </Button>
      </div>
    </div>
  );
}

/** Você se cuidou (fim do nível 3): emoção opcional e a linha de emergência. */
export function VoceSeCuidou() {
  const [emocao, setEmocao] = useState<EmocaoId | null>(null);
  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
      <FocusTopBar />
      <div className="flex flex-col items-center gap-2.5 text-center">
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-30 object-contain" />
        <ScreenTitle>{t('Você se cuidou')}</ScreenTitle>
      </div>
      <section aria-labelledby="titulo-agora" className="flex flex-col gap-2.5">
        <SectionTitle extra={t('(opcional)')}>
          <span id="titulo-agora">{t('Como está agora?')}</span>
        </SectionTitle>
        <EmotionGrid value={emocao} onChange={(e) => setEmocao((atual) => (atual === e ? null : e))} />
      </section>
      <div className="mt-auto flex flex-col gap-2.5">
        <Button to="/estudante" block>
          {t('Início')}
        </Button>
        <Button to="/estudante/agora" state={{ semAviso: true }} variant="outline" block>
          <Icon name="respiracao" size={22} />
          {t('Respirar mais')}
        </Button>
        <EmergencyLine />
      </div>
    </div>
  );
}

