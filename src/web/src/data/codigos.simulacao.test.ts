import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cadastro, codigosCadastro, codigoVinculo, resgate, reiniciarSimulacao } from './codigos';

const aluno = { id: 'est-1', nome: 'Aluno de teste', perfil: 'estudante' as const, turma: '8A' };
const professor = { id: 'prof-1', nome: 'Professor de teste', perfil: 'professor' as const };

beforeEach(() => {
  reiniciarSimulacao();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T12:00:00-03:00'));
});
afterEach(() => vi.useRealTimers());

describe('simulações de validade e consumo', () => {
  it('um pedido que expirou não pode ser aceito nem recusado', async () => {
    const token = await codigoVinculo.gerar(aluno);
    await resgate.usar(professor, token.codigo!, () => false);
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(await codigoVinculo.solicitacoes(aluno)).toEqual([]);
    expect(await resgate.enviados(professor)).toEqual([]);
    await expect(codigoVinculo.responder(aluno, token.id_codigo_vinculo, true)).rejects.toThrow('não está mais disponível');
    await expect(codigoVinculo.responder(aluno, token.id_codigo_vinculo, false)).rejects.toThrow('não está mais disponível');
  });

  it('um código aberto expirado não pode ser resgatado', async () => {
    const token = await codigoVinculo.gerar(aluno);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(await codigoVinculo.atual(aluno)).toBeNull();
    await expect(resgate.usar(professor, token.codigo!, () => false)).rejects.toThrow('Código inválido ou expirado');
  });

  it('um convite deixa de funcionar no instante em que expira', async () => {
    const convite = await codigosCadastro.gerar({ perfil: 'ESTUDANTE', usos_maximos: 2, validade_dias: 1 });
    await expect(cadastro.verificar(convite.codigo!)).resolves.toMatchObject({ perfil: 'ESTUDANTE' });
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    await expect(cadastro.verificar(convite.codigo!)).rejects.toThrow('Código inválido ou expirado');
    expect((await codigosCadastro.listar())[0].situacao).toBe('EXPIRADO');
  });
});
