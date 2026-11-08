import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../../router';
import { api } from '../../data/api';
import { definirPreferencias } from '../../preferencias/preferencias';
import { violacoes } from '../../test/axe';
import { VideoRespiracao } from './VideoRespiracao';

let horizontal = false;
let mudarOrientacao: (() => void) | undefined;

async function abrir() {
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/pausa'] });
  const resultado = render(<RouterProvider router={router} />);
  await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('link', { name: /mk breath/ }));
  return { ...resultado, router, video: resultado.container.querySelector('video')! };
}

beforeEach(() => {
  sessionStorage.clear(); api.reiniciar();
  horizontal = false; mudarOrientacao = undefined;
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    get matches() { return query === '(orientation: landscape)' && horizontal; },
    addEventListener: (_: string, ouvir: () => void) => { if (query === '(orientation: landscape)') mudarOrientacao = ouvir; },
    removeEventListener: vi.fn(),
  })));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    fireEvent.play(this); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) { fireEvent.pause(this); });
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('vídeo de respiração em toda a janela', () => {
  it('remove os textos antigos e inicia em loop sem espera', async () => {
    const { video } = await abrir();
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.playsInline).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(screen.queryByText('Vídeo: um minuto de calma')).toBeNull();
    expect(screen.queryByText('Na sala, use fones.')).toBeNull();
    expect(screen.queryByText(/Vídeo · 30 s/)).toBeNull();
    for (const texto of ['Legendas', 'Trocar', 'Terminei']) expect(screen.queryByText(texto)).toBeNull();
    expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toHaveAccessibleDescription(/se repete até você pausar/);
  });

  it('permite reproduzir, pausar e retomar pelo teclado sem finalizar no fim do vídeo', async () => {
    const { video, router } = await abrir();
    screen.getByRole('button', { name: 'Pausar vídeo' }).focus();
    expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Pausar vídeo' }).querySelector('svg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toHaveClass('bg-transparent');
    await userEvent.keyboard(' ');
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' }).querySelector('svg')).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    fireEvent.ended(video);
    expect(router.state.location.pathname).toBe('/estudante/pausa/video');
    await userEvent.click(screen.getByRole('link', { name: 'Terminar exercício' }));
    expect(router.state.location.pathname).toBe('/estudante/pausa/fim');
    expect(screen.getByRole('button', { name: 'Escolha como está' })).toBeDisabled();
  });

  it('adapta a orientação preservando o ponto e a escolha de continuar tocando', async () => {
    const { video, container } = await abrir();
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=4');
    video.currentTime = 12;
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    act(() => { horizontal = true; mudarOrientacao?.(); });
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-computador.mp4?v=4');
    expect(video).toHaveAttribute('poster', '/videos/respiracao-computador.jpg?v=4');
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    video.currentTime = 0;
    await act(() => fireEvent.loadedMetadata(video));
    expect(video.currentTime).toBe(12);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(container.querySelector('main')).not.toHaveClass('max-w-2xl');
    act(() => { horizontal = false; mudarOrientacao?.(); });
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=4');
  });

  it('não inicia um vídeo pausado ao mudar a orientação', async () => {
    const { video } = await abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Pausar vídeo' }));
    video.currentTime = 9;
    act(() => { horizontal = true; mudarOrientacao?.(); });
    await act(() => fireEvent.loadedMetadata(video));
    expect(video.currentTime).toBe(9);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('pausa ao clicar na área central invisível e mostra o play novamente', async () => {
    const { video } = await abrir();
    const centro = screen.getByRole('button', { name: 'Pausar vídeo' });
    expect(centro.querySelector('svg')).toBeNull();
    await userEvent.click(centro);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' }).querySelector('svg')).not.toBeNull();
    expect(video.loop).toBe(true);
  });

  it('troca a instrução original de idioma sem legenda duplicada nem reiniciar o vídeo', async () => {
    const { video, container } = await abrir();
    video.currentTime = 6;
    fireEvent.timeUpdate(video);
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Solte o ar');
    act(() => definirPreferencias({ idioma: 'en' }));
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Breathe out');
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveAttribute('lang', 'en');
    act(() => definirPreferencias({ idioma: 'es' }));
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Exhala');
    expect(video.querySelectorAll('track')).toHaveLength(0);
    expect(HTMLMediaElement.prototype.load).not.toHaveBeenCalled();
    expect(video.currentTime).toBe(6);
    video.currentTime = 0;
    fireEvent.timeUpdate(video);
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Inhala');
  });

  it.each([['chinchila', 4, 10], ['espiral', 5, 12.5]] as const)('sincroniza a instrução de %s com a fase e o loop', async (atividade, virada, ciclo) => {
    act(() => definirPreferencias({ idioma: 'en' }));
    const router = createMemoryRouter([{ path: '/', element: <VideoRespiracao atividade={atividade} /> }]);
    const { container } = render(<RouterProvider router={router} />);
    const video = container.querySelector('video')!;
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Breathe in slowly');
    video.currentTime = virada;
    fireEvent.timeUpdate(video);
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Breathe out slowly');
    video.currentTime = ciclo;
    fireEvent.timeUpdate(video);
    expect(container.querySelector('[data-instrucao-respiracao]')).toHaveTextContent('Breathe in slowly');
  });

  it('mostra uma falha de reprodução e permite tentar novamente', async () => {
    const { video } = await abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Pausar vídeo' }));
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Falha de mídia'));
    await userEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível reproduzir');
    await userEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toBeInTheDocument();
    expect(video.loop).toBe(true);
  });

  it('os controles têm nomes acessíveis e passam no axe', async () => {
    const { container } = await abrir();
    expect(await violacoes(container)).toEqual([]);
    expect(screen.queryByRole('link', { name: 'Voltar' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'mk breath' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Terminar exercício' })).toHaveAttribute('href', '/estudante/pausa/fim');
  });
});


function abrirPlayer() {
  const router = createMemoryRouter([{ path: '/', element: <VideoRespiracao /> }]);
  return render(<RouterProvider router={router} />);
}

it('inicia imediatamente e não volta a tocar automaticamente depois de pausar', async () => {
  vi.useFakeTimers();
  abrirPlayer();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Pausar vídeo' }));
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Reproduzir vídeo' })).toHaveClass('bg-surface/15');
  fireEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toBeInTheDocument();
});

it('pausa ao sair do vídeo sem agendar outra reprodução', async () => {
  vi.useFakeTimers();
  const { unmount } = abrirPlayer();
  unmount();
  await act(async () => { vi.advanceTimersByTime(3000); });
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
});

it('mantém play manual quando o navegador bloqueia o início automático', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Autoplay bloqueado', 'NotAllowedError'));
  await act(async () => { abrirPlayer(); });
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
  expect(screen.getByRole('button', { name: 'Pausar vídeo' })).toBeInTheDocument();
});
