import { useSyncExternalStore } from 'react';
import { aoMudarModo, emSimulacao } from '../../data/codigos';
import { Icon } from './Icon';
import { t } from '../../i18n';

/** Verdadeiro enquanto os códigos estão sendo simulados (backend ainda sem as rotas). */
export function useSimulacao() {
  return useSyncExternalStore(aoMudarModo, emSimulacao, emSimulacao);
}

/**
 * Aviso mostrado nas telas de códigos enquanto o backend não tem as rotas
 * (docs/codigos-de-acesso.md). Nos testes não aparece.
 */
export function AvisoSimulacao() {
  const simulando = useSimulacao();
  if (!simulando || import.meta.env.MODE === 'test') return null;
  return (
    <p role="note" className="flex items-start gap-2.5 rounded-[18px] bg-sky px-4 py-3 text-caption font-semibold">
      <Icon name="info" size={20} className="mt-0.5 flex-none" />
      {t('Simulação: o servidor ainda não tem os códigos. Eles ficam só neste navegador e nada é salvo no banco.')}
    </p>
  );
}
