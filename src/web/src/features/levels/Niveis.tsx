import { agir } from '../../state/acoes';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../../data/api';
import { DESTINOS_SAIDA } from '../../domain/tipos';
import type { EmocaoId } from '../../domain/emocoes';
import { useEstudante } from '../../state/EstudanteContext';
import { BackButton, FocusTopBar, TerminarExercicio, NomeAtividade } from '../../components/student/FocusTopBar';
import { Confirmacao, EmergencyLine, ScreenTitle, SectionTitle } from '../../components/student/Bits';
import { BreathingCircle, BreathingStage, useBreathClock, usePrefersReducedMotion } from '../../components/student/Breathing';
import { EmotionGrid } from '../../components/student/EmotionGrid';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { emocaoPorId } from '../../domain/emocoes';
import { t } from '../../i18n';

/* ───────────── Nível 2 ───────────── */

/** Aviso de saída com destino opcional e campo para um local personalizado. */
export function AvisoSaida() {
  const { avisoSaida, avisarSaida } = useEstudante();
  const [destino, setDestino] = useState<string | null>(null);
  const [outroLugar, setOutroLugar] = useState('');
  const outroSelecionado = destino === 'Outro lugar';
  const destinoInformado = outroSelecionado ? outroLugar.trim() : destino ?? undefined;
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
        {outroSelecionado && <Field
          label={t('Qual é o outro lugar?')}
          placeholder={t('Informe o local')}
          value={outroLugar}
          onChange={(evento) => setOutroLugar(evento.target.value)}
          maxLength={160}
          required
          autoFocus
        />}
      </section>
      <Button
        block
        disabled={outroSelecionado && !destinoInformado}
        onClick={() => {
          if (outroSelecionado && !destinoInformado) return;
          void agir(() => avisarSaida(destinoInformado), 'Aviso enviado à escola.');
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
 * O alerta é automático ao entrar. A respiração exige a avaliação inicial;
 * retornar para respirar mais mantém a sessão e não repete o alerta.
 */
export function AgoraRespira() {
  const { perfil, sessao, iniciarNivel3, atualizarSessao } = useEstudante();
  const [inicial, setInicial] = useState<EmocaoId | null>(null);
  const pronta = Boolean(sessao.nivel3 && sessao.antes && !sessao.concluida);
  const location = useLocation();
  const estadoRota = location.state as { semAviso?: boolean; relatoRegistrado?: boolean } | null;
  const semAviso = Boolean(estadoRota?.semAviso);
  // Veio do "Não estou bem" da pausa com algo escrito em "Quer contar algo?".
  const relatoRegistrado = Boolean(estadoRota?.relatoRegistrado);
  const reduzir = usePrefersReducedMotion();
  const { t: tempo } = useBreathClock(pronta, reduzir);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const enviou = useRef(false);

  const enviarAviso = () => {
    setFalhou(false);
    return agir(async () => {
      await api.estudante.enviarAlertaNivel3(perfil.id);
      setMostrarAviso(true);
    }, '')
      .then((ok) => { if (!ok) { enviou.current = false; setFalhou(true); } });
  };

  useEffect(() => {
    if (semAviso || enviou.current) return;
    enviou.current = true;
    void enviarAviso();
  }, [semAviso, perfil.id]);

  useEffect(() => {
    if (!mostrarAviso) return;
    const timer = window.setTimeout(() => setMostrarAviso(false), 5000);
    return () => window.clearTimeout(timer);
  }, [mostrarAviso]);

  return (
    <div className={`flex min-h-[calc(100dvh-2rem)] flex-col gap-4 ${pronta ? '' : 'mx-auto w-full max-w-2xl'}`}>
      <FocusTopBar back={pronta ? <NomeAtividade titulo="respire & pause" /> : undefined}>
        {pronta && <TerminarExercicio to="/estudante/agora/fim" onClick={() => atualizarSessao({ etapaNivel3: 'avaliacao' })} />}
      </FocusTopBar>
      {falhou && <div role="alert" className="rounded-card bg-surface p-4">
        <p>{t('O aviso ainda não foi enviado. Você pode continuar respirando e tentar novamente.')}</p>
        <Button onClick={() => { void enviarAviso(); }}>{t('Tentar enviar o aviso novamente')}</Button>
      </div>}
      {mostrarAviso && (
        <div role="status" className="flex items-center gap-2.5 rounded-card bg-surface px-4 py-3.5 font-semibold">
          <span className="flex size-7 flex-none items-center justify-center rounded-full bg-leaf">
            <Icon name="check" size={16} strokeWidth={3} />
          </span>
          {t('Aviso enviado aos profissionais vinculados que podem receber alertas.')}
        </div>
      )}
      {relatoRegistrado && !pronta && <Confirmacao>{t('Sua observação foi registrada.')}</Confirmacao>}
      {pronta ? <>
        <BreathingStage>
          <BreathingCircle t={tempo} reduzir={reduzir} tamanho={320} fluido />
        </BreathingStage>
      </> : <>
        <ScreenTitle>{t('Como você está?')}</ScreenTitle>
        <EmotionGrid value={inicial} onChange={setInicial} />
        <Button block disabled={!inicial} onClick={() => { if (inicial) iniciarNivel3(inicial); }}>
          {t('Começar respiração')}
        </Button>
      </>}
    </div>
  );
}

/** Avaliação final obrigatória da respiração de nível 3; observação opcional. */
export function VoceSeCuidou() {
  const navigate = useNavigate();
  const { sessao, atualizarSessao, concluirSessao } = useEstudante();
  const [emocao, setEmocao] = useState<EmocaoId | null>(null);
  const [relato, setRelato] = useState('');
  if (!sessao.nivel3 || !sessao.antes) return <Navigate to="/estudante/agora" replace />;
  if (sessao.concluida) return <Navigate to="/estudante/pausa/concluida" replace />;
  if (sessao.etapaNivel3 !== 'avaliacao') return <Navigate to="/estudante/agora" state={{ semAviso: true }} replace />;
  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
      <FocusTopBar />
      <div className="flex flex-col items-center gap-2.5 text-center">
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-30 object-contain" />
        <ScreenTitle>{t('Como está agora?')}</ScreenTitle>
      </div>
      <EmotionGrid value={emocao} onChange={setEmocao} />
      <Field label={t('Quer contar algo?')} optional multiline placeholder={t('Escreva aqui')}
        value={relato} onChange={(evento) => setRelato(evento.target.value)} />
      <div className="mt-auto flex flex-col gap-2.5">
        <Button block disabled={!emocao} onClick={() => {
          if (!emocao) return;
          void agir(async () => {
            await concluirSessao(relato, emocao);
            navigate('/estudante/pausa/concluida');
          }, 'Sessão concluída.');
        }}>{t('Enviar resposta')}</Button>
        <Button onClick={() => {
          atualizarSessao({ etapaNivel3: 'respiracao' });
          navigate('/estudante/agora', { state: { semAviso: true } });
        }} variant="outline" block>
          <Icon name="respiracao" size={22} />
          {t('Respirar mais')}
        </Button>
        <EmergencyLine />
      </div>
    </div>
  );
}
