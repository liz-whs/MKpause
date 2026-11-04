import { useState, type FormEvent } from 'react';
import { chamar } from '../../data/servidor';
import { Pagina } from './Onboarding';
import { ScreenTitle } from '../../components/student/Bits';
import { Button } from '../../components/ui/Button';
import { t } from '../../i18n';

interface Info { estudante: string; responsavel: string; termo: string; versao: string; expira_em: string }

export function AceitarConviteResponsavel() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [info, setInfo] = useState<Info>();
  const [confirmo, setConfirmo] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [resposta, setResposta] = useState('');

  async function abrir(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setErro('');
    try { setInfo(await chamar<Info>('POST', 'convites-responsavel/verificar/', {token})); }
    catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }
  async function responder(aceitar: boolean) {
    setOcupado(true); setErro('');
    try {
      await chamar('POST', `convites-responsavel/${aceitar ? 'aceitar' : 'recusar'}/`,
        {token, confirmo_responsabilidade: confirmo, aceito_termo: aceito});
      setResposta(aceitar ? t('Autorização registrada.') : t('Convite recusado. Nenhum novo vínculo foi criado.'));
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }
  return <Pagina>
    <ScreenTitle>{t('Convite ao responsável')}</ScreenTitle>
    {resposta ? <p role="status">{resposta}</p> : info ? <>
      <p>{t('Convite para acompanhar {nome}', {nome:info.estudante})}</p>
      <p className="rounded-card bg-surface p-4">{info.termo}</p>
      <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
        {t('Confirmo que sou responsável por este estudante.')}</label>
      <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
        {t('Li e aceito a autorização acima.')}</label>
      <Button disabled={!confirmo || !aceito || ocupado} onClick={() => responder(true)}>{t('Aceitar autorização')}</Button>
      <Button variant="outline" disabled={ocupado} onClick={() => responder(false)}>{t('Recusar convite')}</Button>
    </> : <form onSubmit={abrir} className="flex flex-col gap-4">
      <p>{t('Leia a autorização antes de decidir. Abrir o convite não cria um vínculo.')}</p>
      <Button type="submit" disabled={ocupado || !token}>{t('Ver convite')}</Button>
      {!token && <p role="alert">{t('Use o link que recebeu por e-mail.')}</p>}
    </form>}
    {erro && <p role="alert">{erro}</p>}
  </Pagina>;
}
