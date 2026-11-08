import { describe, expect, it } from 'vitest';
import { calcularSequencia, chaveDia, semanaAtual, cuidadosDoDia, CUIDADOS } from './cuidados';

// Semana de 26/10/2026 (segunda) a 30/10/2026 (sexta).
const d = (dia: number, mes = 10) => new Date(2026, mes - 1, dia);
const dias = (...lista: Date[]) => new Set(lista.map(chaveDia));

describe('calcularSequencia', () => {
  it('não limita sequências reais a cinco dias nem a 400 dias de calendário', () => {
    const feitos = new Set<string>();
    const data = new Date(2026, 10, 5);
    while (feitos.size < 500) {
      feitos.add(chaveDia(data));
      data.setDate(data.getDate() - 1);
    }
    expect(calcularSequencia(feitos, new Date(2026, 10, 5))).toBe(500);
  });
  it('conta dias corridos seguidos com cuidado', () => {
    expect(calcularSequencia(dias(d(28), d(29), d(30)), d(30))).toBe(3);
  });

  it('não interrompe a sequência se hoje ainda não teve cuidado', () => {
    expect(calcularSequencia(dias(d(28), d(29)), d(30))).toBe(2);
  });

  it('inclui sexta, sábado, domingo e segunda na sequência', () => {
    expect(calcularSequencia(dias(d(30), d(31), d(1, 11), d(2, 11)), d(2, 11))).toBe(4);
  });

  it('um sábado ou domingo sem cuidado interrompe a sequência', () => {
    expect(calcularSequencia(dias(d(30), d(1, 11), d(2, 11)), d(2, 11))).toBe(2);
    expect(calcularSequencia(dias(d(30), d(31), d(2, 11)), d(2, 11))).toBe(1);
  });

  it('um dia sem cuidado recomeça a contagem', () => {
    expect(calcularSequencia(dias(d(26), d(28), d(29)), d(29))).toBe(2);
  });

  it('cuidado feito no sábado soma', () => {
    expect(calcularSequencia(dias(d(30), d(31)), d(31))).toBe(2);
  });
});

describe('semanaAtual', () => {
  it('mostra segunda a domingo, marcando hoje', () => {
    const semana = semanaAtual(dias(d(26)), d(28));
    expect(semana.map((s) => s.rotulo)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']);
    expect(semana.map((s) => s.numero)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(semana.map((s) => s.estado)).toEqual(['feito', 'aberto', 'hoje', 'aberto', 'aberto', 'aberto', 'aberto']);
  });

  it('no domingo inclui o próprio dia na semana', () => {
    expect(semanaAtual(new Set(), d(1, 11)).map((s) => s.numero)).toEqual([26, 27, 28, 29, 30, 31, 1]);
  });
});

it('marca o domingo como hoje quando ainda não há cuidado', () => {
  expect(semanaAtual(new Set(), d(1, 11))[6].estado).toBe('hoje');
});


describe('sugestões diárias', () => {
  it('mantém três opções distintas e estáveis durante o mesmo dia', () => {
    const primeira = cuidadosDoDia('2026-11-07', 'est-1').map((c) => c.id);
    expect(new Set(primeira).size).toBe(3);
    expect(cuidadosDoDia('2026-11-07', 'est-1').map((c) => c.id)).toEqual(primeira);
    expect(new Set(CUIDADOS.map((c) => c.id)).size).toBe(24);
  });

  it('varia em dias consecutivos, incluindo fim de semana e viradas de mês e ano', () => {
    for (const [anterior, seguinte] of [['2026-11-06','2026-11-07'],['2026-11-07','2026-11-08'],['2026-11-08','2026-11-09'],['2026-11-30','2026-12-01'],['2026-12-31','2027-01-01']]) {
      const antes = cuidadosDoDia(anterior, 'est-1').map((c) => c.id);
      const depois = cuidadosDoDia(seguinte, 'est-1').map((c) => c.id);
      expect(depois.some((id) => antes.includes(id))).toBe(false);
    }
  });

  it('alterna todo o catálogo sem exigir que as sugestões anteriores tenham sido feitas', () => {
    const vistos = new Set<string>();
    for (let i = 1; i <= CUIDADOS.length; i++) for (const c of cuidadosDoDia(`2026-11-${String(i).padStart(2,'0')}`, 'est-1')) vistos.add(c.id);
    expect(vistos.size).toBe(CUIDADOS.length);
  });
});


it('oferece escolhas de autonomia, lazer e rotina para adolescentes', () => {
  expect(CUIDADOS.map((c) => c.id)).toEqual(expect.arrayContaining(['notificacoes', 'playlist', 'escrever', 'limites', 'hobby', 'pausatela', 'prioridade', 'reconhecer']));
});
