import { useId, useState, type ReactNode } from 'react';
import type { Conteudo } from '../../domain/tipos';
import { t } from '../../i18n';
import { cx } from '../ui/cx';

const FILTROS = [
  { tipo: 'todas', titulo: 'Todas' },
  { tipo: 'Vídeo', titulo: 'Vídeos' },
  { tipo: 'Jogo', titulo: 'Jogos' },
  { tipo: 'Exercício', titulo: 'Exercícios' },
] as const;
type Filtro = (typeof FILTROS)[number]['tipo'];

/** Filtros independentes compartilhados pelas telas de escolha e administração. */
export function AtividadesPorCategoria<T extends { id: string; tipo: Conteudo['tipo'] }>({
  atividades, renderAtividade, ferramentas, gradeClassName = 'md:grid-cols-2 lg:grid-cols-3',
}: {
  atividades: readonly T[];
  ferramentas?: ReactNode;
  renderAtividade: (atividade: T) => ReactNode;
  gradeClassName?: string;
}) {
  const listaId = useId();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const lista = atividades.filter((atividade) => filtro === 'todas' || atividade.tipo === filtro);
  return <div className="flex flex-col gap-5">
      <div role="group" aria-label={t('Filtrar por tipo')} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTROS.map((opcao) => <button key={opcao.tipo} type="button"
          aria-pressed={filtro === opcao.tipo} aria-controls={listaId}
          onClick={() => setFiltro(opcao.tipo)}
          className={cx('min-h-12 rounded-pill px-3 font-semibold transition-colors',
            filtro === opcao.tipo ? 'bg-ink text-surface' : 'bg-surface text-ink hover:bg-surface-hover')}>
          {t(opcao.titulo)}
        </button>)}
      </div>
    {ferramentas}
    <ul id={listaId} aria-label={t('Atividades')} className={cx('grid gap-3', gradeClassName)}>
      {lista.map((atividade) => <li key={atividade.id} className="grid">{renderAtividade(atividade)}</li>)}
    </ul>
    {lista.length === 0 && <p role="status" className="text-muted">{t('Nenhuma atividade encontrada.')}</p>}
  </div>;
}
