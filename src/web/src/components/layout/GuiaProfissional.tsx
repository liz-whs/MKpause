import { useId, useState } from 'react';
import { Icon } from '../ui/Icon';
import { t } from '../../i18n';

const ESCOLA = [
  'Em Alertas, acompanhe os pedidos de apoio dos estudantes vinculados a você.',
  'Em Avisos de saída, acompanhe as saídas e os retornos informados pelos estudantes.',
  'Em Estudantes, consulte pausas e humores e registre observações escolares. Os registros clínicos não ficam disponíveis neste painel.',
];
const CLINICO = [
  'Em Acompanhados, abra um estudante vinculado para consultar o histórico e os gráficos de humor.',
  'Na Ficha de acompanhamento, registre informações clínicas. As observações da escola são somente para leitura.',
  'Este painel não recebe alertas escolares. O acesso depende de um vínculo autorizado com o estudante.',
];
const ADMIN = [
  'Gerencie cadastros, vínculos e códigos de cadastro nos menus da administração.',
  'Nos Indicadores da escola, consulte apenas os números agregados disponíveis; grupos pequenos são protegidos.',
  'Este perfil não consulta sessões, humores individuais, observações ou registros clínicos.',
];

export function GuiaProfissional({ conta, perfilTo }: { conta: string; perfilTo: string }) {
  const chave = `mkpause:guia-painel-v1:${conta}:${perfilTo}`;
  const [aberto, setAberto] = useState(() => { try { return sessionStorage.getItem(chave) !== 'visto'; } catch { return true; } });
  const id = useId();
  const linhas = perfilTo.startsWith('/clinico') ? CLINICO : perfilTo.startsWith('/admin') ? ADMIN : ESCOLA;
  function alternar(valor: boolean) {
    setAberto(valor);
    if (!valor) { try { sessionStorage.setItem(chave, 'visto'); } catch { /* O guia continua utilizável sem armazenamento. */ } }
  }
  return <section className="rounded-card border border-line bg-surface p-4" aria-label={t('Guia do seu painel')}>
    <button type="button" aria-expanded={aberto} aria-controls={id} onClick={() => alternar(!aberto)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold">
      {t('Conheça seu painel')}<Icon name="seguir" className={aberto ? 'rotate-90' : ''} />
    </button>
    <div id={id} hidden={!aberto}>
      <ul className="flex list-disc flex-col gap-2 py-3 pl-5 text-caption text-muted">{linhas.map((linha) => <li key={linha}>{t(linha)}</li>)}</ul>
      <button type="button" onClick={() => alternar(false)} className="min-h-11 rounded-pill bg-ink px-4 text-caption font-semibold text-surface hover:bg-muted">{t('Entendi')}</button>
    </div>
  </section>;
}
