import { GuiaProfissional } from './GuiaProfissional';
import { Outlet, useLocation } from 'react-router';
import { BotaoPreferencias } from '../../preferencias/PainelPreferencias';
import { StudentHeader } from './StudentHeader';
import { ProSidebar, type ProSidebarProps } from './ProSidebar';

/** Páginas com cabeçalho do estudante (Início, Atividades, Cuidados, Perfil). */
export function StudentLayout({ iniciais }: { iniciais: string }) {
  return (
    <div className="min-h-dvh bg-bg">
      <StudentHeader iniciais={iniciais} />
      <main id="conteudo" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-2.5 pb-10 md:px-8 md:pt-6 lg:max-w-5xl lg:gap-6">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Telas de foco do estudante (pausa, respiração, aviso): sem cabeçalho,
 * cada tela traz o próprio "Voltar" ou "Sair da pausa".
 */
export function StudentFocusLayout() {
  const respiracao = ['/estudante/pausa/respiracao', '/estudante/atividades/respiracao', '/estudante/agora'].includes(useLocation().pathname);
  const jogoIntegrado = ['/estudante/pausa/mkconnection', '/estudante/atividades/mkconnection', '/estudante/pausa/mkpotion', '/estudante/atividades/mkpotion', '/estudante/pausa/pianopause', '/estudante/atividades/pianopause'].includes(useLocation().pathname);
  const video = ['/estudante/pausa/video', '/estudante/pausa/espiral', '/estudante/pausa/chinchila', '/estudante/atividades/video', '/estudante/atividades/espiral', '/estudante/atividades/chinchila'].includes(useLocation().pathname);
  return (
    <div className="min-h-dvh bg-bg">
      <main id="conteudo" tabIndex={-1} className={respiracao ? 'flex min-h-dvh w-full flex-col gap-3 px-4 pb-4 md:px-6' : jogoIntegrado ? 'flex h-dvh min-h-[40rem] w-full flex-col gap-3 px-4 pb-4 md:px-8' : video ? 'w-full' : 'mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pb-8 md:px-8'}>
        <Outlet />
      </main>
    </div>
  );
}

/** Profissionais e administração: menu lateral + conteúdo. */
export function ProLayout(props: ProSidebarProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:flex-row">
      <ProSidebar {...props} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden justify-end px-4 pt-4 lg:flex">
          <BotaoPreferencias />
        </div>
        <main id="conteudo" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6 px-5 pt-6 pb-14 md:px-8 lg:px-10 lg:pt-9">
          <GuiaProfissional key={`${props.usuario.id}-${props.perfilTo}`} conta={props.usuario.id ?? props.perfilTo} perfilTo={props.perfilTo} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
