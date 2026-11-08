import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { contagensDiarias, LinhasHumor } from './LinhasHumor';
import type { DashboardClinico } from '../../data/servidor';
import { violacoes } from '../../test/axe';

const dados: DashboardClinico = {
  estudante: { id_estudante: 1, nome: 'Teste' },
  periodo: { inicio: '2026-10-31', fim: '2026-11-02', dias: 7 },
  resumo: { sessoes_concluidas: 3, mesma_emocao: 0, terminou_leve: 3, percentual_terminou_leve: 100 },
  evolucao: [1, 2, 3].map((id) => ({ id_sessao: id, data: id === 3 ? '2026-11-02' : '2026-10-31', iniciada_em: '2026-10-31T10:00:00-03:00', humor_antes: 'ansioso', humor_depois: 'calmo' })),
  distribuicao_humor: [], atividades: [], aviso: '',
};

describe('gráfico de linhas clínico', () => {
  it('agrupa várias sessões no mesmo dia, incluindo dias sem registros na virada do mês', () => {
    expect(contagensDiarias(dados, 'calmo')).toEqual([
      { data: '2026-10-31', antes: 0, depois: 2 },
      { data: '2026-11-01', antes: 0, depois: 0 },
      { data: '2026-11-02', antes: 0, depois: 1 },
    ]);
    expect(contagensDiarias(dados, 'ansioso')[0]).toEqual({ data: '2026-10-31', antes: 2, depois: 0 });
  });
  it('permite selecionar emoção, dia e pontos pelo teclado', async () => {
    const { container } = render(<LinhasHumor dados={dados} />);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
    const botoes = screen.getByRole('group', { name: 'Emoção do gráfico' });
    await userEvent.click(within(botoes).getByRole('button', { name: 'Ansioso(a)' }));
    expect(within(botoes).getByRole('button', { name: 'Ansioso(a)' })).toHaveAttribute('aria-pressed', 'true');
    const ponto = screen.getByRole('button', { name: '31/10/2026, Antes: 2' });
    fireEvent.keyDown(ponto, { key: 'Enter' });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: '01/11/2026, Antes: 0' }), { key: 'Enter' });
    expect(screen.getByText('01/11/2026')).toBeInTheDocument();
    expect(await violacoes(container)).toEqual([]);
  });
  it('mantém pontos válidos quando o período contém apenas um dia', () => {
    const { container } = render(<LinhasHumor dados={{ ...dados, periodo: { inicio: '2026-11-02', fim: '2026-11-02', dias: 7 } }} />);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(screen.getByRole('button', { name: '02/11/2026, Depois: 1' })).toBeInTheDocument();
  });
});
