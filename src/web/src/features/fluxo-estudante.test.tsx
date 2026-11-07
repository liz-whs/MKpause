import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    await router.navigate('/estudante/pausa/fim');
    expect(await screen.findByRole('link', { name: 'Não estou bem' })).toHaveAttribute('href', '/estudante/agora');
    expect(screen.queryByRole('link', { name: /Pedir ajuda/ })).toBeNull();
    expect(screen.queryByText('Ainda não está bem?')).toBeNull();
    const anteriores = new Set(api.escola.alertas('pe-1').map((a) => a.id));
    await userEvent.click(screen.getByRole('link', { name: 'Não estou bem' }));
    expect(router.state.location.pathname).toBe('/estudante/agora');
    expect(await screen.findByText('Aviso enviado à escola')).toBeInTheDocument();
    const novos = api.escola.alertas('pe-1').filter((a) => !anteriores.has(a.id));
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ estudanteId: 'est-1', tipo: 'nivel3' });
    expect(screen.getByText('Inspire')).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    } finally { vi.useRealTimers(); }
  });

  it.each([false, true])('Terminei encerra respire & pause e registra a sessão após o humor final (pausada: %s)', async (pausada) => {
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
    await userEvent.click(screen.getByRole('button', { name: 'Terminei' }));
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
    const { router } = abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('link', { name: /piano pause/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
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
    expect(await screen.findByRole('link', { name: 'Terminei' })).toHaveAttribute('href', '/estudante/pausa/fim');
    const jogo = screen.getByTitle('Jogo piano pause');
    expect(jogo).toHaveAttribute('src', '/jogos/pianopause/index.html?mkpause=1');
    // Na tela do jogo ele fica visível e acessível.
    expect(jogo.parentElement).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('o vídeo de respiração toca a versão do celular, com legendas nos três idiomas', async () => {
    const { router, container } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await router.navigate('/estudante/pausa/video');
    const video = await screen.findByLabelText(/Vídeo de respiração guiada/);
    expect(video).toHaveAttribute('poster', '/videos/respiracao-celular.jpg?v=3');
    expect(container.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=3');
    expect([...container.querySelectorAll('track')].map((t) => t.getAttribute('srclang'))).toEqual(['pt-BR', 'en', 'es']);
  });

  it('o mk potion aparece em Jogos e abre dentro da pausa', async () => {
    const { router } = abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('button', { name: 'Jogos' }));
    const jogos = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/estudante/pausa');
    expect(jogos.map((l) => l.textContent)).toEqual([expect.stringContaining('piano pause'), expect.stringContaining('mk potion'), expect.stringContaining('mk connection')]);

    await userEvent.click(screen.getByRole('link', { name: /mk potion/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/mkpotion');
    expect(screen.getByTitle('Jogo mk potion')).toHaveAttribute('src', '/jogos/mkpotion/index.html?mkpause=1&estudante=est-1');
    expect(screen.getByRole('link', { name: 'Terminei' })).toHaveAttribute('href', '/estudante/pausa/fim');
  });
});

describe('Navegação sem labirinto', () => {
  it('o Voltar de cada tela leva a um lugar fixo, não ao histórico', async () => {
    abrir('/estudante/pausa');
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/estudante');
  });

  it('vindo de Atividades, o Voltar do "Como você está" retorna a Atividades', async () => {
    abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('link', { name: /piano pause/ }));
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/estudante/atividades');
  });

  it('a escolha da atividade não manda o aluno para fora da pausa', async () => {
    abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('link', { name: 'Ver todas' })).toBeNull();
  });

});

describe('Nível 3', () => {
  it('envia o alerta sozinho, uma vez, e permite cancelar', async () => {
    const antes = api.escola.alertas('pe-1').length;
    abrir('/estudante/agora');
    expect(await screen.findByText('Aviso enviado à escola')).toBeInTheDocument();
    const novos = api.escola.alertas('pe-1').slice(0, api.escola.alertas('pe-1').length - antes);
    expect(novos).toHaveLength(1);
    expect(novos[0].tipo).toBe('nivel3');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar aviso' }));
    expect(screen.getByText('Aviso cancelado.')).toBeInTheDocument();
    expect(api.escola.alertas('pe-1').some((a) => a.id === novos[0].id)).toBe(false);
  });
});

describe('Sem pedir ajuda', () => {
  it('a rota antiga de pedir ajuda não existe mais', async () => {
    const { router } = abrir('/estudante/ajuda');
    expect(router.state.location.pathname).toBe('/');
  });

  it('Você se cuidou mostra a linha de emergência e não tem pedir ajuda', () => {
    abrir('/estudante/agora/fim');
    expect(screen.getByText(/Emergência:/)).toHaveTextContent('Emergência: 188 (CVV) · 192 (SAMU)');
    expect(screen.queryByRole('link', { name: /Pedir ajuda/ })).toBeNull();
  });
});

describe('Nível 2', () => {
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
    await userEvent.click(screen.getByRole('link', { name: 'Terminei' }));
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
