import { beforeEach, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); });

it.each([
  ['mk connection', 'Jogos', 'mkconnection'],
  ['spiral pause', 'Vídeos', 'espiral'],
  ['chinchilla pause', 'Vídeos', 'chinchila'],
])('integra %s ao catálogo livre sem avaliação de humor', async (nome, filtro, id) => {
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/atividades'] });
  const { container } = render(<RouterProvider router={router} />);
  await userEvent.click(screen.getByRole('button', { name: filtro }));
  await userEvent.click(screen.getByRole('link', { name: new RegExp(nome) }));
  expect(router.state.location.pathname).toBe(`/estudante/atividades/${id}`);
  expect(screen.queryByRole('heading', { name: 'Como você está?' })).toBeNull();
  if (id === 'mkconnection') {
    expect(await screen.findByTitle('Jogo mk connection')).toHaveAttribute('src', '/jogos/mkconnection/index.html?mkpause=1&estudante=est-1');
    expect(screen.getByRole('link', { name: 'Terminar exercício' })).toHaveAttribute('href', '/estudante/atividades');
    expect(screen.queryByRole('link', { name: 'Terminei' })).toBeNull();
    expect(container.querySelector('main')).not.toHaveClass('max-w-2xl');
  } else {
    const video = container.querySelector('video')!;
    expect(video.loop).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.querySelector('source')?.getAttribute('src')).toContain(`/videos/${id}-`);
    if (id === 'chinchila') {
      expect(video.querySelector('source')?.getAttribute('src')).toMatch(/\?v=12$/);
      expect(video.getAttribute('poster')).toMatch(/\?v=12$/);
    }
    expect(container.querySelector('main')).not.toHaveClass('max-w-2xl');
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' })).toBeInTheDocument();
  }
});

it('termina mk connection guiado pela avaliação final obrigatória', async () => {
  sessionStorage.setItem('mkpause:estudante:v2:est-1', JSON.stringify({ sessao: { antes: 'calmo', atividade: 'mkconnection' } }));
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/pausa/mkconnection'] });
  render(<RouterProvider router={router} />);
  expect(screen.queryByRole('link', { name: 'Sair da pausa' })).toBeNull();
  await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
  expect(router.state.location.pathname).toBe('/estudante/pausa/fim');
  expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
});
