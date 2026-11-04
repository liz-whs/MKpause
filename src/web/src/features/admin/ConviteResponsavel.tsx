import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../data/api';
import { chamar, idDe } from '../../data/servidor';
import type { Ficha } from '../../domain/tipos';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/pro/Pro';
import { t } from '../../i18n';
import { situacaoConvite } from '../../domain/convites';

interface Convite {
  id_convite: number; nome_responsavel: string; email_destino: string; status: string;
  envio: string; caixa_local: boolean; link_teste: string | null;
}

export function ConviteResponsavel({ estudanteId, ficha }: { estudanteId: string; ficha?: Ficha }) {
  const [nome, setNome] = useState(ficha?.responsavel ?? '');
  const [email, setEmail] = useState(ficha?.contato.match(/[^\s·]+@[^\s·]+\.[^\s·]+/)?.[0] ?? '');
  const [clinico, setClinico] = useState(ficha?.clinicoIndicadoId ?? '');
  const [lista, setLista] = useState<Convite[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const rota = `admin/estudantes/${idDe(estudanteId)}/convites-responsavel/`;
  const recarregar = useCallback(async () => {
    try { setLista(await chamar<Convite[]>('GET', rota)); await api.sincronizar(); }
    catch (e) { setErro((e as Error).message); }
  }, [rota]);
  useEffect(() => {
    void recarregar();
    window.addEventListener('focus', recarregar);
    return () => window.removeEventListener('focus', recarregar);
  }, [recarregar]);

  async function enviar(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setErro(''); setAviso('');
    try {
      const c = await chamar<Convite>('POST', rota, { nome_completo: nome, email,
        parentesco: ficha?.parentesco ?? '', psicologo_clinico: clinico ? idDe(clinico) : null });
      setLista((l) => [c, ...l.filter((anterior) => anterior.id_convite !== c.id_convite)]);
      setAviso(t('Convite na fila de e-mail. O vínculo será criado após o aceite.'));
      await recarregar();
    } catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }

  async function revogar(id: number) {
    setOcupado(true); setErro('');
    try {
      await chamar('POST', `admin/convites-responsavel/${id}/revogar/`);
      await api.sincronizar(); await recarregar();
      setAviso(t('Convite ou autorização revogado.'));
    } catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }

  return <Card as="section" aria-label={t('Responsável')} className="flex flex-col gap-3">
    <h3 className="text-button">{t('Responsável')}</h3>
    <p>{t('O responsável recebe um link, lê a autorização e aceita ou recusa. Não precisa criar conta.')}</p>
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <Field label={t('Nome do responsável')} required value={nome} onChange={(e) => setNome(e.target.value)} />
      <Field label={t('E-mail do responsável')} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <SelectField label={t('Psicólogo clínico')} value={clinico} onChange={setClinico}
        options={[{value: '', label: 'Sem psicólogo clínico'}, ...api.admin.profissionais('psicologo-clinico')
          .filter((p) => p.ativo).map((p) => ({value:p.id, label:p.nome}))]} />
      <Button type="submit" size="md" disabled={ocupado}>{t('Enviar convite')}</Button>
    </form>
    {erro && <p role="alert">{erro}</p>}
    {aviso && <p role="status">{aviso}</p>}
    <Button size="md" variant="text" onClick={recarregar}>{t('Atualizar')}</Button>
    {lista.slice(0, 5).map((c) => <div key={c.id_convite} className="flex flex-col gap-2 rounded-card bg-bg p-3">
      <strong>{c.nome_responsavel}</strong><span>{c.email_destino}</span>
      <span>{t('Situação')}: {situacaoConvite(c.status)} · {t('E-mail')}: {situacaoConvite(c.envio)}</span>
      {c.caixa_local && <p>{t('Modo local: o e-mail fica na caixa de testes e não é entregue na internet.')}</p>}
      {c.link_teste && <a href={c.link_teste} target="_blank" rel="noreferrer">{t('Abrir convite de teste')}</a>}
      {['PENDENTE', 'ACEITO'].includes(c.status) && <Button size="md" variant="outline" disabled={ocupado}
        onClick={() => revogar(c.id_convite)}>{t('Revogar convite ou autorização')}</Button>}
    </div>)}
  </Card>;
}
