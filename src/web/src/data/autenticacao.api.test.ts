import { afterEach, expect, it, vi } from 'vitest';
import { chamar, contaAtual } from './servidor';

afterEach(() => { vi.unstubAllGlobals(); });

it('um 401 em operação restrita avisa que a sessão expirou', async () => {
  const aviso = vi.fn();
  window.addEventListener('mkpause:sessao-expirada', aviso, { once: true });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail: 'Entre novamente.' }, { status: 401 })));
  await expect(chamar('GET', 'estudantes/')).rejects.toThrow('Entre novamente.');
  expect(aviso).toHaveBeenCalledOnce();
});

it('falha de conexão não se confunde com ausência de login', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sem conexão')));
  await expect(contaAtual()).rejects.toThrow('Sem conexão');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 401 })));
  await expect(contaAtual()).resolves.toBeNull();
});
