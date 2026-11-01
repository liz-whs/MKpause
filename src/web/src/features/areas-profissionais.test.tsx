import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { entrarComoProfissional } from '../state/ProContext';
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

describe('acesso por vínculo', () => {
  it('o professor só vê estudantes vinculados a ele', () => {
    entrarComoProfissional('prof-3'); // vinculado só ao 7º C
    abrir('/escola/estudantes');
    expect(screen.getByText('Felipe N.')).toBeInTheDocument();
    expect(screen.queryByText('Ana L.')).toBeNull();
  });

  it('abrir um estudante não vinculado volta para a lista', () => {
    entrarComoProfissional('prof-3');
    const { router } = abrir('/escola/estudantes/est-1');
    expect(router.state.location.pathname).toBe('/escola/estudantes');
  });

  it('a api recusa leitura sem vínculo e registros clínicos para quem não é clínico', () => {
    expect(() => api.escola.sessoes('prof-3', 'est-1')).toThrow();
    expect(api.clinico.registros('pe-1', 'est-1')).toEqual([]);
    expect(api.clinico.registros('pc-1', 'est-1').length).toBeGreaterThan(0);
  });
});

describe('alertas chegam à escola', () => {
  it('o alerta do nível 3 aparece para o professor e pode ser marcado como visto', async () => {
    api.estudante.enviarAlertaNivel3('est-1');
    entrarComoProfissional('prof-1');
    abrir('/escola/alertas');
    const card = screen.getByText('Ana L.').closest('article')!;
    expect(within(card).getByText('Alerta · Nível 3')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Marcar como visto' }));
    expect(within(card).getByText('Visto por você')).toBeInTheDocument();
  });

  it('alerta cancelado pelo aluno não aparece', () => {
    const a = api.estudante.enviarAlertaNivel3('est-1');
    api.estudante.cancelarAlerta(a.id);
    entrarComoProfissional('prof-1');
    abrir('/escola/alertas');
    expect(screen.queryByText('Ana L.')).toBeNull();
  });
});

describe('sem intensidade nem "nível 2" nos registros', () => {
  it.each(['/escola/estudantes/est-1', '/clinico/estudantes/est-1', '/clinico/alertas', '/escola/alertas'])('%s', (caminho) => {
    entrarComoProfissional(caminho.startsWith('/clinico') ? 'pc-1' : 'prof-1');
    abrir(caminho);
    expect(document.body.textContent).not.toMatch(/·\s*(Muito|Médio|Um pouco)/);
    expect(document.body.textContent).not.toMatch(/Nível 2/);
  });
});

describe('administração', () => {
  it('desativar pede confirmação e mantém o histórico', async () => {
    abrir('/admin/usuarios');
    await userEvent.click(screen.getByRole('button', { name: 'Desativar Bruno Martins' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Desativar este cadastro?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar' }));
    expect(screen.getByText('Cadastro desativado. O histórico foi mantido.')).toBeInTheDocument();
    expect(api.admin.estudantes().find((e) => e.id === 'est-2')?.ativo).toBe(false);
  });

  it('cadastro valida o e-mail', async () => {
    abrir('/admin/usuarios/novo');
    await userEvent.type(screen.getByLabelText('E-mail *'), 'ana.lima@');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(screen.getByText('Use um e-mail completo, como nome@escola.edu.br.')).toBeInTheDocument();
  });

  it('conteúdo oculto some das atividades do estudante', async () => {
    abrir('/admin/conteudos');
    await userEvent.click(screen.getByRole('switch', { name: 'PianoPause: disponível para estudantes' }));
    expect(api.estudante.conteudos().map((c) => c.id)).not.toContain('pianopause');
  });

  it('conteúdo já usado não pode ser excluído', () => {
    abrir('/admin/conteudos');
    const excluir = screen.getByRole('button', { name: 'Excluir Respiração' });
    expect(excluir).toBeDisabled();
    expect(excluir).toHaveAccessibleDescription('Já usado em sessões: só pode ser ocultado.');
  });

  it('remover vínculo tira o estudante da lista do profissional', async () => {
    abrir('/admin/vinculos');
    await userEvent.click(screen.getByRole('button', { name: 'Remover Marcos Prado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover vínculo' }));
    expect(api.escola.estudantes('prof-1').some((e) => e.id === 'est-1')).toBe(false);
  });
});

describe('login de exemplo', () => {
  it('leva cada perfil para a sua área', async () => {
    const { router } = abrir('/entrar');
    await userEvent.type(screen.getByLabelText('Matrícula ou e-mail'), 'clinico');
    await userEvent.type(screen.getByLabelText('Senha'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(router.state.location.pathname).toBe('/clinico/acompanhados');
  });
});

describe('acessibilidade das áreas profissionais (axe)', () => {
  const telas = [
    '/escola/alertas', '/escola/avisos', '/escola/estudantes', '/escola/estudantes/est-1',
    '/clinico/acompanhados', '/clinico/estudantes/est-1', '/clinico/estudantes/est-1/ficha', '/clinico/alertas',
    '/admin/usuarios', '/admin/usuarios/novo', '/admin/vinculos', '/admin/fichas', '/admin/conteudos',
  ];
  it.each(telas)('%s', async (caminho) => {
    const { container } = abrir(caminho);
    expect(await violacoes(container)).toEqual([]);
  });
});
