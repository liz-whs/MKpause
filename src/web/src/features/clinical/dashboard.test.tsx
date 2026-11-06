import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../../router';
import { api } from '../../data/api';
import * as servidor from '../../data/servidor';
import { entrarComoProfissional } from '../../state/ProContext';
import { violacoes } from '../../test/axe';
import { Dashboard } from './Dashboard';

function dados(dias: servidor.PeriodoDashboard = 14): servidor.DashboardClinico {
  return {
    estudante: { id_estudante: 1, nome: 'Ana Lima' },
    periodo: { dias, inicio: '2026-10-23', fim: '2026-11-05' },
    resumo: { sessoes_concluidas: 2, mesma_emocao: 1, terminou_leve: 1, percentual_terminou_leve: 50 },
    evolucao: [
      { id_sessao: 81, data: '2026-11-05', iniciada_em: '2026-11-05T10:00:00-03:00', humor_antes: 'ansioso', humor_depois: 'calmo' },
      { id_sessao: 82, data: '2026-11-05', iniciada_em: '2026-11-05T11:00:00-03:00', humor_antes: 'cansado', humor_depois: 'cansado' },
    ],
    distribuicao_humor: (['feliz', 'calmo', 'ansioso', 'triste', 'irritado', 'cansado'] as const).map((emocao) => ({ emocao, antes: Number(emocao === 'ansioso' || emocao === 'cansado'), depois: Number(emocao === 'cansado' || emocao === 'calmo') })),
    atividades: [{ tipo: 'RESPIRACAO', quantidade: 1 }, { tipo: 'JOGO', quantidade: 1 }, { tipo: 'VIDEO', quantidade: 0 }],
    aviso: 'Indicadores descritivos de autorrelato; não constituem diagnóstico.',
  };
}

function abrir(id = 'est-1') {
  const router = createMemoryRouter(rotas, { initialEntries: [`/clinico/estudantes/${id}`] });
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  sessionStorage.clear();
  api.reiniciar();
  entrarComoProfissional('pc-1');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('cliente HTTP V5', () => {
  it('envia o ID numérico, período, cookie e sinal de cancelamento', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(dados(30)));
    vi.stubGlobal('fetch', fetch);
    const controle = new AbortController();
    await expect(servidor.dashboardClinico('est-1', 30, controle.signal)).resolves.toEqual(dados(30));
    expect(fetch).toHaveBeenCalledWith('/api/estudantes/1/dashboard/?dias=30', expect.objectContaining({
      method: 'GET', credentials: 'same-origin', signal: controle.signal,
    }));
  });

  it('preserva a recusa de autorização sem usar simulação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail: 'Vínculo revogado.' }, { status: 403 })));
    await expect(servidor.dashboardClinico('est-1', 14)).rejects.toMatchObject({ status: 403, message: 'Vínculo revogado.' });
  });

  it.each([null, { ...dados(), estudante: { id_estudante: 2 } }, dados(7)])('recusa resposta incompatível: %j', async (resposta) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(resposta)));
    await expect(servidor.dashboardClinico('est-1', 14)).rejects.toThrow('Não foi possível carregar');
  });
});

describe('painel V5 integrado à área clínica', () => {
  it('aguarda a autorização da API antes de exibir dados privados', async () => {
    let resolver!: (valor: servidor.DashboardClinico) => void;
    vi.spyOn(servidor, 'dashboardClinico').mockReturnValue(new Promise((r) => { resolver = r; }));
    abrir();
    expect(screen.getByText('Carregando gráficos do estudante…')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('heading', { name: 'Ana L.' })).toBeNull();
    expect(screen.queryByText('Observações da escola')).toBeNull();
    await act(async () => resolver(dados()));
    expect(screen.getByRole('heading', { name: 'Ana L.' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sessões e registros de humor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ficha de acompanhamento' })).toBeInTheDocument();
  });

  it('mantém sessões do mesmo dia distintas e disponibiliza tabela acessível', async () => {
    vi.spyOn(servidor, 'dashboardClinico').mockResolvedValue(dados());
    const { container } = abrir();
    await screen.findByRole('heading', { name: 'Evolução por sessão' });
    expect(screen.getByText(/Não existe escala de intensidade entre emoções/)).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Registros individuais do período selecionado' });
    expect(within(tabela).getAllByRole('row')).toHaveLength(3);
    expect(within(tabela).getAllByText(/2026-11-05/)).toHaveLength(2);
    expect(await violacoes(container)).toEqual([]);
  });

  it('consulta os quatro períodos e usa os valores retornados pelo servidor', async () => {
    const consultar = vi.spyOn(servidor, 'dashboardClinico').mockImplementation(async (_, dias) => dados(dias));
    abrir();
    await screen.findByText('50%');
    for (const dias of [7, 30, 90, 14]) {
      await userEvent.selectOptions(screen.getByLabelText('Período dos gráficos'), String(dias));
      await waitFor(() => expect(consultar).toHaveBeenLastCalledWith('est-1', dias, expect.any(AbortSignal)));
      await screen.findByText('50%');
    }
  });

  it('cancela a consulta anterior e ignora uma resposta atrasada', async () => {
    let resolver!: (valor: servidor.DashboardClinico) => void;
    const consultar = vi.spyOn(servidor, 'dashboardClinico')
      .mockReturnValueOnce(new Promise((r) => { resolver = r; }))
      .mockResolvedValue(dados(7));
    abrir();
    const sinal = consultar.mock.calls[0][2]!;
    await userEvent.selectOptions(screen.getByLabelText('Período dos gráficos'), '7');
    await screen.findByText('50%');
    expect(sinal.aborted).toBe(true);
    const antigo = dados(); antigo.resumo.percentual_terminou_leve = 99;
    await act(async () => resolver(antigo));
    expect(screen.queryByText('99%')).toBeNull();
    expect(screen.getByLabelText('Período dos gráficos')).toHaveValue('7');
  });

  it('oculta dados e histórico quando a revalidação recebe 403', async () => {
    vi.spyOn(servidor, 'dashboardClinico').mockResolvedValueOnce(dados())
      .mockRejectedValue(new servidor.ErroApi(403, 'Vínculo revogado.'));
    abrir();
    await screen.findByText('50%');
    fireEvent.focus(window);
    expect(await screen.findByRole('alert')).toHaveTextContent('Vínculo revogado.');
    expect(screen.queryByText('50%')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ana L.' })).toBeNull();
    expect(screen.queryByText('Observações da escola')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ficha de acompanhamento' })).toBeNull();
  });

  it('permite tentar novamente após falha de rede, sem preencher com mocks', async () => {
    vi.spyOn(servidor, 'dashboardClinico').mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(dados());
    abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os gráficos. Tente novamente.');
    expect(screen.queryByText('50%')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar gráficos' }));
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('não consulta estudante sem vínculo local', () => {
    const consultar = vi.spyOn(servidor, 'dashboardClinico');
    const { router } = abrir('est-6');
    expect(router.state.location.pathname).toBe('/clinico/acompanhados');
    expect(consultar).not.toHaveBeenCalled();
  });

  it('distingue ausência de percentual de um percentual real de zero', () => {
    const vazio = dados();
    vazio.resumo = { sessoes_concluidas: 0, humor_aumentou: 0, humor_manteve: 0, humor_diminuiu: 0, percentual_aumento: null };
    vazio.evolucao = [];
    const { rerender } = render(<Dashboard dados={vazio} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma sessão concluída');
    const zero = dados(); zero.resumo.percentual_aumento = 0;
    rerender(<Dashboard dados={zero} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('—')).toBeNull();
  });
});
