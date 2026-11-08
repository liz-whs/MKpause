import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rotas } from '../../router';
import { api } from '../../data/api';

function abrir(path = '/primeiro-acesso') {
  const router = createMemoryRouter(rotas, { initialEntries: [path] });
  render(<RouterProvider router={router} />); return router;
}
beforeEach(() => { sessionStorage.clear(); api.reiniciar(); });
afterEach(() => vi.restoreAllMocks());

describe('configuração inicial apenas uma vez', () => {
  it.each(['Concluir', 'Pular por agora'])('%s registra a passagem e impede repetir a tela', async (acao) => {
    const salvar = vi.spyOn(api.estudante, 'concluirPrimeiroAcesso');
    const router = abrir();
    expect(screen.queryByText('Primeiro acesso')).toBeNull();
    if (acao === 'Concluir') await userEvent.type(screen.getByRole('textbox', { name: /Como você quer/ }), 'Aninha');
    await userEvent.click(screen.getByRole('button', { name: acao }));
    await screen.findByRole('heading', { name: /Oi,/ });
    expect(salvar).toHaveBeenCalledOnce();
    expect(api.estudante.primeiroAcessoPendente()).toBe(false);
    if (acao === 'Concluir') expect(screen.getByRole('heading', { name: /Oi,/ })).toHaveTextContent('Aninha');
    await act(async () => { await router.navigate('/primeiro-acesso'); });
    expect(router.state.location.pathname).toBe('/estudante');
    expect(screen.queryByRole('heading', { name: 'Que bom ter você aqui!' })).toBeNull();
  });
  it('não fecha a configuração quando o registro falha', async () => {
    vi.spyOn(api.estudante, 'concluirPrimeiroAcesso').mockRejectedValueOnce(new Error('Falha ao guardar a configuração.'));
    const router = abrir();await userEvent.click(screen.getByRole('button', { name: 'Pular por agora' }));
    await screen.findByText('Falha ao guardar a configuração.');
    expect(router.state.location.pathname).toBe('/primeiro-acesso');
    expect(api.estudante.primeiroAcessoPendente()).toBe(true);
  });
  it('um login posterior segue para o início', async () => {
    await api.estudante.concluirPrimeiroAcesso();const router = abrir('/entrar');
    await userEvent.type(screen.getByRole('textbox', { name: 'Matrícula ou e-mail' }), 'ana@teste.br');
    await userEvent.type(document.querySelector('input[autocomplete="current-password"]')!, 'senha-teste');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('heading', { name: /Oi,/ });
    expect(router.state.location.pathname).toBe('/estudante');
  });
});
