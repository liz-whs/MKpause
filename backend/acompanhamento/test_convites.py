from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from django.core import mail
from django.core.cache import cache
from django.test import override_settings, TransactionTestCase, skipUnlessDBFeature
from django.db import connections
from django.utils import timezone
from rest_framework.test import APIClient

from acompanhamento.convites import link_convite
from acompanhamento.models import ConviteResponsavel, NotificacaoEmail
from contas.models import EstudanteResponsavel, PsicologoClinicoEstudante, Usuario, Administrador, Estudante, Responsavel
from nucleo.emails import processar_emails
from nucleo.fabrica import CasoMKpause, criar_usuario


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EMAIL_ENVIO_AUTOMATICO=False)
class ConvitesTestes(CasoMKpause):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)
        PsicologoClinicoEstudante.objects.all().delete()

    def convidar(self, **extras):
        self.entrar(self.admin)
        r = self.post(f"/api/admin/estudantes/{self.ana.pk}/convites-responsavel/", {
            "nome_completo": "Rosa Lima", "email": "rosa@teste.br", "parentesco": "Mãe",
            "psicologo_clinico": self.marta.pk, **extras})
        self.assertEqual(r.status_code, 201, r.content)
        c = ConviteResponsavel.objects.get(pk=r.json()["id_convite"])
        return c, link_convite(c).split("#token=", 1)[1]

    def responder(self, token, acao="aceitar", **extras):
        return APIClient().post(f"/api/convites-responsavel/{acao}/", {"token": token,
            "confirmo_responsabilidade": True, "aceito_termo": True, **extras}, format="json")

    def test_convite_nao_cria_conta_nem_libera_acesso_antes_do_aceite(self):
        antes = Usuario.objects.count()
        c, token = self.convidar()
        self.assertEqual(Usuario.objects.count(), antes)
        self.assertFalse(EstudanteResponsavel.objects.exists())
        self.assertFalse(PsicologoClinicoEstudante.objects.exists())
        self.entrar(self.marta)
        self.assertEqual(self.client.get(f"/api/estudantes/{self.ana.pk}/").status_code, 404)
        r = APIClient().post("/api/convites-responsavel/verificar/", {"token": token}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["estudante"], "Ana")
        self.assertNotIn("email", r.json())
        self.assertIn("Marta", r.json()["termo"])
        self.assertIsNone(NotificacaoEmail.objects.get(convite=c).enviado_em)

    def test_aceite_exige_confirmacoes_e_grava_termo_vinculos_e_data(self):
        c, token = self.convidar()
        self.assertEqual(self.responder(token, aceito_termo=False).status_code, 400)
        self.assertFalse(PsicologoClinicoEstudante.objects.exists())
        self.assertEqual(self.responder(token).status_code, 200)
        c.refresh_from_db()
        self.assertEqual(c.status, "ACEITO")
        self.assertIsNotNone(c.respondido_em)
        self.assertTrue(c.termo_texto)
        self.assertTrue(c.termo_versao)
        self.assertTrue(EstudanteResponsavel.objects.get().ativo)
        self.assertTrue(PsicologoClinicoEstudante.objects.get().ativo)
        self.assertEqual(self.responder(token).status_code, 400)
        self.assertEqual(PsicologoClinicoEstudante.objects.count(), 1)
        self.entrar(self.marta)
        self.assertEqual(self.client.get(f"/api/estudantes/{self.ana.pk}/").status_code, 200)

    def test_recusa_expiracao_adulteracao_e_reenvio(self):
        c, token = self.convidar()
        self.assertEqual(self.responder(token, "recusar").status_code, 200)
        self.assertFalse(EstudanteResponsavel.objects.exists())
        self.assertFalse(PsicologoClinicoEstudante.objects.exists())
        c, velho = self.convidar()
        novo, token = self.convidar()
        self.assertEqual(self.responder(velho).status_code, 400)
        self.assertEqual(self.responder(token + "x").status_code, 400)
        ConviteResponsavel.objects.filter(pk=novo.pk).update(
            criado_em=timezone.now() - timedelta(days=9), expira_em=timezone.now() - timedelta(days=1))
        self.assertEqual(self.responder(token).status_code, 400)
        self.assertFalse(PsicologoClinicoEstudante.objects.exists())

    def test_revogacao_do_aceite_remove_acesso_e_nao_pode_reativar_sem_consentimento(self):
        c, token = self.convidar()
        self.assertEqual(self.responder(token).status_code, 200)
        self.entrar(self.admin)
        self.assertEqual(self.post(f"/api/admin/convites-responsavel/{c.pk}/revogar/").status_code, 200)
        self.assertFalse(PsicologoClinicoEstudante.objects.get().ativo)
        self.assertFalse(EstudanteResponsavel.objects.get().ativo)
        self.assertEqual(self.post("/api/admin/vinculos/psicologos-clinicos/", {
            "estudante": self.ana.pk, "psicologo_clinico": self.marta.pk}).status_code, 400)

    def test_desativar_responsavel_revoga_o_acesso(self):
        c, token = self.convidar()
        self.responder(token)
        self.entrar(self.admin)
        self.assertEqual(self.client.delete(f"/api/admin/responsaveis/{c.responsavel_id}/").status_code, 200)
        self.assertFalse(PsicologoClinicoEstudante.objects.get().ativo)
        c.refresh_from_db()
        self.assertEqual(c.status, "REVOGADO")

    def test_lista_privada_e_envio_do_convite(self):
        c, token = self.convidar()
        self.assertEqual(processar_emails(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("#token=", mail.outbox[0].body)
        self.assertNotIn("humor", mail.outbox[0].body)
        self.assertEqual(processar_emails(), 0)
        self.entrar(self.ana)
        self.assertEqual(self.client.get("/api/admin/emails/").status_code, 403)
        self.assertEqual(self.post(f"/api/admin/estudantes/{self.ana.pk}/convites-responsavel/").status_code, 403)

    def test_convite_revogado_nao_envia_email(self):
        c, _ = self.convidar()
        self.post(f"/api/admin/convites-responsavel/{c.pk}/revogar/")
        self.assertEqual(processar_emails(), 0)
        self.assertEqual(NotificacaoEmail.objects.get(convite=c).status, "CANCELADA")

    def test_alerta_fila_envio_falha_retry_e_leitura_preservada(self):
        self.entrar(self.ana)
        alerta = self.post("/api/alertas/", {"nivel": 2}).json()["alerta"]["id_alerta"]
        item = NotificacaoEmail.objects.get(destinatario_alerta__alerta_id=alerta)
        with patch("nucleo.emails.EmailMessage.send", side_effect=TimeoutError):
            self.assertEqual(processar_emails(), 0)
        item.refresh_from_db()
        self.assertEqual((item.status, item.tentativas), ("FALHA", 1))
        self.entrar(self.carlos)
        self.post(f"/api/alertas/{alerta}/lido/")
        NotificacaoEmail.objects.filter(pk=item.pk).update(disponivel_em=timezone.now())
        self.assertEqual(processar_emails(), 1)
        item.refresh_from_db()
        self.assertEqual((item.status, item.tentativas), ("ENVIADA", 2))
        item.destinatario_alerta.refresh_from_db()
        self.assertEqual(item.destinatario_alerta.status_notificacao, "LIDA")
        self.assertIsNotNone(item.destinatario_alerta.enviado_em)
        self.assertNotIn("Ana", mail.outbox[-1].body)
        self.assertEqual(processar_emails(), 0)

    def test_alerta_cancelado_nao_envia_email(self):
        self.entrar(self.ana)
        aid = self.post("/api/alertas/", {"nivel": 2}).json()["alerta"]["id_alerta"]
        self.patch(f"/api/alertas/{aid}/", {"status": "CANCELADO"})
        self.assertEqual(processar_emails(), 0)
        self.assertEqual(NotificacaoEmail.objects.get().status, "CANCELADA")

    def test_rotas_administrativas_nao_criam_novo_acesso_sem_aceite(self):
        c, _ = self.convidar()
        self.assertEqual(self.post("/api/admin/vinculos/psicologos-clinicos/", {
            "estudante": self.ana.pk, "psicologo_clinico": self.marta.pk}).status_code, 400)
        self.assertEqual(self.post("/api/admin/vinculos/responsaveis/", {
            "estudante": self.ana.pk, "responsavel": c.responsavel_id}).status_code, 400)

    @override_settings(DEBUG=False, EMAIL_BACKEND="django.core.mail.backends.filebased.EmailBackend")
    def test_caixa_local_continua_identificada_sem_debug_e_sem_expor_link_teste(self):
        c, _ = self.convidar()
        r = self.client.get(f"/api/admin/estudantes/{self.ana.pk}/convites-responsavel/")
        self.assertTrue(r.json()[0]["caixa_local"])
        self.assertIsNone(r.json()[0]["link_teste"])


@skipUnlessDBFeature("has_select_for_update")
@override_settings(EMAIL_ENVIO_AUTOMATICO=False)
class ConviteConcorrenciaTestes(TransactionTestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        admin = Administrador.objects.create(usuario=criar_usuario("Admin", "admin@teste.br"))
        aluno = Estudante.objects.create(usuario=criar_usuario("Aluno", "aluno@teste.br"))
        contato = Responsavel.objects.create(nome_completo="Responsável", email="responsavel@teste.br")
        self.convite = ConviteResponsavel.objects.create(administrador=admin, estudante=aluno, responsavel=contato,
            email_destino=contato.email, termo_versao="teste", termo_texto="Autorização de teste",
            expira_em=timezone.now() + timedelta(days=7))
        NotificacaoEmail.objects.create(convite=self.convite, email_destino=contato.email)

    def paralelo(self, executar):
        barreira = Barrier(2)
        def tarefa(_):
            try:
                barreira.wait(timeout=10)
                return executar()
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(executor.map(tarefa, range(2)))

    def test_dois_processadores_nao_enviam_a_mesma_mensagem(self):
        with patch("nucleo.emails.EmailMessage.send", return_value=1) as enviar:
            self.assertEqual(sum(self.paralelo(lambda: processar_emails(limite=1))), 1)
            self.assertEqual(enviar.call_count, 1)
        self.assertEqual(NotificacaoEmail.objects.get().status, "ENVIADA")

    def test_duas_respostas_so_registram_um_aceite(self):
        token = link_convite(self.convite).split("#token=", 1)[1]
        def aceitar():
            return APIClient().post("/api/convites-responsavel/aceitar/", {
                "token": token, "confirmo_responsabilidade": True, "aceito_termo": True}, format="json").status_code
        self.assertEqual(sorted(self.paralelo(aceitar)), [200, 400])
        self.assertEqual(EstudanteResponsavel.objects.count(), 1)
