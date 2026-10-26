"""Alertas, destinatários e observações. Tabelas (V1): alerta, destinatario_alerta, observacao."""
from django.db import models
from django.utils import timezone

from contas.models import Estudante, Usuario
from nucleo.models import TabelaDoFlyway
from sessoes.models import Sessao


class Alerta(TabelaDoFlyway):
    class Status(models.TextChoices):  # CHECK ck_alerta_status
        ABERTO = "ABERTO"
        EM_ACOMPANHAMENTO = "EM_ACOMPANHAMENTO"
        RESOLVIDO = "RESOLVIDO"
        CANCELADO = "CANCELADO"

    id_alerta = models.BigAutoField(primary_key=True)
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="alertas")
    # No banco é FK composta (id_sessao, id_estudante): a sessão precisa ser
    # do mesmo estudante. O backend valida isso antes de gravar.
    sessao = models.ForeignKey(Sessao, models.RESTRICT, db_column="id_sessao",
                               null=True, blank=True, related_name="alertas", db_constraint=False)
    nivel = models.SmallIntegerField()  # 2 ou 3
    criado_em = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ABERTO)
    descricao = models.TextField(null=True, blank=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "alerta"
        ordering = ["-criado_em"]


class DestinatarioAlerta(TabelaDoFlyway):
    class Tipo(models.TextChoices):  # CHECK ck_destinatario_alerta_tipo
        PROFESSOR = "PROFESSOR"
        PSICOLOGO_ESCOLAR = "PSICOLOGO_ESCOLAR"

    class StatusNotificacao(models.TextChoices):  # CHECK ck_destinatario_alerta_status
        PENDENTE = "PENDENTE"
        ENVIADA = "ENVIADA"
        LIDA = "LIDA"
        FALHA = "FALHA"

    id_destinatario_alerta = models.BigAutoField(primary_key=True)
    alerta = models.ForeignKey(Alerta, models.RESTRICT, db_column="id_alerta",
                               related_name="destinatarios")
    usuario = models.ForeignKey(Usuario, models.RESTRICT, db_column="id_usuario",
                                related_name="alertas_recebidos")
    tipo_destinatario = models.CharField(max_length=30, choices=Tipo.choices)
    status_notificacao = models.CharField(max_length=20, choices=StatusNotificacao.choices,
                                          default=StatusNotificacao.PENDENTE)
    enviado_em = models.DateTimeField(null=True, blank=True)
    lido_em = models.DateTimeField(null=True, blank=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "destinatario_alerta"
        constraints = [
            models.UniqueConstraint(fields=["alerta", "usuario"], name="uq_destinatario_alerta_usuario"),
        ]


class Observacao(TabelaDoFlyway):
    """
    Na V1 a observação pertence a um alerta (e, por ele, ao estudante).
    Gatilho trg_validar_autor_observacao: autor precisa ser estudante,
    professor ou psicólogo escolar ativo.
    """

    id_observacao = models.BigAutoField(primary_key=True)
    alerta = models.ForeignKey(Alerta, models.RESTRICT, db_column="id_alerta",
                               related_name="observacoes")
    autor = models.ForeignKey(Usuario, models.RESTRICT, db_column="id_autor",
                              related_name="observacoes")
    conteudo = models.TextField()
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(null=True, blank=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "observacao"
        ordering = ["-criado_em"]
