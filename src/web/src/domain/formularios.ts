export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function mascararData(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.slice(0, 2) + (d.length > 2 ? '/' + d.slice(2, 4) : '') + (d.length > 4 ? '/' + d.slice(4) : '');
}

export function mascararTelefone(valor: string) {
  let d = valor.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}` + (d.length > corte ? '-' + d.slice(corte) : '');
}

export function dataParaISO(valor: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null;
  const [dia, mes, ano] = valor.split('/').map(Number);
  const data = new Date(0);
  data.setFullYear(ano, mes - 1, dia);
  if (ano < 1 || data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export const telefoneValido = (valor: string) => !valor || /^\d{10,11}$/.test(valor.replace(/\D/g, ''));
export function nascimentoValido(valor: string) {
  const iso = dataParaISO(valor);
  const hoje = new Date();
  const limite = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return Boolean(iso && iso <= limite);
}
