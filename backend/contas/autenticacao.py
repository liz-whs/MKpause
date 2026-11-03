"""
Autenticação pela tabela `usuario` (sem django.contrib.auth).

O login guarda id_usuario na sessão (cookie assinado). A cada requisição o
usuario é recarregado do banco, então desativar a conta ou o perfil corta o
acesso na hora. Requisições que alteram dados exigem o token CSRF
(GET /api/auth/csrf/ entrega o cookie csrftoken; envie em X-CSRFToken).
"""
from rest_framework import authentication, exceptions

from .models import Usuario
from .perfis import carregar_perfil

CHAVE_SESSAO = "id_usuario"


class _CSRF(authentication.SessionAuthentication):
    pass


class AutenticacaoPorSessao(authentication.BaseAuthentication):
    def authenticate(self, request):
        id_usuario = request._request.session.get(CHAVE_SESSAO)
        if id_usuario is None:
            return None
        usuario = Usuario.objects.filter(pk=id_usuario, ativo=True).first()
        if usuario is None or not carregar_perfil(usuario):
            request._request.session.flush()
            raise exceptions.AuthenticationFailed("Sua conta não está mais ativa. Procure a escola.")
        _CSRF().enforce_csrf(request)
        return usuario, None

    def authenticate_header(self, request):
        # Faz o DRF responder 401 (e não 403) quando falta login.
        return "Session"


def entrar(request, usuario):
    request.session.cycle_key()
    request.session[CHAVE_SESSAO] = usuario.pk


def sair(request):
    request.session.flush()
