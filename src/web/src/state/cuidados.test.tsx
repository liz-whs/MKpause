import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { calcularSequencia, chaveDia, cuidadosDoDia } from '../domain/cuidados';
import { useCuidados } from './cuidados';

const hoje = () => new Date(2026, 10, 5, 12);
beforeEach(() => {
  sessionStorage.clear(); api.reiniciar();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(hoje());
});
afterEach(() => vi.useRealTimers());

function abrir(caminho = '/estudante') {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  return { router, ...render(<RouterProvider router={router} />) };
}

describe('sequência real de cuidados', () => {
  it('os dois cards contam o dia e cuidados concluídos permanecem marcados', async () => {
    const { router } = abrir();
    const card = () => within(screen.getByRole('region', { name: 'Sua sequência de cuidados' }));
    expect(card().getByText('0 dias')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: `Feito: ${cuidadosDoDia(chaveDia(hoje()), 'est-1')[0].label}` }));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    await act(() => router.navigate('/estudante/cuidados'));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Alongar 1 min' }));
    await userEvent.click(screen.getByRole('button', { name: 'Olhar para longe' }));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    for (const nome of ['Beber água', 'Alongar 1 min', 'Olhar para longe']) {
      const botao = screen.getByRole('button', { name: nome });
      await userEvent.click(botao);
      expect(botao).toBeDisabled();
      await userEvent.click(botao);
      expect(botao).toHaveAttribute('aria-pressed', 'true');
    }
    expect(card().getByText('1 dia')).toBeInTheDocument();
  });

  it('preserva os dias anteriores e não volta para cinco após reabrir ou sair da conta', () => {
    vi.setSystemTime(new Date(2026, 9, 29, 12));
    const { result, unmount } = renderHook(() => useCuidados('est-1'));
    act(() => result.current.concluirCuidado('agua'));
    for (const data of [new Date(2026, 9, 30, 12), new Date(2026, 9, 31, 12)]) {
      act(() => { vi.setSystemTime(data); fireEvent.focus(window); });
      expect(result.current.feitosHoje).toEqual([]);
      act(() => result.current.concluirCuidado('agua'));
    }
    expect(calcularSequencia(result.current.diasComCuidado, new Date())).toBe(3);
    unmount(); sessionStorage.clear();
    const reaberto = renderHook(() => useCuidados('est-1'));
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(3);
    expect(reaberto.result.current.feitosHoje).toEqual(['agua']);
    act(() => { vi.setSystemTime(new Date(2026, 10, 4, 12)); fireEvent.focus(window); });
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(0);
    act(() => reaberto.result.current.concluirCuidado('alongar'));
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(1);
    expect(reaberto.result.current.diasComCuidado.size).toBe(4);
  });

  it('separa os cuidados de cada estudante sem exibir o histórico da outra conta', () => {
    const { result, rerender } = renderHook(({ id }) => useCuidados(id), { initialProps: { id: 'est-1' } });
    act(() => result.current.concluirCuidado('agua'));
    rerender({ id: 'est-2' });
    expect(result.current.feitosHoje).toEqual([]);
    expect(result.current.diasComCuidado.size).toBe(0);
    act(() => result.current.concluirCuidado('longe'));
    rerender({ id: 'est-1' });
    expect(result.current.feitosHoje).toEqual(['agua']);
  });

  it('não atribui marcações antigas sem identificação ao próximo estudante', () => {
    sessionStorage.setItem('mkpause:estudante', JSON.stringify({
      diasComCuidado: ['2026-10-29', '2026-10-30', '2026-11-02', '2026-11-03', '2026-11-04'],
      cuidadosHoje: { '2026-11-05': ['agua'] },
    }));
    const { result, rerender } = renderHook(({ id }) => useCuidados(id), { initialProps: { id: 'est-0' } });
    expect(result.current.diasComCuidado.size).toBe(0);
    rerender({ id: 'est-1' });
    expect([...result.current.diasComCuidado]).toEqual([]);
    expect(result.current.feitosHoje).toEqual([]);
    rerender({ id: 'est-2' });
    expect(result.current.feitosHoje).toEqual([]);
  });

  it('atualiza o dia à meia-noite sem precisar recarregar a tela', () => {
    vi.useRealTimers(); vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 59));
    const { result, unmount } = renderHook(() => useCuidados('est-1'));
    act(() => result.current.concluirCuidado('agua'));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.feitosHoje).toEqual([]);
    expect(result.current.diasComCuidado.has('2026-11-05')).toBe(true);
    act(() => result.current.concluirCuidado('longe'));
    expect(calcularSequencia(result.current.diasComCuidado, new Date())).toBe(2);
    unmount();
  });

  it('acompanha atualizações de outra aba e ignora registros inválidos', () => {
    const { result } = renderHook(() => useCuidados('est-1'));
    act(() => {
      localStorage.setItem('mkpause:cuidados:v1:est-1', JSON.stringify({
        [chaveDia(hoje())]: ['agua', 'agua', 'inexistente'], '2026-02-31': ['agua'],
      }));
      fireEvent(window, new StorageEvent('storage', { key: 'mkpause:cuidados:v1:est-1' }));
    });
    expect(result.current.feitosHoje).toEqual(['agua']);
    expect(result.current.diasComCuidado.size).toBe(1);
  });
});

it('repetir a conclusão não desmarca nem duplica o cuidado', () => {
  const { result } = renderHook(() => useCuidados('est-1'));
  act(() => { result.current.concluirCuidado('agua'); result.current.concluirCuidado('agua'); });
  expect(result.current.feitosHoje).toEqual(['agua']);
});


it('cuidados fora das sugestões também podem ser concluídos e contam para a sequência', async () => {
  const { router } = abrir('/estudante/cuidados');
  const extras = within(screen.getByRole('region', { name: 'Mais ideias' }));
  const botao = extras.getAllByRole('button')[0];
  await userEvent.click(botao);
  expect(botao).toHaveAttribute('aria-pressed', 'true');
  expect(botao).toBeDisabled();
  expect(within(screen.getByRole('region', { name: 'Sua sequência de cuidados' })).getByText('1 dia')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Sugestões de hoje' })).getByText('1 de 3')).toBeInTheDocument();
  await act(() => router.navigate('/estudante'));
  expect(within(screen.getByRole('region', { name: 'Sua sequência de cuidados' })).getByText('1 dia')).toBeInTheDocument();
});

it('troca as sugestões no dia seguinte e preserva os cuidados dos dias anteriores', () => {
  const { result } = renderHook(() => useCuidados('est-1'));
  const anteriores = result.current.sugestoesHoje.map((c) => c.id);
  act(() => result.current.concluirCuidado(anteriores[0]));
  act(() => { vi.setSystemTime(new Date(2026, 10, 6, 12)); fireEvent.focus(window); });
  expect(result.current.sugestoesHoje.map((c) => c.id)).not.toEqual(anteriores);
  expect(result.current.feitosHoje).toEqual([]);
  expect(result.current.diasComCuidado.has('2026-11-05')).toBe(true);
  expect(result.current.outrosCuidados).toHaveLength(21);
});


it('o quadro aparece após concluir cuidados das duas listas e atualiza o incentivo', async () => {
  abrir('/estudante/cuidados');
  expect(screen.queryByRole('complementary', { name: 'Você cuidou de você!' })).toBeNull();
  const sugestoes = screen.getByRole('region', { name: 'Sugestões de hoje' });
  const ideias = screen.getByRole('region', { name: 'Mais ideias' });
  expect(sugestoes.parentElement).toBe(ideias.parentElement);
  const primeiro = within(sugestoes).getAllByRole('button')[0];
  const rotuloPrimeiro = primeiro.textContent!;
  await userEvent.click(primeiro);
  const quadro = screen.getByRole('complementary', { name: 'Você cuidou de você!' });
  expect(within(quadro).getByText('1 cuidado concluído hoje')).toBeInTheDocument();
  expect(within(quadro).getByText(rotuloPrimeiro)).toBeInTheDocument();
  expect(within(quadro).getByRole('status')).toHaveTextContent('Um pequeno cuidado também faz diferença.');
  const extra = within(ideias).getAllByRole('button')[0];
  await userEvent.click(extra);
  expect(within(quadro).getByText('2 cuidados concluídos hoje')).toBeInTheDocument();
  expect(within(quadro).getByRole('list', { name: 'Cuidados concluídos hoje' }).children).toHaveLength(2);
  expect(within(quadro).getByRole('status')).toHaveTextContent('Você está encontrando jeitos de cuidar de si.');
  expect(quadro.className).not.toMatch(/fixed|absolute/);
});


it('qualquer combinação de cuidados preenche a meta até três sem ultrapassá-la', async () => {
  const { router } = abrir('/estudante/cuidados');
  const ideias = within(screen.getByRole('region', { name: 'Mais ideias' }));
  const botoes = ideias.getAllByRole('button');
  const progresso = () => within(screen.getByRole('region', { name: 'Sugestões de hoje' }));
  for (let i = 0; i < 4; i++) {
    await userEvent.click(botoes[i]);
    expect(progresso().getByText(`${Math.min(i + 1, 3)} de 3`)).toBeInTheDocument();
  }
  expect(screen.getByText('4 cuidados concluídos hoje')).toBeInTheDocument();
  expect(progresso().queryByText('4 de 3')).toBeNull();
  await act(() => router.navigate('/estudante'));
  const card = within(screen.getByRole('region', { name: 'Sua sequência de cuidados' }));
  expect(card.getByText('Meta de cuidados de hoje concluída!')).toBeInTheDocument();
  expect(card.queryByRole('button', { name: /^Feito:/ })).toBeNull();
});
