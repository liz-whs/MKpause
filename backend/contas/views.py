"""
Login (RF01, RF10, RF19, RF26), cadastros e vínculos (RF27–RF34),
e a consulta de estudantes vinculados (RF11, RF20).
"""
from django.db import transaction
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import perfis as p
from . import serializers as s
from .autenticacao import entrar, sair
from .models import (EstudanteResponsavel, ProfessorEstudante, PsicologoClinicoEstudante,
                     PsicologoEscolarEstudante, Usuario)
from .perfis import carregar_perfil
from .permissoes import SomenteAdministrador, estudantes_vinculados, somente

# ---------------------------------------------------------------- autenticação


class CsrfView(APIView):
    """GET: entrega o cookie csrftoken, que o frontend envia em X-CSRFToken."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrftoken": get_token(request)})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        dados = s.LoginSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        usuario = Usuario.objects.filter(email__iexact=dados.validated_data["email"], ativo=True).first()
        # Mesma mensagem para e-mail inexistente e senha errada
        if usuario is None or not usuario.conferir_senha(dados.validated_data["senha"]) \
                or not carregar_perfil(usuario):
            return Response({"detail": "E-mail ou senha não conferem. Confira e tente de novo."},
                            status=status.HTTP_401_UNAUTHORIZED)
        entrar(request, usuario)
        return Response(_dados_da_conta(usuario))


class LogoutView(APIView):
    def post(self, request):
        sair(request)
        return Response({"detail": "Você saiu da sua conta."})


class EuView(APIView):
    def get(self, request):
        return Response(_dados_da_conta(request.user))


def _dados_da_conta(usuario):
    return {
        "id_usuario": usuario.pk,
        "nome_completo": usuario.nome_completo,
        "email": usuario.email,
        "perfil": usuario.perfil,
        "id_perfil": usuario.dados_perfil.pk,
    }


# ------------------------------------------------------- cadastros (admin)

class CadastroViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                      mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    CRUD do administrador. DELETE não apaga: desativa o perfil e o usuario,
    preservando o histórico (RN30, doc. do banco item 7.9).
    ?ativo=true|false filtra a lista.
    """

    permission_classes = [SomenteAdministrador]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        qs = self.serializer_class.Meta.model.objects.select_related("usuario").order_by("usuario__nome_completo")
        ativo = self.request.query_params.get("ativo")
        if ativo in ("true", "false"):
            qs = qs.filter(ativo=ativo == "true")
        return qs

    @transaction.atomic
    def perform_destroy(self, instancia):
        instancia.ativo = False
        instancia.save(update_fields=["ativo"])
        instancia.usuario.ativo = False
        instancia.usuario.save(update_fields=["ativo"])

    def destroy(self, request, *args, **kwargs):
        self.perform_destroy(self.get_object())
        return Response({"detail": "Cadastro desativado. O histórico foi mantido."})


class EstudantesAdminViewSet(CadastroViewSet):
    serializer_class = s.EstudanteSerializer


class ProfessoresAdminViewSet(CadastroViewSet):
    serializer_class = s.ProfessorSerializer


class PsicologosEscolaresAdminViewSet(CadastroViewSet):
    serializer_class = s.PsicologoEscolarSerializer


class PsicologosClinicosAdminViewSet(CadastroViewSet):
    serializer_class = s.PsicologoClinicoSerializer


class ResponsaveisAdminViewSet(CadastroViewSet):
    serializer_class = s.ResponsavelSerializer

    def get_queryset(self):
        qs = self.serializer_class.Meta.model.objects.order_by("nome_completo")
        ativo = self.request.query_params.get("ativo")
        if ativo in ("true", "false"):
            qs = qs.filter(ativo=ativo == "true")
        return qs

    def perform_destroy(self, instancia):
        instancia.ativo = False
        instancia.save(update_fields=["ativo"])


# ---------------------------------------------------------- vínculos (admin)

class VinculoView(APIView):
    """
    GET    lista (filtros: ?estudante=ID, ?ativo=true|false)
    POST   {"<profissional>": ID, "estudante": ID} cria ou reativa
    DELETE {"<profissional>": ID, "estudante": ID} desativa
    """

    permission_classes = [SomenteAdministrador]
    modelo = serializer_class = campo = None
    mensagem_ao_remover = "Vínculo desativado."

    def get(self, request):
        qs = self.modelo.objects.all().order_by("-criado_em")
        if est := request.query_params.get("estudante"):
            qs = qs.filter(estudante_id=est)
        if (ativo := request.query_params.get("ativo")) in ("true", "false"):
            qs = qs.filter(ativo=ativo == "true")
        return Response(self.serializer_class(qs, many=True).data)

    def post(self, request):
        dados = self.serializer_class(data=request.data)
        dados.is_valid(raise_exception=True)
        chave = {self.campo: dados.validated_data[self.campo], "estudante": dados.validated_data["estudante"]}
        extras = {k: v for k, v in dados.validated_data.items() if k not in chave}
        vinculo, criado = self.modelo.objects.get_or_create(**chave, defaults=extras)
        if not criado:
            vinculo.ativo = True
            for k, v in extras.items():
                setattr(vinculo, k, v)
            vinculo.save()
        return Response(self.serializer_class(vinculo).data,
                        status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK)

    def delete(self, request):
        filtro = {f"{self.campo}_id": request.data.get(self.campo), "estudante_id": request.data.get("estudante")}
        vinculo = get_object_or_404(self.modelo, **filtro)
        vinculo.ativo = False
        vinculo.save()
        return Response({"detail": self.mensagem_ao_remover})


class VinculoProfessorView(VinculoView):  # RF32
    modelo, serializer_class, campo = ProfessorEstudante, s.VinculoProfessorSerializer, "professor"
    mensagem_ao_remover = "Vínculo desativado. O professor deixa de receber os alertas deste estudante."


class VinculoPsicologoEscolarView(VinculoView):  # RF33
    modelo, serializer_class, campo = PsicologoEscolarEstudante, s.VinculoPsicologoEscolarSerializer, "psicologo_escolar"
    mensagem_ao_remover = "Vínculo desativado. O psicólogo escolar deixa de receber os alertas deste estudante."


class VinculoPsicologoClinicoView(VinculoView):  # RF33
    modelo, serializer_class, campo = PsicologoClinicoEstudante, s.VinculoPsicologoClinicoSerializer, "psicologo_clinico"
    mensagem_ao_remover = "Vínculo desativado. O psicólogo clínico deixa de ver os registros deste estudante."


class VinculoResponsavelView(VinculoView):  # RF34 (convite: RN24, ainda não implementado)
    modelo, serializer_class, campo = EstudanteResponsavel, s.VinculoResponsavelSerializer, "responsavel"


# -------------------------------------------- estudantes vinculados (RF11, RF20)

class MeusEstudantesViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.EstudanteResumoSerializer
    permission_classes = [somente(*p.PROFISSIONAIS, p.ADMINISTRADOR)]

    def get_queryset(self):
        return (estudantes_vinculados(self.request.user).select_related("usuario")
                .order_by("usuario__nome_completo").distinct())
