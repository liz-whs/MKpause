"""
Executor de testes.

Em produção os models são managed = False (o Flyway cria as tabelas). Nos
testes, o Django precisa criar um banco temporário, então este executor liga
managed = True só durante os testes, num SQLite em memória (ver settings).

Os gatilhos e CHECKs do PostgreSQL não existem no SQLite: por isso as regras
importantes também são validadas no backend, e é isso que os testes cobrem.
"""
from django.apps import apps
from django.conf import settings
from django.test.runner import DiscoverRunner


class ExecutorDeTestes(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        for app in settings.APPS_DO_DOMINIO:
            for model in apps.get_app_config(app).get_models():
                model._meta.managed = True
        super().setup_test_environment(**kwargs)
