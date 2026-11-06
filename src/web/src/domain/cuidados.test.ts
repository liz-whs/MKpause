import { describe, expect, it } from 'vitest';
import { calcularSequencia, chaveDia, semanaAtual } from './cuidados';

// Semana de 26/10/2026 (segunda) a 30/10/2026 (sexta).
const d = (dia: number, mes = 10) => new Date(2026, mes - 1, dia);
const dias = (...lista: Date[]) => new Set(lista.map(chaveDia));

describe('calcularSequencia', () => {
  it('não limita sequências reais a cinco dias nem a 400 dias de calendário', () => {
    const feitos = new Set<string>();
    const data = new Date(2026, 10, 5);
    while (feitos.size < 500) {
      if (data.getDay() !== 0 && data.getDay() !== 6) feitos.add(chaveDia(data));
      data.setDate(data.getDate() - 1);
    }
    expect(calcularSequencia(feitos, new Date(2026, 10, 5))).toBe(500);
  });
  it('conta dias úteis seguidos com cuidado', () => {
    expect(calcularSequencia(dias(d(28), d(29), d(30)), d(30))).toBe(3);
  });

  it('não interrompe a sequência se hoje ainda não teve cuidado', () => {
    expect(calcularSequencia(dias(d(28), d(29)), d(30))).toBe(2);
  });

  it('fim de semana não conta nem interrompe', () => {
    // sexta 23, segunda 26
    expect(calcularSequencia(dias(d(22), d(23), d(26)), d(26))).toBe(3);
    // sábado 31: a sequência da semana continua valendo
    expect(calcularSequencia(dias(d(29), d(30)), d(31))).toBe(2);
  });

  it('um dia útil sem cuidado recomeça a contagem', () => {
    expect(calcularSequencia(dias(d(26), d(28), d(29)), d(29))).toBe(2);
  });

  it('cuidado feito no sábado não soma', () => {
    expect(calcularSequencia(dias(d(30), d(31)), d(31))).toBe(1);
  });
});

describe('semanaAtual', () => {
  it('mostra segunda a sexta, marcando hoje', () => {
    const semana = semanaAtual(dias(d(26)), d(28));
    expect(semana.map((s) => s.rotulo)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex']);
    expect(semana.map((s) => s.numero)).toEqual([26, 27, 28, 29, 30]);
    expect(semana.map((s) => s.estado)).toEqual(['feito', 'aberto', 'hoje', 'aberto', 'aberto']);
  });

  it('no fim de semana mostra a semana que acabou', () => {
    expect(semanaAtual(new Set(), d(1, 11)).map((s) => s.numero)).toEqual([26, 27, 28, 29, 30]);
  });
});
