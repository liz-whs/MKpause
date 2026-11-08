import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { FeedbackAcoes } from './FeedbackAcoes';
import { agir, fecharFeedback } from '../../state/acoes';

afterEach(() => { act(() => fecharFeedback()); });

it('confirmações não criam um aviso flutuante ou botão para fechar', async () => {
  render(<FeedbackAcoes />);
  await act(async () => { await agir(() => undefined, 'Aviso enviado à escola.'); });
  expect(screen.getByRole('status')).toHaveClass('sr-only');
  expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
});

it('erros continuam visíveis e podem ser fechados, sem posicionamento sobre os botões', async () => {
  render(<FeedbackAcoes />);
  await act(async () => { await agir(() => { throw new Error('Não foi possível salvar.'); }); });
  const erro = screen.getByRole('alert');
  expect(erro).toHaveTextContent('Não foi possível salvar.');
  expect(erro.className).not.toMatch(/fixed|absolute|bottom-|z-\[/);
  await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('alert')).toBeNull();
});
