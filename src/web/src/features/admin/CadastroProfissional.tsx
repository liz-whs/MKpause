import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { api, type NovoProfissional } from '../../data/api';
import type { PapelProfissional } from '../../domain/tipos';
import { telefoneValido, UFS } from '../../domain/formularios';
import { agir } from '../../state/acoes';
import { t } from '../../i18n';
import { BackLink, PageHeader, SelectField } from '../../components/pro/Pro';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const TITULOS: Record<PapelProfissional, string> = {
  professor: 'Cadastrar professor', 'psicologo-escolar': 'Cadastrar psicólogo escolar', 'psicologo-clinico': 'Cadastrar psicólogo clínico',
};

export function CadastroProfissional() {
  const { papel } = useParams();
  if (!papel || !Object.hasOwn(TITULOS, papel)) return <Navigate to="/admin/usuarios" replace />;
  return <FormularioProfissional key={papel} papel={papel as PapelProfissional} />;
}

function FormularioProfissional({ papel }: { papel: PapelProfissional }) {
  const navigate = useNavigate();
  const [campos, setCampos] = useState({ nome_completo: '', email: '', senha: '', telefone: '', cargo: '', instituicao_ensino: '', registro_profissional: '', estado_registro: '' });
  const [tentou, setTentou] = useState(false);
  const psicologo = papel !== 'professor';
  const validar = () => {
    const e: Partial<Record<keyof typeof campos, string>> = {};
    if (!campos.nome_completo.trim()) e.nome_completo = t('Escreva o nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email)) e.email = t('Use um e-mail completo, como nome@escola.edu.br.');
    if (campos.senha.length < 8) e.senha = t('Use pelo menos 8 caracteres.');
    if (!telefoneValido(campos.telefone)) e.telefone = t('Informe um telefone com DDD e 10 ou 11 dígitos.');
    if (psicologo && !campos.registro_profissional.trim()) e.registro_profissional = t('Escreva o número do registro no CRP.');
    if (psicologo && !UFS.includes(campos.estado_registro)) e.estado_registro = t('Use a sigla do estado, como PR.');
    return e;
  };
  const erros = tentou ? validar() : {};
  const campo = (nome: keyof typeof campos) => ({ value: campos[nome], error: erros[nome], onChange: (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [nome]: e.target.value })) });

  return <>
    <BackLink to="/admin/usuarios">{t('Usuários')}</BackLink>
    <PageHeader titulo={t(TITULOS[papel])} descricao={t('Campos com * precisam ser preenchidos.')} />
    <form noValidate className="flex max-w-215 flex-col gap-5 rounded-card bg-surface p-6" onSubmit={(e) => {
      e.preventDefault(); setTentou(true);
      if (Object.keys(validar()).length) return;
      const dados: NovoProfissional = { nome_completo: campos.nome_completo.trim(), email: campos.email.trim().toLowerCase(), senha: campos.senha,
        telefone: campos.telefone || undefined,
        ...(psicologo ? { registro_profissional: campos.registro_profissional.trim(), estado_registro: campos.estado_registro } : { cargo: campos.cargo.trim() || undefined }),
        ...(papel !== 'psicologo-clinico' ? { instituicao_ensino: campos.instituicao_ensino.trim() || undefined } : {}),
      };
      void agir(async () => {
        await api.admin.cadastrarProfissional(papel, dados);
        navigate('/admin/usuarios', { replace: true, state: { aba: papel } });
      }, 'Profissional cadastrado. Já pode entrar com e-mail e senha.');
    }}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <Field label={t('Nome completo *')} autoComplete="name" maxLength={150} {...campo('nome_completo')} />
        <Field label={t('E-mail *')} type="email" autoComplete="email" {...campo('email')} />
        <Field label={t('Senha do primeiro acesso *')} type="password" autoComplete="new-password" minLength={8} {...campo('senha')} />
        <Field label={t('Telefone de contato')} type="tel" autoComplete="tel-national" optional {...campo('telefone')} />
        {!psicologo && <Field label={t('Disciplina ou cargo')} maxLength={120} optional {...campo('cargo')} />}
        {papel !== 'psicologo-clinico' && <Field label={t('Escola')} maxLength={160} optional {...campo('instituicao_ensino')} />}
        {psicologo && <>
          <Field label={t('Registro no CRP *')} placeholder="08/12345" maxLength={40} {...campo('registro_profissional')} />
          <SelectField label={t('Estado (UF) *')} value={campos.estado_registro} onChange={(uf) => setCampos((c) => ({ ...c, estado_registro: uf }))}
            options={[{ value: '', label: 'Selecione' }, ...UFS.map((uf) => ({ value: uf, label: uf }))]} />
          {erros.estado_registro && <p role="alert">{erros.estado_registro}</p>}
        </>}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button to="/admin/usuarios" variant="outline">{t('Cancelar')}</Button>
        <Button type="submit">{t('Salvar cadastro')}</Button>
      </div>
    </form>
  </>;
}
