"""
Sessão de autorregulação (RF04–RF07, RF09, RF12, RF13).

Fluxo:
  1. POST /api/sessoes/avaliar/            {"humor": 1-5}  -> nível sugerido e atividades (não grava)
  2. POST /api/sessoes/                    {"id_atividade", "humor_pre"} -> sessão EM_ANDAMENTO + humor PRE
  3. POST /api/sessoes/<id>/concluir/      {"humor_pos", "observacoes_sessao"?} -> CONCLUIDA + humor POS
     ou POST /api/sessoes/<id>/cancelar/   -> CANCELADA ("tudo bem parar")
  GET /api/sessoes/[?estudante=ID]         histórico (estudante: o próprio; profissionais: vinculados)
"""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from atividades.models import Atividade
from atividades.views import AtividadeSerializer
from contas import perfis as p
from contas.models import Estudante
from contas.permissoes import pode, somente
from nucleo.erros import Conflito

from . import regras
from .models import RegistroHumor, Sessao

campo_humor = lambda: serializers.IntegerField(min_value=regras.HUMOR_MIN, max_value=regras.HUMOR_MAX)  # noqa: E731


class RegistroHumorSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroHumor
        fields = ["estado", "momento", "registrado_em"]


class SessaoSerializer(serializers.ModelSerializer):
    atividade = AtividadeSerializer(read_only=True)
    registros_humor = RegistroHumorSerializer(many=True, read_only=True)

    class Meta:
        model = Sessao
        fields = ["id_sessao", "estudante", "atividade", "iniciada_em", "terminada_em", "nivel_avaliado",
                  "duracao_segundos", "observacoes_sessao", "status", "registros_humor"]


class AvaliarSerializer(serializers.Serializer):
    humor = campo_humor()


class IniciarSerializer(serializers.Serializer):
    id_atividade = serializers.IntegerField()
    humor_pre = campo_humor()


class ConcluirSerializer(serializers.Serializer):
    humor_pos = campo_humor()
    observacoes_sessao = serializers.CharField(required=False, allow_blank=True)


class SessaoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SessaoSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        return [somente(p.ESTUDANTE)()]

    def get_queryset(self):
        usuario = self.request.user
        qs = Sessao.objects.select_related("atividade").prefetch_related("registros_humor")
        if usuario.perfil == p.ESTUDANTE:
            return qs.filter(estudante=usuario.dados_perfil)
        if self.action == "list":
            id_estudante = self.request.query_params.get("estudante")
            if not id_estudante:
                raise ValidationError({"estudante": "Informe o estudante (?estudante=ID)."})
            estudante = get_object_or_404(Estudante, pk=id_estudante)
            if not pode(usuario, "ver_historico", estudante):
                raise PermissionDenied("Seu perfil não tem acesso ao histórico deste estudante.")
            return qs.filter(estudante=estudante)
        return qs

    def get_object(self):
        sessao = super().get_object()
        usuario = self.request.user
        if usuario.perfil != p.ESTUDANTE and not pode(usuario, "ver_historico", sessao.estudante):
            raise PermissionDenied("Seu perfil não tem acesso ao histórico deste estudante.")
        return sessao

    # ------------------------------------------------------------ ações

    @action(detail=False, methods=["post"])
    def avaliar(self, request):  # RN07
        dados = AvaliarSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        nivel = regras.avaliar_humor(dados.validated_data["humor"])
        atividades = Atividade.objects.filter(disponivel=True).order_by("nome")
        return Response({
            "nivel": nivel,
            "mensagem": regras.MENSAGEM_POR_NIVEL[nivel],
            "pode_emitir_alerta": nivel >= 2,
            "atividades": AtividadeSerializer(atividades, many=True).data,
        })

    def create(self, request):  # RF04, RF05, RN05, RN06
        dados = IniciarSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        atividade = Atividade.objects.filter(pk=dados.validated_data["id_atividade"], disponivel=True).first()
        if atividade is None:
            raise ValidationError({"id_atividade": "Esta atividade não está disponível. Escolha outra."})

        humor = dados.validated_data["humor_pre"]
        with transaction.atomic():
            sessao = Sessao.objects.create(estudante=request.user.dados_perfil, atividade=atividade,
                                           nivel_avaliado=regras.avaliar_humor(humor))
            RegistroHumor.objects.create(sessao=sessao, estado=humor, momento=RegistroHumor.Momento.PRE)
        return Response({
            "sessao": SessaoSerializer(self.get_queryset().get(pk=sessao.pk)).data,
            "mensagem": regras.MENSAGEM_POR_NIVEL[sessao.nivel_avaliado],
        }, status=status.HTTP_201_CREATED)

    def _sessao_em_andamento(self, pk):
        sessao = get_object_or_404(Sessao.objects.select_for_update(), pk=pk,
                                   estudante=self.request.user.dados_perfil)
        if sessao.status != Sessao.Status.EM_ANDAMENTO:
            raise Conflito("Esta pausa já foi encerrada.")
        return sessao

    def _encerrar(self, sessao, novo_status):
        sessao.terminada_em = timezone.now()
        sessao.duracao_segundos = max(int((sessao.terminada_em - sessao.iniciada_em).total_seconds()), 0)
        sessao.status = novo_status

    @action(detail=True, methods=["post"])
    def concluir(self, request, pk=None):  # RF06, RF07, RN09, RN10
        dados = ConcluirSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        with transaction.atomic():
            sessao = self._sessao_em_andamento(pk)
            self._encerrar(sessao, Sessao.Status.CONCLUIDA)
            if "observacoes_sessao" in dados.validated_data:
                sessao.observacoes_sessao = dados.validated_data["observacoes_sessao"]
            sessao.save()
            RegistroHumor.objects.create(sessao=sessao, estado=dados.validated_data["humor_pos"],
                                         momento=RegistroHumor.Momento.POS)
        return Response({"sessao": SessaoSerializer(self.get_queryset().get(pk=sessao.pk)).data,
                         "mensagem": "Pausa feita. Volte quando quiser."})

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        with transaction.atomic():
            sessao = self._sessao_em_andamento(pk)
            self._encerrar(sessao, Sessao.Status.CANCELADA)
            sessao.save()
        return Response({"sessao": SessaoSerializer(self.get_queryset().get(pk=sessao.pk)).data,
                         "mensagem": "Tudo bem parar. Você pode voltar depois."})
