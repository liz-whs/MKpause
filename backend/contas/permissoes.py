"""
Quem pode fazer o quê (RN02, RN03, RN04, RN20, RN33, RN34).

Toda regra de acesso do backend está aqui. Para mudar uma permissão, edite
a tabela ACESSO: as views só perguntam `pode(usuario, acao, estudante)`.
"""
from rest_framework.permissions import BasePermission

from . import perfis as p
from .models import Estudante

# acao -> perfis que podem. Profissionais só sobre estudantes vinculados;
# o estudante só sobre si mesmo; o administrador sobre todos.
ACESSO = {
    "ver_dados_basicos": {p.ESTUDANTE, p.PROFESSOR, p.PSICOLOGO_ESCOLAR, p.PSICOLOGO_CLINICO, p.ADMINISTRADOR},
    "ver_historico": {p.ESTUDANTE, p.PSICOLOGO_ESCOLAR, p.PSICOLOGO_CLINICO, p.ADMINISTRADOR},  # RF09, RF12, RF13
    "ver_alertas": {p.ESTUDANTE, p.PROFESSOR, p.PSICOLOGO_ESCOLAR, p.PSICOLOGO_CLINICO, p.ADMINISTRADOR},
    "ver_observacoes": {p.ESTUDANTE, p.PROFESSOR, p.PSICOLOGO_ESCOLAR, p.PSICOLOGO_CLINICO},  # RF14
    # Gatilho trg_validar_autor_observacao: só estudante, professor e psi. escolar
    "registrar_observacao": {p.ESTUDANTE, p.PROFESSOR, p.PSICOLOGO_ESCOLAR},  # RF07, RF23
    "ver_ficha": {p.PSICOLOGO_ESCOLAR, p.PSICOLOGO_CLINICO, p.ADMINISTRADOR},  # RF16, RF31
    "editar_ficha": {p.PSICOLOGO_CLINICO, p.ADMINISTRADOR},  # RF17, RF31
}


def estudantes_vinculados(usuario):
    """Estudantes que o usuario pode acessar, conforme perfil e vínculos ativos."""
    qs = Estudante.objects.filter(ativo=True, usuario__ativo=True)
    perfil, dados = usuario.perfil, usuario.dados_perfil
    if perfil == p.ADMINISTRADOR:
        return Estudante.objects.all()
    if perfil == p.ESTUDANTE:
        return qs.filter(pk=dados.pk)
    if perfil == p.PROFESSOR:
        return qs.filter(vinculos_professor__professor=dados, vinculos_professor__ativo=True)
    if perfil == p.PSICOLOGO_ESCOLAR:
        return qs.filter(vinculos_psicologo_escolar__psicologo_escolar=dados,
                         vinculos_psicologo_escolar__ativo=True)
    if perfil == p.PSICOLOGO_CLINICO:
        return qs.filter(vinculos_psicologo_clinico__psicologo_clinico=dados,
                         vinculos_psicologo_clinico__ativo=True)
    return qs.none()


def pode(usuario, acao, estudante):
    if usuario.perfil not in ACESSO[acao]:
        return False
    return estudantes_vinculados(usuario).filter(pk=estudante.pk).exists()


# ----------------------------------------------------- classes para as views

class Autenticado(BasePermission):
    message = "Entre com sua conta para continuar."

    def has_permission(self, request, view):
        return request.user is not None


def somente(*perfis_permitidos):
    """Permissão DRF: exige login e um dos perfis. Uso: permission_classes = [somente(p.ESTUDANTE)]"""

    class _Somente(BasePermission):
        message = "Seu perfil não tem acesso a esta área."

        def has_permission(self, request, view):
            return request.user is not None and request.user.perfil in perfis_permitidos

    return _Somente


SomenteAdministrador = somente(p.ADMINISTRADOR)
