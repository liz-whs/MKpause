import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';
import { cadastro, codigosCadastro, codigoVinculo, resgate } from '../data/codigos';
import { entrarComoProfissional } from '../state/ProContext';
import { violacoes } from '../test/axe';

function abrir(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

const ESTUDANTE = { id: 'est-1', nome: 'Ana Lima', perfil: 'estudante' as const, turma: '8º A' };
const PROF3 = { id: 'prof-3', nome: 'Júlio Freitas', perfil: 'professor' as const, detalhe: 'Português · 7º C' };

beforeEach(() => {
  sessionStorage.clear();
  api.reiniciar();
});

describe('login sem Google', () => {
  it('não oferece mais a conta Google e leva ao cadastro com código', async () => {
    const { router } = abrir('/entrar');
    expect(screen.queryByText(/Google/)).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'Tenho um código de cadastro' }));
    expect(router.state.location.pathname).toBe('/cadastro');
  });
});

describe('códigos de cadastro (admin)', () => {
  it('gera um código que aparece uma vez só e entra na lista sem o texto', async () => {
    abrir('/admin/codigos');
    await userEvent.selectOptions(screen.getByLabelText('Para quem'), 'PROFESSOR');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar código' }));
    const mostrado = await screen.findByText(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    const codigo = mostrado.textContent!;
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();

    const lista = screen.getByRole('region', { name: 'Códigos gerados' });
    expect(within(lista).getByText('Professor(a)')).toBeInTheDocument();
    expect(within(lista).getByText(`…${codigo.slice(-3)}`)).toBeInTheDocument();
    expect(within(lista).queryByText(codigo)).toBeNull();
    expect(within(lista).getByText('Ativo')).toBeInTheDocument();
  });

  it('cancelar um código impede o cadastro com ele', async () => {
    const { codigo, id_codigo_cadastro } = await codigosCadastro.gerar({ perfil: 'ESTUDANTE', usos_maximos: 1, validade_dias: 7 });
    abrir('/admin/codigos');
    await userEvent.click(await screen.findByRole('button', { name: `Cancelar código …${codigo!.slice(-3)}` }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar código' }));
    expect(await screen.findByText('Código cancelado.')).toBeInTheDocument();
    await expect(cadastro.verificar(codigo!)).rejects.toThrow('Código inválido ou expirado');
    expect((await codigosCadastro.listar()).find((c) => c.id_codigo_cadastro === id_codigo_cadastro)?.situacao).toBe('REVOGADO');
  });
});

describe('cadastro com código', () => {
  it('código errado mostra a mesma mensagem genérica', async () => {
    abrir('/cadastro');
    await userEvent.type(screen.getByLabelText('Código'), 'AAAAA-BBBBB');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Código inválido ou expirado. Peça um novo à escola.')).toBeInTheDocument();
  });

  it('código de estudante com turma: turma vem fixa, valida senha e consome o código', async () => {
    const { codigo } = await codigosCadastro.gerar({ perfil: 'ESTUDANTE', usos_maximos: 1, validade_dias: 7, turma: '8º B' });
    abrir('/cadastro');
    // Aceita minúsculas e sem hífen.
    await userEvent.type(screen.getByLabelText('Código'), codigo!.replace('-', '').toLowerCase());
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Código válido · Estudante')).toBeInTheDocument();
    expect(screen.getByLabelText('Turma')).toHaveValue('8º B');
    expect(screen.getByLabelText('Turma')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Registro no CRP')).toBeNull();

    await userEvent.type(screen.getByLabelText('Nome completo'), 'Bia Costa');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bia@escola.br');
    await userEvent.type(screen.getByLabelText('Senha'), '1234567');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('A senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Senha'), '8');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), '12345678');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('heading', { name: 'Cadastro conferido' })).toBeInTheDocument();

    const [c] = await codigosCadastro.listar();
    expect(c.situacao).toBe('ESGOTADO');
    expect(c.usado_por[0]).toMatchObject({ nome_completo: 'Bia Costa', email: 'bia@escola.br' });
  });

  it('psicólogo precisa do registro no CRP e da UF', async () => {
    const { codigo } = await codigosCadastro.gerar({ perfil: 'PSICOLOGO_CLINICO', usos_maximos: 1, validade_dias: 7 });
    abrir('/cadastro');
    await userEvent.type(screen.getByLabelText('Código'), codigo!);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.type(await screen.findByLabelText('Nome completo'), 'Rui Lopes');
    await userEvent.type(screen.getByLabelText('E-mail'), 'rui@clinica.br');
    await userEvent.type(screen.getByLabelText('Senha'), '12345678');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), '12345678');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('Escreva o número do registro no CRP.')).toBeInTheDocument();
    expect(screen.getByText('Use a sigla do estado, como PR.')).toBeInTheDocument();
  });
});

describe('código de vínculo: estudante gera, profissional usa, estudante confirma', () => {
  it('fluxo completo pelas telas', async () => {
    // 1. Estudante gera o código no Perfil.
    const perfil = abrir('/estudante/perfil');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar código' }));
    const codigo = (await screen.findByText(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/)).textContent!;
    expect(screen.getByText(/Só pode ser usado uma vez/)).toBeInTheDocument();
    perfil.unmount();

    // 2. Professor (sem vínculo com a Ana) usa o código.
    entrarComoProfissional('prof-3');
    const escola = abrir('/escola/estudantes');
    expect(screen.queryByText('Ana L.')).toBeNull();
    await userEvent.type(screen.getByLabelText('Código do estudante'), codigo);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Pedido enviado para Ana (8º A). Quando aceitar, aparece na sua lista.')).toBeInTheDocument();
    expect(screen.getByText('Aguardando o estudante aceitar')).toBeInTheDocument();
    // Antes do aceite, nada da Ana aparece na lista do professor.
    expect(screen.queryByText('Ana L.')).toBeNull();
    escola.unmount();

    // 3. Estudante vê o pedido no Início e aceita no Perfil.
    const inicio = abrir('/estudante');
    expect(await screen.findByRole('link', { name: 'Júlio Freitas quer te acompanhar' })).toHaveAttribute('href', '/estudante/perfil');
    inicio.unmount();
    abrir('/estudante/perfil');
    const pedidos = await screen.findByRole('region', { name: 'Pedidos para te acompanhar' });
    expect(within(pedidos).getByText(/usou o seu código e quer te acompanhar/)).toBeInTheDocument();
    await userEvent.click(within(pedidos).getByRole('button', { name: 'Aceitar Júlio Freitas' }));
    expect(await screen.findByText('Pronto! Júlio Freitas agora acompanha você.')).toBeInTheDocument();

    // 4. Agora o professor acompanha a Ana.
    expect(api.escola.estudantes('prof-3').some((e) => e.id === 'est-1')).toBe(true);
  });

  it('recusar não cria vínculo', async () => {
    const { codigo } = await codigoVinculo.gerar(ESTUDANTE);
    await resgate.usar(PROF3, codigo!, () => false);
    abrir('/estudante/perfil');
    await userEvent.click(await screen.findByRole('button', { name: 'Recusar Júlio Freitas' }));
    expect(await screen.findByText('Pedido recusado. Júlio Freitas não vai ver suas pausas.')).toBeInTheDocument();
    expect(api.escola.estudantes('prof-3').some((e) => e.id === 'est-1')).toBe(false);
  });

  it('o código vale uma vez, e gerar outro cancela o anterior', async () => {
    const primeiro = await codigoVinculo.gerar(ESTUDANTE);
    const segundo = await codigoVinculo.gerar(ESTUDANTE);
    await expect(resgate.usar(PROF3, primeiro.codigo!, () => false)).rejects.toThrow('Código inválido ou expirado');
    await resgate.usar(PROF3, segundo.codigo!, () => false);
    await expect(resgate.usar(PROF3, segundo.codigo!, () => false)).rejects.toThrow('Código inválido ou expirado');
  });

  it('quem já acompanha o estudante é avisado e o código continua valendo', async () => {
    const { codigo } = await codigoVinculo.gerar(ESTUDANTE);
    entrarComoProfissional('prof-1'); // já acompanha a Ana
    abrir('/escola/estudantes');
    await userEvent.type(screen.getByLabelText('Código do estudante'), codigo!);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Você já acompanha este estudante.')).toBeInTheDocument();
    await expect(resgate.usar(PROF3, codigo!, () => false)).resolves.toMatchObject({ status: 'AGUARDANDO_ESTUDANTE' });
  });
});

describe('acessibilidade das telas de código (axe)', () => {
  it.each(['/cadastro', '/admin/codigos', '/escola/estudantes', '/estudante/perfil'])('%s', async (caminho) => {
    const { container } = abrir(caminho);
    await screen.findAllByRole('heading');
    expect(await violacoes(container)).toEqual([]);
  });
});
