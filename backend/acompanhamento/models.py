"""Ficha de acompanhamento e avisos. Tabelas (V1): ficha_acompanhamento, aviso."""
from django.db import models
from django.utils import timezone

from contas.models import Estudante, Usuario
from nucleo.models import TabelaDoFlyway


class FichaAcompanhamento(TabelaDoFlyway):
    id_ficha = models.BigAutoField(primary_key=True)
    estudante = models.OneToOneField(Estudante, models.RESTRICT, db_column="id_estudante",
                                     related_name="ficha")
    informacoes_acompanhamento = models.TextField(null=True, blank=True)
    criada_em = models.DateTimeField(default=timezone.now)
    atualizada_em = models.DateTimeField(default=timezone.now)
    ativo = models.BooleanField(default=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "ficha_acompanhamento"

    def save(self, *args, **kwargs):
        self.atualizada_em = timezone.now()
        super().save(*args, **kwargs)


class Aviso(TabelaDoFlyway):
    class Publico(models.TextChoices):  # CHECK ck_aviso_publico
        TODOS = "TODOS"
        ESTUDANTES = "ESTUDANTES"
        PROFESSORES = "PROFESSORES"
        PSICOLOGOS_ESCOLARES = "PSICOLOGOS_ESCOLARES"
        PSICOLOGOS_CLINICOS = "PSICOLOGOS_CLINICOS"
        RESPONSAVEIS = "RESPONSAVEIS"  # rever após V2 (responsável sem login)

    id_aviso = models.BigAutoField(primary_key=True)
    titulo = models.CharField(max_length=180)
    conteudo = models.TextField()
    publicado_em = models.DateTimeField(default=timezone.now)
    autor = models.ForeignKey(Usuario, models.RESTRICT, db_column="id_autor", related_name="avisos")
    publico_destinatario = models.CharField(max_length=30, choices=Publico.choices, default=Publico.TODOS)
    ativo = models.BooleanField(default=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "aviso"
        ordering = ["-publicado_em"]
