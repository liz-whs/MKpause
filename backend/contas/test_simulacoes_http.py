"""Simulações com HTTP real, cookies e CSRF em um banco temporário do Django."""
import json
from datetime import timedelta
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, ProxyHandler, Request, build_opener

from django.core.cache import cache
from django.test import LiveServerTestCase, override_settings
from django.utils import timezone

from contas.models import (Administrador, CodigoVinculo, Estudante, Professor, PsicologoClinico,
                           ProfessorEstudante, PsicologoEscolar, PsicologoEscolarEstudante,
                           UsoCodigoCadastro)
from nucleo.fabrica import criar_usuario, SENHA
from contas.models import PsicologoClinicoEstudante
from atividades.models import Atividade
from sessoes.models import Sessao, RegistroHumor


class NavegadorHttp:
    """Cada instância mantém seus próprios cookies, como sessões separadas de navegador."""

    def __init__(self, origem):
        self.origem = origem
        self.cookies = CookieJar()
        self.http = build_opener(ProxyHandler({}), HTTPCookieProcessor(self.cookies))
        self.chamar("GET", "auth/csrf/")

    def chamar(self, metodo, rota, dados=None, csrf=True):
        headers = {"Accept": "application/json", "Origin": self.origem}
        if metodo != "GET":
            headers["Content-Type"] = "application/json"
            if csrf:
                headers["X-CSRFToken"] = next((c.value for c in self.cookies if c.name == "csrftoken"), "")
        request = Request(self.origem + "/api/" + rota, method=metodo, headers=headers,
                          data=json.dumps(dados or {}).encode() if metodo != "GET" else None)
        try:
            resposta = self.http.open(request, timeout=10)
        except HTTPError as erro:
            resposta = erro
        with resposta:
            corpo = resposta.read()
            return resposta.status, json.loads(corpo) if corpo else None


@override_settings(SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False)
class SimulacoesHttpTestes(LiveServerTestCase):
    host = "127.0.0.1"

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.admin = Administrador.objects.create(usuario=criar_usuario("Admin fictício", "admin@simulacao.br"))
        self.aluno = Estudante.objects.create(usuario=criar_usuario("Aluno fictício", "aluno@simulacao.br"), turma="8A")
        self.outro = Estudante.objects.create(usuario=criar_usuario("Outro aluno", "outro@simulacao.br"))
        self.prof = Professor.objects.create(usuario=criar_usuario("Professor fictício", "prof@simulacao.br"))
        self.psi = PsicologoEscolar.objects.create(usuario=criar_usuario("Psicóloga fictícia", "psi@simulacao.br"),
                                                  registro_profissional="12345", estado_registro="PR")

    def navegador(self, perfil=None):
        navegador = NavegadorHttp(self.live_server_url)
        if perfil:
            status, _ = navegador.chamar("POST", "auth/login/", {"email": perfil.usuario.email, "senha": SENHA})
            self.assertEqual(status, 200)
        return navegador

    def pedir(self, navegador, metodo, rota, dados=None, esperado=200):
        status, corpo = navegador.chamar(metodo, rota, dados)
        self.assertEqual(status, esperado, f"{metodo} {rota}: {status}, {corpo}")
        return corpo

    def token(self, aluno):
        return self.pedir(aluno, "POST", "vinculos/codigos/", esperado=201)

    def test_http_dashboard_v5_com_cookie_periodos_e_revogacao(self):
        clinico = PsicologoClinico.objects.create(
            usuario=criar_usuario("Clínico fictício", "clinico@simulacao.br"),
            registro_profissional="123456", estado_registro="PR")
        vinculo = PsicologoClinicoEstudante.objects.create(psicologo_clinico=clinico, estudante=self.aluno)
        atividade = Atividade.objects.create(nome="Respiração fictícia", tipo="RESPIRACAO")
        hoje = timezone.now()
        ids = []
        for horas, antes, depois in ((2, 2, 4), (1, 3, 3)):
            sessao = Sessao.objects.create(estudante=self.aluno, atividade=atividade,
                iniciada_em=hoje - timedelta(hours=horas), terminada_em=hoje,
                status=Sessao.Status.CONCLUIDA)
            ids.append(sessao.pk)
            RegistroHumor.objects.create(sessao=sessao, estado=antes, momento="PRE")
            RegistroHumor.objects.create(sessao=sessao, estado=depois, momento="POS")
        rota = f"estudantes/{self.aluno.pk}/dashboard/"
        self.pedir(self.navegador(), "GET", rota, esperado=401)
        self.pedir(self.navegador(self.prof), "GET", rota, esperado=403)
        self.pedir(self.navegador(self.admin), "GET", rota, esperado=403)
        navegador = self.navegador(clinico)
        for dias in (7, 14, 30, 90):
            dados = self.pedir(navegador, "GET", f"{rota}?dias={dias}")
            self.assertEqual(dados["periodo"]["dias"], dias)
            self.assertEqual(dados["resumo"]["sessoes_concluidas"], 2)
            self.assertEqual(dados["resumo"]["percentual_aumento"], 50)
            self.assertEqual([s["id_sessao"] for s in dados["evolucao"]], ids)
        self.pedir(navegador, "GET", f"{rota}?dias=8", esperado=400)
        self.pedir(navegador, "GET", f"estudantes/{self.outro.pk}/dashboard/", esperado=403)
        vinculo.ativo = False
        vinculo.save(update_fields=["ativo"])
        self.pedir(navegador, "GET", rota, esperado=403)

    def test_http_convite_cadastro_sessao_automatica_e_uso_unico(self):
        admin, novo = self.navegador(self.admin), self.navegador()
        convite = self.pedir(admin, "POST", "admin/codigos-cadastro/", {
            "perfil": "ESTUDANTE", "turma": "9B", "instituicao_ensino": "Escola fictícia"}, esperado=201)
        self.pedir(novo, "POST", "auth/codigo-cadastro/verificar/", {"codigo": convite["codigo"]})
        cadastro = {"codigo": convite["codigo"], "nome_completo": "Nova aluna", "email": "NOVA@simulacao.br",
                    "senha": SENHA, "turma": "alterada", "instituicao_ensino": "alterada"}
        conta = self.pedir(novo, "POST", "auth/cadastro/", cadastro, esperado=201)
        self.assertEqual(self.pedir(novo, "GET", "auth/eu/")["id_usuario"], conta["id_usuario"])
        estudante = Estudante.objects.get(pk=conta["id_perfil"])
        self.assertEqual((estudante.turma, estudante.instituicao_ensino), ("9B", "Escola fictícia"))
        self.assertTrue(UsoCodigoCadastro.objects.filter(usuario_id=conta["id_usuario"]).exists())
        cadastro["email"] = "segunda@simulacao.br"
        self.pedir(novo, "POST", "auth/cadastro/", cadastro, esperado=400)
        listado = self.pedir(admin, "GET", "admin/codigos-cadastro/")[0]
        self.assertEqual((listado["situacao"], listado["usos"]), ("ESGOTADO", 1))
        self.assertNotIn("codigo", listado)
        self.assertNotIn("codigo_hash", listado)

    def test_http_aceite_libera_dados_e_alertas_ao_professor(self):
        aluno, prof = self.navegador(self.aluno), self.navegador(self.prof)
        token = self.token(aluno)
        pedido = self.pedir(prof, "POST", "vinculos/resgatar/", {"codigo": token["codigo"].lower().replace("-", " ")})
        self.assertEqual(pedido["estudante"], {"primeiro_nome": "Aluno", "turma": "8A"})
        self.pedir(prof, "GET", f"estudantes/{self.aluno.pk}/", esperado=404)
        self.assertEqual(self.pedir(prof, "GET", "estudantes/"), [])
        self.assertEqual(len(self.pedir(prof, "GET", "vinculos/enviados/")), 1)
        self.assertEqual(len(self.pedir(aluno, "GET", "vinculos/solicitacoes/")), 1)
        rota = f'vinculos/solicitacoes/{token["id_codigo_vinculo"]}/aceitar/'
        self.assertEqual(self.pedir(aluno, "POST", rota)["status"], "ACEITO")
        self.assertTrue(ProfessorEstudante.objects.get(estudante=self.aluno, professor=self.prof).ativo)
        self.pedir(prof, "GET", f"estudantes/{self.aluno.pk}/")
        self.assertEqual(self.pedir(prof, "GET", "vinculos/enviados/"), [])
        self.pedir(aluno, "POST", "alertas/", {"nivel": 3}, esperado=201)
        self.assertEqual(len(self.pedir(prof, "GET", "alertas/")), 1)
        self.pedir(aluno, "POST", rota, esperado=400)
        self.pedir(prof, "POST", "vinculos/resgatar/", {"codigo": token["codigo"]}, esperado=400)

    def test_http_recusa_expiracao_e_resposta_de_outro_estudante(self):
        aluno, psi, outro = self.navegador(self.aluno), self.navegador(self.psi), self.navegador(self.outro)
        token = self.token(aluno)
        self.pedir(psi, "POST", "vinculos/resgatar/", {"codigo": token["codigo"]})
        rota = f'vinculos/solicitacoes/{token["id_codigo_vinculo"]}/'
        self.pedir(outro, "POST", rota + "aceitar/", esperado=404)
        self.assertEqual(self.pedir(aluno, "POST", rota + "recusar/")["status"], "RECUSADO")
        self.assertFalse(PsicologoEscolarEstudante.objects.exists())
        self.pedir(psi, "GET", f"estudantes/{self.aluno.pk}/", esperado=404)
        token = self.token(aluno)
        self.pedir(psi, "POST", "vinculos/resgatar/", {"codigo": token["codigo"]})
        CodigoVinculo.objects.filter(pk=token["id_codigo_vinculo"]).update(
            criado_em=timezone.now() - timedelta(days=2), expira_em=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.pedir(aluno, "GET", "vinculos/solicitacoes/"), [])
        self.assertEqual(self.pedir(psi, "GET", "vinculos/enviados/"), [])
        self.pedir(aluno, "POST", f'vinculos/solicitacoes/{token["id_codigo_vinculo"]}/aceitar/', esperado=400)
        self.assertFalse(PsicologoEscolarEstudante.objects.exists())

    def test_http_csrf_permissoes_e_logout(self):
        anonimo, aluno, prof = self.navegador(), self.navegador(self.aluno), self.navegador(self.prof)
        self.pedir(anonimo, "GET", "vinculos/codigos/atual/", esperado=401)
        self.pedir(aluno, "GET", "admin/codigos-cadastro/", esperado=403)
        self.pedir(prof, "POST", "vinculos/codigos/", esperado=403)
        status, _ = aluno.chamar("POST", "vinculos/codigos/", csrf=False)
        self.assertEqual(status, 403)
        token = self.token(aluno)
        self.pedir(aluno, "DELETE", "vinculos/codigos/atual/", esperado=204)
        self.pedir(prof, "POST", "vinculos/resgatar/", {"codigo": token["codigo"]}, esperado=400)
        self.pedir(aluno, "POST", "auth/logout/")
        self.pedir(aluno, "GET", "auth/eu/", esperado=401)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EMAIL_ENVIO_AUTOMATICO=False)
    def test_http_convite_responsavel_email_e_liberacao_clinica(self):
        from acompanhamento.models import ConviteResponsavel
        from acompanhamento.convites import link_convite
        from django.core import mail
        clinico = PsicologoClinico.objects.create(usuario=criar_usuario("Clínico fictício", "clinico@simulacao.br"),
                                                  registro_profissional="98765", estado_registro="PR")
        admin, profissional, publico = self.navegador(self.admin), self.navegador(clinico), self.navegador()
        novo = self.pedir(admin, "POST", f"admin/estudantes/{self.aluno.pk}/convites-responsavel/", {
            "nome_completo": "Responsável fictício", "email": "responsavel@simulacao.br",
            "psicologo_clinico": clinico.pk}, esperado=201)
        self.pedir(profissional, "GET", f"estudantes/{self.aluno.pk}/", esperado=404)
        envio = self.pedir(admin, "POST", "admin/emails/")
        self.assertEqual(envio["processados"], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("#token=", mail.outbox[0].body)
        token = link_convite(ConviteResponsavel.objects.get(pk=novo["id_convite"])).split("#token=", 1)[1]
        self.pedir(publico, "POST", "convites-responsavel/verificar/", {"token": token})
        self.pedir(publico, "POST", "convites-responsavel/aceitar/", {
            "token": token, "confirmo_responsabilidade": True, "aceito_termo": True})
        self.pedir(profissional, "GET", f"estudantes/{self.aluno.pk}/")
        self.pedir(admin, "POST", f'admin/convites-responsavel/{novo["id_convite"]}/revogar/')
        self.pedir(profissional, "GET", f"estudantes/{self.aluno.pk}/", esperado=404)
