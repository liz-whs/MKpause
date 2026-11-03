import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MODE', 'development');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('códigos usando a API real', () => {
  it('uma rota ausente mostra erro e não muda para simulação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const { codigosCadastro, emSimulacao } = await import('./codigos');
    await expect(codigosCadastro.listar()).rejects.toThrow('Erro 404');
    expect(emSimulacao()).toBe(false);
  });

  it('carrega códigos do servidor e preserva erros de permissão', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([{ id_codigo_cadastro: 42, situacao: 'ATIVO' }]))
      .mockResolvedValueOnce(Response.json({ detail: 'Seu perfil não tem acesso a esta área.' }, { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    const { codigosCadastro } = await import('./codigos');
    await expect(codigosCadastro.listar()).resolves.toEqual([{ id_codigo_cadastro: 42, situacao: 'ATIVO' }]);
    expect(fetch.mock.calls[0][0]).toBe('/api/admin/codigos-cadastro/');
    await expect(codigosCadastro.listar()).rejects.toThrow('Seu perfil não tem acesso');
  });

  it('a resposta 204 indica que não há código de vínculo ativo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const { codigoVinculo } = await import('./codigos');
    await expect(codigoVinculo.atual({ id: 'est-1', nome: 'Ana', perfil: 'estudante' })).resolves.toBeNull();
  });
});
