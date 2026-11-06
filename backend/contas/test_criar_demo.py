from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from atividades.models import Atividade


class CriarDemoTestes(TestCase):
    @patch("contas.management.commands.criar_demo.exigir_banco")
    def test_atualiza_nome_antigo_sem_duplicar_atividade_ou_sobrescrever_personalizada(self, _exigir_banco):
        respiracao = Atividade.objects.create(nome="Respiração da chinchila", tipo="RESPIRACAO", conteudo_ou_referencia="respiracao")
        video = Atividade.objects.create(nome="Vídeo da escola", tipo="VIDEO", conteudo_ou_referencia="video")
        call_command("criar_demo", senha="senha-demo-teste", stdout=StringIO())
        respiracao.refresh_from_db()
        video.refresh_from_db()
        self.assertEqual(respiracao.nome, "Respire&Pause")
        self.assertEqual(video.nome, "Vídeo da escola")
        self.assertEqual(Atividade.objects.count(), 4)

    @patch("contas.management.commands.criar_demo.exigir_banco")
    def test_cria_catalogo_completo_em_banco_vazio(self, _exigir_banco):
        call_command("criar_demo", senha="senha-demo-teste", stdout=StringIO())

        self.assertEqual(Atividade.objects.count(), 4)
        self.assertEqual(set(Atividade.objects.filter(tipo="JOGO").values_list(
            "conteudo_ou_referencia", flat=True)), {
                "/jogos/pianopause/index.html", "/jogos/mkpotion/index.html"})

    @patch("contas.management.commands.criar_demo.exigir_banco")
    def test_cria_os_dois_jogos_e_pode_repetir_com_cadastro_existente(self, _exigir_banco):
        # Reproduz o banco local: MK Potion já foi cadastrado pela API.
        potion = Atividade.objects.create(
            nome="MK Potion", tipo="JOGO",
            conteudo_ou_referencia="/jogos/mkpotion/index.html")

        for _ in range(2):
            call_command("criar_demo", senha="senha-demo-teste", stdout=StringIO())

        self.assertEqual(Atividade.objects.count(), 4)
        self.assertEqual(Atividade.objects.filter(tipo="JOGO").count(), 2)
        self.assertEqual(
            Atividade.objects.get(conteudo_ou_referencia="/jogos/mkpotion/index.html").pk,
            potion.pk)
        self.assertTrue(Atividade.objects.filter(
            nome="PianoPause", tipo="JOGO",
            conteudo_ou_referencia="/jogos/pianopause/index.html").exists())
