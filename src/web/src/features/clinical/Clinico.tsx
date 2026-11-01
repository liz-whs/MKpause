import { useState } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router';
import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { ehLeve, emocaoMaisComum, emocaoPorId } from '../../domain/emocoes';
import { dia, hora, iniciais, nomeCurto, quando } from '../../domain/formatos';
import { PAPEL_LABEL, type Profissional } from '../../domain/tipos';
import { profissionalLogado } from '../../state/ProContext';
import { ProLayout } from '../../components/layout/Layouts';
import {
  AlertBadge, Avatar, BackLink, EmocaoAntesDepois, LockNote, PageHeader, SearchField, StatCard, SuccessBanner,
} from '../../components/pro/Pro';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { cx } from '../../components/ui/cx';
import { NOME_ATIVIDADE, ObservacoesLista } from '../school/Escola';
import { t } from '../../i18n';

export function ClinicoLayout() {
  const eu = profissionalLogado('clinico');
  const pendentes = useDados(() => api.escola.alertas(eu.id).filter((a) => !a.vistoPor?.includes(eu.id)).length);
  return (
    <ProLayout
      perfil={PAPEL_LABEL[eu.papel]}
      usuario={{ nome: eu.nome, iniciais: eu.iniciais }}
      items={[
        { to: '/clinico/acompanhados', label: 'Acompanhados', icon: 'pessoas' },
        { to: '/clinico/alertas', label: 'Alertas e avisos', icon: 'alerta', count: pendentes },
      ]}
    />
  );
}

const DUAS_SEMANAS = 14 * 24 * 60 * 60_000;

export function ClinicoAcompanhados() {
  const eu = profissionalLogado('clinico');
  const estudantes = useDados(() => api.escola.estudantes(eu.id));
  const alertas = useDados(() => api.escola.alertas(eu.id));
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const lista = estudantes.filter((e) => !termo || e.nome.toLowerCase().includes(termo) || e.escola.toLowerCase().includes(termo));

  return (
    <>
      <PageHeader titulo={t('Estudantes acompanhados')} descricao={t('Só aparecem os estudantes vinculados a você.')} />
      <div className="flex flex-wrap gap-4">
        <SearchField label={t('Buscar estudante')} placeholder={t('Nome ou escola')} value={busca} onChange={setBusca} />
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
        {lista.map((e) => {
          const sessoes = api.escola.sessoes(eu.id, e.id);
          const leves = sessoes.filter((s) => ehLeve(s.depois)).length;
          const aberto = alertas.find((a) => a.estudanteId === e.id && !a.vistoPor?.includes(eu.id));
          return (
            <li key={e.id}>
              <Link
                to={`/clinico/estudantes/${e.id}`}
                className="flex h-full flex-col gap-3 rounded-card-lg bg-surface p-5 no-underline hover:bg-surface-hover hover:text-ink"
              >
                <span className="flex items-center gap-3">
                  <Avatar iniciais={iniciais(e.nome)} />
                  <span className="flex flex-col">
                    <strong className="text-button">{nomeCurto(e.nome)}</strong>
                    <span className="text-caption text-muted">
                      {e.turma} · {e.escola}
                    </span>
                  </span>
                </span>
                <span>
                  {sessoes.length === 1 ? t('{n} de {total} pausa terminou mais leve', { n: leves, total: sessoes.length }) : t('{n} de {total} pausas terminaram mais leves', { n: leves, total: sessoes.length })}
                </span>
                <span className="text-caption text-muted">{t('Última pausa:')} {sessoes[0] ? quando(sessoes[0].em) : t('nenhuma ainda')}</span>
                {aberto && <AlertBadge alerta={aberto} />}
              </Link>
            </li>
          );
        })}
      </ul>
      {lista.length === 0 && <p role="status" className="text-muted">{t('Nenhum estudante encontrado.')}</p>}
    </>
  );
}

function Cabecalho({ estudanteId, eu }: { estudanteId: string; eu: Profissional }) {
  const e = useDados(() => api.escola.estudante(eu.id, estudanteId));
  const ficha = useDados(() => api.clinico.ficha(eu.id, estudanteId));
  const aberto = useDados(() => api.escola.alertas(eu.id).find((a) => a.estudanteId === estudanteId && !a.vistoPor?.includes(eu.id)));
  const aba = 'inline-flex min-h-12 items-center rounded-pill px-4.5 font-semibold no-underline';

  return (
    <>
      <BackLink to="/clinico/acompanhados">{t('Acompanhados')}</BackLink>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar iniciais={iniciais(e.nome)} tamanho="lg" />
        <div className="flex flex-[1_1_280px] flex-col gap-1">
          <h1 className="text-screen md:text-screen-lg">{nomeCurto(e.nome)}</h1>
          <span className="text-muted">
            {e.turma} · {e.escola}
            {ficha?.inicio && ` · ${t('acompanhamento desde {data}', { data: ficha.inicio })}`}
          </span>
        </div>
        {aberto && <AlertBadge alerta={aberto} />}
      </div>
      <nav aria-label={t('Seções do estudante')}>
        <ul className="flex flex-wrap gap-2">
          {[
            { to: `/clinico/estudantes/${estudanteId}`, label: 'Histórico e humor', end: true },
            { to: `/clinico/estudantes/${estudanteId}/ficha`, label: 'Ficha de acompanhamento' },
          ].map((aba_) => (
            <li key={aba_.to}>
              <NavLink
                to={aba_.to}
                end={aba_.end}
                className={({ isActive }) =>
                  cx(aba, isActive ? 'bg-ink text-surface hover:text-surface' : 'bg-surface hover:bg-peony hover:text-ink')
                }
              >
                {t(aba_.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function useAcessoClinico() {
  const { id = '' } = useParams();
  const eu = profissionalLogado('clinico');
  const vinculado = useDados(() => api.escola.estudantes(eu.id).some((e) => e.id === id));
  return { id, eu, vinculado };
}

export function ClinicoEstudante() {
  const { id, eu, vinculado } = useAcessoClinico();
  const sessoes = useDados(() => (vinculado ? api.escola.sessoes(eu.id, id) : []));
  const observacoes = useDados(() => (vinculado ? api.escola.observacoes(eu.id, id) : []));
  if (!vinculado) return <Navigate to="/clinico/acompanhados" replace />;

  const recentes = sessoes.filter((s) => Date.now() - new Date(s.em).getTime() <= DUAS_SEMANAS);
  const comum = emocaoMaisComum(recentes.map((s) => s.antes));

  return (
    <>
      <Cabecalho estudanteId={id} eu={eu} />
      <div className="flex flex-wrap gap-3.5">
        <StatCard valor={String(recentes.length)} rotulo={t('pausas nas últimas 2 semanas')} />
        <StatCard valor={t('{n} de {total}', { n: recentes.filter((s) => ehLeve(s.depois)).length, total: recentes.length })} rotulo={t('terminaram mais leves')} />
        <StatCard valor={comum ? emocaoPorId(comum).label : '—'} rotulo={t('emoção inicial mais comum')} />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <Card as="section" aria-labelledby="t-sessoes" className="flex min-w-0 flex-[3_1_480px] flex-col">
          <h2 id="t-sessoes" className="text-section">
            {t('Sessões e registros de humor')}
          </h2>
          {sessoes.length === 0 && <p className="mt-2 text-muted">{t('Nenhuma pausa ainda.')}</p>}
          <ul>
            {sessoes.map((s) => {
              return (
                <li key={s.id} className="flex flex-col gap-2 border-b-2 border-bg py-4">
                  <span className="flex flex-wrap items-center gap-2.5">
                    <strong>{dia(s.em)}</strong>
                    <span className="text-caption text-muted">
                      {hora(s.em)} · {t(NOME_ATIVIDADE[s.atividade])}
                    </span>
                  </span>
                  <EmocaoAntesDepois antes={s.antes} depois={s.depois} />
                  {s.relato && <span className="text-caption text-muted">{t('Relato do estudante: “{relato}”', { relato: s.relato })}</span>}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card as="section" aria-labelledby="t-obs-escola" className="flex min-w-0 flex-[2_1_320px] flex-col gap-3">
          <h2 id="t-obs-escola" className="text-section">
            {t('Observações da escola')}
          </h2>
          {observacoes.length === 0 && <p className="text-muted">{t('Nenhuma observação ainda.')}</p>}
          <ObservacoesLista observacoes={observacoes} />
          <LockNote>{t('Somente leitura. Quem registra são professores e psicólogos escolares.')}</LockNote>
        </Card>
      </div>
      <LockNote>{t('Os registros apoiam o acompanhamento e não são diagnóstico.')}</LockNote>
    </>
  );
}

export function ClinicoFicha() {
  const { id, eu, vinculado } = useAcessoClinico();
  const ficha = useDados(() => (vinculado ? api.clinico.ficha(eu.id, id) : undefined));
  const registros = useDados(() => (vinculado ? api.clinico.registros(eu.id, id) : []));
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);
  if (!vinculado) return <Navigate to="/clinico/acompanhados" replace />;

  const dados: [string, string][] = ficha
    ? [
        [t('Responsável'), `${ficha.responsavel} · ${t(ficha.parentesco)}${ficha.convite?.aceito ? ` · ${t('vínculo confirmado')}` : ''}`],
        [t('Contato do responsável'), ficha.contato],
        [t('Início do acompanhamento'), ficha.inicio || '—'],
        [t('Encaminhamento'), ficha.encaminhamento || '—'],
      ]
    : [];

  return (
    <>
      <Cabecalho estudanteId={id} eu={eu} />
      <div className="flex flex-wrap items-start gap-6">
        <Card as="section" aria-labelledby="t-dados" className="flex min-w-0 flex-[2_1_340px] flex-col gap-1">
          <h2 id="t-dados" className="text-section">
            {t('Dados da ficha')}
          </h2>
          {!ficha && <p className="text-muted">{t('A administração ainda não preencheu a ficha.')}</p>}
          <dl>
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex flex-col gap-0.5 border-b-2 border-bg py-3">
                <dt className="text-caption font-semibold text-muted">{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <LockNote>{t('Dados mantidos pela administração da escola.')}</LockNote>
          </div>
        </Card>
        <Card as="section" aria-labelledby="t-registros" className="flex min-w-0 flex-[3_1_440px] flex-col gap-3.5">
          <h2 id="t-registros" className="text-section">
            {t('Registros de acompanhamento')}
          </h2>
          {salvo && <SuccessBanner>{t('Registro salvo na ficha.')}</SuccessBanner>}
          <form
            noValidate
            className="flex flex-col gap-3.5"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!texto.trim()) {
                setErro(t('Escreva o registro antes de salvar.'));
                return;
              }
              api.clinico.adicionarRegistro(eu.id, id, texto.trim());
              setTexto('');
              setErro(undefined);
              setSalvo(true);
            }}
          >
            <Field
              label={t('Novo registro')}
              multiline
              placeholder={t('Resumo do acompanhamento')}
              hint={t('Só psicólogos clínicos vinculados veem.')}
              value={texto}
              error={erro}
              onChange={(ev) => {
                setTexto(ev.target.value);
                setSalvo(false);
              }}
            />
            <Button type="submit" size="md" className="self-start">
              {t('Salvar registro')}
            </Button>
          </form>
          <ul className="flex flex-col gap-2">
            {registros.map((r) => (
              <li key={r.id} className="flex gap-3.5 rounded-[18px] bg-peony px-4 py-3.5">
                <strong className="flex-none text-caption">{dia(r.em)}</strong>
                <span>{r.texto}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

export function ClinicoAlertas() {
  const eu = profissionalLogado('clinico');
  const estudantes = useDados(() => api.escola.estudantes(eu.id));
  const alertas = useDados(() => api.escola.alertas(eu.id));
  const avisos = useDados(() => api.escola.avisos(eu.id));
  const nome = (id: string) => {
    const e = estudantes.find((x) => x.id === id);
    return e ? nomeCurto(e.nome) : '';
  };
  const turma = (id: string) => estudantes.find((x) => x.id === id)?.turma ?? '';
  const fora = avisos.filter((a) => !a.voltouEm);
  const voltaram = avisos.filter((a) => a.voltouEm).slice(0, 3);

  return (
    <>
      <PageHeader titulo={t('Alertas e avisos')} descricao={t('Dos estudantes que você acompanha.')} />
      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="t-alertas" className="flex min-w-0 flex-[3_1_460px] flex-col gap-3">
          <h2 id="t-alertas" className="text-section md:text-section-lg">
            {t('Alertas')}
          </h2>
          {alertas.length === 0 && <p className="text-muted">{t('Nenhum alerta agora.')}</p>}
          {alertas.map((a) => (
            <Card as="article" key={a.id} className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <AlertBadge alerta={a} />
                <strong className="text-button">{nome(a.estudanteId)}</strong>
                <span className="ml-auto text-caption text-muted">{quando(a.criadoEm)}</span>
              </div>
              <p>{t('Tocou em “Não estou bem”. Alerta automático.')}</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="md" to={`/clinico/estudantes/${a.estudanteId}`}>
                  {t('Ver histórico')}
                </Button>
                {a.vistoPor?.includes(eu.id) ? (
                  <Badge tone="leaf" icon="check">
                    {t('Visto por você')}
                  </Badge>
                ) : (
                  <Button size="md" variant="outline" onClick={() => api.escola.marcarVisto(eu.id, a.id)}>
                    <Icon name="check" size={18} />
                    {t('Marcar como visto')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </section>
        <section aria-labelledby="t-avisos" className="flex min-w-0 flex-[2_1_320px] flex-col gap-3">
          <h2 id="t-avisos" className="text-section md:text-section-lg">
            {t('Avisos de saída')}
          </h2>
          {fora.length === 0 && <p className="text-muted">{t('Ninguém fora da sala agora.')}</p>}
          {fora.map((a) => (
            <article key={a.id} className="flex flex-col gap-1.5 rounded-card-lg bg-sky p-5">
              <Badge icon="porta">{t('Fora da sala agora')}</Badge>
              <strong className="font-display text-section font-semibold">
                {nome(a.estudanteId)} · {turma(a.estudanteId)}
              </strong>
              <span className="font-semibold">
                {t('Desde {hora}', { hora: hora(a.desde) })}
                {a.destino && ` · ${t(a.destino)}`}
              </span>
            </article>
          ))}
          {voltaram.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-[20px] bg-surface px-4.5 py-4">
              <Icon name="check" size={20} className="text-jungle" />
              {t('{nome} voltou às {hora}', { nome: nome(a.estudanteId), hora: hora(a.voltouEm!) })}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
