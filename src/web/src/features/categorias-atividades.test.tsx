import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { definirPreferencias } from '../preferencias/preferencias';
import { violacoes } from '../test/axe';

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); definirPreferencias({ idioma: 'pt-BR' }); });
afterEach(() => definirPreferencias({ idioma: 'pt-BR' }));
function abrir(url = '/estudante/atividades') {
  const router = createMemoryRouter(rotas, { initialEntries: [url] });
  return { router, ...render(<RouterProvider router={router} />) };
}
const lista = () => within(screen.getByRole('list', { name: 'Atividades' }));

it('mostra um card de filtros sem ícones e os sete nomes novos, sem títulos de grupos', async () => {
  const { container } = abrir();
  const filtros = screen.getByRole('group', { name: 'Filtrar por tipo' });
  expect(within(filtros).getAllByRole('button')).toHaveLength(4);
  expect(filtros.querySelector('svg')).toBeNull();
  expect(within(filtros).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('heading', { name: 'Vídeos' })).toBeNull();
  for (const nome of ['mk breath', 'mk potion', 'mk connection', 'piano pause', 'chinchilla pause', 'spiral pause', 'respire & pause']) {
    expect(lista().getByRole('link', { name: new RegExp(nome) })).toBeInTheDocument();
  }
  expect(lista().getAllByRole('link')).toHaveLength(7);
  expect(await violacoes(container)).toEqual([]);
});

it('filtra por clique e combina a categoria com a busca', async () => {
  abrir();
  await userEvent.click(screen.getByRole('button', { name: 'Jogos' }));
  expect(lista().getAllByRole('link')).toHaveLength(3);
  expect(lista().queryByRole('link', { name: /chinchilla pause/ })).toBeNull();
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar atividades' }), 'mk potion');
  expect(lista().getAllByRole('link')).toHaveLength(1);
  await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar atividades' }));
  await userEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
  expect(lista().getAllByRole('link')).toHaveLength(1);
  expect(lista().getByRole('link', { name: /respire & pause/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
  expect(lista().getAllByRole('link')).toHaveLength(7);
});

it('oferece o card durante a pausa e conserva a recomendação e o destino da atividade', async () => {
  const { router } = abrir('/estudante/pausa');
  await userEvent.click(screen.getByRole('button', { name: 'Ansioso(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Vídeos' }));
  expect(lista().getAllByRole('link')).toHaveLength(3);
  await userEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
  expect(lista().getByText('Para você')).toBeInTheDocument();
  await userEvent.click(lista().getByRole('link', { name: /respire & pause/ }));
  expect(router.state.location.pathname).toBe('/estudante/pausa/respiracao');
  expect(screen.getByRole('heading', { name: 'respire & pause' })).toBeInTheDocument();
});

it('filtra os conteúdos administrativos e mantém o controle de disponibilidade', async () => {
  const { router } = abrir('/admin/conteudos');
  await userEvent.click(screen.getByRole('button', { name: 'Vídeos' }));
  expect(lista().getAllByRole('switch')).toHaveLength(3);
  const disponivel = lista().getByRole('switch', { name: 'mk breath: disponível para estudantes' });
  await userEvent.click(disponivel);
  expect(disponivel).toHaveAttribute('aria-checked', 'false');
  await act(async () => { await router.navigate('/estudante/atividades'); });
  expect(lista().queryByRole('link', { name: /mk breath/ })).toBeNull();
  expect(lista().getAllByRole('link')).toHaveLength(6);
});

it('mantém o card e informa quando a categoria selecionada está vazia', async () => {
  for (const id of ['pianopause', 'mkpotion', 'mkconnection'] as const) await api.admin.alternarConteudo(id);
  abrir();
  await userEvent.click(screen.getByRole('button', { name: 'Jogos' }));
  expect(lista().queryAllByRole('link')).toHaveLength(0);
  expect(screen.getByRole('status')).toHaveTextContent('Nenhuma atividade encontrada.');
  expect(screen.getByRole('button', { name: 'Vídeos' })).toBeInTheDocument();
});

it.each([
  ['en', 'Videos', 'Games', 'Exercises'],
  ['es', 'Videos', 'Juegos', 'Ejercicios'],
] as const)('filtra em %s sem traduzir os nomes das atividades', async (idioma, videos, jogos, exercicios) => {
  definirPreferencias({ idioma });
  abrir();
  await userEvent.click(screen.getByRole('button', { name: videos }));
  expect(screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/estudante/pausa')).toHaveLength(3);
  await userEvent.click(screen.getByRole('button', { name: jogos }));
  expect(screen.getByRole('link', { name: /mk connection/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: exercicios }));
  expect(screen.getByRole('link', { name: /respire & pause/ })).toBeInTheDocument();
});
