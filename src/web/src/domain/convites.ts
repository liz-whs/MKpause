import { t } from '../i18n';

export function situacaoConvite(status: string) {
  switch (status) {
    case 'PENDENTE': return t('Pendente');
    case 'PROCESSANDO': return t('Enviando…');
    case 'ENVIADA': return t('Enviado');
    case 'FALHA': return t('Falha no envio');
    case 'CANCELADA': return t('Cancelado');
    case 'ACEITO': return t('Aceito');
    case 'RECUSADO': return t('Recusado');
    case 'REVOGADO': return t('Revogado');
    case 'EXPIRADO': return t('Expirado');
    default: return status;
  }
}
