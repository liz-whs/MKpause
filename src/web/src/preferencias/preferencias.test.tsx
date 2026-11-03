import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { DESTINOS_SAIDA } from '../domain/tipos';
import { TURMAS } from '../data/mocks/escola';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { t } from '../i18n';
import { definirPreferencias } from './preferencias';
import { violacoes } from '../test/axe';

function abrir(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

beforeEach(() => {
  sessionStorage.clear();
  api.reiniciar();
});

/* ───────────── Cobertura das traduções ───────────── */

// Todo t('...') escrito no código (a chave é o texto em português).
const fontes = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.*', '!../i18n/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function chavesDoCodigo(): string[] {
  const chaves = new Set<string>();
  const padrao = /\b(?:t|traduzir)\(\s*(?:'([^']*)'|"([^"]*)")/g;
  for (const codigo of Object.values(fontes)) for (const m of codigo.matchAll(padrao)) chaves.add(m[1] ?? m[2]);
  return [...chaves];
}

function titulosDasRotas(lista: RouteObject[]): string[] {
  return lista.flatMap((r) => {
    const titulo = (r.handle as { titulo?: string } | undefined)?.titulo;
    return [...(titulo ? [titulo] : []), ...(r.children ? titulosDasRotas(r.children) : [])];
  });
}

/** Textos que chegam a t() por variável: menus, opções, dados conhecidos. */
const DINAMICAS = [
  ...titulosDasRotas(rotas),
  ...DESTINOS_SAIDA,
  ...api.admin.conteudos().flatMap((c) => [c.nome, c.tipo, c.duracao]),
  // Menus e abas
  'Início', 'Atividades', 'Cuidados', 'Usuários', 'Vínculos', 'Fichas', 'Conteúdos', 'Acompanhados', 'Alertas e avisos',
  'Alertas', 'Avisos de saída', 'Estudantes', 'Histórico e humor', 'Ficha de acompanhamento',
  'Professores', 'Psicólogos escolares', 'Psicólogos clínicos', 'Psicólogo escolar', 'Psicólogo clínico',
  // Opções e filtros
  'Todas', 'Todos', 'Novos', 'Vistos', 'Respiração', 'Jogos', 'Vídeos', 'Ativo', 'Inativo', 'Escolha',
  'Sem psicólogo clínico', 'Destino não informado', 'Não informado', 'Normal', 'Grande', 'Muito grande',
  // Apresentação
  'Quero uma pausa', 'Fico na sala e escolho uma atividade.', 'Preciso sair da sala', 'Aviso a escola e saio um pouco.',
  'Não estou bem', 'Um toque. A escola é avisada sozinha.', 'Você', 'Escolhe quando pausar.', 'Quem acompanha você',
  'Vê suas pausas e avisos.', 'Sua turma', 'Não vê nada.',
  // Códigos de cadastro (situação e perfis)
  'Usado', 'Expirado', 'Cancelado', 'Ativo', 'Estudante', 'Professor(a)', 'Psicólogo(a) escolar', 'Psicólogo(a) clínico(a)',
  // Dados de exemplo
  'Mãe', 'Pai',
  // Perfil dos profissionais (O que você vê)
  'Alertas de nível 3 e avisos de saída dos seus estudantes', 'Pausas e como o estudante estava antes e depois', 'Observações da escola, com nome de quem escreveu', 'Fichas e registros clínicos', 'Histórico de pausas e humor dos estudantes que você acompanha', 'Ficha de acompanhamento e registros clínicos', 'Observações da escola, só para leitura', 'Alertas e avisos de saída', 'Cadastros de estudantes e profissionais', 'Vínculos, fichas administrativas e conteúdos', 'Pausas, humor, observações e registros clínicos',
];

describe('traduções', () => {
  const chaves = [...new Set([...chavesDoCodigo(), ...DINAMICAS])];

  it('encontra os textos do código', () => {
    expect(chaves.length).toBeGreaterThan(300);
  });

  it.each([
    ['inglês', en],
    ['espanhol', es],
  ])('todo texto tem tradução em %s', (_, dicionario) => {
    expect(chaves.filter((c) => !(c in dicionario))).toEqual([]);
  });

  it('inglês e espanhol têm as mesmas chaves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('as variáveis {x} da tradução são as mesmas do português', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const d of [en, es]) for (const [pt, traducao] of Object.entries(d)) expect(vars(traducao), pt).toEqual(vars(pt));
  });

  it('dados da escola sem tradução (como as turmas) aparecem como foram cadastrados', () => {
    definirPreferencias({ idioma: 'en' });
    expect(TURMAS.map((turma) => t(turma))).toEqual(TURMAS);
  });

  it('troca as variáveis no texto traduzido', () => {
    expect(t('Oi, {nome}!', { nome: 'Ana' })).toBe('Oi, Ana!');
    definirPreferencias({ idioma: 'es' });
    expect(t('Oi, {nome}!', { nome: 'Ana' })).toBe('¡Hola, Ana!');
  });
});

/* ───────────── Painel "Acessibilidade e idioma" ───────────── */

describe('painel Acessibilidade e idioma', () => {
  it('o botão aparece na primeira tela, no início, nas telas de pausa e no nível 3', () => {
    for (const caminho of ['/', '/estudante', '/estudante/pausa', '/estudante/agora', '/entrar']) {
      const { unmount } = abrir(caminho);
      expect(screen.getAllByRole('button', { name: 'Acessibilidade e idioma' }).length, caminho).toBeGreaterThan(0);
      unmount();
    }
  });

  it('troca o idioma das telas, o lang da página e o título da aba', async () => {
    abrir('/estudante');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Oi, Ana!');
    await userEvent.click(screen.getByRole('button', { name: 'Acessibilidade e idioma' }));
    const painel = screen.getByRole('dialog', { name: 'Acessibilidade e idioma' });
    await userEvent.click(within(painel).getByRole('radio', { name: 'English' }));

    expect(document.documentElement.lang).toBe('en');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Hi, Ana!');
    expect(screen.getAllByRole('link', { name: /, Level \d$/ }).map((l) => l.textContent)).toEqual([
      'I want to take a pause, Level 1',
      'I need to leave the room, Level 2',
      "I'm not okay, Level 3",
    ]);
    expect(document.title).toBe('Home · MKpause');
    // O painel continua aberto, já traduzido.
    expect(screen.getByRole('dialog', { name: 'Accessibility and language' })).toBeInTheDocument();
  });

  it('as opções de acessibilidade vão para o <html> e ficam salvas no aparelho', async () => {
    abrir('/estudante');
    await userEvent.click(screen.getByRole('button', { name: 'Acessibilidade e idioma' }));
    const painel = screen.getByRole('dialog');
    await userEvent.click(within(painel).getByRole('radio', { name: 'Muito grande · 150%' }));
    await userEvent.click(within(painel).getByRole('switch', { name: 'Alto contraste' }));
    await userEvent.click(within(painel).getByRole('switch', { name: 'Menos movimento' }));
    await userEvent.click(within(painel).getByRole('switch', { name: 'Fonte mais legível' }));

    const html = document.documentElement;
    expect(html.style.fontSize).toBe('150%');
    expect(html).toHaveAttribute('data-alto-contraste');
    expect(html).toHaveAttribute('data-menos-movimento');
    expect(html).toHaveAttribute('data-fonte-legivel');
    expect(JSON.parse(localStorage.getItem('mkpause:preferencias')!)).toMatchObject({
      tamanhoTexto: 150,
      altoContraste: true,
      menosMovimento: true,
      fonteLegivel: true,
    });

    await userEvent.click(within(painel).getByRole('button', { name: 'Voltar ao padrão' }));
    expect(html.style.fontSize).toBe('100%');
    expect(html).not.toHaveAttribute('data-alto-contraste');
  });

  it('cada idioma é anunciado na própria língua (lang)', async () => {
    abrir('/');
    await userEvent.click(screen.getByRole('button', { name: 'Acessibilidade e idioma' }));
    expect(screen.getByRole('radio', { name: 'Español' }).closest('label')).toHaveAttribute('lang', 'es');
  });

  it('o painel aberto não tem problemas de acessibilidade (axe)', async () => {
    abrir('/estudante');
    await userEvent.click(screen.getByRole('button', { name: 'Acessibilidade e idioma' }));
    expect(await violacoes(document.body)).toEqual([]);
  });

  it('o Perfil também tem as opções', async () => {
    abrir('/estudante/perfil');
    await userEvent.click(screen.getByText('Acessibilidade e idioma', { selector: 'strong' }));
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument();
  });

  it('em espanhol, a primeira tela muda', () => {
    act(() => definirPreferencias({ idioma: 'es' }));
    abrir('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Una pausa para respirar y volver más liviano(a).');
    expect(screen.getByRole('button', { name: 'Accesibilidad e idioma' })).toBeInTheDocument();
  });
});
