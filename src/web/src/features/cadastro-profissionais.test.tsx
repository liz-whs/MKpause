import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { rotas } from '../router';
import { api } from '../data/api';

beforeEach(() => { api.reiniciar(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

it.each([
  ['professor', 'Professores', 'Cadastrar professor'],
  ['psicologo-escolar', 'Psicólogos escolares', 'Cadastrar psicólogo escolar'],
  ['psicologo-clinico', 'Psicólogos clínicos', 'Cadastrar psicólogo clínico'],
] as const)('cadastra %s pela administração e retorna à aba correta', async (papel, aba, titulo) => {
  const user = userEvent.setup();
  const salvar = vi.spyOn(api.admin, 'cadastrarProfissional');
  const router = createMemoryRouter(rotas, { initialEntries: ['/admin/usuarios'] });
  render(<RouterProvider router={router} />);
  await user.click(screen.getByRole('button', { name: aba }));
  await user.click(screen.getByRole('link', { name: titulo }));
  expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
  await user.type(screen.getByLabelText('Nome completo *'), 'Profissional Novo');
  await user.type(screen.getByLabelText('E-mail *'), 'novo@escola.br');
  await user.type(screen.getByLabelText('Senha do primeiro acesso *'), 'Senha-segura123');
  await user.type(screen.getByLabelText(/Telefone de contato/), '4133334444');
  if (papel !== 'professor') {
    await user.type(screen.getByLabelText('Registro no CRP *'), '08/12345');
    await user.selectOptions(screen.getByLabelText('Estado (UF) *'), 'PR');
  } else {
    await user.type(screen.getByLabelText(/Disciplina ou cargo/), 'Matemática');
    expect(screen.queryByLabelText('Registro no CRP *')).toBeNull();
  }
  await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
  expect(await screen.findByText('Profissional Novo')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/admin/usuarios');
  expect(screen.getByRole('button', { name: aba })).toHaveAttribute('aria-pressed', 'true');
  expect(salvar).toHaveBeenCalledWith(papel, expect.objectContaining({ telefone: '(41) 3333-4444', email: 'novo@escola.br' }));
  expect(api.admin.profissionais(papel).some((p) => p.nome === 'Profissional Novo')).toBe(true);
});

it('exige os campos do psicólogo e preserva os dados se o servidor falhar', async () => {
  const user = userEvent.setup();
  const salvar = vi.spyOn(api.admin, 'cadastrarProfissional').mockRejectedValueOnce(new Error('Já existe uma conta com este e-mail.'));
  render(<RouterProvider router={createMemoryRouter(rotas, { initialEntries: ['/admin/profissionais/novo/psicologo-clinico'] })} />);
  await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
  expect(screen.getByText('Escreva o número do registro no CRP.')).toBeInTheDocument();
  expect(salvar).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Nome completo *'), 'Psicóloga Nova');
  await user.type(screen.getByLabelText('E-mail *'), 'psico@escola.br');
  await user.type(screen.getByLabelText('Senha do primeiro acesso *'), 'Senha-segura123');
  await user.type(screen.getByLabelText('Registro no CRP *'), '08/12345');
  await user.selectOptions(screen.getByLabelText('Estado (UF) *'), 'PR');
  await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
  expect(await screen.findByText('Já existe uma conta com este e-mail.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nome completo *')).toHaveValue('Psicóloga Nova');
});
