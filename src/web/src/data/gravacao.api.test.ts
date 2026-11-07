import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

it('não altera o cadastro local antes da confirmação e preserva os dados se a API falhar', async () => {
  vi.resetModules();
  vi.stubEnv('MODE', 'development');
  const servidor = await import('./servidor');
  const seed = await import('./mocks/escola');
  vi.spyOn(servidor, 'contaAtual').mockResolvedValue({ id_usuario: 9, id_perfil: 9, nome_completo: 'Admin', email: 'admin@teste.br', perfil: 'administrador' });
  vi.spyOn(servidor, 'carregar').mockResolvedValue({ estudantes: structuredClone(seed.ESTUDANTES), profissionais: [], vinculos: [], sessoes: [], alertas: [], avisos: [], observacoes: [], registros: [], fichas: [], conteudos: [] });
  let falhar!: (erro: Error) => void;
  vi.spyOn(servidor, 'chamar').mockReturnValueOnce(new Promise((_ok, erro) => { falhar = erro; }));
  const { api } = await import('./api');
  await api.sincronizar();
  const anterior = api.admin.estudantes()[0].nome;
  const salvar = api.admin.atualizarEstudante('est-1', { nome: 'Alterado' });
  expect(api.admin.estudantes()[0].nome).toBe(anterior);
  falhar(new Error('Sem conexão'));
  await expect(salvar).rejects.toThrow('Sem conexão');
  expect(api.admin.estudantes()[0].nome).toBe(anterior);
});
