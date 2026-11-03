"""Sessões de autorregulação e humor. Tabelas (V1): sessao, registro_humor."""
from django.db import models
from django.utils import timezone

from atividades.models import Atividade
from contas.models import Estudante
from nucleo.models import TabelaDoFlyway


class Sessao(TabelaDoFlyway):
    class Status(models.TextChoices):  # CHECK ck_sessao_status
        EM_ANDAMENTO = "EM_ANDAMENTO"
        CONCLUIDA = "CONCLUIDA"
        CANCELADA = "CANCELADA"

    id_sessao = models.BigAutoField(primary_key=True)
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="sessoes")
    # V1: uma atividade por sessão (não há tabela sessao_atividade)
    atividade = models.ForeignKey(Atividade, models.RESTRICT, db_column="id_atividade",
                                  related_name="sessoes")
    iniciada_em = models.DateTimeField(default=timezone.now)
    terminada_em = models.DateTimeField(null=True, blank=True)
    nivel_avaliado = models.SmallIntegerField(null=True, blank=True)  # 1 a 3
    duracao_segundos = models.IntegerField(null=True, blank=True)
    observacoes_sessao = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ANDAMENTO)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "sessao"
        ordering = ["-iniciada_em"]


class RegistroHumor(TabelaDoFlyway):
    class Momento(models.TextChoices):  # CHECK ck_registro_humor_momento
        PRE = "PRE"
        POS = "POS"

    id_registro_humor = models.BigAutoField(primary_key=True)
    sessao = models.ForeignKey(Sessao, models.RESTRICT, db_column="id_sessao",
                               related_name="registros_humor")
    estado = models.SmallIntegerField()  # 1 a 5
    momento = models.CharField(max_length=10, choices=Momento.choices)
    registrado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "registro_humor"
        constraints = [  # uq_registro_humor_sessao_momento
            models.UniqueConstraint(fields=["sessao", "momento"], name="uq_registro_humor_sessao_momento"),
        ]
