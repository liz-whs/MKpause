import { useCallback, useEffect, useState } from 'react';
import { api } from '../../data/api';
import { codigoVinculo, formatar, type CodigoVinculoAtual, type Quem, type Solicitacao } from '../../data/codigos';
import { useDados } from '../../data/useDados';
import { AvisoSimulacao } from '../../components/ui/AvisoSimulacao';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { hora } from '../../domain/formatos';
import { locale, t } from '../../i18n';

/** O estudante logado, no formato que a camada de códigos usa. */
export function useEuEstudante(): Quem {
  const perfil = useDados(() => api.estudante.perfil());
  return { id: perfil.id, nome: perfil.nome, perfil: 'estudante', turma: perfil.turma };
}

const PAPEL: Record<Solicitacao['profissional']['perfil'], string> = {
  professor: 'Professor(a)',
  psicologo_escolar: 'Psicólogo(a) escolar',
};

/**
 * Pedidos de acompanhamento esperando a resposta do estudante.
 * Confere de novo ao voltar para a aba e a cada 20 s (o pedido chega de outra pessoa).
 */
export function useSolicitacoes(eu: Quem) {
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const recarregar = useCallback(async () => {
    try {
      setLista(await codigoVinculo.solicitacoes(eu));
    } catch {
      // Sem conexão: tenta de novo na próxima vez.
    }
  }, [eu.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void recarregar();
    const id = window.setInterval(() => void recarregar(), 20_000);
    window.addEventListener('focus', recarregar);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', recarregar);
    };
  }, [recarregar]);
  return { lista, recarregar };
}

/** Cartões "X quer te acompanhar", com Aceitar e Recusar. */
export function SolicitacoesPendentes({ eu }: { eu: Quem }) {
  const { lista, recarregar } = useSolicitacoes(eu);
  const [resposta, setResposta] = useState<string>();
  const [erro, setErro] = useState<string>();

  async function responder(s: Solicitacao, aceitar: boolean) {
    setErro(undefined);
    try {
      const r = await codigoVinculo.responder(eu, s.id_codigo_vinculo, aceitar);
      if (r.simulado && r.profissionalId) api.vincularLocal(eu.id, r.profissionalId);
      if (!r.simulado) await api.sincronizar();
      setResposta(
        aceitar
          ? t('Pronto! {nome} agora acompanha você.', { nome: s.profissional.nome_completo })
          : t('Pedido recusado. {nome} não vai ver suas pausas.', { nome: s.profissional.nome_completo }),
      );
      await recarregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  if (lista.length === 0 && !resposta && !erro) return null;
  return (
    <section aria-labelledby="titulo-pedidos" className="flex flex-col gap-2.5">
      <h2 id="titulo-pedidos" className="text-section md:text-section-lg">
        {t('Pedidos para te acompanhar')}
      </h2>
      {resposta && (
        <p role="status" className="flex items-center gap-2.5 rounded-[18px] bg-leaf px-4 py-3 font-semibold">
          <Icon name="check" size={20} />
          {resposta}
        </p>
      )}
      {erro && (
        <p role="alert" className="font-semibold text-dark">
          {erro}
        </p>
      )}
      {lista.map((s) => (
        <article key={s.id_codigo_vinculo} className="flex flex-col gap-3 rounded-card-lg bg-surface p-4">
          <p>
            <strong>{s.profissional.nome_completo}</strong> ({t(PAPEL[s.profissional.perfil])}){' '}
            {t('usou o seu código e quer te acompanhar.')}
          </p>
          {s.profissional.detalhe && <p className="text-caption text-muted">{s.profissional.detalhe}</p>}
          <p className="text-caption text-muted">{t('Se aceitar, vai ver suas pausas e receber seus alertas.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="md"
              aria-label={t('Aceitar {nome}', { nome: s.profissional.nome_completo })}
              onClick={() => responder(s, true)}
            >
              {t('Aceitar')}
            </Button>
            <Button
              size="md"
              variant="outline"
              aria-label={t('Recusar {nome}', { nome: s.profissional.nome_completo })}
              onClick={() => responder(s, false)}
            >
              {t('Recusar')}
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

/** Aviso curto no Início quando há pedidos: leva ao Perfil. */
export function AvisoPedidos({ eu }: { eu: Quem }) {
  const { lista } = useSolicitacoes(eu);
  if (lista.length === 0) return null;
  return (
    <Button to="/estudante/perfil" variant="help" block className="justify-start">
      <Icon name="pessoas" size={22} />
      {lista.length === 1
        ? t('{nome} quer te acompanhar', { nome: lista[0].profissional.nome_completo })
        : t('{n} pedidos para te acompanhar', { n: lista.length })}
    </Button>
  );
}

/** "Compartilhar com quem me acompanha": gerar, ver, gerar outro, cancelar. */
export function CompartilharCodigo({ eu }: { eu: Quem }) {
  const [atual, setAtual] = useState<CodigoVinculoAtual | null>(null);
  const [erro, setErro] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    codigoVinculo
      .atual(eu)
      .then(setAtual)
      .catch(() => undefined);
  }, [eu.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function executar(acao: () => Promise<void>) {
    setErro(undefined);
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card-lg bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-lavender">
          <Icon name="chave" size={22} />
        </span>
        <div className="flex flex-col gap-0.5">
          <strong>{t('Compartilhar com quem me acompanha')}</strong>
          <span className="text-caption text-muted">
            {t('Gere um código e entregue ao professor ou psicólogo escolar. Você confirma antes de liberar.')}
          </span>
        </div>
      </div>
      <AvisoSimulacao />

      {atual ? (
        <div role="status" className="flex flex-col gap-2 rounded-card bg-peony p-4">
          {atual.codigo ? (
            <>
              <span className="text-caption font-semibold">{t('Seu código')}</span>
              <strong className="font-mono text-screen tracking-widest">{formatar(atual.codigo)}</strong>
            </>
          ) : (
            <strong>{t('Você tem um código ativo.')}</strong>
          )}
          <span className="text-caption">
            {t('Vale até {hora} de {dia}. Só pode ser usado uma vez.', {
              hora: hora(atual.expira_em),
              dia: new Date(atual.expira_em).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }),
            })}
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="md" variant="outline" disabled={ocupado} onClick={() => executar(async () => setAtual(await codigoVinculo.gerar(eu)))}>
              {t('Gerar outro')}
            </Button>
            <Button
              size="md"
              variant="text"
              disabled={ocupado}
              onClick={() =>
                executar(async () => {
                  await codigoVinculo.cancelar(eu);
                  setAtual(null);
                })
              }
            >
              {t('Cancelar código')}
            </Button>
          </div>
        </div>
      ) : (
        <Button block disabled={ocupado} onClick={() => executar(async () => setAtual(await codigoVinculo.gerar(eu)))}>
          {t('Gerar código')}
        </Button>
      )}
      {erro && (
        <p role="alert" className="font-semibold text-dark">
          {erro}
        </p>
      )}
    </div>
  );
}
