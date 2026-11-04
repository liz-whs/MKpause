"""
Alertas e observações (RF08, RF14, RF15, RF21–RF23, RN11–RN19).

POST  /api/alertas/                      estudante emite {"nivel": 2|3, "id_sessao"?, "descricao"?}
GET   /api/alertas/[?status=ABERTO]      estudante: os seus; professor/psi. escolar: recebidos;
                                         psi. clínico: dos vinculados; admin: todos
GET   /api/alertas/<id>/
PATCH /api/alertas/<id>/                 {"status": ...} destinatário, admin, ou estudante (só CANCELADO)
POST  /api/alertas/<id>/lido/            destinatário marca a notificação como lida
GET/POST /api/alertas/<id>/observacoes/  {"conteudo": "..."}

O alerta e a fila de e-mail são gravados na mesma transação. O processador
registra ENVIADA/FALHA no envio e preserva LIDA se a leitura já aconteceu.
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from contas import perfis as p
from contas.permissoes import estudantes_vinculados, pode, somente
from nucleo.erros import Conflito
from sessoes.models import Sessao

from . import regras
from .models import Alerta, DestinatarioAlerta, Observacao


class DestinatarioSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source="usuario.nome_completo")

    class Meta:
        model = DestinatarioAlerta
        fields = ["usuario", "nome", "tipo_destinatario", "status_notificacao", "enviado_em", "lido_em"]


class AlertaSerializer(serializers.ModelSerializer):
    nome_estudante = serializers.CharField(source="estudante.usuario.nome_completo", read_only=True)
    destinatarios = DestinatarioSerializer(many=True, read_only=True)

    class Meta:
        model = Alerta
        fields = ["id_alerta", "estudante", "nome_estudante", "sessao", "nivel", "criado_em",
                  "status", "descricao", "destinatarios"]


class EmitirSerializer(serializers.Serializer):
    nivel = serializers.ChoiceField(choices=regras.NIVEIS_DE_ALERTA)
    id_sessao = serializers.IntegerField(required=False, allow_null=True)
    descricao = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class StatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Alerta.Status.choices)


class ObservacaoSerializer(serializers.ModelSerializer):
    nome_autor = serializers.CharField(source="autor.nome_completo", read_only=True)
    conteudo = serializers.CharField(max_length=5000)

    class Meta:
        model = Observacao
        fields = ["id_observacao", "alerta", "autor", "nome_autor", "conteudo", "criado_em", "atualizado_em"]
        read_only_fields = ["alerta", "autor", "criado_em", "atualizado_em"]

    def validate_conteudo(self, texto):  # CHECK ck_observacao_conteudo
        if not texto.strip():
            raise serializers.ValidationError("Escreva a observação antes de salvar.")
        return texto.strip()


class AlertaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertaSerializer

    def get_queryset(self):
        usuario = self.request.user
        qs = Alerta.objects.select_related("estudante__usuario").prefetch_related("destinatarios__usuario")
        if usuario.perfil == p.ESTUDANTE:
            qs = qs.filter(estudante=usuario.dados_perfil)
        elif usuario.perfil in (p.PROFESSOR, p.PSICOLOGO_ESCOLAR):
            qs = qs.filter(destinatarios__usuario=usuario)
        elif usuario.perfil == p.PSICOLOGO_CLINICO:
            qs = qs.filter(estudante__in=estudantes_vinculados(usuario))
        if st := self.request.query_params.get("status"):
            qs = qs.filter(status=st.upper())
        return qs.distinct()

    def _destinatario(self, alerta):
        return alerta.destinatarios.filter(usuario=self.request.user).first()

    # ------------------------------------------------------- emitir (RF08)

    def create(self, request):
        if request.user.perfil != p.ESTUDANTE:
            raise PermissionDenied("Só o estudante emite alertas.")
        dados = EmitirSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        estudante, nivel = request.user.dados_perfil, dados.validated_data["nivel"]

        sessao = None
        if id_sessao := dados.validated_data.get("id_sessao"):
            # Espelha a FK composta (id_sessao, id_estudante) do banco
            sessao = Sessao.objects.filter(pk=id_sessao, estudante=estudante).first()
            if sessao is None:
                raise ValidationError({"id_sessao": "Sessão não encontrada."})

        destinatarios = regras.destinatarios_para(estudante, nivel)
        if not destinatarios:
            raise Conflito("Você ainda não tem profissionais vinculados para receber o aviso. "
                           "Procure um adulto da escola. " + regras.AJUDA_IMEDIATA)

        with transaction.atomic():
            alerta = Alerta.objects.create(estudante=estudante, sessao=sessao, nivel=nivel,
                                           descricao=dados.validated_data.get("descricao") or None)
            DestinatarioAlerta.objects.bulk_create([
                DestinatarioAlerta(alerta=alerta, usuario=u, tipo_destinatario=tipo) for u, tipo in destinatarios
            ])
            from acompanhamento.models import NotificacaoEmail
            from nucleo.emails import agendar_envio
            NotificacaoEmail.objects.bulk_create([
                NotificacaoEmail(destinatario_alerta=d, email_destino=d.usuario.email)
                for d in alerta.destinatarios.select_related("usuario")
            ])
            agendar_envio()
        return Response({"alerta": AlertaSerializer(self.get_queryset().get(pk=alerta.pk)).data,
                         "avisados": [u.nome_completo for u, _ in destinatarios],
                         "mensagem": regras.mensagem_ao_estudante(nivel)},
                        status=status.HTTP_201_CREATED)

    # ---------------------------------------------- acompanhamento (RF22)

    def partial_update(self, request, pk=None):
        alerta = self.get_object()
        dados = StatusSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        novo = dados.validated_data["status"]

        perfil = request.user.perfil
        if perfil == p.ESTUDANTE:
            if novo != Alerta.Status.CANCELADO:
                raise PermissionDenied("Você pode apenas cancelar um alerta que enviou.")
        elif perfil != p.ADMINISTRADOR and self._destinatario(alerta) is None:
            raise PermissionDenied("Só quem recebeu o alerta pode mudar o status.")

        alerta.status = novo
        alerta.save(update_fields=["status"])
        return Response(AlertaSerializer(alerta).data)

    @action(detail=True, methods=["post"], permission_classes=[somente(p.PROFESSOR, p.PSICOLOGO_ESCOLAR)])
    def lido(self, request, pk=None):
        destinatario = self._destinatario(self.get_object())
        if destinatario.lido_em is None:
            destinatario.status_notificacao = DestinatarioAlerta.StatusNotificacao.LIDA
            destinatario.lido_em = timezone.now()
            destinatario.save(update_fields=["status_notificacao", "lido_em"])
        return Response(DestinatarioSerializer(destinatario).data)

    # ------------------------------------------- observações (RF14, RF23)

    @action(detail=True, methods=["get", "post"])
    def observacoes(self, request, pk=None):
        alerta = self.get_object()
        usuario = request.user

        if request.method == "GET":
            if not pode(usuario, "ver_observacoes", alerta.estudante):
                raise PermissionDenied("Seu perfil não tem acesso a estas observações.")
            qs = alerta.observacoes.select_related("autor")
            return Response(ObservacaoSerializer(qs, many=True).data)

        if not pode(usuario, "registrar_observacao", alerta.estudante):
            raise PermissionDenied("Seu perfil não registra observações neste alerta.")
        dados = ObservacaoSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        obs = dados.save(alerta=alerta, autor=usuario)
        return Response(ObservacaoSerializer(obs).data | {"mensagem": "Observação salva."},
                        status=status.HTTP_201_CREATED)
