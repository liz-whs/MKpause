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
    const excluir = screen.getByRole('button', { name: 'Excluir Respire&Pause' });
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

describe('perfil dos profissionais', () => {
  it('o cartão do menu leva ao perfil, que mostra os estudantes vinculados', async () => {
    entrarComoProfissional('prof-3'); // vinculado só ao 7º C
    const { router } = abrir('/escola/alertas');
    await userEvent.click(screen.getAllByRole('link', { name: /Júlio Freitas.*, Perfil/ })[0]);
    expect(router.state.location.pathname).toBe('/escola/perfil');
    expect(screen.getByRole('heading', { level: 1, name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByText(/Professor\(a\) · Português · 7º C · Escola Modelo/)).toBeInTheDocument();
    const lista = screen.getByRole('region', { name: 'Seus estudantes' });
    expect(within(lista).getByRole('link', { name: /Felipe Nunes/ })).toHaveAttribute('href', '/escola/estudantes/est-6');
    expect(within(lista).queryByText('Ana Lima')).toBeNull();
    expect(screen.getByText('Fichas e registros clínicos').nextSibling).toHaveTextContent('Você não vê');
  });

  it('o psicólogo clínico vê os registros clínicos e chega aos estudantes pela área clínica', () => {
    entrarComoProfissional('pc-1');
    abrir('/clinico/perfil');
    expect(screen.getByText('Ficha de acompanhamento e registros clínicos').nextSibling).toHaveTextContent('Você vê');
    expect(screen.getByRole('link', { name: /Ana Lima/ })).toHaveAttribute('href', '/clinico/estudantes/est-1');
  });

  it('a administração não tem lista de estudantes e não vê dados clínicos', () => {
    abrir('/admin/perfil');
    expect(screen.queryByRole('region', { name: 'Seus estudantes' })).toBeNull();
    expect(screen.getByText('Pausas, humor, observações e registros clínicos').nextSibling).toHaveTextContent('Você não vê');
  });

  it('sair da conta esquece quem estava usando', async () => {
    entrarComoProfissional('pe-1');
    const { router } = abrir('/escola/perfil');
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(router.state.location.pathname).toBe('/');
    expect(sessionStorage.getItem('mkpause:profissional')).toBeNull();
  });
});

describe('acessibilidade das áreas profissionais (axe)', () => {
  const telas = [
    '/escola/alertas', '/escola/avisos', '/escola/estudantes', '/escola/estudantes/est-1', '/escola/perfil',
    '/clinico/acompanhados', '/clinico/estudantes/est-1', '/clinico/estudantes/est-1/ficha', '/clinico/alertas', '/clinico/perfil',
    '/admin/usuarios', '/admin/usuarios/novo', '/admin/vinculos', '/admin/fichas', '/admin/conteudos', '/admin/perfil',
  ];
  it.each(telas)('%s', async (caminho) => {
    const { container } = abrir(caminho);
    expect(await violacoes(container)).toEqual([]);
  });
});
