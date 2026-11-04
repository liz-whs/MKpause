"""
python manage.py aplicar_esquema

Para hospedagem sem Flyway (ex.: Render + Neon): roda as migrações SQL de
database/migrations/ num banco vazio ou aplica V2/V3 ausentes em um banco com V1.
A V2 exige responsavel vazia; registros legados precisam de migração de dados.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from nucleo.conexao import exigir_banco

VERSOES = [
    ("V1__criacao_do_esquema_inicial.sql", {"usuario"}),
    ("V2__ajusta_responsavel_como_contato.sql", {"responsavel"}),
    ("V3__codigos_de_cadastro_e_vinculo.sql", {"codigo_cadastro", "uso_codigo_cadastro", "codigo_vinculo"}),
]


class Command(BaseCommand):
    help = "Aplica V1, V2 e V3 ausentes no banco do MKpause (sem Flyway)."

    def handle(self, *args, **options):
        exigir_banco(self.stdout)
        pasta = settings.BASE_DIR.parent / "database" / "migrations"
        with transaction.atomic(), connection.cursor() as cursor:
            # Evita dois builds aplicarem o mesmo SQL simultaneamente no PostgreSQL.
            cursor.execute("SELECT pg_advisory_xact_lock(72843003)")
            tabelas = set(connection.introspection.table_names())
            for nome, marcas in VERSOES:
                if nome.startswith("V2__"):
                    colunas = {c.name for c in connection.introspection.get_table_description(cursor, "responsavel")}
                    if {"nome_completo", "email"} <= colunas and "id_usuario" not in colunas:
                        self.stdout.write(f"{nome}: já aplicado.")
                        continue
                    if "id_usuario" not in colunas or {"nome_completo", "email"} & colunas:
                        raise CommandError(f"Esquema parcial de {nome}. Confira as colunas de responsavel.")
                    cursor.execute("SELECT EXISTS (SELECT 1 FROM responsavel)")
                    if cursor.fetchone()[0]:
                        raise CommandError(
                            "V2 não aplicada: responsavel possui registros legados. "
                            "Migre os dados antes de remover id_usuario; nenhum registro foi apagado.")
                    self.stdout.write(f"Aplicando {nome}...")
                    cursor.execute((pasta / nome).read_text(encoding="utf-8"))
                    continue
                if marcas <= tabelas:
                    self.stdout.write(f"{nome}: já aplicado.")
                    continue
                if marcas & tabelas:
                    raise CommandError(f"Esquema parcial de {nome}. Confira as tabelas antes de continuar.")
                self.stdout.write(f"Aplicando {nome}...")
                cursor.execute((pasta / nome).read_text(encoding="utf-8"))
                tabelas.update(marcas)
        self.stdout.write(self.style.SUCCESS("Esquema pronto (V1, V2 e V3)."))
