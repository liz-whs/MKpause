import { afterEach, expect, it, vi } from 'vitest';
import { carregar, idAtividade } from './servidor';

afterEach(() => vi.unstubAllGlobals());

it('diferencia jogos e vídeos pela referência sem substituir as atividades existentes', async () => {
  const itens = [
    ['RESPIRACAO', 'respiracao', 'Respire&Pause'],
    ['JOGO', '/jogos/pianopause/index.html', 'PianoPause'],
    ['JOGO', '/jogos/mkpotion/index.html', 'MK Potion'],
    ['JOGO', '/jogos/mkconnection/index.html', 'MKconnection'],
    ['VIDEO', 'video', 'MK Breath'],
    ['VIDEO', '/videos/espiral-celular.mp4', 'Respiração em espiral'],
    ['VIDEO', '/videos/chinchila-celular.mp4', 'Respiração com a chinchila'],
  ].map(([tipo, conteudo_ou_referencia, nome], i) => ({ id_atividade: i + 1, tipo, conteudo_ou_referencia, nome, disponivel: true }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(itens)).mockResolvedValueOnce(Response.json([])));
  const carga = await carregar({ id_usuario: 1, id_perfil: 1, nome_completo: 'Ana', email: 'ana@teste.br', perfil: 'estudante' });
  expect(carga.conteudos.map((c) => c.id)).toEqual(['respiracao', 'pianopause', 'mkpotion', 'mkconnection', 'video', 'espiral', 'chinchila']);
  expect(carga.conteudos.map((c) => c.nome)).toEqual(['respire & pause', 'piano pause', 'mk potion', 'mk connection', 'mk breath', 'spiral pause', 'chinchilla pause']);
  expect(idAtividade('mkconnection')).toBe(4);
  expect(idAtividade('espiral')).toBe(6);
  expect(idAtividade('chinchila')).toBe(7);
});
