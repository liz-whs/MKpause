import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import * as servidor from '../data/servidor';
import { api } from '../data/api';
import { AceitarConviteResponsavel } from './onboarding/Convite';
import { ConviteResponsavel } from './admin/ConviteResponsavel';
import { AdminEmails } from './admin/Emails';
import { violacoes } from '../test/axe';

beforeEach(() => { api.reiniciar(); window.history.replaceState(null, '', '/convite-responsavel#token=token-de-teste'); });
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

function abrirPublico() {
  return render(<RouterProvider router={createMemoryRouter([{path:'*',element:<AceitarConviteResponsavel />}])} />);
}

const info = { estudante: 'Ana', responsavel: 'Rosa', termo: 'Autorizo a profissional indicada a acompanhar o estudante.', versao:'teste', expira_em:'2026-11-10T12:00:00Z' };

describe('autorização do responsável', () => {
  it('abrir não aceita; exige as duas confirmações antes de enviar o aceite', async () => {
    const chamar = vi.spyOn(servidor, 'chamar').mockResolvedValueOnce(info).mockResolvedValueOnce({status:'ACEITO'});
    const {container} = abrirPublico();
    await userEvent.click(screen.getByRole('button', {name:'Ver convite'}));
    expect(chamar).toHaveBeenCalledTimes(1);
    const aceitar = screen.getByRole('button', {name:'Aceitar autorização'});
    expect(aceitar).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Confirmo que sou responsável por este estudante.'));
    expect(aceitar).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Li e aceito a autorização acima.'));
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(aceitar);
    expect(chamar).toHaveBeenLastCalledWith('POST', 'convites-responsavel/aceitar/', {
      token:'token-de-teste', confirmo_responsabilidade:true, aceito_termo:true,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Autorização registrada.');
    expect(window.location.hash).toBe('');
  });

  it('permite recusar sem marcar as confirmações', async () => {
    const chamar = vi.spyOn(servidor, 'chamar').mockResolvedValueOnce(info).mockResolvedValueOnce({status:'RECUSADO'});
    abrirPublico();
    await userEvent.click(screen.getByRole('button', {name:'Ver convite'}));
    await userEvent.click(screen.getByRole('button', {name:'Recusar convite'}));
    expect(chamar).toHaveBeenLastCalledWith('POST', 'convites-responsavel/recusar/', expect.objectContaining({aceito_termo:false}));
    expect(await screen.findByRole('status')).toHaveTextContent('Nenhum novo vínculo foi criado.');
  });

  it('mostra a rejeição de um link inválido ou expirado', async () => {
    vi.spyOn(servidor, 'chamar').mockRejectedValue(new Error('Convite indisponível. Peça um novo à escola.'));
    abrirPublico();
    await userEvent.click(screen.getByRole('button', {name:'Ver convite'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Convite indisponível');
    expect(screen.queryByRole('button', {name:'Aceitar autorização'})).toBeNull();
  });
});

describe('administração dos convites e e-mails', () => {
  it('indicar um clínico na ficha não libera acesso antes do aceite', () => {
    const aluno = api.admin.estudantes().find((e) => !api.admin.profissionaisDe(e.id).some((p) => p.papel === 'psicologo-clinico'))!;
    const clinico = api.admin.profissionais('psicologo-clinico')[0];
    api.admin.salvarFicha({estudanteId:aluno.id,responsavel:'Rosa',parentesco:'Mãe',contato:'rosa@teste.br',inicio:'',encaminhamento:''}, clinico.id);
    expect(api.admin.ficha(aluno.id)?.clinicoIndicadoId).toBe(clinico.id);
    expect(api.admin.profissionaisDe(aluno.id).some((p) => p.id === clinico.id)).toBe(false);
  });

  it('envia o convite e distingue caixa local de entrega na internet', async () => {
    const chamar = vi.spyOn(servidor, 'chamar').mockResolvedValueOnce([]).mockResolvedValueOnce({
      id_convite:1, nome_responsavel:'Rosa', email_destino:'rosa@teste.br', status:'PENDENTE', envio:'PENDENTE',
      caixa_local:true, link_teste:'/convite-responsavel#token=teste',
    }).mockResolvedValueOnce([{id_convite:1,nome_responsavel:'Rosa',email_destino:'rosa@teste.br',status:'PENDENTE',
      envio:'PENDENTE',caixa_local:true,link_teste:'/convite-responsavel#token=teste'}]);
    const {container} = render(<main><ConviteResponsavel estudanteId="est-1" /></main>);
    await userEvent.type(screen.getByLabelText('Nome do responsável'), 'Rosa');
    await userEvent.type(screen.getByLabelText('E-mail do responsável'), 'rosa@teste.br');
    await userEvent.selectOptions(screen.getByLabelText('Psicólogo clínico'), 'pc-1');
    await userEvent.click(screen.getByRole('button', {name:'Enviar convite'}));
    expect(chamar).toHaveBeenCalledWith('POST','admin/estudantes/1/convites-responsavel/',expect.objectContaining({psicologo_clinico:1,email:'rosa@teste.br'}));
    expect(await screen.findByRole('status')).toHaveTextContent('Convite na fila');
    expect(screen.getByText(/não é entregue na internet/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'Abrir convite de teste'})).toBeInTheDocument();
    expect(await violacoes(container)).toEqual([]);
  });

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
