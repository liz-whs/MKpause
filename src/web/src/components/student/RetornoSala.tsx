import { useState } from 'react';
import { useEstudante } from '../../state/EstudanteContext';
import { t } from '../../i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Encerra o aviso de saída na própria página, sem uma tela intermediária. */
export function RetornoSala() {
  const { avisoSaida, voltei } = useEstudante();
  const [retornou, setRetornou] = useState(false);
  if (!avisoSaida) return retornou ? <p role="status">{t('Avisamos seu retorno.')}</p> : null;

  return <Button variant="outline" block onClick={() => {
    voltei();
    setRetornou(true);
  }}>
    <Icon name="check" size={22} />
    {t('Voltei para a sala')}
  </Button>;
}
