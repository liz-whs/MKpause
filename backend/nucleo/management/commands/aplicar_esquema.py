"""
python manage.py aplicar_esquema

Para hospedagem sem Flyway (ex.: Render + Neon): roda as migrações SQL de
database/migrations/ num banco vazio ou aplica a V3 em um banco com V1.

Aplica as versões que o backend usa (V1 e V3). A V2 (responsável sem login)
entra quando os models forem ajustados (ver backend/README.md).
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from nucleo.conexao import exigir_banco

VERSOES = [
    ("V1__criacao_do_esquema_inicial.sql", {"usuario"}),
    ("V3__codigos_de_cadastro_e_vinculo.sql", {"codigo_cadastro", "uso_codigo_cadastro", "codigo_vinculo"}),
]


class Command(BaseCommand):
    help = "Aplica V1 e V3 ausentes no banco do MKpause (sem Flyway)."

    def handle(self, *args, **options):
        exigir_banco(self.stdout)
        pasta = settings.BASE_DIR.parent / "database" / "migrations"
        with transaction.atomic(), connection.cursor() as cursor:
            # Evita dois builds aplicarem o mesmo SQL simultaneamente no PostgreSQL.
            cursor.execute("SELECT pg_advisory_xact_lock(72843003)")
            tabelas = set(connection.introspection.table_names())
            for nome, marcas in VERSOES:
                if marcas <= tabelas:
                    self.stdout.write(f"{nome}: já aplicado.")
                    continue
                if marcas & tabelas:
                    raise CommandError(f"Esquema parcial de {nome}. Confira as tabelas antes de continuar.")
                self.stdout.write(f"Aplicando {nome}...")
                cursor.execute((pasta / nome).read_text(encoding="utf-8"))
                tabelas.update(marcas)
        self.stdout.write(self.style.SUCCESS("Esquema pronto (V1 e V3)."))
