import re
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.test import TestCase, skipUnlessDBFeature

from contas.models import Responsavel
from nucleo.fabrica import criar_usuario


@skipUnlessDBFeature("can_rollback_ddl", "has_select_for_update")
class AplicarV2PostgresTestes(TestCase):
    """Exercita o SQL real da V2 no banco de testes, com rollback do DDL a cada caso."""

    def setUp(self):
        # Nunca reconstruir tabelas fora do banco temporário criado pelo executor.
        self.assertTrue(connection.settings_dict["NAME"].startswith("test_"))
        sql = (settings.BASE_DIR.parent / "database/migrations/V1__criacao_do_esquema_inicial.sql").read_text(encoding="utf-8")
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE estudante_responsavel")
            cursor.execute("DROP TABLE responsavel")
            for tabela in ("responsavel", "estudante_responsavel"):
                trecho = re.search(r"CREATE TABLE " + tabela + r" \([\s\S]*?\n\);", sql)
                self.assertIsNotNone(trecho)
                cursor.execute(trecho.group())

    def aplicar(self):
        call_command("aplicar_esquema", stdout=StringIO())

    def colunas(self):
        with connection.cursor() as cursor:
            return {c.name for c in connection.introspection.get_table_description(cursor, "responsavel")}

    def test_aplica_v2_real_e_repeticao_preserva_contato(self):
        self.aplicar()
        self.assertNotIn("id_usuario", self.colunas())
        self.assertTrue({"nome_completo", "email", "telefone"} <= self.colunas())
        contato = Responsavel.objects.create(nome_completo="Contato após V2", email="contato@teste.br")
        self.aplicar()
        self.assertEqual(Responsavel.objects.get(pk=contato.pk).nome_completo, "Contato após V2")

    def test_legado_com_dados_interrompe_sem_apagar_ou_mudar_colunas(self):
        usuario = criar_usuario("Responsável legado", "legado@teste.br")
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO responsavel (id_usuario) VALUES (%s)", [usuario.pk])
        with self.assertRaisesMessage(CommandError, "registros legados"):
            self.aplicar()
        self.assertIn("id_usuario", self.colunas())
        self.assertNotIn("nome_completo", self.colunas())
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_usuario FROM responsavel")
            self.assertEqual(cursor.fetchall(), [(usuario.pk,)])

    def test_esquema_parcial_interrompe_sem_prosseguir(self):
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE responsavel ADD COLUMN nome_completo VARCHAR(150)")
        with self.assertRaisesMessage(CommandError, "Esquema parcial"):
            self.aplicar()
        self.assertIn("id_usuario", self.colunas())
        self.assertNotIn("email", self.colunas())
