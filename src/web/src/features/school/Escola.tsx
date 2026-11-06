import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { ehLeve } from '../../domain/emocoes';
import { dia, ehHoje, haQuanto, hora, iniciais, nomeCurto, quando } from '../../domain/formatos';
import { PAPEL_LABEL, type Alerta, type AtividadeId, type Estudante, type Profissional } from '../../domain/tipos';
import { profissionalLogado } from '../../state/ProContext';
import { ProLayout } from '../../components/layout/Layouts';
import {
  AlertBadge, Avatar, BackLink, EmocaoAntesDepois, LockNote, PageHeader, SearchField, SelectField, StatCard, SuccessBanner,
} from '../../components/pro/Pro';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import mascote from '../../assets/chinchila/mascote.svg';
import { t } from '../../i18n';
import { AdicionarComCodigo } from './AdicionarComCodigo';

export const NOME_ATIVIDADE: Record<AtividadeId, string> = {
  respiracao: 'Respire&Pause',
  pianopause: 'PianoPause',
  mkpotion: 'MK Potion',
  video: 'MK Breath',
};

const visto = (a: Alerta, profissionalId: string) => a.vistoPor?.includes(profissionalId) ?? false;

/** Menu lateral com pendências: alertas não vistos e estudantes fora da sala. */
export function EscolaLayout() {
  const eu = profissionalLogado('escola');
  const novos = useDados(() => api.escola.alertas(eu.id).filter((a) => !visto(a, eu.id)).length);
  const fora = useDados(() => api.escola.avisos(eu.id).filter((a) => !a.voltouEm).length);
  return (
    <ProLayout
      perfil={PAPEL_LABEL[eu.papel]}
      usuario={{ nome: eu.nome, iniciais: eu.iniciais }}
      perfilTo="/escola/perfil"
      items={[
        { to: '/escola/alertas', label: 'Alertas', icon: 'alerta', count: novos },
        { to: '/escola/avisos', label: 'Avisos de saída', icon: 'porta', count: fora },
        { to: '/escola/estudantes', label: 'Estudantes', icon: 'pessoas' },
      ]}
    />
  );
}

function useEstudantePorId(eu: Profissional) {
  const lista = useDados(() => api.escola.estudantes(eu.id));
  return (id: string) => lista.find((e) => e.id === id);
}

function AlertaCard({ alerta, estudante, eu }: { alerta: Alerta; estudante: Estudante; eu: Profissional }) {
  const jaVisto = visto(alerta, eu.id);
  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <AlertBadge alerta={alerta} />
        <strong className="text-button">{nomeCurto(estudante.nome)}</strong>
        <span className="text-caption text-muted">{estudante.turma}</span>
        <span className="ml-auto text-caption font-semibold text-muted">{quando(alerta.criadoEm)}</span>
      </div>
      <p>{t('Tocou em “Não estou bem”. Alerta automático.')}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="md" to={`/escola/estudantes/${estudante.id}`}>
          {t('Ver estudante')}
        </Button>
        {jaVisto ? (
          <Badge tone="leaf" icon="check">
            {t('Visto por você')}
          </Badge>
        ) : (
          <Button size="md" variant="outline" onClick={() => api.escola.marcarVisto(eu.id, alerta.id)}>
            <Icon name="check" size={18} />
            {t('Marcar como visto')}
          </Button>
        )}
      </div>
    </Card>
  );
}

const FILTROS = ['todos', 'novos', 'vistos'] as const;
type Filtro = (typeof FILTROS)[number];

export function EscolaAlertas() {
  const eu = profissionalLogado('escola');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const alertas = useDados(() => api.escola.alertas(eu.id));
  const fora = useDados(() => api.escola.avisos(eu.id).filter((a) => !a.voltouEm));
  const estudantePorId = useEstudantePorId(eu);

  const lista = alertas.filter(
    (a) => filtro === 'todos' || (filtro === 'novos' ? !visto(a, eu.id) : visto(a, eu.id)),
  );

  return (
    <>
      <PageHeader titulo={t('Alertas')} descricao={t('Alertas automáticos de nível 3 (“Não estou bem”).')} />
      <ChoiceChips
        label={t('Filtro')}
        tone="ink"
        options={FILTROS}
        labels={{ todos: 'Todos', novos: 'Novos', vistos: 'Vistos' }}
        value={filtro}
        onChange={(v) => setFiltro(v ?? 'todos')}
      />
      <div className="flex flex-wrap items-start gap-6">
        <section aria-label={t('Lista de alertas')} className="flex min-w-0 flex-[2_1_520px] flex-col gap-3">
          {lista.map((a) => {
            const e = estudantePorId(a.estudanteId);
            return e && <AlertaCard key={a.id} alerta={a} estudante={e} eu={eu} />;
          })}
          {lista.length === 0 && (
            <Card className="flex flex-col items-center gap-2.5 p-10 text-center">
              <img src={mascote} alt="" className="h-27 w-27.5 object-contain" />
              <h2 className="text-section">{t('Nenhum alerta aqui')}</h2>
              <p className="text-muted">{t('Quando um estudante tocar em “Não estou bem”, ele aparece nesta lista.')}</p>
            </Card>
          )}
        </section>
        <aside aria-label={t('Resumo')} className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Link
            to="/escola/avisos"
            className="flex flex-col gap-2.5 rounded-card-lg bg-sky p-5 no-underline hover:text-ink"
          >
            <span className="flex items-center justify-between">
              <Badge icon="porta">{t('Fora da sala agora')}</Badge>
              <Icon name="seguir" size={20} />
            </span>
            <strong className="font-display text-section font-semibold">
              {fora.length === 1 ? t('{n} estudante', { n: fora.length }) : t('{n} estudantes', { n: fora.length })}
            </strong>
            {fora.slice(0, 2).map((a) => {
              const e = estudantePorId(a.estudanteId);
              return (
                e && (
                  <span key={a.id}>
                    {nomeCurto(e.nome)} · {t('desde {hora}', { hora: hora(a.desde) })}
                    {a.destino && ` · ${t(a.destino)}`}
                  </span>
                )
              );
            })}
          </Link>
          <Card padding="compact" className="flex items-start gap-3">
            <Icon name="info" size={22} className="flex-none" />
            <p className="text-caption text-muted">{t('Em emergência, siga o protocolo da escola. O MKpause não é serviço de emergência.')}</p>
          </Card>
        </aside>
      </div>
    </>
  );
}

export function EscolaAvisos() {
  const eu = profissionalLogado('escola');
  const avisos = useDados(() => api.escola.avisos(eu.id));
  const alertas = useDados(() => api.escola.alertas(eu.id));
  const estudantePorId = useEstudantePorId(eu);
  const fora = avisos.filter((a) => !a.voltouEm);
  const voltaram = avisos.filter((a) => a.voltouEm && ehHoje(a.voltouEm));

  return (
    <>
      <PageHeader titulo={t('Avisos de saída')} descricao={t('O aviso termina quando o estudante toca em “Voltei”.')} />
      <section aria-labelledby="t-fora" className="flex flex-col gap-3">
        <h2 id="t-fora" className="text-section md:text-section-lg">
          {t('Fora da sala agora')}
        </h2>
        {fora.length === 0 && <p className="text-muted">{t('Ninguém fora da sala agora.')}</p>}
        {fora.map((a) => {
          const e = estudantePorId(a.estudanteId);
          if (!e) return null;
          const temAlerta = alertas.some((x) => x.estudanteId === e.id && !visto(x, eu.id));
          return (
            <article key={a.id} className="flex flex-wrap items-center gap-4.5 rounded-[26px] bg-sky p-5.5">
              <Avatar iniciais={iniciais(e.nome)} tamanho="lg" tom="surface" />
              <div className="flex flex-[1_1_260px] flex-col gap-1">
                <strong className="font-display text-section font-semibold">
                  {nomeCurto(e.nome)} · {e.turma}
                </strong>
                <span className="font-semibold">
                  {t('Saiu às {hora}', { hora: hora(a.desde) })} ({haQuanto(a.desde)}) · {t(a.destino ?? 'Destino não informado')}
                </span>
              </div>
              {temAlerta && (
                <Badge tone="rose" icon="alerta">
                  {t('Alerta aberto')}
                </Badge>
              )}
              <Button size="md" to={`/escola/estudantes/${e.id}`}>
                {t('Ver estudante')}
              </Button>
            </article>
          );
        })}
      </section>
      <section aria-labelledby="t-voltaram" className="flex flex-col gap-3">
        <h2 id="t-voltaram" className="text-section md:text-section-lg">
          {t('Voltaram hoje')}
        </h2>
        {voltaram.length === 0 && <p className="text-muted">{t('Ninguém voltou ainda hoje.')}</p>}
        <ul className="flex flex-col gap-2">
          {voltaram.map((a) => {
            const e = estudantePorId(a.estudanteId);
            return (
              e && (
                <li key={a.id} className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-center gap-2 rounded-[18px] bg-surface px-4.5 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <Avatar iniciais={iniciais(e.nome)} tamanho="sm" />
                    <strong>{nomeCurto(e.nome)}</strong>
                  </span>
                  <span className="text-muted">{e.turma}</span>
                  <span>{t('Saiu {hora}', { hora: hora(a.desde) })}</span>
                  <span>{t('Voltou {hora}', { hora: hora(a.voltouEm!) })}</span>
                  <span className="text-muted">{t(a.destino ?? 'Não informado')}</span>
                </li>
              )
            );
          })}
        </ul>
      </section>
    </>
  );
}

export function EscolaEstudantes() {
  const eu = profissionalLogado('escola');
  const estudantes = useDados(() => api.escola.estudantes(eu.id));
  const alertas = useDados(() => api.escola.alertas(eu.id));
  const [busca, setBusca] = useState('');
  const [turma, setTurma] = useState('Todas');

  const turmas = ['Todas', ...new Set(estudantes.map((e) => e.turma))].sort();
  const termo = busca.trim().toLowerCase();
  const lista = estudantes.filter(
    (e) =>
      (turma === 'Todas' || e.turma === turma) &&
      (!termo || e.nome.toLowerCase().includes(termo) || e.matricula.includes(termo)),
  );

  return (
    <>
      <PageHeader titulo={t('Estudantes')} descricao={t('Só aparecem os estudantes vinculados a você.')} />
      <AdicionarComCodigo eu={eu} />
      <div className="flex flex-wrap items-end gap-4">
        <SearchField label={t('Buscar estudante')} placeholder={t('Nome ou matrícula')} value={busca} onChange={setBusca} />
        <SelectField
          label={t('Turma')}
          className="basis-50"
          value={turma}
          onChange={setTurma}
          options={turmas.map((t) => ({ value: t, label: t }))}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {lista.map((e) => {
          const ultima = api.escola.sessoes(eu.id, e.id)[0];
          const aberto = alertas.some((a) => a.estudanteId === e.id && !visto(a, eu.id));
          return (
            <li key={e.id}>
              <Link
                to={`/escola/estudantes/${e.id}`}
                className="flex flex-wrap items-center gap-3.5 rounded-[20px] bg-surface px-4.5 py-3.5 no-underline hover:bg-surface-hover hover:text-ink"
              >
                <Avatar iniciais={iniciais(e.nome)} />
                <span className="flex flex-[1_1_160px] flex-col">
                  <strong>{nomeCurto(e.nome)}</strong>
                  <span className="text-caption text-muted">{e.turma}</span>
                </span>
                <span className="flex-[1_1_180px] text-caption text-muted">
                  {t('Última pausa:')} {ultima ? quando(ultima.em) : t('nenhuma ainda')}
                </span>
                {aberto && (
                  <Badge tone="rose" icon="alerta">
                    {t('Alerta aberto')}
                  </Badge>
                )}
                <Icon name="seguir" size={22} />
              </Link>
            </li>
          );
        })}
        {lista.length === 0 && <p role="status" className="text-muted">{t('Nenhum estudante encontrado.')}</p>}
      </ul>
    </>
  );
}

export function EscolaEstudante() {
  const { id = '' } = useParams();
  const eu = profissionalLogado('escola');
  const vinculado = useDados(() => api.escola.estudantes(eu.id).some((e) => e.id === id));
  if (!vinculado) return <Navigate to="/escola/estudantes" replace />;
  return <FichaEscolar estudanteId={id} eu={eu} />;
}

function FichaEscolar({ estudanteId, eu }: { estudanteId: string; eu: Profissional }) {
  const e = useDados(() => api.escola.estudante(eu.id, estudanteId));
  const sessoes = useDados(() => api.escola.sessoes(eu.id, estudanteId));
  const observacoes = useDados(() => api.escola.observacoes(eu.id, estudanteId));
  const alertas = useDados(() => api.escola.alertas(eu.id).filter((a) => a.estudanteId === estudanteId));
  const aviso = useDados(() => api.escola.avisos(eu.id).find((a) => a.estudanteId === estudanteId && !a.voltouEm));
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);

  const umMes = Date.now() - 30 * 24 * 60 * 60_000;
  const doMes = sessoes.filter((s) => new Date(s.em).getTime() >= umMes);
  const aberto = alertas.find((a) => !visto(a, eu.id));
  const primeiroNome = e.nome.split(' ')[0];

  return (
    <>
      <BackLink to="/escola/estudantes">{t('Estudantes')}</BackLink>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar iniciais={iniciais(e.nome)} tamanho="lg" />
        <div className="flex flex-[1_1_280px] flex-col gap-1">
          <h1 className="text-screen md:text-screen-lg">{nomeCurto(e.nome)}</h1>
          <span className="text-muted">
            {e.turma} · {t('Matrícula')} {e.matricula}
          </span>
        </div>
        {aviso && (
          <Badge tone="sky" icon="porta">
            {t('Fora da sala desde {hora}', { hora: hora(aviso.desde) })}
          </Badge>
        )}
        {aberto && <AlertBadge alerta={aberto} />}
      </div>

      <div className="flex flex-wrap gap-3.5">
        <StatCard valor={String(doMes.length)} rotulo={t('pausas este mês')} />
        <StatCard valor={t('{n} de {total}', { n: doMes.filter((s) => ehLeve(s.depois)).length, total: doMes.length })} rotulo={t('terminaram mais leves')} />
        <StatCard valor={String(alertas.length)} rotulo={alertas.length === 1 ? t('alerta de nível 3') : t('alertas de nível 3')} />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <Card as="section" aria-labelledby="t-pausas" className="flex min-w-0 flex-[3_1_460px] flex-col gap-1.5">
          <h2 id="t-pausas" className="text-section">
            {t('Pausas recentes')}
          </h2>
          {sessoes.length === 0 && <p className="text-muted">{t('Nenhuma pausa ainda.')}</p>}
          <ul>
            {sessoes.slice(0, 6).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-b-2 border-bg py-3">
                <span className="flex-[0_0_120px] text-caption font-semibold">{quando(s.em)}</span>
                <span className="flex-[1_1_300px]">
                  <EmocaoAntesDepois antes={s.antes} depois={s.depois} />
                </span>
                <span className="text-caption text-muted">{t(NOME_ATIVIDADE[s.atividade])}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5">
            <LockNote>{t('A ficha e os registros clínicos não aparecem aqui.')}</LockNote>
          </div>
        </Card>

        <Card as="section" aria-labelledby="t-obs" className="flex min-w-0 flex-[2_1_340px] flex-col gap-3.5">
          <h2 id="t-obs" className="text-section">
            {t('Observações')}
          </h2>
          {salvo && <SuccessBanner>{t('Observação salva.')}</SuccessBanner>}
          <form
            noValidate
            className="flex flex-col gap-3.5"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!texto.trim()) {
                setErro(t('Escreva a observação antes de salvar.'));
                return;
              }
              api.escola.adicionarObservacao(eu.id, estudanteId, texto.trim());
              setTexto('');
              setErro(undefined);
              setSalvo(true);
            }}
          >
            <Field
              label={t('Nova observação')}
              multiline
              placeholder={t('O que você observou?')}
              hint={t('Fica com seu nome, data e hora. Quem acompanha {nome} vê.', { nome: primeiroNome })}
              value={texto}
              error={erro}
              onChange={(ev) => {
                setTexto(ev.target.value);
                setSalvo(false);
              }}
            />
            <Button type="submit" size="md" className="self-start">
              {t('Salvar observação')}
            </Button>
          </form>
          <ObservacoesLista observacoes={observacoes} />
        </Card>
      </div>
    </>
  );
}

export function ObservacoesLista({ observacoes }: { observacoes: ReturnType<typeof api.escola.observacoes> }) {
  return (
    <ul className="flex flex-col gap-2">
      {observacoes.map((o) => {
        const autor = api.escola.autor(o.autorId);
        return (
          <li key={o.id} className="flex flex-col gap-1 rounded-[18px] bg-peony px-4 py-3.5">
            <span className="text-caption">
              <strong>{autor?.nome}</strong> · {autor && PAPEL_LABEL[autor.papel]} ·{' '}
              <span className="text-muted">
                {dia(o.em)}, {hora(o.em)}
              </span>
            </span>
            <span>{o.texto}</span>
          </li>
        );
      })}
    </ul>
  );
}
