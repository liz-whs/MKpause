import { dataParaISO, nascimentoValido, telefoneValido } from '../../domain/formularios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { cadastro, type CodigoVerificado, type DadosCadastro, type PerfilCodigo } from '../../data/codigos';
import { api } from '../../data/api';
import type { Perfil } from '../../data/servidor';
import { BackButton, FocusTopBar } from '../../components/student/FocusTopBar';
import { ScreenTitle } from '../../components/student/Bits';
import { AvisoSimulacao } from '../../components/ui/AvisoSimulacao';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { emocaoPorId } from '../../domain/emocoes';
import { DESTINO_DO_PERFIL, Pagina, Rodape } from './Onboarding';
import { t } from '../../i18n';

export const NOME_DO_PERFIL: Record<PerfilCodigo, string> = {
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor(a)',
  PSICOLOGO_ESCOLAR: 'Psicólogo(a) escolar',
  PSICOLOGO_CLINICO: 'Psicólogo(a) clínico(a)',
};

const SENHA_MINIMA = 8;

type Campos = Omit<DadosCadastro, 'codigo'> & { confirmar: string };
const VAZIO: Campos = {
  nome_completo: '', email: '', senha: '', confirmar: '', turma: '', instituicao_ensino: '', data_nascimento: '',
  cargo: '', telefone: '', registro_profissional: '', estado_registro: '',
};

function validar(c: Campos, perfil: PerfilCodigo): Partial<Record<keyof Campos, string>> {
  const e: Partial<Record<keyof Campos, string>> = {};
  if (!c.nome_completo.trim()) e.nome_completo = t('Escreva o nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = t('Use um e-mail completo, como nome@escola.edu.br.');
  if (c.senha.length < SENHA_MINIMA) e.senha = t('A senha precisa de pelo menos {n} caracteres.', { n: SENHA_MINIMA });
  else if (c.confirmar !== c.senha) e.confirmar = t('As senhas não são iguais.');
  if (perfil === 'PSICOLOGO_ESCOLAR' || perfil === 'PSICOLOGO_CLINICO') {
    if (!c.registro_profissional?.trim()) e.registro_profissional = t('Escreva o número do registro no CRP.');
    if (!/^[A-Za-z]{2}$/.test(c.estado_registro?.trim() ?? '')) e.estado_registro = t('Use a sigla do estado, como PR.');
  }
  if (c.data_nascimento && !nascimentoValido(c.data_nascimento)) e.data_nascimento = t('Informe uma data válida, sem estar no futuro.');
  if (!telefoneValido(c.telefone ?? '')) e.telefone = t('Informe um telefone com DDD e 10 ou 11 dígitos.');
  return e;
}

/** Só os campos que valem para o perfil do código (o resto não vai para o servidor). */
function corpo(codigo: string, c: Campos, perfil: PerfilCodigo, info: CodigoVerificado): DadosCadastro {
  const base: DadosCadastro = { codigo, nome_completo: c.nome_completo.trim(), email: c.email.trim().toLowerCase(), senha: c.senha };
  const opcional = (v?: string) => (v?.trim() ? v.trim() : undefined);
  if (perfil === 'ESTUDANTE') {
    return {
      ...base,
      turma: info.turma ?? opcional(c.turma),
      instituicao_ensino: info.instituicao_ensino ?? opcional(c.instituicao_ensino),
      data_nascimento: c.data_nascimento ? dataParaISO(c.data_nascimento)! : undefined,
    };
  }
  if (perfil === 'PROFESSOR') {
    return { ...base, cargo: opcional(c.cargo), instituicao_ensino: opcional(c.instituicao_ensino), telefone: opcional(c.telefone) };
  }
  return {
    ...base,
    registro_profissional: c.registro_profissional!.trim(),
    estado_registro: c.estado_registro!.trim().toUpperCase(),
    telefone: opcional(c.telefone),
    ...(perfil === 'PSICOLOGO_ESCOLAR' ? { instituicao_ensino: opcional(c.instituicao_ensino) } : {}),
  };
}

/** Cadastro com código: 1) confere o código; 2) dados do perfil; 3) pronto. */
export function CadastroComCodigo() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [info, setInfo] = useState<CodigoVerificado | null>(null);
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [simulado, setSimulado] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  const muda = (k: keyof Campos) => ({
    value: campos[k] ?? '',
    onChange: (e: { target: { value: string } }) => setCampos({ ...campos, [k]: e.target.value }),
    error: erros[k],
  });

  async function conferir(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    if (!codigo.trim()) {
      setErro(t('Digite o código de cadastro.'));
      return;
    }
    setEnviando(true);
    try {
      setInfo(await cadastro.verificar(codigo));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    if (!info) return;
    const encontrados = validar(campos, info.perfil);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErro(undefined);
    setEnviando(true);
    try {
      const r = await cadastro.enviar(corpo(codigo, campos, info.perfil, info));
      if (r.simulado) {
        setSimulado(true);
        return;
      }
      // O servidor já entrou na conta nova: carrega os dados e vai para a área do perfil.
      await api.sincronizar();
      navigate(DESTINO_DO_PERFIL[(r.conta?.perfil ?? 'estudante') as Perfil]);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (simulado) {
    return (
      <Pagina centro>
        <img src={emocaoPorId('feliz').imagem} alt="" className="size-24 object-contain" />
        <ScreenTitle>{t('Cadastro conferido')}</ScreenTitle>
        <p className="text-muted">
          {t('Na simulação a conta não é criada. Quando o servidor tiver esta função, você entra direto daqui.')}
        </p>
        <Rodape>
          <Button to="/entrar" block>
            {t('Voltar para Entrar')}
          </Button>
        </Rodape>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <FocusTopBar
        back={
          info ? (
            <button
              type="button"
              aria-label={t('Voltar')}
              onClick={() => {
                setInfo(null);
                setErro(undefined);
              }}
              className="flex size-12 flex-none items-center justify-center rounded-full bg-surface text-ink hover:bg-peony"
            >
              <Icon name="voltar" />
            </button>
          ) : (
            <BackButton to="/entrar" />
          )
        }
      >
        <span className="text-caption font-semibold text-muted">{info ? t('Etapa {atual} de {total}', { atual: 2, total: 2 }) : t('Etapa {atual} de {total}', { atual: 1, total: 2 })}</span>
      </FocusTopBar>
      <AvisoSimulacao />

      {!info ? (
        <>
          <span className="flex size-16 items-center justify-center rounded-full bg-lavender">
            <Icon name="chave" size={32} />
          </span>
          <ScreenTitle>{t('Código de cadastro')}</ScreenTitle>
          <p className="text-muted">{t('A escola te entrega um código para criar a sua conta. Ele vale por pouco tempo.')}</p>
          <form noValidate onSubmit={conferir} className="flex flex-col gap-4.5">
            <Field
              label={t('Código')}
              placeholder="XXXXX-XXXXX"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              error={erro}
              className="[&_input]:font-mono [&_input]:tracking-widest"
            />
            <Button type="submit" block disabled={enviando} aria-busy={enviando}>
              {enviando ? t('Conferindo…') : t('Continuar')}
            </Button>
          </form>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Badge icon="check" className="self-start">
              {t('Código válido · {perfil}', { perfil: t(NOME_DO_PERFIL[info.perfil]) })}
            </Badge>
            <ScreenTitle>{t('Seus dados')}</ScreenTitle>
          </div>
          <form noValidate onSubmit={cadastrar} className="flex flex-col gap-4.5">
            <Field label={t('Nome completo')} autoComplete="name" {...muda('nome_completo')} />
            <Field label={t('E-mail')} type="email" autoComplete="email" placeholder={t('nome@escola.edu.br')} {...muda('email')} />

            {info.perfil === 'ESTUDANTE' && (
              <>
                {info.turma ? (
                  <Field label={t('Turma')} value={info.turma} readOnly hint={t('Definida pela escola.')} />
                ) : (
                  <Field label={t('Turma')} maxLength={80} optional {...muda('turma')} />
                )}
                {info.instituicao_ensino ? (
                  <Field label={t('Escola')} maxLength={160} value={info.instituicao_ensino} readOnly hint={t('Definida pela escola.')} />
                ) : (
                  <Field label={t('Escola')} maxLength={160} optional {...muda('instituicao_ensino')} />
                )}
                <Field label={t('Data de nascimento')} mask="data" placeholder={t('DD/MM/AAAA')} optional {...muda('data_nascimento')} />
              </>
            )}

            {info.perfil === 'PROFESSOR' && (
              <>
                <Field label={t('Disciplina ou cargo')} maxLength={120} optional placeholder={t('Ex.: Matemática')} {...muda('cargo')} />
                <Field label={t('Escola')} maxLength={160} optional {...muda('instituicao_ensino')} />
                <Field label={t('Telefone de contato')} type="tel" optional {...muda('telefone')} />
              </>
            )}

            {(info.perfil === 'PSICOLOGO_ESCOLAR' || info.perfil === 'PSICOLOGO_CLINICO') && (
              <>
                <div className="grid grid-cols-[1fr_7rem] gap-3">
                  <Field label={t('Registro no CRP')} maxLength={40} inputMode="numeric" placeholder="08/12345" {...muda('registro_profissional')} />
                  <Field label={t('Estado (UF)')} maxLength={2} autoCapitalize="characters" placeholder="PR" {...muda('estado_registro')} />
                </div>
                {info.perfil === 'PSICOLOGO_ESCOLAR' && <Field label={t('Escola')} maxLength={160} optional {...muda('instituicao_ensino')} />}
                <Field label={t('Telefone de contato')} type="tel" optional {...muda('telefone')} />
              </>
            )}

            <Field
              label={t('Senha')}
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              hint={t('Pelo menos {n} caracteres.', { n: SENHA_MINIMA })}
              {...muda('senha')}
            />
            <Field label={t('Confirme a senha')} type={mostrar ? 'text' : 'password'} autoComplete="new-password" {...muda('confirmar')} />
            <button
              type="button"
              aria-pressed={mostrar}
              onClick={() => setMostrar((v) => !v)}
              className="min-h-12 self-start px-1 font-semibold underline underline-offset-4"
            >
              {mostrar ? t('Ocultar senha') : t('Mostrar senha')}
            </button>

            {erro && (
              <p role="alert" className="font-semibold text-dark">
                {erro}
              </p>
            )}
            <Button type="submit" block disabled={enviando} aria-busy={enviando}>
              {enviando ? t('Criando conta…') : t('Criar conta')}
            </Button>
          </form>
        </>
      )}
    </Pagina>
  );
}
