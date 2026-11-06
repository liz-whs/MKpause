import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { calcularSequencia, chaveDia } from '../domain/cuidados';
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
  it('os dois cards começam em zero, somam só um dia e permitem desmarcar os cuidados', async () => {
    const { router } = abrir();
    const card = () => within(screen.getByRole('region', { name: 'Sua sequência de cuidados' }));
    expect(card().getByText('0 dias')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Feito: Beber água' }));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    await act(() => router.navigate('/estudante/cuidados'));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Alongar 1 min' }));
    await userEvent.click(screen.getByRole('button', { name: 'Olhar para longe' }));
    expect(card().getByText('1 dia')).toBeInTheDocument();
    for (const nome of ['Beber água', 'Alongar 1 min', 'Olhar para longe']) {
      await userEvent.click(screen.getByRole('button', { name: nome }));
    }
    expect(card().getByText('0 dias')).toBeInTheDocument();
  });

  it('preserva os dias anteriores e não volta para cinco após reabrir ou sair da conta', () => {
    vi.setSystemTime(new Date(2026, 9, 29, 12));
    const { result, unmount } = renderHook(() => useCuidados('est-1'));
    act(() => result.current.alternarCuidado('agua'));
    for (const data of [new Date(2026, 9, 30, 12), new Date(2026, 10, 2, 12)]) {
      act(() => { vi.setSystemTime(data); fireEvent.focus(window); });
      expect(result.current.feitosHoje).toEqual([]);
      act(() => result.current.alternarCuidado('agua'));
    }
    expect(calcularSequencia(result.current.diasComCuidado, new Date())).toBe(3);
    unmount(); sessionStorage.clear();
    const reaberto = renderHook(() => useCuidados('est-1'));
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(3);
    expect(reaberto.result.current.feitosHoje).toEqual(['agua']);
    act(() => { vi.setSystemTime(new Date(2026, 10, 4, 12)); fireEvent.focus(window); });
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(0);
    act(() => reaberto.result.current.alternarCuidado('alongar'));
    expect(calcularSequencia(reaberto.result.current.diasComCuidado, new Date())).toBe(1);
    expect(reaberto.result.current.diasComCuidado.size).toBe(4);
  });

  it('separa os cuidados de cada estudante sem exibir o histórico da outra conta', () => {
    const { result, rerender } = renderHook(({ id }) => useCuidados(id), { initialProps: { id: 'est-1' } });
    act(() => result.current.alternarCuidado('agua'));
    rerender({ id: 'est-2' });
    expect(result.current.feitosHoje).toEqual([]);
    expect(result.current.diasComCuidado.size).toBe(0);
    act(() => result.current.alternarCuidado('longe'));
    rerender({ id: 'est-1' });
    expect(result.current.feitosHoje).toEqual(['agua']);
  });

  it('migra marcações antigas comprovadas e descarta os cinco dias fictícios', () => {
    sessionStorage.setItem('mkpause:estudante', JSON.stringify({
      diasComCuidado: ['2026-10-29', '2026-10-30', '2026-11-02', '2026-11-03', '2026-11-04'],
      cuidadosHoje: { '2026-11-05': ['agua'] },
    }));
    const { result, rerender } = renderHook(({ id }) => useCuidados(id), { initialProps: { id: 'est-0' } });
    expect(result.current.diasComCuidado.size).toBe(0);
    rerender({ id: 'est-1' });
    expect([...result.current.diasComCuidado]).toEqual(['2026-11-05']);
    expect(result.current.feitosHoje).toEqual(['agua']);
    rerender({ id: 'est-2' });
    expect(result.current.feitosHoje).toEqual([]);
  });

  it('atualiza o dia à meia-noite sem precisar recarregar a tela', () => {
    vi.useRealTimers(); vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 59));
    const { result, unmount } = renderHook(() => useCuidados('est-1'));
    act(() => result.current.alternarCuidado('agua'));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.feitosHoje).toEqual([]);
    expect(result.current.diasComCuidado.has('2026-11-05')).toBe(true);
    act(() => result.current.alternarCuidado('longe'));
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
