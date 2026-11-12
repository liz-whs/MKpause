import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { entrarComoProfissional } from '../state/ProContext';

function abrir(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

beforeEach(() => {
  sessionStorage.clear();
  api.reiniciar();
});

async function concluirPausa(relato: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('link', { name: /respire & pause/ }));
  await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
  if (relato) await userEvent.type(screen.getByRole('textbox', { name: /Quer contar algo/ }), relato);
  await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
  await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
}

describe('confirmações para o estudante', () => {
  it('nível 2: confirma que o professor foi avisado', async () => {
    abrir('/estudante/aviso-de-saida');
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    expect(await screen.findByText('Seu professor foi avisado da sua saída.')).toBeInTheDocument();
  });

  it('a tela de saída não lista os profissionais vinculados', () => {
    abrir('/estudante/aviso-de-saida');
    expect(screen.queryByText('Marcos Prado')).toBeNull();
  });

  it('confirma o registro da observação quando o estudante escreve algo', async () => {
    abrir('/estudante/pausa');
    await concluirPausa('Ajudou bastante');
    expect(await screen.findByText('Sua observação foi registrada.')).toBeInTheDocument();
  });

  it('não confirma observação quando o campo fica vazio', async () => {
    abrir('/estudante/pausa');
    await concluirPausa('');
    expect(await screen.findByRole('heading', { name: 'Pausa feita!' })).toBeInTheDocument();
    expect(screen.queryByText('Sua observação foi registrada.')).toBeNull();
  });
});

describe('retorno para a sala', () => {
  it('recupera o aviso aberto no servidor quando esta aba não o conhece', async () => {
    // Saída avisada em outra aba (ou antes de sair da conta): nada guardado nesta aba.
    await api.estudante.avisarSaida('est-1', 'Pátio');
    sessionStorage.clear();
    abrir('/estudante');
    await userEvent.click(await screen.findByRole('button', { name: 'Voltei para a sala' }));
    expect(api.estudante.avisoAberto()).toBeNull();
  });

  it('o painel só mostra como fora da sala os avisos de hoje', () => {
    entrarComoProfissional('prof-1');
    const antigo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    api.vincularLocal('est-1', 'prof-1');
    void api.estudante.avisarSaida('est-1');
    const aviso = api.escola.avisos('prof-1').find((a) => a.estudanteId === 'est-1')!;
    aviso.desde = antigo;
    abrir('/escola/avisos');
    const fora = screen.getByRole('heading', { name: 'Fora da sala agora' }).closest('section')!;
    expect(within(fora).queryByText(/Ana L\./)).toBeNull();
  });
});

describe('alertas e conteúdos', () => {
  it('o profissional encerra um alerta depois de confirmar', async () => {
    entrarComoProfissional('pe-1');
    const antes = api.escola.alertas('pe-1').length;
    expect(antes).toBeGreaterThan(0);
    abrir('/escola/alertas');
    await userEvent.click(screen.getAllByRole('button', { name: 'Encerrar alerta' })[0]);
    expect(api.escola.alertas('pe-1')).toHaveLength(antes);
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(api.escola.alertas('pe-1')).toHaveLength(antes - 1);
  });

  it('observação pode ser registrada para estudante sem alertas', async () => {
    const semAlerta = api.escola.estudantes('pe-1').find((e) => !api.escola.alertas('pe-1').some((a) => a.estudanteId === e.id))!;
    await api.escola.adicionarObservacao('pe-1', semAlerta.id, 'Conversamos no intervalo.');
    expect(api.escola.observacoes('pe-1', semAlerta.id).map((o) => o.texto)).toContain('Conversamos no intervalo.');
  });
});

describe('atualização automática do painel da escola', () => {
  it('busca as novidades a cada 20 segundos, menos com a aba escondida', () => {
    vi.useFakeTimers();
    const atualizar = vi.spyOn(api, 'atualizarEmSegundoPlano').mockResolvedValue(undefined);
    try {
      entrarComoProfissional('prof-1');
      abrir('/escola/avisos');
      act(() => { vi.advanceTimersByTime(20_000); });
      expect(atualizar).toHaveBeenCalledTimes(1);
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      act(() => { vi.advanceTimersByTime(20_000); });
      expect(atualizar).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      atualizar.mockRestore();
      vi.useRealTimers();
    }
  });
});
