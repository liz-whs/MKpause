import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as servidor from '../data/servidor';
import { AdminEmails } from './admin/Emails';

afterEach(() => vi.restoreAllMocks());
describe('fila de avisos escolares', () => {
  it('processa a fila e mostra o estado retornado pelo servidor', async () => {
    const chamar = vi.spyOn(servidor, 'chamar').mockResolvedValueOnce({caixa_local:true,emails:[]})
      .mockResolvedValueOnce({processados:1}).mockResolvedValueOnce({caixa_local:true,emails:[{
        id:1,para:'prof@teste.br',tipo:'ALERTA',status:'ENVIADA',tentativas:1,erro:null,
      }]});
    render(<main><AdminEmails /></main>);
    await screen.findByText(/não é entregue na internet/);
    await userEvent.click(screen.getByRole('button', {name:'Processar fila de e-mails'}));
    expect(chamar).toHaveBeenCalledWith('POST', 'admin/emails/');
    expect(await screen.findByText('prof@teste.br')).toBeInTheDocument();
    expect(screen.getByText(/Enviado/)).toBeInTheDocument();
  });
});
