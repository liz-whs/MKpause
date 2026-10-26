"""
Conteúdos de autorregulação (RF02, RF03, RF35, RN31).

GET    /api/atividades/            lista (estudante vê só as disponíveis; ?tipo=JOGO)
POST   /api/atividades/            admin cadastra
PATCH  /api/atividades/<id>/       admin altera
DELETE /api/atividades/<id>/       admin marca como indisponível (não apaga: há sessões ligadas)
"""
from rest_framework import serializers, viewsets
from rest_framework.response import Response

from contas import perfis as p
from contas.permissoes import SomenteAdministrador

from .models import Atividade


class AtividadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atividade
        fields = ["id_atividade", "nome", "descricao", "tipo", "conteudo_ou_referencia",
                  "disponivel", "criado_em", "atualizado_em"]
        read_only_fields = ["criado_em", "atualizado_em"]


class AtividadeViewSet(viewsets.ModelViewSet):
    serializer_class = AtividadeSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        return [SomenteAdministrador()]

    def get_queryset(self):
        qs = Atividade.objects.order_by("nome")
        if self.request.user.perfil != p.ADMINISTRADOR:
            qs = qs.filter(disponivel=True)
        if tipo := self.request.query_params.get("tipo"):
            qs = qs.filter(tipo=tipo.upper())
        return qs

    def destroy(self, request, *args, **kwargs):
        atividade = self.get_object()
        atividade.disponivel = False
        atividade.save()
        return Response({"detail": "Atividade marcada como indisponível."})
