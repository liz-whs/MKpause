import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { entrarComoProfissional } from '../state/ProContext';
import { fecharFeedback } from '../state/acoes';

beforeEach(() => { api.reiniciar(); fecharFeedback(); sessionStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function abrir(url: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

it('preserva o registro durante falha e só confirma depois do servidor', async () => {
  entrarComoProfissional('pc-1');
  let recusar!: (erro: Error) => void;
  const salvar = vi.spyOn(api.clinico, 'adicionarRegistro').mockReturnValueOnce(new Promise((_r, rejeitar) => { recusar = rejeitar; }));
  abrir('/clinico/estudantes/est-1/ficha');
  const campo = screen.getByLabelText('Novo registro');
  await userEvent.type(campo, 'Acompanhamento de teste');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));
  expect(screen.getByText('Salvando…')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
  expect(campo).toHaveValue('Acompanhamento de teste');
  expect(screen.queryByText('Registro salvo na ficha.')).toBeNull();
  await act(async () => recusar(new Error('Falha de conexão. Tente novamente.')));
  expect(await screen.findByText('Falha de conexão. Tente novamente.')).toBeInTheDocument();
  expect(campo).toHaveValue('Acompanhamento de teste');
  const chave = salvar.mock.calls[0][3];
  salvar.mockResolvedValueOnce(undefined);
  await userEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));
  expect(await screen.findByText('Registro salvo na ficha.')).toBeInTheDocument();
  expect(campo).toHaveValue('');
  expect(salvar.mock.calls[1][3]).toBe(chave);
});

it.each(['/estudante', '/clinico/acompanhados', '/escola/alertas', '/admin/usuarios'])('sem login %s retorna à entrada', async (url) => {
  vi.stubEnv('MODE', 'production');
  vi.spyOn(api, 'conta').mockReturnValue(null);
  const router = abrir(url);
  await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
  expect(await screen.findByText('Entre com sua conta para continuar.')).toBeInTheDocument();
  expect(screen.queryByText('Carlos Pires')).toBeNull();
});

it('uma conta de estudante não abre a administração', async () => {
  vi.spyOn(api, 'conta').mockReturnValue({ id_usuario: 1, id_perfil: 1, perfil: 'estudante', nome_completo: 'Ana Lima', email: 'ana@teste.br' });
  const router = abrir('/admin/usuarios');
  await waitFor(() => expect(router.state.location.pathname).toBe('/estudante'));
  expect(screen.queryByRole('heading', { name: 'Usuários' })).toBeNull();
});

it('a conclusão da sessão aguarda o servidor e mantém o relato quando falha', async () => {
  sessionStorage.setItem('mkpause:estudante:v2:est-1', JSON.stringify({ sessao: { antes: 'feliz', atividade: 'respiracao' } }));
  const salvar = vi.spyOn(api.estudante, 'registrarSessao').mockRejectedValueOnce(new Error('Não conseguimos salvar a sessão.'));
  const router = abrir('/estudante/pausa/fim');
  await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
  const relato = screen.getByLabelText(/Quer contar algo/);
  await userEvent.type(relato, 'Fiquei mais calmo');
  await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  expect(await screen.findByText('Não conseguimos salvar a sessão.')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/estudante/pausa/fim');
  expect(relato).toHaveValue('Fiquei mais calmo');
  salvar.mockResolvedValueOnce(undefined);
  await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/estudante/pausa/concluida'));
});
