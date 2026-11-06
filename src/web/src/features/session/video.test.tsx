import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../../router';
import { api } from '../../data/api';
import { definirPreferencias } from '../../preferencias/preferencias';
import { violacoes } from '../../test/axe';

let horizontal = false;
let mudarOrientacao: (() => void) | undefined;

async function abrir() {
  const router = createMemoryRouter(rotas, { initialEntries: ['/estudante/pausa'] });
  const resultado = render(<RouterProvider router={router} />);
  await userEvent.click(screen.getByRole('button', { name: 'Calmo(a)' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.click(screen.getByRole('link', { name: /MK Breath/ }));
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
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('vídeo de respiração em toda a janela', () => {
  it('remove os textos antigos, mantém loop e aguarda o play do usuário', async () => {
    const { video } = await abrir();
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.playsInline).toBe(true);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.queryByText('Vídeo: um minuto de calma')).toBeNull();
    expect(screen.queryByText('Na sala, use fones.')).toBeNull();
    expect(screen.queryByText(/Vídeo · 30 s/)).toBeNull();
    for (const texto of ['Legendas', 'Trocar', 'Terminei']) expect(screen.queryByText(texto)).toBeNull();
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' })).toHaveAccessibleDescription(/se repete até você pausar/);
  });

  it('permite reproduzir, pausar e retomar pelo teclado sem finalizar no fim do vídeo', async () => {
    const { video, router } = await abrir();
    screen.getByRole('button', { name: 'Reproduzir vídeo' }).focus();
    await userEvent.keyboard('{Enter}');
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
    await userEvent.click(screen.getByRole('link', { name: 'Sair da pausa' }));
    expect(router.state.location.pathname).toBe('/estudante');
  });

  it('adapta a orientação preservando o ponto e a escolha de continuar tocando', async () => {
    const { video, container } = await abrir();
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=3');
    await userEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
    video.currentTime = 12;
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    act(() => { horizontal = true; mudarOrientacao?.(); });
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-computador.mp4?v=3');
    expect(video).toHaveAttribute('poster', '/videos/respiracao-computador.jpg?v=3');
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    video.currentTime = 0;
    await act(() => fireEvent.loadedMetadata(video));
    expect(video.currentTime).toBe(12);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(container.querySelector('main')).not.toHaveClass('max-w-2xl');
    act(() => { horizontal = false; mudarOrientacao?.(); });
    expect(video.querySelector('source')).toHaveAttribute('src', '/videos/respiracao-celular.mp4?v=3');
  });

  it('não inicia um vídeo pausado ao mudar a orientação', async () => {
    const { video } = await abrir();
    video.currentTime = 9;
    act(() => { horizontal = true; mudarOrientacao?.(); });
    await act(() => fireEvent.loadedMetadata(video));
    expect(video.currentTime).toBe(9);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('pausa ao clicar na área central invisível e mostra o play novamente', async () => {
    const { video } = await abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Reproduzir vídeo' }));
    const centro = screen.getByRole('button', { name: 'Pausar vídeo' });
    expect(centro.querySelector('svg')).toBeNull();
    await userEvent.click(centro);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Reproduzir vídeo' }).querySelector('svg')).not.toBeNull();
    expect(video.loop).toBe(true);
  });

  it('mantém legendas automáticas no idioma escolhido sem botão adicional', async () => {
    const { video, container } = await abrir();
    const faixas = [
      { language: 'pt-BR', mode: 'disabled' }, { language: 'en', mode: 'disabled' }, { language: 'es', mode: 'disabled' },
    ];
    Object.defineProperty(video, 'textTracks', { configurable: true, value: faixas });
    fireEvent.loadedMetadata(video);
    expect(faixas.every((f) => f.mode === 'disabled')).toBe(true);
    expect(video.querySelectorAll('track')).toHaveLength(3);
    act(() => definirPreferencias({ idioma: 'es' }));
    expect(screen.queryByRole('button', { name: 'Subtítulos' })).toBeNull();
    expect(container.querySelector('track[srclang="es"]')).toHaveAttribute('default');
  });

  it('mostra uma falha de reprodução e permite tentar novamente', async () => {
    const { video } = await abrir();
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
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/estudante/pausa/atividade');
    expect(screen.getByRole('link', { name: 'Sair da pausa' })).toHaveAttribute('href', '/estudante');
  });
});
