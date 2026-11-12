import { dataBrasileira } from '../../domain/formatos';
import { AtividadesPorCategoria } from '../../components/student/AtividadesPorCategoria';
import { dataParaISO, nascimentoValido, telefoneValido } from '../../domain/formularios';
import { agir } from '../../state/acoes';
import { useCallback, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { TURMAS } from '../../data/mocks/escola';
import { dia, iniciais, nomeCurto } from '../../domain/formatos';
import { PAPEL_LABEL, type AtividadeId, type Estudante, type PapelProfissional, type Profissional } from '../../domain/tipos';
import { administradorLogado } from '../../state/ProContext';
import { ProLayout } from '../../components/layout/Layouts';
import {
  Avatar, BackLink, ConfirmDialog, LockNote, PageHeader, SearchField, SelectField, SuccessBanner,
} from '../../components/pro/Pro';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { cx } from '../../components/ui/cx';
import { t } from '../../i18n';

export function AdminLayout() {
  const eu = administradorLogado();
  return (
    <ProLayout
      perfil={t('Administrador(a)')}
      usuario={{ id: eu.id, nome: eu.nome, iniciais: eu.iniciais }}
      perfilTo="/admin/perfil"
      items={[
        { to: '/admin/usuarios', label: 'Usuários', icon: 'pessoas' },
        { to: '/admin/vinculos', label: 'Vínculos', icon: 'vinculo' },
        { to: '/admin/fichas', label: 'Fichas', icon: 'ficha' },
        { to: '/admin/conteudos', label: 'Conteúdos', icon: 'camadas' },
        { to: '/admin/codigos', label: 'Códigos de cadastro', icon: 'chave' },
        { to: '/admin/emails', label: 'E-mails', icon: 'envelope' },
        { to: '/admin/indicadores', label: 'Indicadores da escola', icon: 'camadas' },
      ]}
    />
  );
}

/** Pede confirmação antes de uma ação; devolve o diálogo pronto para renderizar. */
function useConfirmacao() {
  const [pedido, setPedido] = useState<{ titulo: string; texto: string; confirmar: string; acao: () => void | Promise<void> } | null>(null);
  const cancelar = useCallback(() => setPedido(null), []);
  const dialogo = (
    <ConfirmDialog
      aberto={pedido !== null}
      titulo={pedido?.titulo ?? ''}
      texto={pedido?.texto ?? ''}
      confirmar={pedido?.confirmar ?? ''}
      onCancelar={cancelar}
      onConfirmar={() => {
        void agir(async () => { await pedido?.acao(); setPedido(null); });
      }}
    />
  );
  return { pedir: setPedido, dialogo };
}

function Situacao({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Badge tone="leaf" icon="check">
      {t('Ativo')}
    </Badge>
  ) : (
    <Badge tone="surface" icon="cadeado" className="bg-disabled">
      {t('Inativo')}
    </Badge>
  );
}

/* ───────────── Usuários ───────────── */

const ABAS = ['estudantes', 'professor', 'psicologo-escolar', 'psicologo-clinico'] as const;
type Aba = (typeof ABAS)[number];
const ABA_LABEL: Record<Aba, string> = {
  estudantes: 'Estudantes',
  professor: 'Professores',
  'psicologo-escolar': 'Psicólogos escolares',
  'psicologo-clinico': 'Psicólogos clínicos',
};

interface Linha {
  id: string;
  nome: string;
  info: string;
  ativo: boolean;
  tipo: 'estudante' | 'profissional';
}

export function AdminUsuarios() {
  const location = useLocation();
  const [aba, setAba] = useState<Aba>(() => ABAS.find((a) => a === (location.state as { aba?: string } | null)?.aba) ?? 'estudantes');
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState('');
  const { pedir, dialogo } = useConfirmacao();

  const linhas = useDados<Linha[]>(() =>
    aba === 'estudantes'
      ? api.admin.estudantes().map((e) => ({ id: e.id, nome: e.nome, info: `${e.turma} · ${t('Matrícula')} ${e.matricula}`, ativo: e.ativo, tipo: 'estudante' }))
      : api.admin.profissionais(aba).map((p) => ({ id: p.id, nome: p.nome, info: p.detalhe ?? '', ativo: p.ativo, tipo: 'profissional' })),
  );
  const termo = busca.trim().toLowerCase();
  const lista = linhas.filter((l) => !termo || l.nome.toLowerCase().includes(termo) || l.info.toLowerCase().includes(termo));

  const desativar = (l: Linha) =>
    pedir({
      titulo: t('Desativar este cadastro?'),
      texto: t('A pessoa não entra mais. O histórico continua e os vínculos ficam inativos.'),
      confirmar: t('Desativar'),
      acao: async () => {
        if (l.tipo === 'estudante') await api.admin.desativarEstudante(l.id);
        else await api.admin.desativarProfissional(l.id);
        setAviso(t('Cadastro desativado. O histórico foi mantido.'));
      },
    });

  return (
    <>
      <PageHeader
        titulo={t('Usuários')}
        descricao={t('Cadastre, consulte e desative usuários.')}
        acao={
          aba === 'estudantes' ? (
            <Button to="/admin/usuarios/novo">
              <Icon name="mais" size={20} />
              {t('Cadastrar estudante')}
            </Button>
          ) : <Button to={`/admin/profissionais/novo/${aba}`}><Icon name="mais" size={20} />{t(aba === 'professor' ? 'Cadastrar professor' : aba === 'psicologo-escolar' ? 'Cadastrar psicólogo escolar' : 'Cadastrar psicólogo clínico')}</Button>
        }
      />
      <ChoiceChips
        label={t('Tipo de usuário')}
        tone="ink"
        options={ABAS}
        labels={ABA_LABEL}
        value={aba}
        onChange={(v) => {
          setAba(v ?? 'estudantes');
          setAviso('');
        }}
      />
      <div className="flex flex-wrap gap-4">
        <SearchField label={t('Buscar')} placeholder={t('Nome, matrícula ou registro')} value={busca} onChange={setBusca} />
      </div>
      {aviso && <SuccessBanner>{aviso}</SuccessBanner>}
      <ul className="flex flex-col gap-2">
        {lista.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3.5 rounded-[20px] bg-surface px-4.5 py-3.5">
            <Avatar iniciais={iniciais(l.nome)} />
            <span className="flex flex-[1_1_220px] flex-col">
              <strong>{l.nome}</strong>
              <span className="text-caption text-muted">{l.info}</span>
            </span>
            <Situacao ativo={l.ativo} />
            {l.tipo === 'estudante' && (
              <Button size="md" variant="outline" to={`/admin/usuarios/${l.id}`} aria-label={t('Editar {nome}', { nome: l.nome })}>
                <Icon name="lapis" size={18} />
                {t('Editar')}
              </Button>
            )}
            {l.ativo && (
              <Button size="md" variant="outline" onClick={() => desativar(l)} aria-label={t('Desativar {nome}', { nome: l.nome })}>
                <Icon name="lixeira" size={18} />
                {t('Desativar')}
              </Button>
            )}
          </li>
        ))}
        {lista.length === 0 && <p role="status" className="text-muted">{t('Ninguém encontrado.')}</p>}
      </ul>
      {dialogo}
    </>
  );
}

/* ───────────── Cadastrar / editar estudante ───────────── */

type Campos = Pick<Estudante, 'nome' | 'nascimento' | 'email' | 'telefone' | 'matricula' | 'turma'> & { ativo: string };

function validar(c: Campos): Partial<Record<keyof Campos, string>> {
  const erros: Partial<Record<keyof Campos, string>> = {};
  if (!c.nome?.trim()) erros.nome = t('Escreva o nome completo.');
  if (!nascimentoValido(c.nascimento ?? '')) erros.nascimento = t('Informe uma data válida, sem estar no futuro.');
  if (!telefoneValido(c.telefone ?? '')) erros.telefone = t('Informe um telefone com DDD e 10 ou 11 dígitos.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email ?? '')) erros.email = t('Use um e-mail completo, como nome@escola.edu.br.');
  if (!c.matricula?.trim()) erros.matricula = t('Escreva a matrícula.');
  return erros;
}

export function AdminCadastro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existente = useDados(() => (id ? api.admin.estudantes().find((e) => e.id === id) : undefined));
  const [c, setC] = useState<Campos>({
    nome: existente?.nome ?? '',
    nascimento: existente?.nascimento ?? '',
    email: existente?.email ?? '',
    telefone: existente?.telefone ?? '',
    matricula: existente?.matricula ?? '',
    turma: existente?.turma ?? TURMAS[1],
    ativo: existente?.ativo === false ? 'Inativo' : 'Ativo',
  });
  const [senha, setSenha] = useState('');
  const [tentou, setTentou] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const erros = tentou ? validar(c) : {};

  const campo = (k: keyof Campos) => ({
    value: c[k] ?? '',
    error: erros[k],
    onChange: (e: { target: { value: string } }) => {
      setC({ ...c, [k]: e.target.value });
      setSalvo(false);
    },
  });

  function salvar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (Object.keys(validar(c)).length > 0 || (!existente && senha.length < 8)) return;
    const dados = { ...c, ativo: c.ativo === 'Ativo' };
    void agir(async () => {
    if (existente) await api.admin.atualizarEstudante(existente.id, dados);
    else {
      const novo = await api.admin.cadastrarEstudante(dados, senha);
      navigate(`/admin/usuarios/${novo.id}`, { replace: true });
    }
    setSalvo(true);
    });
  }

  return (
    <>
      <BackLink to="/admin/usuarios">{t('Usuários')}</BackLink>
      <PageHeader titulo={existente ? t('Editar estudante') : t('Cadastrar estudante')} descricao={t('Campos com * precisam ser preenchidos.')} />
      {salvo && <SuccessBanner>{existente ? t('Cadastro atualizado.') : t('Estudante cadastrado. Já pode entrar com e-mail e senha.')}</SuccessBanner>}
      <form noValidate onSubmit={salvar} className="flex max-w-215 flex-col gap-5.5 rounded-[26px] bg-surface p-7">
        <h2 className="text-section">{t('Dados pessoais')}</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
          <Field label={t('Nome completo *')} autoComplete="off" {...campo('nome')} />
          <Field label={t('Data de nascimento *')} placeholder={t('DD/MM/AAAA')} mask="data" {...campo('nascimento')} />
          <Field label={t('E-mail *')} type="email" placeholder={t('nome@escola.edu.br')} {...campo('email')} />
          {!existente && <Field label={t('Senha do primeiro acesso *')} type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} error={tentou && senha.length < 8 ? t('Use pelo menos 8 caracteres.') : undefined} />}
          <Field label={t('Telefone de contato')} type="tel" placeholder="(00) 00000-0000" {...campo('telefone')} />
        </div>
        <h2 className="text-section">{t('Escola')}</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
          <Field maxLength={30} label={t('Matrícula *')} {...campo('matricula')} />
          <SelectField label={t('Turma *')} value={c.turma} onChange={(v) => setC({ ...c, turma: v })} options={TURMAS.map((turma) => ({ value: turma, label: turma }))} />
          <SelectField label={t('Situação')} value={c.ativo} onChange={(v) => setC({ ...c, ativo: v })} options={['Ativo', 'Inativo'].map((situacao) => ({ value: situacao, label: situacao }))} />
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button to="/admin/usuarios" variant="outline" size="md">
            {t('Cancelar')}
          </Button>
          <Button type="submit" size="md">
            {t('Salvar cadastro')}
          </Button>
        </div>
      </form>
    </>
  );
}

/* ───────────── Vínculos ───────────── */

const SECOES: { papel: PapelProfissional; titulo: string }[] = [
  { papel: 'professor', titulo: 'Professores' },
  { papel: 'psicologo-escolar', titulo: 'Psicólogo escolar' },
  { papel: 'psicologo-clinico', titulo: 'Psicólogo clínico' },
];

function SecaoVinculo({ estudante, papel, titulo, onRemover }: { estudante: Estudante; papel: PapelProfissional; titulo: string; onRemover: (p: Profissional) => void }) {
  const vinculados = useDados(() => api.admin.profissionaisDe(estudante.id).filter((p) => p.papel === papel));
  const disponiveis = useDados(() => api.admin.profissionais(papel).filter((p) => p.ativo && !vinculados.some((v) => v.id === p.id)));
  const [escolhido, setEscolhido] = useState('');

  return (
    <Card as="section" aria-label={t(titulo)} className="flex flex-col gap-1">
      <h3 className="text-button">{t(titulo)}</h3>
      <ul>
        {vinculados.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 border-b-2 border-bg py-3">
            <Avatar iniciais={p.iniciais} tamanho="sm" />
            <span className="flex flex-[1_1_200px] flex-col">
              <strong>{p.nome}</strong>
              <span className="text-caption text-muted">{p.detalhe}</span>
            </span>
            <Button size="md" variant="outline" onClick={() => onRemover(p)} aria-label={t('Remover {nome}', { nome: p.nome })}>
              <Icon name="fechar" size={18} />
              {t('Remover')}
            </Button>
          </li>
        ))}
        {vinculados.length === 0 && <li className="py-3 text-muted">{t('Ninguém vinculado.')}</li>}
      </ul>
      {disponiveis.length > 0 && (
        <div className="flex flex-wrap items-end gap-2.5 pt-3">
          <SelectField
            label={t('Adicionar {papel}', { papel: PAPEL_LABEL[papel].toLowerCase() })}
            className="flex-[1_1_220px]"
            value={escolhido}
            onChange={setEscolhido}
            options={[{ value: '', label: 'Escolha' }, ...disponiveis.map((p) => ({ value: p.id, label: p.nome }))]}
          />
          <Button
            size="md"
            variant="outline"
            disabled={!escolhido}
            onClick={() => {
              void agir(async () => { await api.admin.vincular(estudante.id, escolhido); setEscolhido(''); });
            }}
          >
            <Icon name="mais" size={18} />
            {t('Adicionar')}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function AdminVinculos() {
  const estudantes = useDados(() => api.admin.estudantes().filter((e) => e.ativo));
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(estudantes[0]?.id ?? '');
  const [aviso, setAviso] = useState('');
  const { pedir, dialogo } = useConfirmacao();

  const termo = busca.trim().toLowerCase();
  const lista = estudantes.filter((e) => !termo || e.nome.toLowerCase().includes(termo));
  const selecionado = estudantes.find((e) => e.id === selecionadoId);
  const primeiroNome = selecionado?.nome.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader titulo={t('Vínculos')} descricao={t('Profissionais só veem estudantes vinculados a eles.')} />
      {aviso && <SuccessBanner>{aviso}</SuccessBanner>}
      <div className="flex flex-wrap items-start gap-6">
        <Card as="section" aria-label={t('Estudantes')} padding="compact" className="flex min-w-0 flex-[1_1_260px] flex-col gap-3">
          <SearchField label={t('Estudante')} placeholder={t('Buscar estudante')} value={busca} onChange={setBusca} className="" />
          <ul className="flex flex-col gap-1">
            {lista.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={e.id === selecionadoId}
                  onClick={() => {
                    setSelecionadoId(e.id);
                    setAviso('');
                  }}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left',
                    e.id === selecionadoId ? 'bg-peony' : 'hover:bg-surface-hover',
                  )}
                >
                  <Avatar iniciais={iniciais(e.nome)} tamanho="sm" />
                  <span className="flex flex-col">
                    <strong>{nomeCurto(e.nome)}</strong>
                    <span className="text-caption text-muted">{e.turma}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {selecionado && (
          <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-3.5">
            <div className="flex items-center gap-3.5">
              <Avatar iniciais={iniciais(selecionado.nome)} tamanho="lg" />
              <div className="flex flex-col">
                <h2 className="text-section md:text-section-lg">{nomeCurto(selecionado.nome)}</h2>
                <span className="text-caption text-muted">
                  {selecionado.turma} · {t('Matrícula')} {selecionado.matricula}
                </span>
              </div>
            </div>
            {SECOES.map((s) => (
              <SecaoVinculo
                key={`${selecionado.id}-${s.papel}`}
                estudante={selecionado}
                papel={s.papel}
                titulo={s.titulo}
                onRemover={(p) =>
                  pedir({
                    titulo: t('Remover este vínculo?'),
                    texto: t('{profissional} deixa de ver {estudante}. O que já foi registrado continua.', { profissional: p.nome, estudante: primeiroNome }),
                    confirmar: t('Remover vínculo'),
                    acao: async () => {
                      await api.admin.desvincular(selecionado.id, p.id);
                      setAviso(t('Vínculo removido. Os registros anteriores foram mantidos.'));
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
      {dialogo}
    </>
  );
}

/* ───────────── Fichas ───────────── */

export function AdminFichas() {
  const fichas = useDados(() => api.admin.fichas());
  const estudantes = useDados(() => api.admin.estudantes());
  const clinicos = useDados(() => api.admin.profissionais('psicologo-clinico').filter((p) => p.ativo));
  const [editando, setEditando] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const clinicoDe = (estudanteId: string) => api.admin.profissionaisDe(estudanteId).find((p) => p.papel === 'psicologo-clinico');
  const semFicha = estudantes.filter((e) => e.ativo && !fichas.some((f) => f.estudanteId === e.id));

  return (
    <>
      <PageHeader
        titulo={t('Fichas de acompanhamento')}
        descricao={t('Dados administrativos. Os registros clínicos ficam com o psicólogo clínico.')}
        acao={
          semFicha.length > 0 && (
            <Button
              onClick={() => {
                setEditando('nova');
                setSalvo(false);
              }}
            >
              <Icon name="mais" size={20} />
              {t('Nova ficha')}
            </Button>
          )
        }
      />
      <ul className="flex flex-col gap-2">
        {fichas.map((f) => {
          const e = estudantes.find((x) => x.id === f.estudanteId);
          const clinico = clinicoDe(f.estudanteId);
          if (!e) return null;
          return (
            <li key={f.estudanteId} className="flex flex-wrap items-center gap-3.5 rounded-[20px] bg-surface px-4.5 py-3.5">
              <Avatar iniciais={iniciais(e.nome)} />
              <span className="flex flex-[1_1_160px] flex-col">
                <strong>{nomeCurto(e.nome)}</strong>
                <span className="text-caption text-muted">{e.turma}</span>
              </span>
              <span className="flex-[1_1_200px] text-caption">{clinico?.nome ?? t('Sem psicólogo clínico')}</span>
              <span className="flex-[0_1_160px] text-caption text-muted">
                {t('Atualizada em {data}', { data: f.atualizadaEm ? dia(f.atualizadaEm) : '—' })}
              </span>
              {clinico ? (
                <Badge tone="leaf" icon="check">
                  {t('Em acompanhamento')}
                </Badge>
              ) : (
                <Badge tone="lavender" icon="info">
                  {t('Falta vínculo')}
                </Badge>
              )}
              <Button
                size="md"
                variant="outline"
                aria-label={t('Editar ficha de {nome}', { nome: e.nome })}
                onClick={() => {
                  setEditando(f.estudanteId);
                  setSalvo(false);
                }}
              >
                <Icon name="lapis" size={18} />
                {t('Editar')}
              </Button>
            </li>
          );
        })}
      </ul>
      {salvo && <SuccessBanner>{t('Ficha atualizada.')}</SuccessBanner>}
      {editando && (
        <FormFicha
          key={editando}
          estudanteId={editando === 'nova' ? null : editando}
          opcoesNova={semFicha}
          clinicos={clinicos}
          onSalvo={() => {
            setSalvo(true);
            setEditando(null);
          }}
        />
      )}
    </>
  );
}

function FormFicha({ estudanteId, opcoesNova, clinicos, onSalvo }: {
  estudanteId: string | null;
  opcoesNova: Estudante[];
  clinicos: Profissional[];
  onSalvo: () => void;
}) {
  const ficha = estudanteId ? api.admin.ficha(estudanteId) : undefined;
  const [alvo, setAlvo] = useState(estudanteId ?? opcoesNova[0]?.id ?? '');
  const [f, setF] = useState({
    responsavel: ficha?.responsavel ?? '',
    parentesco: ficha?.parentesco ?? '',
    contato: ficha?.contato ?? '',
    inicio: ficha?.inicio ? dataBrasileira(ficha.inicio) : '',
    encaminhamento: ficha?.encaminhamento ?? '',
  });
  const [clinico, setClinico] = useState(
    ficha?.clinicoIndicadoId ?? ((estudanteId && api.admin.profissionaisDe(estudanteId).find((p) => p.papel === 'psicologo-clinico')?.id) || ''),
  );
  const nome = api.admin.estudantes().find((e) => e.id === alvo)?.nome ?? '';
  const muda = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });

  return (
    <section aria-labelledby="t-editar" className="flex max-w-215 flex-col gap-4.5 rounded-[26px] bg-surface p-6.5">
      <h2 id="t-editar" className="text-section md:text-section-lg">
        {estudanteId ? t('Editar ficha · {nome}', { nome: nomeCurto(nome) }) : t('Nova ficha')}
      </h2>
      <form
        className="flex flex-col gap-4.5"
        onSubmit={(e) => {
          e.preventDefault();
          void agir(async () => {
            if (f.inicio && !dataParaISO(f.inicio)) throw new Error(t('Informe uma data válida no formato DD/MM/AAAA.'));
            await api.admin.salvarFicha({ estudanteId: alvo, ...f }, clinico || null); onSalvo();
          });
        }}
      >
        {!estudanteId && (
          <SelectField label={t('Estudante')} value={alvo} onChange={setAlvo} options={opcoesNova.map((e) => ({ value: e.id, label: e.nome }))} />
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
          <Field label={t('Responsável')} {...muda('responsavel')} />
          <Field maxLength={80} label={t('Parentesco')} placeholder={t('Ex.: Mãe')} {...muda('parentesco')} />
          <Field maxLength={254} label={t('Contato do responsável')} {...muda('contato')} />
          <Field label={t('Início do acompanhamento')} mask="data" placeholder={t('DD/MM/AAAA')} {...muda('inicio')} />
          <SelectField
            label={t('Psicólogo clínico')}
            value={clinico}
            onChange={setClinico}
            options={[{ value: '', label: 'Sem psicólogo clínico' }, ...clinicos.map((p) => ({ value: p.id, label: p.nome }))]}
          />
        </div>
        <Field maxLength={2000} label={t('Encaminhamento')} multiline rows={2} {...muda('encaminhamento')} />
        <LockNote>{t('Os registros clínicos não aparecem aqui.')}</LockNote>
        <div className="flex justify-end">
          <Button type="submit" size="md">
            {t('Salvar ficha')}
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ───────────── Conteúdos ───────────── */

const VISUAL: Record<AtividadeId, { icone: IconName; fundo: string }> = {
  respiracao: { icone: 'respiracao', fundo: 'bg-lavender' },
  pianopause: { icone: 'musica', fundo: 'bg-peony' },
  mkpotion: { icone: 'pocao', fundo: 'bg-leaf' },
  mkconnection: { icone: 'atividades', fundo: 'bg-leaf' },
  espiral: { icone: 'respiracao', fundo: 'bg-leaf' },
  chinchila: { icone: 'play', fundo: 'bg-lavender' },
  video: { icone: 'play', fundo: 'bg-sky' },
};

export function AdminConteudos() {
  const conteudos = useDados(() => api.admin.conteudos());

  return (
    <>
      <PageHeader titulo={t('Conteúdos')} descricao={t('Só os disponíveis aparecem para os estudantes.')} />
      <AtividadesPorCategoria atividades={conteudos} gradeClassName="" renderAtividade={(c) => {
        const v = VISUAL[c.id];
        return (
          <div className="flex flex-wrap items-center gap-4 rounded-card bg-surface px-5 py-4">
            <span className={cx('flex size-14 flex-none items-center justify-center rounded-[18px]', v.fundo)}>
              <Icon name={v.icone} size={28} />
            </span>
            <span className="flex flex-[1_1_240px] flex-col">
              <strong className="text-button">{t(c.nome)}</strong>
              <span className="text-caption text-muted">{t(c.tipo)}</span>
            </span>
            <span className="flex min-w-37.5 items-center gap-2.5 font-semibold">
              <button
                type="button"
                role="switch"
                aria-checked={c.disponivel}
                aria-label={t('{nome}: disponível para estudantes', { nome: t(c.nome) })}
                onClick={() => { void agir(() => api.admin.alternarConteudo(c.id)); }}
                className={cx('relative h-8.5 w-14 flex-none rounded-pill transition-colors', c.disponivel ? 'bg-ink' : 'bg-disabled')}
              >
                <span
                  className={cx(
                    'absolute top-1 size-6.5 rounded-full bg-surface transition-[left] motion-reduce:transition-none',
                    c.disponivel ? 'left-6.5' : 'left-1',
                  )}
                />
              </button>
              {c.disponivel ? t('Disponível') : t('Oculto')}
            </span>
          </div>
        );
      }} />
      {/* O catálogo é fixo: ocultar preserva o histórico das sessões. Não há exclusão. */}
      <LockNote>{t('Os conteúdos não são excluídos: oculte os que não devem aparecer para os estudantes.')}</LockNote>
    </>
  );
}
