import { Fragment } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation, type RouteObject } from 'react-router';
import { FeedbackAcoes } from './components/ui/FeedbackAcoes';
import { Button } from './components/ui/Button';
import { agir } from './state/acoes';
import { StudentFocusLayout, StudentLayout } from './components/layout/Layouts';
import { EstudanteProvider, useEstudante } from './state/EstudanteContext';
import { SkipLink, useTituloEFoco } from './components/layout/Navegacao';
import { usePreferencias } from './preferencias/preferencias';
import { PainelPreferencias } from './preferencias/PainelPreferencias';
import { api } from './data/api';
import { useDados } from './data/useDados';
import { VLibras } from './preferencias/VLibras';
import { t } from './i18n';
import { CadastroComCodigo } from './features/onboarding/Cadastro';
import { AdminCodigos } from './features/admin/Codigos';
import { AdminEmails } from './features/admin/Emails';
import { AdminIndicadores } from './features/admin/Indicadores';
import { Apresentacao1, Apresentacao2, Apresentacao3, BoasVindas, Entrar, PrimeiroAcesso } from './features/onboarding/Onboarding';
import { Atividades, Cuidados, Inicio, Perfil } from './features/student/Paginas';
import { AtividadeLivre, ComoFicou, EscolherAtividade, Humor, MKPotion, PausaFeita, PianoPause, Respiracao, Video } from './features/session/Sessao';
import { JogoPianoPauseProvider } from './features/session/JogoPianoPause';
import { AgoraRespira, AvisoSaida, VoceSeCuidou } from './features/levels/Niveis';
import { EscolaAlertas, EscolaAvisos, EscolaEstudante, EscolaEstudantes, EscolaLayout } from './features/school/Escola';
import { ClinicoAcompanhados, ClinicoEstudante, ClinicoFicha, ClinicoLayout } from './features/clinical/Clinico';
import { PerfilProfissional } from './features/pro/PerfilProfissional';
import { AdminCadastro, AdminConteudos, AdminFichas, AdminLayout, AdminUsuarios, AdminVinculos } from './features/admin/Admin';
import { CadastroProfissional } from './features/admin/CadastroProfissional';

function Raiz() {
  const { idioma } = usePreferencias();
  const { pathname } = useLocation();
  const videoLocalizado = /^\/estudante\/(?:pausa|atividades)\/(?:video|espiral|chinchila)$/.test(pathname);
  // Telas que leem a api sem useDados redesenham quando a conta do backend termina de carregar.
  const conta = useDados(() => (api.carregado() ? api.conta()?.id_usuario ?? 'anonimo' : 'carregando'));
  const erroCarga = useDados(() => api.erroCarga());
  useTituloEFoco();
  return (
    <EstudanteProvider>
      {/* O player traduz suas instruções sem remontar nem interromper a reprodução. */}
      <Fragment key={`${videoLocalizado ? 'video-localizado' : idioma}-${conta}`}>
        <SkipLink />
        {/* Antes dos dados chegarem, as telas que conferem vínculo mandariam de volta para a lista. */}
        {erroCarga ? <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
          <p role="alert">{t(erroCarga)}</p>
          <Button onClick={() => { void agir(() => api.sincronizar(), 'Dados atualizados.'); }}>{t('Tentar novamente')}</Button>
        </main> : conta === 'carregando' ? (
          <main id="conteudo" role="status" className="flex min-h-dvh items-center justify-center font-semibold text-muted">
            {t('Carregando…')}
          </main>
        ) : (
          <AcessoRestrito />
        )}
      </Fragment>
      <ScrollRestoration />
      <PainelPreferencias />
      <VLibras />
      <FeedbackAcoes />
    </EstudanteProvider>
  );
}

export function AcessoRestrito() {
  const { pathname } = useLocation();
  const conta = useDados(() => api.conta());
  const area = pathname.split('/')[1];
  const permitidos: Record<string, string[]> = {
    estudante: ['estudante'], escola: ['professor', 'psicologo_escolar'],
    clinico: ['psicologo_clinico'], admin: ['administrador'],
  };
  if (!permitidos[area] || (import.meta.env.MODE === 'test' && !conta)) return <Outlet />;
  if (!conta) return <Navigate to="/entrar" replace state={{ aviso: 'Entre com sua conta para continuar.' }} />;
  if (!permitidos[area].includes(conta.perfil)) {
    const destinos = { estudante: '/estudante', professor: '/escola', psicologo_escolar: '/escola', psicologo_clinico: '/clinico', administrador: '/admin' };
    return <Navigate to={destinos[conta.perfil]} replace />;
  }
  return <Outlet />;
}

function LayoutEstudante() {
  const { iniciais } = useEstudante();
  return <StudentLayout iniciais={iniciais} />;
}

export const rotas: RouteObject[] = [
  {
    element: <Raiz />,
    children: [
      // Onboarding
      { path: '/', element: <BoasVindas />, handle: { titulo: 'Boas-vindas' } },
      { path: '/apresentacao/1', element: <Apresentacao1 />, handle: { titulo: 'Seu espaço para fazer uma pausa' } },
      { path: '/apresentacao/2', element: <Apresentacao2 />, handle: { titulo: 'Três jeitos de pausar' } },
      { path: '/apresentacao/3', element: <Apresentacao3 />, handle: { titulo: 'Quem vê o quê?' } },
      { path: '/entrar', element: <Entrar />, handle: { titulo: 'Entrar' } },
      { path: '/primeiro-acesso', element: <PrimeiroAcesso />, handle: { titulo: 'Primeiro acesso' } },
      { path: '/cadastro', element: <CadastroComCodigo />, handle: { titulo: 'Código de cadastro' } },

      // Estudante: páginas com cabeçalho
      {
        path: '/estudante',
        element: <LayoutEstudante />,
        children: [
          { index: true, element: <Inicio />, handle: { titulo: 'Início' } },
          { path: 'atividades', element: <Atividades />, handle: { titulo: 'Atividades' } },
          { path: 'cuidados', element: <Cuidados />, handle: { titulo: 'Cuidados' } },
          { path: 'perfil', element: <Perfil />, handle: { titulo: 'Perfil' } },
        ],
      },

      // Estudante: telas de foco (pausa, níveis 2 e 3)
      {
        path: '/estudante',
        element: (
          <JogoPianoPauseProvider>
            <StudentFocusLayout />
          </JogoPianoPauseProvider>
        ),
        children: [
          { path: 'atividades/respiracao', element: <AtividadeLivre atividade="respiracao"><Respiracao /></AtividadeLivre>, handle: { titulo: 'respire & pause' } },
          { path: 'atividades/pianopause', element: <AtividadeLivre atividade="pianopause"><PianoPause /></AtividadeLivre>, handle: { titulo: 'piano pause' } },
          { path: 'atividades/mkpotion', element: <AtividadeLivre atividade="mkpotion"><MKPotion /></AtividadeLivre>, handle: { titulo: 'mk potion' } },
          { path: 'atividades/mkconnection', element: <AtividadeLivre atividade="mkconnection"><MKPotion jogo="mkconnection" /></AtividadeLivre>, handle: { titulo: 'mk connection' } },
          { path: 'atividades/espiral', element: <AtividadeLivre atividade="espiral"><Video atividade="espiral" /></AtividadeLivre>, handle: { titulo: 'spiral pause' } },
          { path: 'atividades/chinchila', element: <AtividadeLivre atividade="chinchila"><Video atividade="chinchila" /></AtividadeLivre>, handle: { titulo: 'chinchilla pause' } },
          { path: 'atividades/video', element: <AtividadeLivre atividade="video"><Video /></AtividadeLivre>, handle: { titulo: 'mk breath' } },
          { path: 'pausa', element: <Humor />, handle: { titulo: 'Como você está' } },
          { path: 'pausa/atividade', element: <EscolherAtividade />, handle: { titulo: 'Escolha uma atividade' } },
          { path: 'pausa/respiracao', element: <Respiracao />, handle: { titulo: 'respire & pause' } },
          { path: 'pausa/pianopause', element: <PianoPause />, handle: { titulo: 'piano pause' } },
          { path: 'pausa/mkpotion', element: <MKPotion />, handle: { titulo: 'mk potion' } },
          { path: 'pausa/mkconnection', element: <MKPotion jogo="mkconnection" />, handle: { titulo: 'mk connection' } },
          { path: 'pausa/espiral', element: <Video atividade="espiral" />, handle: { titulo: 'spiral pause' } },
          { path: 'pausa/chinchila', element: <Video atividade="chinchila" />, handle: { titulo: 'chinchilla pause' } },
          { path: 'pausa/video', element: <Video />, handle: { titulo: 'mk breath' } },
          { path: 'pausa/fim', element: <ComoFicou />, handle: { titulo: 'E agora?' } },
          { path: 'pausa/concluida', element: <PausaFeita />, handle: { titulo: 'Pausa feita' } },
          { path: 'aviso-de-saida', element: <AvisoSaida />, handle: { titulo: 'Sair da sala' } },
          { path: 'fora-da-sala', element: <Navigate to="/estudante" replace /> },
          { path: 'agora', element: <AgoraRespira />, handle: { titulo: 'Respire' } },
          { path: 'agora/fim', element: <VoceSeCuidou />, handle: { titulo: 'Como está agora?' } },
        ],
      },

      // Professor e Psicólogo escolar (mesmas telas)
      {
        path: '/escola',
        element: <EscolaLayout />,
        children: [
          { index: true, element: <Navigate to="alertas" replace /> },
          { path: 'alertas', element: <EscolaAlertas />, handle: { titulo: 'Alertas' } },
          { path: 'avisos', element: <EscolaAvisos />, handle: { titulo: 'Avisos de saída' } },
          { path: 'estudantes', element: <EscolaEstudantes />, handle: { titulo: 'Estudantes' } },
          { path: 'estudantes/:id', element: <EscolaEstudante />, handle: { titulo: 'Estudante' } },
          { path: 'perfil', element: <PerfilProfissional area="escola" />, handle: { titulo: 'Perfil' } },
        ],
      },

      // Psicólogo clínico
      {
        path: '/clinico',
        element: <ClinicoLayout />,
        children: [
          { index: true, element: <Navigate to="acompanhados" replace /> },
          { path: 'acompanhados', element: <ClinicoAcompanhados />, handle: { titulo: 'Acompanhados' } },
          { path: 'estudantes/:id', element: <ClinicoEstudante />, handle: { titulo: 'Estudante' } },
          { path: 'estudantes/:id/ficha', element: <ClinicoFicha />, handle: { titulo: 'Ficha de acompanhamento' } },
          { path: 'alertas', element: <Navigate to="/clinico/acompanhados" replace /> },
          { path: 'perfil', element: <PerfilProfissional area="clinico" />, handle: { titulo: 'Perfil' } },
        ],
      },

      // Administração
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="usuarios" replace /> },
          { path: 'usuarios', element: <AdminUsuarios />, handle: { titulo: 'Usuários' } },
          { path: 'usuarios/novo', element: <AdminCadastro />, handle: { titulo: 'Cadastrar estudante' } },
          { path: 'profissionais/novo/:papel', element: <CadastroProfissional />, handle: { titulo: 'Cadastrar profissional' } },
          { path: 'usuarios/:id', element: <AdminCadastro />, handle: { titulo: 'Editar estudante' } },
          { path: 'vinculos', element: <AdminVinculos />, handle: { titulo: 'Vínculos' } },
          { path: 'fichas', element: <AdminFichas />, handle: { titulo: 'Fichas' } },
          { path: 'conteudos', element: <AdminConteudos />, handle: { titulo: 'Conteúdos' } },
          { path: 'codigos', element: <AdminCodigos />, handle: { titulo: 'Códigos de cadastro' } },
          { path: 'emails', element: <AdminEmails />, handle: { titulo: 'E-mails' } },
          { path: 'indicadores', element: <AdminIndicadores />, handle: { titulo: 'Indicadores da escola' } },
          { path: 'perfil', element: <PerfilProfissional area="admin" />, handle: { titulo: 'Perfil' } },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(rotas);
