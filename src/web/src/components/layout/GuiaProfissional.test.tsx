import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { GuiaProfissional } from './GuiaProfissional';
import { violacoes } from '../../test/axe';

beforeEach(() => sessionStorage.clear());
describe('orientação por perfil', () => {
  it.each(['/escola/perfil', '/clinico/perfil', '/admin/perfil'])('oferece orientação específica e acessível em %s', async (perfilTo) => {
    const { container } = render(<GuiaProfissional conta="teste" perfilTo={perfilTo} />);
    const botao = screen.getByRole('button', { name: 'Conheça seu painel' });
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    if (perfilTo.startsWith('/clinico')) expect(screen.getByText(/Este painel não recebe alertas escolares/)).toBeInTheDocument();
    if (perfilTo.startsWith('/admin')) expect(screen.getByText(/Este perfil não consulta sessões/)).toBeInTheDocument();
    if (perfilTo.startsWith('/escola')) expect(screen.getByText(/Em Alertas, acompanhe os pedidos/)).toBeInTheDocument();
    expect(await violacoes(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
  });
  it('lembra o fechamento na visita sem esconder o guia de outra conta', () => {
    render(<GuiaProfissional conta="a" perfilTo="/escola/perfil" />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));cleanup();
    render(<GuiaProfissional conta="a" perfilTo="/escola/perfil" />);
    expect(screen.getByRole('button', { name: 'Conheça seu painel' })).toHaveAttribute('aria-expanded', 'false');cleanup();
    render(<GuiaProfissional conta="b" perfilTo="/escola/perfil" />);
    expect(screen.getByRole('button', { name: 'Conheça seu painel' })).toHaveAttribute('aria-expanded', 'true');
  });
});
