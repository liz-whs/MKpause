"""
python manage.py aplicar_esquema

Para hospedagem sem Flyway (ex.: Render + Neon): roda as migrações SQL de
database/migrations/ num banco vazio. Se a tabela `usuario` já existe, não faz nada.

Só aplica até a versão que o backend usa (V1). A V2 (responsável sem login)
entra quando os models forem ajustados (ver backend/README.md).
"""
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from nucleo.conexao import exigir_banco

VERSOES = ["V1__criacao_do_esquema_inicial.sql"]


class Command(BaseCommand):
    help = "Cria as tabelas do MKpause num banco vazio (sem Flyway)."

    def handle(self, *args, **options):
        exigir_banco(self.stdout)
        if "usuario" in connection.introspection.table_names():
            self.stdout.write("O banco já tem as tabelas. Nada a fazer.")
            return
        pasta = settings.BASE_DIR.parent / "database" / "migrations"
        with connection.cursor() as cursor:
            for nome in VERSOES:
                self.stdout.write(f"Aplicando {nome}...")
                cursor.execute((pasta / nome).read_text(encoding="utf-8"))
        self.stdout.write(self.style.SUCCESS("Esquema criado."))
