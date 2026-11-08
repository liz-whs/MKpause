import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());
function abrir(url = '/estudante/atividades') {
  const router = createMemoryRouter(rotas, { initialEntries: [url] });
  const resultado = render(<RouterProvider router={router} />);
  return { ...resultado, router };
}

it.each([
  ['respire & pause', 'respiracao'],
  ['piano pause', 'pianopause'],
  ['mk potion', 'mkpotion'],
  ['mk connection', 'mkconnection'],
  ['mk breath', 'video'],
  ['spiral pause', 'espiral'],
  ['chinchilla pause', 'chinchila'],
])('%s abre e termina sem avaliações pelo catálogo', async (nome, id) => {
  const registrar = vi.spyOn(api.estudante, 'registrarSessao');
  const { router } = abrir();
  await userEvent.click(screen.getByRole('link', { name: new RegExp(nome) }));
  expect(router.state.location.pathname).toBe(`/estudante/atividades/${id}`);
  expect(screen.queryByRole('heading', { name: 'Como você está?' })).toBeNull();
  expect(screen.getByRole('heading', { name: nome })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Voltar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Feliz' })).toBeNull();
  if (id === 'pianopause') expect(await screen.findByTitle('Jogo piano pause')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
  expect(router.state.location.pathname).toBe('/estudante/atividades');
  expect(screen.getByRole('heading', { name: 'Atividades' })).toBeInTheDocument();
  expect(registrar).not.toHaveBeenCalled();
});

it('o acesso direto à atividade livre também funciona sem humor inicial', () => {
  const { router } = abrir('/estudante/atividades/respiracao');
  expect(router.state.location.pathname).toBe('/estudante/atividades/respiracao');
  expect(screen.getByRole('heading', { name: 'respire & pause' })).toBeInTheDocument();
});

it('o uso livre não altera uma sessão guiada que estava em andamento', async () => {
  const anterior = { antes: 'ansioso', atividade: 'respiracao' };
  sessionStorage.setItem('mkpause:estudante:v2:est-1', JSON.stringify({ sessao: anterior }));
  abrir('/estudante/atividades/respiracao');
  await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
  expect(JSON.parse(sessionStorage.getItem('mkpause:estudante:v2:est-1')!).sessao).toEqual(anterior);
});

it('uma atividade indisponível não abre por atalho livre', async () => {
  await api.admin.alternarConteudo('mkpotion');
  const { router } = abrir('/estudante/atividades/mkpotion');
  expect(router.state.location.pathname).toBe('/estudante/atividades');
  expect(screen.queryByTitle('Jogo mk potion')).toBeNull();
});

it('o fluxo iniciado no Início mantém avaliação inicial e final obrigatórias', async () => {
  const { router } = abrir('/estudante');
  await userEvent.click(screen.getByRole('link', { name: 'Quero fazer uma pausa, Nível 1' }));
  expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('link', { name: /respire & pause/ }));
  await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
  expect(router.state.location.pathname).toBe('/estudante/pausa/fim');
  expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
  await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  expect(await screen.findByRole('heading', { name: 'Pausa feita!' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
});
