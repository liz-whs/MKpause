import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../data/api';
import { emSimulacao, resgate, type PedidoEnviado, type Quem } from '../../data/codigos';
import type { Profissional } from '../../domain/tipos';
import { AvisoSimulacao } from '../../components/ui/AvisoSimulacao';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { dia, hora } from '../../domain/formatos';
import { t } from '../../i18n';

function quem(eu: Profissional): Quem {
  return {
    id: eu.id,
    nome: eu.nome,
    perfil: eu.papel === 'psicologo-escolar' ? 'psicologo_escolar' : 'professor',
    detalhe: eu.detalhe,
  };
}

/**
 * Professor(a) e psicólogo(a) escolar: digitar o código que o estudante gerou.
 * O vínculo só vale depois que o estudante aceitar.
 */
export function AdicionarComCodigo({ eu }: { eu: Profissional }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviado, setEnviado] = useState<string>();
  const [ocupado, setOcupado] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoEnviado[]>([]);

  const recarregar = useCallback(async () => {
    try {
      setPedidos(await resgate.enviados(quem(eu)));
      // O aceite acontece na conta do estudante: recarrega também a lista de acompanhados.
      if (!emSimulacao()) await api.sincronizar();
    } catch {
      // Tenta de novo na próxima vez.
    }
  }, [eu.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void recarregar();
    window.addEventListener('focus', recarregar);
    return () => window.removeEventListener('focus', recarregar);
  }, [recarregar]);

  useEffect(() => {
    if (pedidos.length === 0) return;
    const intervalo = window.setInterval(() => void recarregar(), 20_000);
    return () => window.clearInterval(intervalo);
  }, [pedidos.length, recarregar]);

  async function usar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setEnviado(undefined);
    if (!codigo.trim()) {
      setErro(t('Digite o código que o estudante te passou.'));
      return;
    }
    setOcupado(true);
    try {
      const jaAcompanha = (estudanteId: string) => api.escola.estudantes(eu.id).some((x) => x.id === estudanteId);
      const r = await resgate.usar(quem(eu), codigo, jaAcompanha);
      setEnviado(
        t('Pedido enviado para {nome} ({turma}). Quando aceitar, aparece na sua lista.', {
          nome: r.estudante.primeiro_nome,
          turma: r.estudante.turma || '—',
        }),
      );
      setCodigo('');
      await recarregar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-adicionar" className="flex flex-col gap-3 rounded-card-lg bg-surface p-4.5 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-lavender">
          <Icon name="chave" size={22} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="titulo-adicionar" className="text-button font-semibold">
            {t('Adicionar estudante com código')}
          </h2>
          <p className="text-caption text-muted">{t('Peça o código ao estudante: ele gera no Perfil dele e confirma antes de você ver qualquer dado.')}</p>
        </div>
      </div>
      <AvisoSimulacao />
      <form noValidate onSubmit={usar} className="flex flex-wrap items-end gap-3">
        <Field
          label={t('Código do estudante')}
          placeholder="XXX-XXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          error={erro}
          className="min-w-0 flex-[1_1_220px] [&_input]:font-mono [&_input]:tracking-widest"
        />
        <Button type="submit" disabled={ocupado} aria-busy={ocupado}>
          {t('Enviar pedido')}
        </Button>
      </form>
      {enviado && (
        <p role="status" className="flex items-start gap-2.5 rounded-[18px] bg-leaf px-4 py-3 font-semibold">
          <Icon name="check" size={20} className="mt-0.5 flex-none" />
          {enviado}
        </p>
      )}
      {pedidos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-caption font-semibold text-muted">{t('Aguardando o estudante aceitar')}</h3>
          <ul className="flex flex-col gap-1.5">
            {pedidos.map((p) => (
              <li key={p.id_codigo_vinculo} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-bg px-3.5 py-2.5">
                <strong>{p.estudante.primeiro_nome}</strong>
                <span className="text-caption text-muted">{p.estudante.turma}</span>
                <span className="ml-auto text-caption text-muted">
                  {t('enviado {dia}, {hora}', { dia: dia(p.resgatado_em), hora: hora(p.resgatado_em) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
