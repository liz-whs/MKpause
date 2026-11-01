import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../data/api';
import { useDados } from '../../data/useDados';
import { PAPEL_LABEL, type Profissional } from '../../domain/tipos';
import { administradorLogado, profissionalLogado, sairProfissional } from '../../state/ProContext';
import { Avatar, PageHeader } from '../../components/pro/Pro';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Linha } from '../../components/ui/Linha';
import { Switch } from '../../components/ui/Switch';
import { cx } from '../../components/ui/cx';
import { OpcoesPreferencias } from '../../preferencias/PainelPreferencias';
import { IDIOMAS, usePreferencias } from '../../preferencias/preferencias';
import { iniciais as iniciaisDe } from '../../domain/formatos';
import { t } from '../../i18n';

type Area = 'escola' | 'clinico' | 'admin';

const ESCOLA = 'Escola Modelo';
const CHAVE_NOTIFICACOES = 'mkpause:profissional:notificacoes';

/** O que cada papel vê e não vê no MKpause (o mesmo que a camada de dados permite). */
const VE: Record<'escola' | 'clinico' | 'admin', { icone: IconName; texto: string; ve: boolean }[]> = {
  escola: [
    { icone: 'alerta', texto: 'Alertas de nível 3 e avisos de saída dos seus estudantes', ve: true },
    { icone: 'pausa', texto: 'Pausas e como o estudante estava antes e depois', ve: true },
    { icone: 'lapis', texto: 'Observações da escola, com nome de quem escreveu', ve: true },
    { icone: 'cadeado', texto: 'Fichas e registros clínicos', ve: false },
  ],
  clinico: [
    { icone: 'pausa', texto: 'Histórico de pausas e humor dos estudantes que você acompanha', ve: true },
    { icone: 'ficha', texto: 'Ficha de acompanhamento e registros clínicos', ve: true },
    { icone: 'lapis', texto: 'Observações da escola, só para leitura', ve: true },
    { icone: 'alerta', texto: 'Alertas e avisos de saída', ve: true },
  ],
  admin: [
    { icone: 'pessoas', texto: 'Cadastros de estudantes e profissionais', ve: true },
    { icone: 'vinculo', texto: 'Vínculos, fichas administrativas e conteúdos', ve: true },
    { icone: 'cadeado', texto: 'Pausas, humor, observações e registros clínicos', ve: false },
  ],
};

function useNotificacoes() {
  const [ligadas, setLigadas] = useState(() => sessionStorage.getItem(CHAVE_NOTIFICACOES) !== 'off');
  const definir = (v: boolean) => {
    sessionStorage.setItem(CHAVE_NOTIFICACOES, v ? 'on' : 'off');
    setLigadas(v);
  };
  return [ligadas, definir] as const;
}

function SeusEstudantes({ eu, area }: { eu: Profissional; area: 'escola' | 'clinico' }) {
  const estudantes = useDados(() => api.escola.estudantes(eu.id));
  return (
    <section aria-labelledby="titulo-seus-estudantes" className="flex flex-col gap-2">
      {/* A contagem fica na linha do título: a lista começa na mesma altura do cartão "Sua conta". */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-seus-estudantes" className="text-section md:text-section-lg">
          {t('Seus estudantes')}
        </h2>
        <span className="text-caption font-semibold text-muted">
          {estudantes.length === 1 ? t('{n} estudante vinculado', { n: 1 }) : t('{n} estudantes vinculados', { n: estudantes.length })}
        </span>
      </div>
      {estudantes.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-3.5 text-muted">{t('Ninguém vinculado.')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {estudantes.map((e) => (
            <li key={e.id}>
              <Link
                to={`/${area}/estudantes/${e.id}`}
                className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 py-3 no-underline hover:bg-surface-hover hover:text-ink"
              >
                <Avatar iniciais={iniciaisDe(e.nome)} tamanho="sm" />
                <span className="flex flex-1 flex-col">
                  <strong>{e.nome}</strong>
                  <span className="text-caption text-muted">{e.turma}</span>
                </span>
                <Icon name="seguir" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OQueVoceVe({ area }: { area: Area }) {
  return (
    <section aria-labelledby="titulo-o-que-ve" className="flex flex-col gap-2">
      <h2 id="titulo-o-que-ve" className="text-section md:text-section-lg">
        {t('O que você vê')}
      </h2>
      <ul className="flex flex-col gap-2">
        {VE[area].map((item) => (
          <li key={item.texto} className="flex items-start gap-3 rounded-[18px] bg-surface px-3.5 py-3">
            <Icon name={item.icone} size={22} />
            <span className="flex flex-col">
              <strong>{t(item.texto)}</strong>
              <span className="text-caption text-muted">{item.ve ? t('Você vê') : t('Você não vê')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Perfil de professor(a), psicólogo(a) escolar, psicólogo(a) clínico(a) e administração. */
export function PerfilProfissional({ area }: { area: Area }) {
  const navigate = useNavigate();
  const { idioma } = usePreferencias();
  const [notificacoes, setNotificacoes] = useNotificacoes();
  const eu = area === 'admin' ? null : profissionalLogado(area);
  const admin = administradorLogado();
  const nome = eu?.nome ?? admin.nome;
  const iniciais = eu?.iniciais ?? admin.iniciais;
  const papel = eu ? PAPEL_LABEL[eu.papel] : t('Administrador(a)');
  const detalhe = [papel, eu?.detalhe, ESCOLA].filter(Boolean).join(' · ');

  return (
    <>
      <PageHeader titulo={t('Perfil')} />
      <div className="flex items-center gap-4">
        <Avatar iniciais={iniciais} tamanho="lg" />
        <div className="flex flex-col">
          <p className="font-display text-section font-semibold md:text-section-lg">{nome}</p>
          <span className="text-caption text-muted">{detalhe}</span>
        </div>
      </div>

      {/*
        No computador, duas colunas que começam na mesma altura:
        - com estudantes: conta, "O que você vê" e Sair à esquerda; a lista de estudantes à direita;
        - administração: conta e Sair à esquerda; "O que você vê" à direita.
        No celular fica tudo empilhado, com Sair por último.
      */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-6 lg:gap-y-6">
        <section aria-labelledby="titulo-sua-conta" className="flex flex-col gap-2">
          <h2 id="titulo-sua-conta" className="text-section md:text-section-lg">
            {t('Sua conta')}
          </h2>
          <div className="flex flex-col gap-5">
            <div className="rounded-card-lg bg-surface p-2.5">
              <div className="px-1.5 py-3.5">
                <Switch
                  label={t('Notificações do navegador')}
                  description={
                    area === 'admin'
                      ? t('Convites aceitos pelos responsáveis.')
                      : t('Alertas de nível 3 e avisos de saída dos seus estudantes.')
                  }
                  checked={notificacoes}
                  onChange={setNotificacoes}
                />
              </div>
              <Linha icone="acessibilidade" titulo={t('Acessibilidade e idioma')} valor={IDIOMAS.find((i) => i.id === idioma)?.nome}>
                <OpcoesPreferencias />
              </Linha>
            </div>
          </div>
        </section>

        {eu && area !== 'admin' ? (
          <>
            <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
              <SeusEstudantes eu={eu} area={area} />
            </div>
            <div className="lg:col-start-1 lg:row-start-2">
              <OQueVoceVe area={area} />
            </div>
          </>
        ) : (
          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <OQueVoceVe area={area} />
          </div>
        )}

        <Button
          variant="outline"
          block
          className={cx('lg:col-start-1', eu && area !== 'admin' ? 'lg:row-start-3' : 'lg:row-start-2')}
          onClick={() => {
            sairProfissional();
            navigate('/');
          }}
        >
          <Icon name="sair" size={22} />
          {t('Sair da conta')}
        </Button>
      </div>
    </>
  );
}
