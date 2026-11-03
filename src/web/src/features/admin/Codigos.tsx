import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { codigosCadastro, type CodigoCadastro, type PerfilCodigo, type SituacaoCodigo } from '../../data/codigos';
import { ConfirmDialog, PageHeader, SelectField, SuccessBanner } from '../../components/pro/Pro';
import { AvisoSimulacao } from '../../components/ui/AvisoSimulacao';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { dia } from '../../domain/formatos';
import { NOME_DO_PERFIL } from '../onboarding/Cadastro';
import { t } from '../../i18n';

const PERFIS: PerfilCodigo[] = ['ESTUDANTE', 'PROFESSOR', 'PSICOLOGO_ESCOLAR', 'PSICOLOGO_CLINICO'];
const VALIDADES = ['1', '3', '7', '14', '30'];

const SITUACAO: Record<SituacaoCodigo, { rotulo: string; icone: IconName; tom: 'leaf' | 'surface' | 'peony' | 'lavender' }> = {
  ATIVO: { rotulo: 'Ativo', icone: 'check', tom: 'leaf' },
  ESGOTADO: { rotulo: 'Usado', icone: 'pessoa', tom: 'lavender' },
  EXPIRADO: { rotulo: 'Expirado', icone: 'info', tom: 'peony' },
  REVOGADO: { rotulo: 'Cancelado', icone: 'fechar', tom: 'surface' },
};

/** Botão Copiar: só funciona a partir de um clique (regra do navegador). */
function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState<boolean | null>(null);
  return (
    <Button
      size="md"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        } catch {
          setCopiado(false);
        }
        setTimeout(() => setCopiado(null), 2500);
      }}
    >
      <Icon name={copiado ? 'check' : 'copiar'} size={20} />
      {copiado === null ? t('Copiar') : copiado ? t('Copiado') : t('Selecione e copie')}
    </Button>
  );
}

/** Admin → Códigos de cadastro: gerar, ver a situação e cancelar. */
export function AdminCodigos() {
  const [perfil, setPerfil] = useState<PerfilCodigo>('ESTUDANTE');
  const [turma, setTurma] = useState('');
  const [escola, setEscola] = useState('');
  const [validade, setValidade] = useState('7');
  const [usos, setUsos] = useState('1');
  const [erroUsos, setErroUsos] = useState<string>();
  const [novo, setNovo] = useState<CodigoCadastro | null>(null);
  const [lista, setLista] = useState<CodigoCadastro[]>([]);
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState('');
  const [cancelar, setCancelar] = useState<CodigoCadastro | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setLista(await codigosCadastro.listar());
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  async function gerar(e: FormEvent) {
    e.preventDefault();
    const n = Number(usos);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      setErroUsos(t('Use um número de 1 a 200.'));
      return;
    }
    setErroUsos(undefined);
    setErro(undefined);
    setAviso('');
    try {
      const criado = await codigosCadastro.gerar({
        perfil,
        usos_maximos: n,
        validade_dias: Number(validade),
        ...(perfil === 'ESTUDANTE' ? { turma, instituicao_ensino: escola } : {}),
      });
      setNovo(criado);
      await recarregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        titulo={t('Códigos de cadastro')}
        descricao={t('Cada pessoa cria a própria conta com um código. O código aparece uma vez só.')}
      />
      <AvisoSimulacao />
      {aviso && <SuccessBanner>{aviso}</SuccessBanner>}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <Card as="section" aria-labelledby="t-gerar" className="flex flex-col gap-4">
          <h2 id="t-gerar" className="text-section">
            {t('Gerar código')}
          </h2>
          <form noValidate onSubmit={gerar} className="flex flex-col gap-4">
            <SelectField
              label={t('Para quem')}
              value={perfil}
              onChange={(v) => setPerfil(v as PerfilCodigo)}
              options={PERFIS.map((p) => ({ value: p, label: NOME_DO_PERFIL[p] }))}
            />
            {perfil === 'ESTUDANTE' && (
              <>
                <Field label={t('Turma')} optional placeholder="8º A" value={turma} onChange={(e) => setTurma(e.target.value)} />
                <Field label={t('Escola')} optional value={escola} onChange={(e) => setEscola(e.target.value)} />
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('Validade')}
                value={validade}
                onChange={setValidade}
                options={VALIDADES.map((d) => ({ value: d, label: d === '1' ? t('1 dia') : t('{n} dias', { n: d }) }))}
              />
              <Field
                label={t('Quantas pessoas')}
                type="number"
                min={1}
                max={200}
                inputMode="numeric"
                hint={t('1 para uma pessoa; mais para uma turma.')}
                value={usos}
                onChange={(e) => setUsos(e.target.value)}
                error={erroUsos}
              />
            </div>
            {erro && (
              <p role="alert" className="font-semibold text-dark">
                {erro}
              </p>
            )}
            <Button type="submit" block>
              <Icon name="chave" size={22} />
              {t('Gerar código')}
            </Button>
          </form>

          {novo?.codigo && (
            <div role="status" className="flex flex-col gap-3 rounded-card bg-leaf p-4">
              <span className="text-caption font-semibold">
                {t('Código de {perfil}', { perfil: t(NOME_DO_PERFIL[novo.perfil]) })}
              </span>
              <strong className="font-mono text-screen tracking-widest break-all">{novo.codigo}</strong>
              <p className="text-caption">{t('Copie agora e entregue à pessoa: depois ele não aparece de novo.')}</p>
              <div className="flex flex-wrap gap-2">
                <BotaoCopiar texto={novo.codigo} />
                <Button size="md" variant="text" onClick={() => setNovo(null)}>
                  {t('Fechar')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <section aria-labelledby="t-lista" className="flex flex-col gap-2.5">
          <h2 id="t-lista" className="text-section">
            {t('Códigos gerados')}
          </h2>
          {lista.length === 0 && <p className="rounded-card bg-surface px-4 py-3.5 text-muted">{t('Nenhum código ainda.')}</p>}
          <ul className="flex flex-col gap-2.5">
            {lista.map((c) => {
              const s = SITUACAO[c.situacao];
              return (
                <li key={c.id_codigo_cadastro}>
                  <Card className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <strong>{t(NOME_DO_PERFIL[c.perfil])}</strong>
                      <span className="font-mono text-caption text-muted">…{c.sufixo}</span>
                      <Badge tone={s.tom} icon={s.icone} className="ml-auto">
                        {t(s.rotulo)}
                      </Badge>
                    </div>
                    <p className="text-caption text-muted">
                      {[
                        c.turma,
                        c.instituicao_ensino,
                        t('{usos} de {total} usado(s)', { usos: c.usos, total: c.usos_maximos }),
                        t('vale até {data}', { data: dia(c.expira_em) }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {c.usado_por.length > 0 && (
                      <p className="text-caption">
                        {t('Usado por: {nomes}', { nomes: c.usado_por.map((u) => u.nome_completo).join(', ') })}
                      </p>
                    )}
                    {c.situacao === 'ATIVO' && (
                      <Button
                        size="md"
                        variant="outline"
                        className="self-start"
                        aria-label={t('Cancelar código …{sufixo}', { sufixo: c.sufixo })}
                        onClick={() => setCancelar(c)}
                      >
                        {t('Cancelar código')}
                      </Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        aberto={cancelar !== null}
        titulo={t('Cancelar este código?')}
        texto={t('Quem ainda não usou não vai conseguir se cadastrar com ele. As contas já criadas continuam.')}
        confirmar={t('Cancelar código')}
        onCancelar={() => setCancelar(null)}
        onConfirmar={async () => {
          if (!cancelar) return;
          try {
            await codigosCadastro.revogar(cancelar.id_codigo_cadastro);
            setAviso(t('Código cancelado.'));
            if (novo?.id_codigo_cadastro === cancelar.id_codigo_cadastro) setNovo(null);
            await recarregar();
          } catch (e) {
            setErro((e as Error).message);
          } finally {
            setCancelar(null);
          }
        }}
      />
    </>
  );
}
