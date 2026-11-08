import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoasVindas, Apresentacao1 } from './Onboarding';
import { definirPreferencias, reiniciarPreferencias } from '../../preferencias/preferencias';

beforeEach(() => { sessionStorage.clear(); reiniciarPreferencias(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); reiniciarPreferencias(); });
const abrir = () => render(<MemoryRouter><BoasVindas /></MemoryRouter>);

describe('abertura de boas-vindas', () => {
  it('apresenta a marca e segue para as boas-vindas, sem repetir na mesma visita', () => {
    vi.useFakeTimers();
    const view = abrir();
    expect(screen.getByRole('button', { name: 'Pular abertura' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4100));
    expect(screen.getByRole('button', { name: 'Pular abertura' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1900));
    expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument();
    view.unmount(); abrir();
    expect(screen.queryByRole('button', { name: 'Pular abertura' })).toBeNull();
    expect(screen.getByRole('link', { name: 'mkpause, início' })).toBeInTheDocument();
  });
  it('permite pular imediatamente e entrar sem esperar', () => {
    abrir();
    expect(screen.getByRole('link', { name: 'Já tenho conta · Entrar' })).toHaveAttribute('href', '/entrar');
    fireEvent.click(screen.getByRole('button', { name: 'Pular abertura' }));
    expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument();
  });
  it('respeita a preferência de menos movimento', () => {
    definirPreferencias({ menosMovimento: true }); abrir();
    expect(screen.queryByRole('button', { name: 'Pular abertura' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument();
  });
  it('respeita a preferência de movimento do sistema operacional', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList));
    abrir();
    expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pular abertura' })).toBeNull();
  });
  it('usa apenas um botão de preferências, com símbolo e nome acessível, nas etapas', () => {
    render(<MemoryRouter><Apresentacao1 /></MemoryRouter>);
    const preferencias = screen.getAllByRole('button', { name: 'Acessibilidade e idioma' });
    expect(preferencias).toHaveLength(1);
    expect(preferencias[0].textContent).toBe('');
    expect(preferencias[0].querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'mkpause, início' })).toBeInTheDocument();
  });
  it('ignora o marcador antigo e mantém apenas as ações principais nas boas-vindas', () => {
    sessionStorage.setItem('mkpause:abertura-vista', '1');
    abrir();
    expect(screen.getByRole('button', { name: 'Pular abertura' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pular abertura' }));
    expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Já tenho conta · Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rever abertura' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Tenho um código de cadastro' })).toBeNull();
  });

});
