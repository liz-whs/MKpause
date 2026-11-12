import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { violacoes } from '../test/axe';
import { definirPreferencias } from '../preferencias/preferencias';

function abrir(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

beforeEach(() => {
  sessionStorage.clear();
  api.reiniciar();
});

afterEach(() => vi.restoreAllMocks());

describe('Início do estudante', () => {
  it('mostra os níveis 1, 2, 3 e não mostra pedir ajuda nem contagem de pausas', () => {
    abrir('/estudante');
    expect(screen.getAllByRole('link', { name: /, Nível \d$/ }).map((l) => l.textContent)).toEqual([
      'Quero fazer uma pausa, Nível 1',
      'Preciso sair da sala, Nível 2',
      'Não estou bem, Nível 3',
    ]);
    expect(screen.queryByRole('link', { name: 'Pedir ajuda' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/pausas?\s+(feitas|seguidas)|última pausa|histórico/i);
  });
});

describe('Nível 1', () => {
  it.each(['Ansioso(a)', 'Triste', 'Irritado(a)'])('continua a pausa com %s sem o bloco de sugestão removido', async (emocao) => {
    const { router } = abrir('/estudante/pausa');
    expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: emocao }));
    for (const texto of ['Está pesado demais?', 'Vá direto para a respiração.', 'Ir direto', 'Agora não']) {
      expect(screen.queryByText(texto)).toBeNull();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/atividade');
  });

  it('não sugere escalada para cansado', async () => {
    abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Cansado(a)' }));
    expect(screen.queryByText('Está pesado demais?')).toBeNull();
  });

  it('não tem "Pedir ajuda": se ainda não está bem, o E agora? leva ao nível 3', async () => {
    const { router } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/atividade');
    await userEvent.click(screen.getByRole('link', { name: /respire & pause/ }));
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    expect(await screen.findByRole('button', { name: 'Não estou bem' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Triste' }));
    expect(screen.queryByRole('link', { name: /Pedir ajuda/ })).toBeNull();
    expect(screen.queryByText('Ainda não está bem?')).toBeNull();
    const anteriores = new Set(api.escola.alertas('pe-1').map((a) => a.id));
    await userEvent.click(screen.getByRole('button', { name: 'Não estou bem' }));
    expect(await screen.findByRole('heading', { name: 'Como você está?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/estudante/agora');
    expect(await screen.findByText('Aviso enviado aos profissionais vinculados que podem receber alertas.')).toBeInTheDocument();
    const novos = api.escola.alertas('pe-1').filter((a) => !anteriores.has(a.id));
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ estudanteId: 'est-1', tipo: 'nivel3' });
    expect(screen.getByRole('button', { name: 'Começar respiração' })).toBeDisabled();
  });
});

describe('Nova pausa', () => {
  it('mostra respire & pause e as atividades sem duração', () => {
    abrir('/estudante/atividades');
    expect(screen.getByRole('link', { name: /respire & pause/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b\d+\s*(min|s)\b/);
  });

  it('respire & pause continua além do antigo limite e só pausa por escolha do estudante', async () => {
    definirPreferencias({ menosMovimento: true });
    abrir('/estudante/pausa');
    await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('link', { name: /respire & pause/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      act(() => vi.advanceTimersByTime(600_000));
      expect(screen.getByRole('heading', { name: 'respire & pause' })).toBeInTheDocument();
      expect(screen.queryByText(/\d{2}:\d{2}|\d+ min|Faltam/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
      act(() => vi.advanceTimersByTime(30_000));
      expect(screen.getByText('Pausado')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      expect(screen.getByRole('button', { name: 'Pausar' }).querySelector('svg')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    } finally { vi.useRealTimers(); }
  });

  it.each([false, true])('Terminar exercício encerra respire & pause e registra a sessão após o humor final (pausada: %s)', async (pausada) => {
    const { router } = abrir('/estudante/pausa');
    const quantidade = api.escola.sessoes('pe-1', 'est-1').length;
    await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('link', { name: /respire & pause/ }));
    if (pausada) {
      await userEvent.click(screen.getByRole('button', { name: 'Pausar' }));
      expect(router.state.location.pathname).toBe('/estudante/pausa/respiracao');
      expect(screen.getByText('Pausado')).toBeInTheDocument();
      expect(api.escola.sessoes('pe-1', 'est-1')).toHaveLength(quantidade);
      await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      expect(router.state.location.pathname).toBe('/estudante/pausa/respiracao');
      await userEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    }
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/fim');
    expect(screen.getByRole('heading', { name: 'E agora?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
    const sessoes = api.escola.sessoes('pe-1', 'est-1');
    expect(sessoes).toHaveLength(quantidade + 1);
    expect(sessoes[0]).toMatchObject({ atividade: 'respiracao', antes: 'calmo', depois: 'feliz' });
  });

  it('não reaproveita a atividade nem a emoção da pausa anterior', async () => {
    const { router } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('link', { name: /piano pause/ }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/pianopause');

    // Nova pausa pelo card do nível 1: começa do zero e passa pela escolha da atividade.
    await router.navigate('/estudante/pausa');
    expect(await screen.findByRole('button', { name: 'Escolha como está' })).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/atividade');
  });

  it('o piano pause abre o jogo original dentro da tela', async () => {
    const { router } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await router.navigate('/estudante/pausa/pianopause');
    expect(await screen.findByRole('link', { name: 'Terminar exercício' })).toHaveAttribute('href', '/estudante/pausa/fim');
    const jogo = screen.getByTitle('Jogo piano pause');
    expect(jogo).toHaveAttribute('src', '/jogos/pianopause/index.html?mkpause=1');
    // Na tela do jogo ele fica visível e acessível.
    expect(jogo.parentElement).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('o vídeo de respiração toca a versão do celular com instrução localizada sem legendas', async () => {
    const { router, container } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await router.navigate('/estudante/pausa/video');
    const video = await screen.findByLabelText(/Vídeo de respiração guiada/);
    expect(video).toHaveAttribute('poster', '/videos/respiracao-celular.jpg?v=5');
    expect(container.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=5');
    expect(container.querySelectorAll('track')).toHaveLength(0);
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Inspire');
  });

  it('o mk potion aparece em Jogos e abre livremente', async () => {
    const { router } = abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('button', { name: 'Jogos' }));
    const jogos = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/estudante/atividades/'));
    expect(jogos.map((l) => l.textContent)).toEqual([expect.stringContaining('piano pause'), expect.stringContaining('mk potion'), expect.stringContaining('mk connection')]);

    await userEvent.click(screen.getByRole('link', { name: /mk potion/ }));
    expect(router.state.location.pathname).toBe('/estudante/atividades/mkpotion');
    expect(screen.getByTitle('Jogo mk potion')).toHaveAttribute('src', '/jogos/mkpotion/index.html?mkpause=1&estudante=est-1');
    expect(screen.getByRole('link', { name: 'Terminar exercício' })).toHaveAttribute('href', '/estudante/atividades');
  });
});

describe('Navegação sem labirinto', () => {
  it('o Voltar de cada tela leva a um lugar fixo, não ao histórico', async () => {
    abrir('/estudante/pausa');
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/estudante');
  });

  it('a atividade livre usa o encerramento para retornar ao catálogo', async () => {
    abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('link', { name: /piano pause/ }));
    expect(screen.queryByRole('link', { name: 'Voltar' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Terminar exercício' })).toHaveAttribute('href', '/estudante/atividades');
  });

  it('a escolha da atividade não manda o aluno para fora da pausa', async () => {
    abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('link', { name: 'Ver todas' })).toBeNull();
  });

});

describe('Nível 3', () => {
  it('exige humor antes e depois, envia ambos e deixa apenas a observação opcional', async () => {
    const salvar = vi.spyOn(api.estudante, 'registrarSessao');
    const { router, container } = abrir('/estudante/agora');
    await screen.findByText('Aviso enviado aos profissionais vinculados que podem receber alertas.');
    expect(screen.getByRole('button', { name: 'Começar respiração' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Terminei' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Triste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Começar respiração' }));
    expect(screen.getByText('Inspire')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    expect(router.state.location.pathname).toBe('/estudante/agora/fim');
    expect(screen.getByRole('button', { name: 'Enviar resposta' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Início' })).toBeNull();
    expect(salvar).not.toHaveBeenCalled();
    expect(screen.getAllByText('(opcional)')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await screen.findByRole('heading', { name: 'Pausa feita!' });
    expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
    expect(screen.getByText('Antes')).toBeInTheDocument();
    expect(screen.getByText('Depois')).toBeInTheDocument();
    expect(screen.getByText('Triste')).toBeInTheDocument();
    expect(screen.getByText('Calmo(a)')).toBeInTheDocument();
    expect(salvar).toHaveBeenCalledExactlyOnceWith({ estudanteId: 'est-1', antes: 'triste', depois: 'calmo', atividade: 'respiracao', relato: undefined });
    await act(async () => { await router.navigate('/estudante/agora/fim'); });
    expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('link', { name: 'Início' }));
    await screen.findByRole('heading', { name: /Oi,/ });
    expect(router.state.location.pathname).toBe('/estudante');
  });

  it('não mostra conclusão se o envio do humor final do nível 3 falhar', async () => {
    sessionStorage.setItem('mkpause:estudante:v2:est-1', JSON.stringify({ sessao: { antes: 'triste', atividade: 'respiracao', nivel3: true, etapaNivel3: 'avaliacao' } }));
    vi.spyOn(api.estudante, 'registrarSessao').mockRejectedValueOnce(new Error('Não foi possível salvar a sessão.'));
    const { router } = abrir('/estudante/agora/fim');
    await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await screen.findByText('Não foi possível salvar a sessão.');
    expect(router.state.location.pathname).toBe('/estudante/agora/fim');
    expect(screen.queryByRole('heading', { name: 'Pausa feita!' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar resposta' })).toBeEnabled();
  });

  it('abrir a URL final sem avaliação inicial não permite enviar', () => {
    const { router } = abrir('/estudante/agora/fim');
    expect(router.state.location.pathname).toBe('/estudante/agora');
    expect(screen.getByRole('button', { name: 'Começar respiração' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar resposta' })).toBeNull();
  });

  it('respirar mais mantém a avaliação inicial e não duplica o alerta', async () => {
    const avisar = vi.spyOn(api.estudante, 'enviarAlertaNivel3');
    abrir('/estudante/agora');
    await screen.findByText('Aviso enviado aos profissionais vinculados que podem receber alertas.');
    await userEvent.click(screen.getByRole('button', { name: 'Ansioso(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Começar respiração' }));
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    await userEvent.click(screen.getByRole('button', { name: 'Respirar mais' }));
    expect(screen.getByText('Inspire')).toBeInTheDocument();
    expect(avisar).toHaveBeenCalledTimes(1);
  });

  it('envia o alerta uma vez e não permite cancelar', async () => {
    const antes = api.escola.alertas('pe-1').length;
    abrir('/estudante/agora');
    expect(await screen.findByText('Aviso enviado aos profissionais vinculados que podem receber alertas.')).toBeInTheDocument();
    const novos = api.escola.alertas('pe-1').slice(0, api.escola.alertas('pe-1').length - antes);
    expect(novos).toHaveLength(1);
    expect(novos[0].tipo).toBe('nivel3');

    expect(screen.queryByRole('button', { name: 'Cancelar aviso' })).toBeNull();
    expect(api.escola.alertas('pe-1').some((a) => a.id === novos[0].id)).toBe(true);
  });
});

describe('Sem pedir ajuda', () => {
  it('a rota antiga de pedir ajuda não existe mais', async () => {
    const { router } = abrir('/estudante/ajuda');
    expect(router.state.location.pathname).toBe('/');
  });

  it('a avaliação final mantém a linha de emergência e não tem pedir ajuda', () => {
    sessionStorage.setItem('mkpause:estudante:v2:est-1', JSON.stringify({ sessao: { antes: 'triste', atividade: 'respiracao', nivel3: true, etapaNivel3: 'avaliacao' } }));
    abrir('/estudante/agora/fim');
    expect(screen.getByText(/Emergência:/)).toHaveTextContent('Emergência: 188 (CVV) · 192 (SAMU)');
    expect(screen.queryByRole('link', { name: /Pedir ajuda/ })).toBeNull();
  });
});

describe('Nível 2', () => {
  it('mostra campo para outro lugar, exige preenchimento e envia o local informado', async () => {
    const { router, container } = abrir('/estudante/aviso-de-saida');
    expect(screen.queryByRole('heading', { name: /Quem.*saber/i })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Outro lugar' }));
    const campo = screen.getByRole('textbox', { name: 'Qual é o outro lugar?' });
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('maxlength', '160');
    const enviar = screen.getByRole('button', { name: 'Avisar e sair' });
    expect(enviar).toBeDisabled();
    await userEvent.type(campo, '   ');
    expect(enviar).toBeDisabled();
    await userEvent.clear(campo);
    await userEvent.type(campo, '  Sala de leitura  ');
    expect(enviar).toBeEnabled();
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(enviar);
    expect(router.state.location.pathname).toBe('/estudante/pausa');
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Sala de leitura')).toBe(true);
  });

  it('trocar outro lugar por um destino da lista oculta o campo e envia somente a escolha atual', async () => {
    abrir('/estudante/aviso-de-saida');
    await userEvent.click(screen.getByRole('button', { name: 'Outro lugar' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Qual é o outro lugar?' }), 'Sala de leitura');
    await userEvent.click(screen.getByRole('button', { name: 'Pátio' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Pátio')).toBe(true);
    expect(api.escola.avisos('pe-1').some((a) => a.destino === 'Sala de leitura')).toBe(false);
  });

  it('avisa a saída, segue direto à pausa e registra o retorno no início', async () => {
    const { router } = abrir('/estudante/aviso-de-saida');
    expect(screen.queryByRole('link', { name: 'Pedir ajuda' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Biblioteca' }));
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa');
    expect(screen.queryByText('Quem sabe')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Fora da sala' })).toBeNull();
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Biblioteca')).toBe(true);
    await userEvent.click(await screen.findByRole('link', { name: 'Voltar' }));
    expect(router.state.location.pathname).toBe('/estudante');
    await userEvent.click(await screen.findByRole('button', { name: 'Voltei para a sala' }));
    expect(screen.getByText('Avisamos seu retorno.')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: 'Voltei para a sala' })).toBeNull();
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Biblioteca')).toBe(false);
  });

  it('o aviso é opcional quanto ao destino e não é duplicado ao reabrir o nível 2', async () => {
    const { router } = abrir('/estudante/aviso-de-saida');
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    const avisos = api.escola.avisos('pe-1').filter((a) => !a.voltouEm);
    await userEvent.click(await screen.findByRole('link', { name: 'Voltar' }));
    await userEvent.click(screen.getByRole('link', { name: 'Preciso sair da sala, Nível 2' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa');
    await act(() => router.navigate('/estudante/aviso-de-saida'));
    expect(router.state.location.pathname).toBe('/estudante/pausa');
    expect(api.escola.avisos('pe-1').filter((a) => !a.voltouEm)).toEqual(avisos);
    expect(screen.queryByText('Quem sabe')).toBeNull();
  });

  it('registra o retorno na conclusão da pausa sem outra tela', async () => {
    const { router } = abrir('/estudante/aviso-de-saida');
    const existentes = new Set(api.escola.avisos('pe-1').map((a) => a.id));
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    const aviso = api.escola.avisos('pe-1').find((a) => !existentes.has(a.id))!;
    await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('link', { name: /piano pause/ }));
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
    await userEvent.click(await screen.findByRole('button', { name: 'Voltei para a sala' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/concluida');
    expect(screen.getByRole('heading', { name: 'Pausa feita!' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Avisamos seu retorno.');
    expect(api.escola.avisos('pe-1').find((a) => a.id === aviso.id)?.voltouEm).toBeTruthy();
  });

  it('a URL antiga volta ao início sem exibir a tela removida', () => {
    const { router } = abrir('/estudante/fora-da-sala');
    expect(router.state.location.pathname).toBe('/estudante');
    expect(screen.queryByText('Quem sabe')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Fora da sala' })).toBeNull();
  });

  it('mantém o aviso e o retorno disponíveis ao passar pelos outros níveis', async () => {
    const { router, container } = abrir('/estudante/aviso-de-saida');
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    for (const rota of ['/estudante/pausa', '/estudante/agora', '/estudante/agora/fim', '/estudante/fora-da-sala']) {
      await act(() => router.navigate(rota));
      expect(screen.queryByRole('heading', { name: 'Fora da sala' })).toBeNull();
      expect(screen.queryByText('Quem sabe')).toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Voltei para a sala' })).toBeInTheDocument();
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('Cuidados', () => {
  it('marcar um cuidado conta para hoje e "Só você vê"', async () => {
    abrir('/estudante/cuidados');
    expect(screen.getByText('Falta o de hoje')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Beber água' }));
    expect(screen.getByRole('button', { name: 'Beber água' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Hoje já conta!')).toBeInTheDocument();
    expect(screen.getByText('Só você vê.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/perdeu|dia perdido|pontos|ranking/i);
  });
});

describe('acessibilidade das telas do estudante (axe)', () => {
  const telas = [
    '/', '/apresentacao/2', '/apresentacao/3', '/entrar', '/primeiro-acesso',
    '/estudante', '/estudante/atividades', '/estudante/cuidados', '/estudante/perfil',
    '/estudante/pausa', '/estudante/aviso-de-saida', '/estudante/agora', '/estudante/agora/fim',
  ];
  it.each(telas)('%s', async (caminho) => {
    const { container } = abrir(caminho);
    expect(await violacoes(container)).toEqual([]);
  });
});


it('oculta a confirmação após cinco segundos sem remover o alerta enviado', async () => {
  vi.useFakeTimers();
  try {
    await act(async () => { abrir('/estudante/agora'); });
    expect(screen.getByText('Aviso enviado aos profissionais vinculados que podem receber alertas.')).toBeInTheDocument();
    const alertas = api.escola.alertas('pe-1');
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.getByText('Aviso enviado aos profissionais vinculados que podem receber alertas.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Aviso enviado aos profissionais vinculados que podem receber alertas.')).toBeNull();
    expect(api.escola.alertas('pe-1')).toEqual(alertas);
    expect(screen.getByRole('button', { name: 'Começar respiração' })).toBeDisabled();
  } finally {
    vi.useRealTimers();
  }
});
