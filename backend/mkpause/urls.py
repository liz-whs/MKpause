"""
Rotas da API do MKpause. Tudo responde JSON em /api/.
A lista completa, com exemplos, está em backend/README.md.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from acompanhamento.views import AvisoViewSet, FichaView
from alertas.views import AlertaViewSet
from atividades.views import AtividadeViewSet
from contas import views as contas
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
    path("api/auth/csrf/", contas.CsrfView.as_view()),
    path("api/auth/login/", contas.LoginView.as_view()),
    path("api/auth/logout/", contas.LogoutView.as_view()),
    path("api/auth/eu/", contas.EuView.as_view()),
    path("api/estudantes/<int:id_estudante>/ficha/", FichaView.as_view()),
    path("api/admin/vinculos/professores/", contas.VinculoProfessorView.as_view()),
    path("api/admin/vinculos/psicologos-escolares/", contas.VinculoPsicologoEscolarView.as_view()),
    path("api/admin/vinculos/psicologos-clinicos/", contas.VinculoPsicologoClinicoView.as_view()),
    path("api/admin/vinculos/responsaveis/", contas.VinculoResponsavelView.as_view()),
    path("api/", include(router.urls)),
]
