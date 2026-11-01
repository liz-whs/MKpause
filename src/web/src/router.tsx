import { Fragment } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, type RouteObject } from 'react-router';
import { StudentFocusLayout, StudentLayout } from './components/layout/Layouts';
import { EstudanteProvider, useEstudante } from './state/EstudanteContext';
import { SkipLink, useTituloEFoco } from './components/layout/Navegacao';
import { usePreferencias } from './preferencias/preferencias';
import { PainelPreferencias } from './preferencias/PainelPreferencias';
import { VLibras } from './preferencias/VLibras';
import { Apresentacao1, Apresentacao2, Apresentacao3, BoasVindas, Entrar, PrimeiroAcesso } from './features/onboarding/Onboarding';
import { Atividades, Cuidados, Inicio, Perfil } from './features/student/Paginas';
import { ComoFicou, EscolherAtividade, Humor, PausaFeita, PianoPause, Respiracao, Video } from './features/session/Sessao';
import { JogoPianoPauseProvider } from './features/session/JogoPianoPause';
import { AgoraRespira, AvisoSaida, ForaDaSala, VoceSeCuidou } from './features/levels/Niveis';
import { EscolaAlertas, EscolaAvisos, EscolaEstudante, EscolaEstudantes, EscolaLayout } from './features/school/Escola';
import { ClinicoAcompanhados, ClinicoAlertas, ClinicoEstudante, ClinicoFicha, ClinicoLayout } from './features/clinical/Clinico';
import { PerfilProfissional } from './features/pro/PerfilProfissional';
import { AdminCadastro, AdminConteudos, AdminFichas, AdminLayout, AdminUsuarios, AdminVinculos } from './features/admin/Admin';

function Raiz() {
  const { idioma } = usePreferencias();
  useTituloEFoco();
  return (
    <EstudanteProvider>
      {/* Ao trocar de idioma as telas são remontadas e todo texto passa de novo por t(). */}
      <Fragment key={idioma}>
        <SkipLink />
        <Outlet />
      </Fragment>
      <ScrollRestoration />
      <PainelPreferencias />
      <VLibras />
    </EstudanteProvider>
  );
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
      { path: '/apresentacao/1', element: <Apresentacao1 />, handle: { titulo: 'Quando a cabeça pesar' } },
      { path: '/apresentacao/2', element: <Apresentacao2 />, handle: { titulo: 'Três jeitos de pausar' } },
      { path: '/apresentacao/3', element: <Apresentacao3 />, handle: { titulo: 'Quem vê o quê' } },
      { path: '/entrar', element: <Entrar />, handle: { titulo: 'Entrar' } },
      { path: '/primeiro-acesso', element: <PrimeiroAcesso />, handle: { titulo: 'Primeiro acesso' } },

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
          { path: 'pausa', element: <Humor />, handle: { titulo: 'Como você está' } },
          { path: 'pausa/atividade', element: <EscolherAtividade />, handle: { titulo: 'Escolha uma atividade' } },
          { path: 'pausa/respiracao', element: <Respiracao />, handle: { titulo: 'Respiração' } },
          { path: 'pausa/pianopause', element: <PianoPause />, handle: { titulo: 'PianoPause' } },
          { path: 'pausa/video', element: <Video />, handle: { titulo: 'Vídeo' } },
          { path: 'pausa/fim', element: <ComoFicou />, handle: { titulo: 'E agora?' } },
          { path: 'pausa/concluida', element: <PausaFeita />, handle: { titulo: 'Pausa feita' } },
          { path: 'aviso-de-saida', element: <AvisoSaida />, handle: { titulo: 'Sair da sala' } },
          { path: 'fora-da-sala', element: <ForaDaSala />, handle: { titulo: 'Fora da sala' } },
          { path: 'agora', element: <AgoraRespira />, handle: { titulo: 'Respire' } },
          { path: 'agora/fim', element: <VoceSeCuidou />, handle: { titulo: 'Você se cuidou' } },
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
          { path: 'alertas', element: <ClinicoAlertas />, handle: { titulo: 'Alertas' } },
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
          { path: 'usuarios/:id', element: <AdminCadastro />, handle: { titulo: 'Editar estudante' } },
          { path: 'vinculos', element: <AdminVinculos />, handle: { titulo: 'Vínculos' } },
          { path: 'fichas', element: <AdminFichas />, handle: { titulo: 'Fichas' } },
          { path: 'conteudos', element: <AdminConteudos />, handle: { titulo: 'Conteúdos' } },
          { path: 'perfil', element: <PerfilProfissional area="admin" />, handle: { titulo: 'Perfil' } },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(rotas);
