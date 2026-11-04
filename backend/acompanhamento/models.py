"""Ficha de acompanhamento e avisos. Tabelas (V1): ficha_acompanhamento, aviso."""
from django.db import models
from django.utils import timezone
from uuid import uuid4

from contas.models import Estudante, Usuario
from nucleo.models import TabelaDoFlyway


class ConviteResponsavel(TabelaDoFlyway):
    id_convite = models.BigAutoField(primary_key=True)
    nonce = models.UUIDField(default=uuid4, unique=True)
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante")
    responsavel = models.ForeignKey("contas.Responsavel", models.RESTRICT, db_column="id_responsavel")
    psicologo_clinico = models.ForeignKey("contas.PsicologoClinico", models.RESTRICT,
                                         db_column="id_psicologo_clinico", null=True)
    administrador = models.ForeignKey("contas.Administrador", models.RESTRICT, db_column="id_administrador")
    email_destino = models.EmailField(max_length=254)
    parentesco = models.CharField(max_length=60, null=True, blank=True)
    termo_versao = models.CharField(max_length=30)
    termo_texto = models.TextField()
    status = models.CharField(max_length=20, default="PENDENTE")
    criado_em = models.DateTimeField(default=timezone.now)
    expira_em = models.DateTimeField()
    respondido_em = models.DateTimeField(null=True)
    revogado_em = models.DateTimeField(null=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "convite_responsavel"


class NotificacaoEmail(TabelaDoFlyway):
    id_notificacao = models.BigAutoField(primary_key=True)
    convite = models.OneToOneField(ConviteResponsavel, models.RESTRICT, db_column="id_convite", null=True,
                                   related_name="email")
    destinatario_alerta = models.OneToOneField("alertas.DestinatarioAlerta", models.RESTRICT,
                                             db_column="id_destinatario_alerta", null=True, related_name="email")
    email_destino = models.EmailField(max_length=254)
    status = models.CharField(max_length=20, default="PENDENTE")
    tentativas = models.IntegerField(default=0)
    criado_em = models.DateTimeField(default=timezone.now)
    disponivel_em = models.DateTimeField(default=timezone.now)
    processando_em = models.DateTimeField(null=True)
    enviado_em = models.DateTimeField(null=True)
    erro = models.CharField(max_length=120, null=True)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "notificacao_email"


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
