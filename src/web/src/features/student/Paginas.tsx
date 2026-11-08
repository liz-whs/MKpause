import { agir } from '../../state/acoes';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { NIVEIS } from '../../domain/niveis';
import { emocaoPorId } from '../../domain/emocoes';
import { META_DIARIA_CUIDADOS, type Cuidado } from '../../domain/cuidados';
import type { AtividadeId, Conteudo } from '../../domain/tipos';
import { api } from '../../data/api';
import { useEstudante } from '../../state/EstudanteContext';
import { LevelCard } from '../../components/student/LevelCard';
import { CareStreakCard, CareStreakSummary } from '../../components/student/CareStreak';
import { CuidadosConcluidos } from '../../components/student/CuidadosConcluidos';
import { ActivityRow, CalmFab, PeopleList, PrivacyNote, ScreenTitle, SectionTitle } from '../../components/student/Bits';
import { AtividadesPorCategoria } from '../../components/student/AtividadesPorCategoria';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Switch } from '../../components/ui/Switch';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { Linha } from '../../components/ui/Linha';
import { QuemVeOQue } from '../onboarding/Onboarding';
import { AvisoPedidos, CompartilharCodigo, SolicitacoesPendentes, useEuEstudante } from './Vinculos';
import { OpcoesPreferencias } from '../../preferencias/PainelPreferencias';
import { IDIOMAS, usePreferencias } from '../../preferencias/preferencias';
import { t } from '../../i18n';
import { RetornoSala } from '../../components/student/RetornoSala';

export function Inicio() {
  const { perfil, avisoSaida } = useEstudante();
  const eu = useEuEstudante();
  const niveis = NIVEIS.map((n) => (n.nivel === 2 && avisoSaida ? { ...n, destino: '/estudante/pausa' } : n));

  return (
    <>
      <div className="flex items-center gap-3">
        <img src={emocaoPorId('calmo').imagem} alt="" className="size-18 flex-none object-contain" />
        <ScreenTitle>{t('Oi, {nome}!', { nome: perfil.apelido })}</ScreenTitle>
      </div>
      <AvisoPedidos eu={eu} />
      <RetornoSala />
      {/* No computador: níveis à esquerda, sequência de cuidados à direita. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-6">
        <section aria-labelledby="titulo-pausa" className="flex flex-col gap-2.5">
          <h2 id="titulo-pausa" className="text-section md:text-section-lg">
            {t('Precisa de uma pausa?')}
          </h2>
          {niveis.map((n) => (
            <LevelCard key={n.nivel} info={n} />
          ))}
        </section>
        <div className="lg:pt-10.5">
          <CareStreakCard />
        </div>
      </div>
    </>
  );
}

export interface AtividadeInfo {
  id: AtividadeId;
  tipo: Conteudo['tipo'];
  titulo: string;
  detalhe: string;
  icone: IconName;
  fundo: string;
  rota: string;
}

const VISUAL: Record<AtividadeId, Pick<AtividadeInfo, 'icone' | 'fundo' | 'rota'>> = {
  respiracao: { icone: 'respiracao', fundo: 'bg-lavender', rota: '/estudante/pausa/respiracao' },
  pianopause: { icone: 'musica', fundo: 'bg-peony', rota: '/estudante/pausa/pianopause' },
  mkpotion: { icone: 'pocao', fundo: 'bg-leaf', rota: '/estudante/pausa/mkpotion' },
  mkconnection: { icone: 'atividades', fundo: 'bg-leaf', rota: '/estudante/pausa/mkconnection' },
  espiral: { icone: 'respiracao', fundo: 'bg-leaf', rota: '/estudante/pausa/espiral' },
  chinchila: { icone: 'play', fundo: 'bg-lavender', rota: '/estudante/pausa/chinchila' },
  video: { icone: 'play', fundo: 'bg-sky', rota: '/estudante/pausa/video' },
};

/** Só as atividades que a administração deixou disponíveis. */
export function atividades(): AtividadeInfo[] {
  return api.estudante.conteudos().map((c) => ({
    id: c.id,
    tipo: c.tipo,
    // Conteúdo da escola: os nomes conhecidos têm tradução; os novos aparecem como cadastrados.
    titulo: t(c.nome),
    detalhe: t(c.tipo),
    ...VISUAL[c.id],
  }));
}

export function Atividades() {
  const [busca, setBusca] = useState('');

  const termo = busca.trim().toLowerCase();
  const lista = atividades().filter(
    (a) => !termo || a.titulo.toLowerCase().includes(termo),
  );

  return (
    <div className="flex flex-col gap-5 pb-20">
      <ScreenTitle>{t('Atividades')}</ScreenTitle>
      <p>{t('Explore jogos, vídeos e exercícios livremente, no seu ritmo.')}</p>
      <AtividadesPorCategoria atividades={lista} ferramentas={
      <div className="flex min-h-13 items-center gap-2 rounded-pill bg-surface px-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
        <Icon name="busca" size={20} className="text-muted" />
        <label htmlFor="busca" className="sr-only">
          {t('Buscar atividades')}
        </label>
        <input
          id="busca"
          type="search"
          placeholder={t('Buscar atividades')}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
        />
      </div>
      } renderAtividade={(a) => (
        // O catálogo oferece acesso livre; a avaliação pertence ao fluxo iniciado no Início.
        <ActivityRow
          to={`/estudante/atividades/${a.id}`}
          icone={a.icone}
          fundo={a.fundo}
          titulo={a.titulo}
          detalhe={a.detalhe}
        />
      )} />
      <CalmFab />
    </div>
  );
}

function ListaCuidados({ itens }: { itens: readonly Cuidado[] }) {
  const { feitosHoje, concluirCuidado } = useEstudante();
  return (
        <ul className="flex flex-col gap-2">
          {itens.map((c) => {
            const feito = feitosHoje.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={feito}
                  disabled={feito}
                  onClick={() => concluirCuidado(c.id)}
                  className="flex w-full items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 text-left enabled:hover:bg-surface-hover disabled:cursor-default"
                >
                  <span className={cx('flex size-11 flex-none items-center justify-center rounded-field', c.fundo)}>
                    <Icon name={c.icone} size={22} />
                  </span>
                  <span className="flex-1 font-semibold">{c.label}</span>
                  <span
                    className={cx(
                      'flex size-7.5 flex-none items-center justify-center rounded-full border-2',
                      feito ? 'border-leaf bg-leaf' : 'border-line bg-surface',
                    )}
                  >
                    {feito && <Icon name="check" size={16} strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
  );
}

export function Cuidados() {
  const { feitosHoje, sugestoesHoje, outrosCuidados } = useEstudante();
  const total = META_DIARIA_CUIDADOS;
  const feitos = Math.min(feitosHoje.length, total);

  return (
    <div className="flex flex-col gap-5 pb-20">
      <ScreenTitle>{t('Cuidados')}</ScreenTitle>
      <p>{t('Escolha o que combina com você. Qualquer cuidado feito hoje conta para sua sequência.')}</p>
      <CareStreakSummary />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="titulo-hoje" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <SectionTitle><span id="titulo-hoje">{t('Sugestões de hoje')}</span></SectionTitle>
              <div aria-hidden="true" className="h-2.5 flex-1 overflow-hidden rounded-pill bg-surface">
                <span className="block h-full rounded-pill bg-leaf transition-[width]" style={{ width: `${(100 * feitos) / total}%` }} />
              </div>
              <span className="text-caption font-semibold text-muted">{t('{feitos} de {total}', { feitos, total })}</span>
            </div>
            <ListaCuidados itens={sugestoesHoje} />
          </section>
          <section aria-labelledby="titulo-ideias" className="flex flex-col gap-2.5">
            <SectionTitle><span id="titulo-ideias">{t('Mais ideias')}</span></SectionTitle>
            <ListaCuidados itens={outrosCuidados} />
          </section>
        </div>
        <CuidadosConcluidos />
      </div>
      <PrivacyNote>{t('Só você vê.')}</PrivacyNote>
      <CalmFab />
    </div>
  );
}

export function Perfil() {
  const navigate = useNavigate();
  const { perfil, iniciais, notificacoes, definirApelido, definirNotificacoes, sair } = useEstudante();
  const [apelido, setApelido] = useState(perfil.apelido);
  const [salvo, setSalvo] = useState(false);
  const { idioma } = usePreferencias();
  const eu = useEuEstudante();

  return (
    <>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-18 flex-none items-center justify-center rounded-full bg-lavender font-display text-section font-semibold">
          {iniciais}
        </span>
        <div className="flex flex-col">
          <h1 className="text-section md:text-section-lg">{perfil.nome}</h1>
          <span className="text-caption text-muted">
            {t('Matrícula')} {perfil.matricula} · {perfil.turma} · {perfil.escola}
          </span>
        </div>
      </div>

      <SolicitacoesPendentes eu={eu} />

      {/* No computador: duas colunas que começam na mesma altura, cada uma com seu título. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:gap-y-5">
        <section aria-labelledby="titulo-conta" className="flex flex-col gap-2">
          <SectionTitle>
            <span id="titulo-conta">{t('Sua conta')}</span>
          </SectionTitle>
          <div className="flex flex-col gap-5">
            <div className="rounded-card-lg bg-surface p-2.5">
              <Linha icone="lapis" titulo={t('Como você quer ser chamado(a)')} valor={perfil.apelido}>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    definirApelido(apelido);
                    setSalvo(true);
                  }}
                >
                  <Field label={t('Apelido')} value={apelido} onChange={(e) => { setApelido(e.target.value); setSalvo(false); }} />
                  <Button type="submit" size="md">{t('Salvar')}</Button>
                  {salvo && <p role="status" className="text-caption font-semibold">{t('Apelido salvo.')}</p>}
                </form>
              </Linha>
              <div className="px-1.5 py-3.5">
                <Switch label={t('Notificações do navegador')} description={notificacoes ? t('Ligadas') : t('Desligadas')} checked={notificacoes} onChange={definirNotificacoes} />
              </div>
            </div>

            <div className="rounded-card-lg bg-surface p-2.5">
              <Linha icone="acessibilidade" titulo={t('Acessibilidade e idioma')} valor={IDIOMAS.find((i) => i.id === idioma)?.nome}>
                <OpcoesPreferencias />
              </Linha>
            </div>

            <div className="rounded-card-lg bg-surface p-2.5">
              <Linha icone="escudo" titulo={t('Privacidade')} valor={t('Quem vê o quê no MKpause')}>
                <QuemVeOQue />
              </Linha>
              <Linha icone="duvida" titulo={t('Ajuda e emergência')} valor="188 (CVV) · 192 (SAMU)">
                <p>
                  {t('Emergência:')} <a href="tel:188">188 (CVV)</a> · <a href="tel:192">192 (SAMU)</a>
                </p>
              </Linha>
            </div>

          </div>
        </section>

        <section aria-labelledby="titulo-acompanha" className="flex flex-col gap-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SectionTitle>
            <span id="titulo-acompanha">{t('Quem acompanha você')}</span>
          </SectionTitle>
          <PeopleList pessoas={api.estudante.quemAcompanha()} />
          <CompartilharCodigo eu={eu} />
        </section>

        {/* No celular fica por último; no computador, embaixo da coluna da esquerda. */}
        <Button
          variant="outline"
          block
          className="lg:col-start-1 lg:row-start-2"
          onClick={() => {
            void agir(async () => { await sair(); navigate('/'); }, 'Você saiu da sua conta.');
          }}
        >
          <Icon name="sair" size={22} />
          {t('Sair da conta')}
        </Button>
      </div>
    </>
  );
}
