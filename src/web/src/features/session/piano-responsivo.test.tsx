import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../../router';
import { api } from '../../data/api';

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

it('mantém o mesmo jogo ao alternar entre as larguras de celular e computador', async () => {
  let computador = false;
  const ouvintes = new Set<() => void>();
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    get matches() { return consulta === '(min-width: 1024px)' && computador; },
    addEventListener: (_: string, ouvir: () => void) => { if (consulta === '(min-width: 1024px)') ouvintes.add(ouvir); },
    removeEventListener: (_: string, ouvir: () => void) => { ouvintes.delete(ouvir); },
  }));
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/atividades/pianopause'] });
  render(<RouterProvider router={router} />);
  const jogo = await screen.findByTitle('Jogo piano pause');
  act(() => { computador = true; ouvintes.forEach((ouvir) => ouvir()); });
  expect(screen.getByTitle('Jogo piano pause')).toBe(jogo);
  expect(jogo).toHaveAttribute('src', '/jogos/pianopause/index.html?mkpause=1');
  act(() => { computador = false; ouvintes.forEach((ouvir) => ouvir()); });
  expect(screen.getByTitle('Jogo piano pause')).toBe(jogo);
});
