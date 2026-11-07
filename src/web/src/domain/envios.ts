import { t } from '../i18n';

export function situacaoEnvio(status: string) {
  switch (status) {
    case 'PENDENTE': return t('Pendente');
    case 'PROCESSANDO': return t('Enviando…');
    case 'ENVIADA': return t('Enviado');
    case 'FALHA': return t('Falha no envio');
    case 'CANCELADA': return t('Cancelado');
    default: return status;
  }
}
