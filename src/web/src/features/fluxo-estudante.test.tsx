import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { violacoes } from '../test/axe';

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
  it('sugere ir direto ao nível 3 com emoção pesada', async () => {
    abrir('/estudante/pausa');
    expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Triste' }));
    expect(screen.getByText('Está pesado demais?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir direto' })).toHaveAttribute('href', '/estudante/agora');
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
  });
});

describe('Nova pausa', () => {
  it('não reaproveita a atividade nem a emoção da pausa anterior', async () => {
    const { router } = abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('link', { name: /PianoPause/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/pianopause');

    // Nova pausa pelo card do nível 1: começa do zero e passa pela escolha da atividade.
    await router.navigate('/estudante/pausa');
    expect(await screen.findByRole('button', { name: 'Escolha como está' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/atividade');
  });

  it('o PianoPause abre o jogo original dentro da tela', async () => {
    const { router } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await router.navigate('/estudante/pausa/pianopause');
    expect(await screen.findByRole('link', { name: 'Terminei' })).toHaveAttribute('href', '/estudante/pausa/fim');
    const jogo = screen.getByTitle('Jogo PianoPause');
    expect(jogo).toHaveAttribute('src', '/jogos/pianopause/index.html');
    // Na tela do jogo ele fica visível e acessível.
    expect(jogo.parentElement).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('o vídeo de respiração toca a versão do celular, com legendas nos três idiomas', async () => {
    const { router, container } = abrir('/estudante/pausa');
    await userEvent.click(screen.getByRole('button', { name: 'Feliz' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await router.navigate('/estudante/pausa/video');
    const video = await screen.findByLabelText(/Vídeo de respiração guiada/);
    expect(video).toHaveAttribute('poster', '/videos/respiracao-celular.jpg');
    expect(container.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4');
    expect([...container.querySelectorAll('track')].map((t) => t.getAttribute('srclang'))).toEqual(['pt-BR', 'en', 'es']);
  });

  it('o MK Potion aparece em Jogos e abre dentro da pausa', async () => {
    const { router } = abrir('/estudante/atividades');
    await userEvent.click(screen.getByRole('button', { name: 'Jogos' }));
    const jogos = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/estudante/pausa');
    expect(jogos.map((l) => l.textContent)).toEqual([expect.stringContaining('PianoPause'), expect.stringContaining('MK Potion')]);

    await userEvent.click(screen.getByRole('link', { name: /MK Potion/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/mkpotion');
    expect(screen.getByTitle('Jogo MK Potion')).toHaveAttribute('src', '/jogos/mkpotion/index.html?mkpause=1');
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
    await userEvent.click(screen.getByRole('link', { name: /PianoPause/ }));
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
  it('avisa a saída e encerra com Voltei', async () => {
    const { router } = abrir('/estudante/aviso-de-saida');
    expect(screen.queryByRole('link', { name: 'Pedir ajuda' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Biblioteca' }));
    await userEvent.click(screen.getByRole('button', { name: 'Avisar e sair' }));
    expect(router.state.location.pathname).toBe('/estudante/fora-da-sala');
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Biblioteca')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Voltei' }));
    expect(screen.getByText('Bom retorno!')).toBeInTheDocument();
    expect(api.escola.avisos('pe-1').some((a) => !a.voltouEm && a.destino === 'Biblioteca')).toBe(false);
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
