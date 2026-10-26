"""
Ficha de acompanhamento (RF16, RF17, RF31, RN22) e avisos (RF18, RF25).

GET/POST/PATCH /api/estudantes/<id>/ficha/   POST só admin; PATCH admin ou psi. clínico
GET    /api/avisos/                          avisos ativos para o público do perfil
POST   /api/avisos/                          admin publica
PATCH  /api/avisos/<id>/   DELETE /api/avisos/<id>/ (desativa)   admin
"""
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from contas import perfis as p
from contas.models import Estudante
from contas.permissoes import SomenteAdministrador, pode
from nucleo.erros import Conflito

from .models import Aviso, FichaAcompanhamento


class FichaSerializer(serializers.ModelSerializer):
    nome_estudante = serializers.CharField(source="estudante.usuario.nome_completo", read_only=True)

    class Meta:
        model = FichaAcompanhamento
        fields = ["id_ficha", "estudante", "nome_estudante", "informacoes_acompanhamento",
                  "criada_em", "atualizada_em", "ativo"]
        read_only_fields = ["estudante", "criada_em", "atualizada_em"]


class FichaView(APIView):
    def _estudante(self, request, id_estudante, acao):
        estudante = get_object_or_404(Estudante, pk=id_estudante)
        if not pode(request.user, acao, estudante):
            raise PermissionDenied("Seu perfil não tem acesso à ficha deste estudante.")
        return estudante

    def _ficha(self, estudante):
        ficha = FichaAcompanhamento.objects.filter(estudante=estudante).first()
        if ficha is None:
            raise NotFound("Este estudante ainda não tem ficha de acompanhamento.")
        return ficha

    def get(self, request, id_estudante):
        estudante = self._estudante(request, id_estudante, "ver_ficha")
        return Response(FichaSerializer(self._ficha(estudante)).data)

    def post(self, request, id_estudante):
        if request.user.perfil != p.ADMINISTRADOR:
            raise PermissionDenied("Só a administração cria fichas de acompanhamento.")
        estudante = get_object_or_404(Estudante, pk=id_estudante)
        if FichaAcompanhamento.objects.filter(estudante=estudante).exists():
            raise Conflito("Este estudante já tem uma ficha.")
        dados = FichaSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        ficha = dados.save(estudante=estudante)
        return Response(FichaSerializer(ficha).data, status=status.HTTP_201_CREATED)

    def patch(self, request, id_estudante):
        estudante = self._estudante(request, id_estudante, "editar_ficha")
        ficha = self._ficha(estudante)
        dados = FichaSerializer(ficha, data=request.data, partial=True)
        dados.is_valid(raise_exception=True)
        if "ativo" in dados.validated_data and request.user.perfil != p.ADMINISTRADOR:
            raise PermissionDenied("Só a administração ativa ou desativa fichas.")
        return Response(FichaSerializer(dados.save()).data)


# ------------------------------------------------------------------- avisos

PUBLICO_DO_PERFIL = {
    p.ESTUDANTE: Aviso.Publico.ESTUDANTES,
    p.PROFESSOR: Aviso.Publico.PROFESSORES,
    p.PSICOLOGO_ESCOLAR: Aviso.Publico.PSICOLOGOS_ESCOLARES,
    p.PSICOLOGO_CLINICO: Aviso.Publico.PSICOLOGOS_CLINICOS,
}


class AvisoSerializer(serializers.ModelSerializer):
    nome_autor = serializers.CharField(source="autor.nome_completo", read_only=True)

    class Meta:
        model = Aviso
        fields = ["id_aviso", "titulo", "conteudo", "publicado_em", "autor", "nome_autor",
                  "publico_destinatario", "ativo"]
        read_only_fields = ["publicado_em", "autor"]


class AvisoViewSet(viewsets.ModelViewSet):
    serializer_class = AvisoSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        return [SomenteAdministrador()]

    def get_queryset(self):
        qs = Aviso.objects.select_related("autor")
        perfil = self.request.user.perfil
        if perfil == p.ADMINISTRADOR:
            return qs
        return qs.filter(ativo=True, publico_destinatario__in=[Aviso.Publico.TODOS, PUBLICO_DO_PERFIL[perfil]])

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)

    def destroy(self, request, *args, **kwargs):
        aviso = self.get_object()
        aviso.ativo = False
        aviso.save(update_fields=["ativo"])
        return Response({"detail": "Aviso desativado."})
