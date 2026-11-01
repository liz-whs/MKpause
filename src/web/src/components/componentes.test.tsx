import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useState } from 'react';
import { NIVEIS } from '../domain/niveis';
import type { EmocaoId } from '../domain/emocoes';
import { LevelCard } from './student/LevelCard';
import { EmotionGrid } from './student/EmotionGrid';

function comRota(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: '*', element: ui }]);
  return render(<RouterProvider router={router} />);
}

describe('LevelCard', () => {
  it('mostra os níveis na ordem 1, 2, 3 com o nível no nome acessível', () => {
    comRota(<>{NIVEIS.map((n) => <LevelCard key={n.nivel} info={n} />)}</>);
    const niveis = screen.getAllByRole('link', { name: /, Nível \d$/ });
    expect(niveis.map((l) => l.getAttribute('href'))).toEqual(['/estudante/pausa', '/estudante/aviso-de-saida', '/estudante/agora']);
    expect(niveis[0]).toHaveAccessibleName('Quero fazer uma pausa, Nível 1');
    expect(niveis[1]).toHaveAccessibleName('Preciso sair da sala, Nível 2');
    expect(niveis[2]).toHaveAccessibleName('Não estou bem, Nível 3');
  });
});

describe('EmotionGrid', () => {
  it('marca a emoção escolhida com aria-pressed', async () => {
    function Teste() {
      const [v, setV] = useState<EmocaoId | null>(null);
      return <EmotionGrid value={v} onChange={setV} />;
    }
    render(<Teste />);
    const triste = screen.getByRole('button', { name: 'Triste' });
    expect(triste).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(triste);
    expect(triste).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });
});
