"""Catálogo de conteúdos de autorregulação. Tabela (V1): atividade."""
from django.db import models
from django.utils import timezone

from nucleo.models import TabelaDoFlyway


class Atividade(TabelaDoFlyway):
    class Tipo(models.TextChoices):  # CHECK ck_atividade_tipo
        JOGO = "JOGO"
        VIDEO = "VIDEO"
        EXERCICIO = "EXERCICIO"
        RESPIRACAO = "RESPIRACAO"
        OUTRO = "OUTRO"

    id_atividade = models.BigAutoField(primary_key=True)
    nome = models.CharField(max_length=160)
    descricao = models.TextField(null=True, blank=True)
    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    conteudo_ou_referencia = models.TextField(null=True, blank=True)
    disponivel = models.BooleanField(default=True)  # RN31
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "atividade"

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        self.atualizado_em = timezone.now()
        super().save(*args, **kwargs)
