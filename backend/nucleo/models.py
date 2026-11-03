"""Peças comuns aos models que espelham as tabelas do Flyway."""
from django.db import models
from django.utils import timezone


class TabelaDoFlyway(models.Model):
    """
    Base de todo model do MKpause.

    managed = False: o Django nunca cria nem altera estas tabelas; quem manda
    no esquema é o Flyway (database/migrations/). Se o banco mudar, ajuste o
    model e rode `python manage.py verificar_esquema`.
    """

    class Meta:
        abstract = True
        managed = False


class ComAtivoETimestamps(TabelaDoFlyway):
    """Colunas `ativo`, `criado_em` e `atualizado_em`, repetidas em várias tabelas."""

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        abstract = True

    def save(self, *args, **kwargs):
        # O banco não tem gatilho para atualizado_em; o backend mantém.
        self.atualizado_em = timezone.now()
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = {*kwargs["update_fields"], "atualizado_em"}
        super().save(*args, **kwargs)
