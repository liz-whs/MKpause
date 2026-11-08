import { CUIDADOS } from '../../domain/cuidados';
import { useEstudante } from '../../state/EstudanteContext';
import { emocaoPorId } from '../../domain/emocoes';
import { Icon } from '../ui/Icon';
import { t } from '../../i18n';

/** Quadro de incentivo no fluxo da página, sem pop-up ou sobreposição. */
export function CuidadosConcluidos() {
  const { feitosHoje } = useEstudante();
  const concluidos = feitosHoje.flatMap((id) => CUIDADOS.filter((c) => c.id === id));
  if (!concluidos.length) return null;
  const mensagens = [
    t('Um pequeno cuidado também faz diferença.'),
    t('Você está encontrando jeitos de cuidar de si.'),
    t('Que bom reservar um momento para você.'),
    t('Cada cuidado tem seu valor. Continue no seu ritmo.'),
  ];
  return <aside aria-labelledby="titulo-cuidados-concluidos" className="flex min-w-0 flex-col gap-5 rounded-[28px] border border-line bg-surface p-5 lg:sticky lg:top-6 lg:p-6">
    <div className="flex items-center gap-4">
      <img src={emocaoPorId('feliz').imagem} alt="" className="size-20 flex-none object-contain" />
      <h2 id="titulo-cuidados-concluidos" className="text-section">{t('Você cuidou de você!')}</h2>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className="font-display text-section text-ink">
      {mensagens[(concluidos.length - 1) % mensagens.length]}
    </p>
    <p className="text-caption font-semibold text-muted">{concluidos.length === 1
      ? t('{n} cuidado concluído hoje', { n: concluidos.length })
      : t('{n} cuidados concluídos hoje', { n: concluidos.length })}</p>
    <ul aria-label={t('Cuidados concluídos hoje')} className="flex flex-col gap-3">
      {concluidos.map((c) => <li key={c.id} className="flex items-center gap-3">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-leaf" aria-hidden="true"><Icon name="check" size={18} /></span>
        <span className="font-semibold">{c.label}</span>
      </li>)}
    </ul>
    <p className="text-caption text-muted">{t('Você não precisa fazer tudo. Escolha o que faz sentido para você.')}</p>
  </aside>;
}
