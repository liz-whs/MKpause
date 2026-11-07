import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Field } from './Field';
import { dataParaISO, mascararData, mascararTelefone, nascimentoValido } from '../../domain/formularios';

function Formulario() {
  const [data, setData] = useState('');
  const [telefone, setTelefone] = useState('');
  return <><Field label="Data" mask="data" value={data} onChange={(e) => setData(e.target.value)} />
    <Field label="Telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
    <Field label="Nome" /><Field label="Resumo" multiline maxLength={2000} /></>;
}

it('formata durante a digitação, permite apagar e limita data e telefone', async () => {
  const user = userEvent.setup();
  render(<Formulario />);
  const data = screen.getByLabelText('Data');
  await user.type(data, '12032012');
  expect(data).toHaveValue('12/03/2012');
  await user.type(data, '99');
  expect(data).toHaveValue('12/03/2012');
  await user.keyboard('{Backspace}');
  expect(data).toHaveValue('12/03/201');
  await user.clear(data);
  expect(data).toHaveValue('');
  await user.type(screen.getByLabelText('Telefone'), '41999991234');
  expect(screen.getByLabelText('Telefone')).toHaveValue('(41) 99999-1234');
  expect(screen.getByLabelText('Nome')).toHaveAttribute('maxlength', '150');
  expect(screen.getByLabelText('Resumo')).toHaveAttribute('maxlength', '2000');
});

it('aceita colagem formatada e telefone com código do Brasil', async () => {
  const user = userEvent.setup();
  render(<Formulario />);
  await user.click(screen.getByLabelText('Data'));
  await user.paste('29/02/2024');
  expect(screen.getByLabelText('Data')).toHaveValue('29/02/2024');
  await user.click(screen.getByLabelText('Telefone'));
  await user.paste('+55 (41) 99999-1234');
  expect(screen.getByLabelText('Telefone')).toHaveValue('(41) 99999-1234');
  expect(mascararTelefone('4133334444')).toBe('(41) 3333-4444');
  expect(mascararData('12032012999')).toBe('12/03/2012');
});

it('valida calendário e impede nascimento no futuro', () => {
  expect(dataParaISO('29/02/2024')).toBe('2024-02-29');
  expect(dataParaISO('29/02/2023')).toBeNull();
  expect(dataParaISO('31/04/2024')).toBeNull();
  expect(dataParaISO('00/01/2024')).toBeNull();
  expect(nascimentoValido('01/01/9999')).toBe(false);
});
