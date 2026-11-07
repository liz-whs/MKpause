import { afterEach, expect, it, vi } from 'vitest';
import { carregar } from './servidor';

afterEach(() => vi.unstubAllGlobals());

it('carrega observações clínicas por estudante sem consultar alertas', async () => {
  const fetch = vi.fn(async (url: string) => {
    if (url === '/api/estudantes/') return Response.json([{
      id_estudante: 1, nome_completo: 'Ana', email: 'ana@teste.br', turma: null, instituicao_ensino: null,
    }]);
    if (url === '/api/estudantes/1/observacoes/') return Response.json([{
      id_observacao: 2, autor: 3, nome_autor: 'Professor', conteudo: 'Observação escolar', criado_em: '2026-11-06T12:00:00',
    }]);
    if (url.endsWith('/ficha/')) return Response.json({ detail: 'Sem ficha' }, { status: 404 });
    return Response.json([]);
  });
  vi.stubGlobal('fetch', fetch);
  const carga = await carregar({ id_usuario: 2, id_perfil: 2, nome_completo: 'Clínico', email: 'clinico@teste.br', perfil: 'psicologo_clinico' });
  expect(carga.observacoes[0].texto).toBe('Observação escolar');
  expect(carga.alertas).toEqual([]);
  expect(carga.avisos).toEqual([]);
  const urls = fetch.mock.calls.map(([url]) => url);
  expect(urls).toContain('/api/sessoes/?estudante=1');
  expect(urls.some((url) => url.includes('/alertas/'))).toBe(false);
});
