import { describe, expect, it } from 'vitest';
import { EMOCOES, sugereEscalada } from './emocoes';

describe('emoções', () => {
  it('tem as 6 emoções do HANDOFF, sem intensidade', () => {
    expect(EMOCOES.map((e) => e.label)).toEqual(['Feliz', 'Calmo(a)', 'Ansioso(a)', 'Triste', 'Irritado(a)', 'Cansado(a)']);
    for (const e of EMOCOES) expect(Object.keys(e).sort()).toEqual(['id', 'imagem', 'label']);
  });

  it('sugere ir direto ao nível 3 só para ansioso, triste ou irritado', () => {
    expect(sugereEscalada('ansioso')).toBe(true);
    expect(sugereEscalada('triste')).toBe(true);
    expect(sugereEscalada('irritado')).toBe(true);
    expect(sugereEscalada('feliz')).toBe(false);
    expect(sugereEscalada('calmo')).toBe(false);
    expect(sugereEscalada('cansado')).toBe(false);
    expect(sugereEscalada(null)).toBe(false);
  });
});
