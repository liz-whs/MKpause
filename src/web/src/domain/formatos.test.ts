import { describe, expect, it } from 'vitest';
import { dataBrasileira, dia } from './formatos';

describe('datas brasileiras', () => {
  it('formata datas ISO sem deslocar o dia pelo fuso', () => {
    expect(dataBrasileira('2026-11-05')).toBe('05/11/2026');
    expect(dataBrasileira('2026-01-01')).toBe('01/01/2026');
    expect(dataBrasileira('29/02/2024')).toBe('29/02/2024');
    expect(dataBrasileira('')).toBe('—');
    expect(dataBrasileira('invalida')).toBe('—');
  });
  it('mantém hoje e ontem, com dia/mês/ano nas demais datas', () => {
    const agora = new Date('2026-11-08T12:00:00');
    expect(dia('2026-11-08', agora)).toBe('Hoje');
    expect(dia('2026-11-07', agora)).toBe('Ontem');
    expect(dia('2026-11-05', agora)).toBe('05/11/2026');
  });
});
