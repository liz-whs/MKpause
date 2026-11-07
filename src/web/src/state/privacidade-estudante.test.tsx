import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { api } from '../data/api';
import { EstudanteProvider, useEstudante } from './EstudanteContext';
import { chaveEstadoEstudante, limparPausasLocais } from './armazenamentoEstudante';

function Estado() {
  const { sessao, avisoSaida, perfil, iniciarSessao } = useEstudante();
  return <>
    <output data-testid="estado">{JSON.stringify({ sessao, avisoSaida, apelido: perfil.apelido })}</output>
    <button onClick={() => iniciarSessao('calmo', 'respiracao')}>Começar</button>
  </>;
}

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

it('trocar de estudante na mesma aba não reaproveita humor, apelido ou aviso de saída', async () => {
  const conta = (id: number) => ({ id_usuario: id, id_perfil: id, nome_completo: `Conta ${id}`, email: `conta${id}@teste.br`, perfil: 'estudante' as const });
  const atual = vi.spyOn(api, 'conta').mockReturnValue(conta(1));
  sessionStorage.setItem(chaveEstadoEstudante('est-1')!, JSON.stringify({
    sessao: { antes: 'triste', atividade: 'video' }, apelido: 'Apelido privado', avisoSaida: { id: 'aviso-1', destino: 'Biblioteca' },
  }));
  const tela = () => <EstudanteProvider><Estado /></EstudanteProvider>;
  const { rerender } = render(tela());
  expect(screen.getByTestId('estado')).toHaveTextContent('Apelido privado');
  atual.mockReturnValue(conta(2));
  rerender(tela());
  expect(screen.getByTestId('estado')).not.toHaveTextContent('triste');
  expect(screen.getByTestId('estado')).not.toHaveTextContent('Biblioteca');
  expect(screen.getByTestId('estado')).not.toHaveTextContent('Apelido privado');
  act(() => screen.getByRole('button', { name: 'Começar' }).click());
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem(chaveEstadoEstudante('est-2')!)!).sessao.antes).toBe('calmo'));
  expect(JSON.parse(sessionStorage.getItem(chaveEstadoEstudante('est-1')!)!).sessao.antes).toBe('triste');
});

it('o estado antigo sem dono é descartado e logout e expiração limpam as pausas', async () => {
  sessionStorage.setItem('mkpause:estudante', JSON.stringify({ sessao: { antes: 'triste' } }));
  sessionStorage.setItem(chaveEstadoEstudante('est-1')!, '{}');
  sessionStorage.setItem(chaveEstadoEstudante('est-2')!, '{}');
  sessionStorage.setItem('preferencia-outra', 'preservada');
  limparPausasLocais('est-2');
  expect(sessionStorage.getItem('mkpause:estudante')).toBeNull();
  expect(sessionStorage.getItem(chaveEstadoEstudante('est-1')!)).toBeNull();
  expect(sessionStorage.getItem(chaveEstadoEstudante('est-2')!)).toBe('{}');
  await api.sair();
  expect(sessionStorage.getItem(chaveEstadoEstudante('est-2')!)).toBeNull();
  sessionStorage.setItem(chaveEstadoEstudante('est-1')!, '{}');
  act(() => window.dispatchEvent(new Event('mkpause:sessao-expirada')));
  expect(sessionStorage.getItem(chaveEstadoEstudante('est-1')!)).toBeNull();
  expect(sessionStorage.getItem('preferencia-outra')).toBe('preservada');
});

it('o professor não recebe sessões e humores do cache', () => {
  expect(api.escola.sessoes('prof-1', 'est-1')).toEqual([]);
  expect(api.escola.sessoes('pe-1', 'est-1').length).toBeGreaterThan(0);
});
