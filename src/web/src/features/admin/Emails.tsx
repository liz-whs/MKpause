import { useCallback, useEffect, useState } from 'react';
import { chamar } from '../../data/servidor';
import { PageHeader } from '../../components/pro/Pro';
import { Button } from '../../components/ui/Button';
import { t } from '../../i18n';
import { situacaoConvite } from '../../domain/convites';

interface Caixa { caixa_local: boolean; emails: {id:number; para:string; tipo:string; status:string; tentativas:number; erro:string|null}[] }

export function AdminEmails() {
  const [caixa, setCaixa] = useState<Caixa>();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const carregar = useCallback(async () => {
    try { setCaixa(await chamar<Caixa>('GET', 'admin/emails/')); }
    catch (e) { setErro((e as Error).message); }
  }, []);
  useEffect(() => {void carregar();}, [carregar]);
  async function processar() {
    setOcupado(true); setErro('');
    try { await chamar('POST', 'admin/emails/'); await carregar(); }
    catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }
  return <>
    <PageHeader titulo={t('E-mails')} descricao={t('Acompanhe os convites e avisos na fila de envio.')} />
    {caixa?.caixa_local && <p role="note">{t('Modo local: o e-mail fica na caixa de testes e não é entregue na internet.')}</p>}
    <div className="flex flex-wrap gap-3"><Button disabled={ocupado} onClick={processar}>{t('Processar fila de e-mails')}</Button>
      <Button variant="outline" onClick={carregar}>{t('Atualizar')}</Button></div>
    {erro && <p role="alert">{erro}</p>}
    <ul className="flex flex-col gap-3">{caixa?.emails.map((e) => <li key={e.id} className="rounded-card bg-surface p-4">
      <strong>{e.para}</strong><p>{e.tipo === 'CONVITE' ? t('Convite') : t('Alerta')} · {situacaoConvite(e.status)} · {t('Tentativas')}: {e.tentativas}</p>
      {e.erro && <p>{t('Falha no envio. Confira a configuração de e-mail.')}</p>}
    </li>)}</ul>
  </>;
}
