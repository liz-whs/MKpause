"""Cobertura do contrato do dashboard clínico."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient

from contas.models import PsicologoClinicoEstudante
from nucleo.fabrica import CasoMKpause
from sessoes.models import RegistroHumor, Sessao


class DashboardClinicoTestes(CasoMKpause):
    def url(self, estudante=None, dias=None):
        caminho = f"/api/estudantes/{(estudante or self.ana).pk}/dashboard/"
        return caminho + (f"?dias={dias}" if dias is not None else "")

    def sessao(self, antes, depois, dias_atras=0, status=Sessao.Status.CONCLUIDA):
        data = timezone.now() - timedelta(days=dias_atras)
        s = Sessao.objects.create(
            estudante=self.ana, atividade=self.respiracao,
            iniciada_em=data, terminada_em=data, status=status,
        )
        RegistroHumor.objects.create(sessao=s, estado=antes, momento="PRE")
        if depois is not None:
            RegistroHumor.objects.create(sessao=s, estado=depois, momento="POS")
        return s

    def test_calcula_indicadores_e_distribuicao(self):
        self.sessao(2, 4)
        self.sessao(3, 3)
        self.sessao(4, 2)
        self.sessao(1, 5, dias_atras=20)
        self.sessao(2, 5, status=Sessao.Status.CANCELADA)
        self.sessao(2, None)

        self.entrar(self.marta)
        resposta = self.client.get(self.url())
        self.assertEqual(resposta.status_code, 200, resposta.content)
        dados = resposta.json()
        self.assertEqual(dados["periodo"]["dias"], 14)
        self.assertEqual(dados["resumo"]["sessoes_concluidas"], 3)
        self.assertEqual(dados["resumo"]["humor_aumentou"], 1)
        self.assertEqual(dados["resumo"]["humor_manteve"], 1)
        self.assertEqual(dados["resumo"]["humor_diminuiu"], 1)
        self.assertEqual(dados["resumo"]["percentual_aumento"], 33.3)
        self.assertEqual(len(dados["evolucao"]), 3)
        self.assertEqual(dados["distribuicao_humor"][1]["antes"], 1)
        self.assertEqual(dados["distribuicao_humor"][3]["depois"], 1)
        self.assertEqual(dados["atividades"][0]["quantidade"], 3)

        dados_30 = self.client.get(self.url(dias=30)).json()
        self.assertEqual(dados_30["resumo"]["sessoes_concluidas"], 4)

    def test_sem_sessoes_retorna_zeros_sem_divisao_por_zero(self):
        self.entrar(self.marta)
        dados = self.client.get(self.url()).json()
        self.assertEqual(dados["resumo"]["sessoes_concluidas"], 0)
        self.assertIsNone(dados["resumo"]["percentual_aumento"])
        self.assertEqual(dados["evolucao"], [])

    def test_bloqueia_sem_login_professor_e_nao_vinculado(self):
        self.assertEqual(APIClient().get(self.url()).status_code, 401)
        self.entrar(self.carlos)
        self.assertEqual(self.client.get(self.url()).status_code, 403)
        self.entrar(self.marta)
        self.assertEqual(self.client.get(self.url(self.bruno)).status_code, 403)
        vinculo = PsicologoClinicoEstudante.objects.get(psicologo_clinico=self.marta, estudante=self.ana)
        vinculo.ativo = False
        vinculo.save(update_fields=["ativo"])
        self.assertEqual(self.client.get(self.url()).status_code, 403)

    def test_periodo_invalido(self):
        self.entrar(self.marta)
        for dias in ("0", "365", "texto"):
            self.assertEqual(self.client.get(self.url(dias=dias)).status_code, 400)
