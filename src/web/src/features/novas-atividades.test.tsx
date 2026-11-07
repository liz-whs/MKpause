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
])('integra %s ao filtro, humor inicial e atividade da pausa', async (nome, filtro, id) => {
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/atividades'] });
  const { container } = render(<RouterProvider router={router} />);
  await userEvent.click(screen.getByRole('button', { name: filtro }));
  await userEvent.click(screen.getByRole('link', { name: new RegExp(nome) }));
  expect(router.state.location.pathname).toBe('/estudante/pausa');
  await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(router.state.location.pathname).toBe(`/estudante/pausa/${id}`);
  if (id === 'mkconnection') {
    expect(await screen.findByTitle('Jogo mk connection')).toHaveAttribute('src', '/jogos/mkconnection/index.html?mkpause=1&estudante=est-1');
    expect(screen.getByRole('link', { name: 'Terminei' })).toHaveAttribute('href', '/estudante/pausa/fim');
  } else {
    const video = container.querySelector('video')!;
    expect(video.loop).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.querySelector('source')?.getAttribute('src')).toContain(`/videos/${id}-`);
    if (id === 'chinchila') {
      expect(video.querySelector('source')?.getAttribute('src')).toMatch(/\?v=10$/);
      expect(video.getAttribute('poster')).toMatch(/\?v=10$/);
    }
    expect(container.querySelector('main')).not.toHaveClass('max-w-2xl');
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' })).toBeInTheDocument();
  }
});
