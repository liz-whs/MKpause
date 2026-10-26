"""
python manage.py verificar_esquema

Compara os models do Django com o banco real (criado pelo Flyway) e mostra
o que está diferente. Rode sempre depois de aplicar uma migração nova
(flyway migrate). Não altera nada no banco.

Saída com código 1 quando há algo que quebra o backend (tabela ou coluna
que o model usa e não existe mais no banco).
"""
from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from nucleo.conexao import exigir_banco

TABELAS_IGNORADAS = {"flyway_schema_history"}


class Command(BaseCommand):
    help = "Compara os models com as tabelas do banco criado pelo Flyway."

    def handle(self, *args, **options):
        exigir_banco(self.stdout)
        intro = connection.introspection
        with connection.cursor() as cursor:
            tabelas_banco = {t.name for t in intro.get_table_list(cursor) if t.type == "t"}
            erros, avisos, mapeadas = [], [], set()

            for app in settings.APPS_DO_DOMINIO:
                for model in apps.get_app_config(app).get_models():
                    tabela = model._meta.db_table
                    mapeadas.add(tabela)
                    if tabela not in tabelas_banco:
                        erros.append(f"{model.__name__}: a tabela '{tabela}' não existe no banco.")
                        continue

                    colunas_banco = {c.name: c for c in intro.get_table_description(cursor, tabela)}
                    colunas_model = {f.column for f in model._meta.concrete_fields if f.column}

                    for coluna in sorted(colunas_model - colunas_banco.keys()):
                        erros.append(f"{tabela}.{coluna}: está no model mas não existe no banco.")

                    for coluna in sorted(colunas_banco.keys() - colunas_model):
                        info = colunas_banco[coluna]
                        sem_default = (not info.null_ok and getattr(info, "default", None) is None
                                       and not getattr(info, "is_autofield", False))
                        if sem_default:
                            erros.append(f"{tabela}.{coluna}: coluna nova NOT NULL sem valor padrão; "
                                         "inserções pelo backend vão falhar até o model ser atualizado.")
                        else:
                            avisos.append(f"{tabela}.{coluna}: coluna nova no banco, ainda não usada pelo backend.")

                    for campo in model._meta.concrete_fields:
                        info = colunas_banco.get(campo.column)
                        if info is not None and campo.null != bool(info.null_ok) and not campo.primary_key:
                            avisos.append(f"{tabela}.{campo.column}: nulo no banco = {bool(info.null_ok)}, "
                                          f"no model = {campo.null}.")

            for tabela in sorted(tabelas_banco - mapeadas - TABELAS_IGNORADAS):
                avisos.append(f"{tabela}: tabela nova no banco, sem model no backend.")

        for a in avisos:
            self.stdout.write(self.style.WARNING(f"AVISO  {a}"))
        for e in erros:
            self.stdout.write(self.style.ERROR(f"ERRO   {e}"))
        if erros:
            raise CommandError(f"{len(erros)} diferença(s) que quebram o backend. Ajuste os models.")
        self.stdout.write(self.style.SUCCESS(f"Models e banco conferem ({len(mapeadas)} tabelas)."))
