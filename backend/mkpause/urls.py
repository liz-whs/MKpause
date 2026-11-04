"""
Rotas da API do MKpause. Tudo responde JSON em /api/.
A lista completa, com exemplos, está em backend/README.md.
"""
from django.conf import settings
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from acompanhamento.views import AvisoViewSet, FichaView
from acompanhamento.dashboard import DashboardClinicoView
from acompanhamento import convites
from alertas.views import AlertaViewSet
from atividades.views import AtividadeViewSet
from contas import views as contas
from contas import views_codigos as codigos
from sessoes.views import SessaoViewSet

router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register("atividades", AtividadeViewSet, basename="atividade")
router.register("sessoes", SessaoViewSet, basename="sessao")
router.register("alertas", AlertaViewSet, basename="alerta")
router.register("avisos", AvisoViewSet, basename="aviso")
router.register("estudantes", contas.MeusEstudantesViewSet, basename="estudante")
router.register("admin/estudantes", contas.EstudantesAdminViewSet, basename="admin-estudante")
router.register("admin/professores", contas.ProfessoresAdminViewSet, basename="admin-professor")
router.register("admin/psicologos-escolares", contas.PsicologosEscolaresAdminViewSet,
                basename="admin-psicologo-escolar")
router.register("admin/psicologos-clinicos", contas.PsicologosClinicosAdminViewSet,
                basename="admin-psicologo-clinico")
router.register("admin/responsaveis", contas.ResponsaveisAdminViewSet, basename="admin-responsavel")

urlpatterns = [
    path("api/admin/estudantes/<int:id_estudante>/convites-responsavel/", convites.ConvitesAdminView.as_view()),
    path("api/admin/convites-responsavel/<int:id_convite>/revogar/", convites.RevogarConviteView.as_view()),
    path("api/convites-responsavel/verificar/", convites.ConvitePublicoView.as_view()),
    path("api/convites-responsavel/aceitar/", convites.ResponderConviteView.as_view(), {"resposta": "aceitar"}),
    path("api/convites-responsavel/recusar/", convites.ResponderConviteView.as_view(), {"resposta": "recusar"}),
    path("api/admin/emails/", convites.EmailsAdminView.as_view()),
    path("api/auth/csrf/", contas.CsrfView.as_view()),
    path("api/auth/login/", contas.LoginView.as_view()),
    path("api/auth/logout/", contas.LogoutView.as_view()),
    path("api/auth/eu/", contas.EuView.as_view()),
    path("api/auth/codigo-cadastro/verificar/", codigos.VerificarCadastroView.as_view()),
    path("api/auth/cadastro/", codigos.CadastrarComCodigoView.as_view()),
    path("api/admin/codigos-cadastro/", codigos.CodigosCadastroView.as_view()),
    path("api/admin/codigos-cadastro/<int:id_codigo>/revogar/", codigos.RevogarCadastroView.as_view()),
    path("api/vinculos/codigos/", codigos.GerarVinculoView.as_view()),
    path("api/vinculos/codigos/atual/", codigos.VinculoAtualView.as_view()),
    path("api/vinculos/solicitacoes/", codigos.SolicitacoesView.as_view()),
    path("api/vinculos/solicitacoes/<int:id_codigo>/aceitar/", codigos.ResponderVinculoView.as_view(), {"resposta": "aceitar"}),
    path("api/vinculos/solicitacoes/<int:id_codigo>/recusar/", codigos.ResponderVinculoView.as_view(), {"resposta": "recusar"}),
    path("api/vinculos/resgatar/", codigos.ResgatarVinculoView.as_view()),
    path("api/vinculos/enviados/", codigos.PedidosEnviadosView.as_view()),
    path("api/estudantes/<int:id_estudante>/ficha/", FichaView.as_view()),
    path("api/estudantes/<int:id_estudante>/dashboard/", DashboardClinicoView.as_view()),
    path("api/admin/vinculos/professores/", contas.VinculoProfessorView.as_view()),
    path("api/admin/vinculos/psicologos-escolares/", contas.VinculoPsicologoEscolarView.as_view()),
    path("api/admin/vinculos/psicologos-clinicos/", contas.VinculoPsicologoClinicoView.as_view()),
    path("api/admin/vinculos/responsaveis/", contas.VinculoResponsavelView.as_view()),
    path("api/", include(router.urls)),
]


def interface_web(request):
    """Rotas da interface (React Router): devolve o index.html compilado."""
    index = settings.INTERFACE_WEB / "index.html"
    if not index.exists():
        raise Http404("Interface web não compilada: rode `npm run build` em src/web.")
    return FileResponse(index.open("rb"), content_type="text/html")


urlpatterns.append(re_path(r"^(?!api/).*$", interface_web))
