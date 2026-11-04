from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.core.cache import cache
from django.db import close_old_connections, connections
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient

from contas.codigos import hash_codigo, normalizar
from contas.models import (CodigoCadastro, CodigoVinculo, ProfessorEstudante,
                           PsicologoEscolarEstudante, UsoCodigoCadastro, Usuario)
from nucleo.fabrica import CasoMKpause, SENHA, criar_usuario
from contas.models import Administrador, Estudante, Professor


class CodigosTestes(CasoMKpause):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)

    def convite(self, **campos):
        self.entrar(self.admin)
        r = self.post("/api/admin/codigos-cadastro/", {"perfil": "ESTUDANTE", **campos})
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def token(self, estudante=None):
        self.entrar(estudante or self.ana)
        r = self.post("/api/vinculos/codigos/")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def solicitar(self, token, profissional=None):
        self.entrar(profissional or self.carlos)
        return self.post("/api/vinculos/resgatar/", {"codigo": token["codigo"].lower().replace("-", " ")})

    def responder(self, token, aceitar=True, estudante=None):
        self.entrar(estudante or self.ana)
        acao = "aceitar" if aceitar else "recusar"
        return self.post(f'/api/vinculos/solicitacoes/{token["id_codigo_vinculo"]}/{acao}/')

    def test_convite_guarda_hash_e_so_revela_codigo_uma_vez(self):
        novo = self.convite()
        c = CodigoCadastro.objects.get(pk=novo["id_codigo_cadastro"])
        self.assertEqual(c.codigo_hash, hash_codigo(novo["codigo"]))
        self.assertEqual(c.sufixo, normalizar(novo["codigo"])[-3:])
        self.assertNotIn("codigo_hash", novo)
        listado = self.client.get("/api/admin/codigos-cadastro/").json()[0]
        self.assertNotIn("codigo", listado)
        self.assertNotIn("codigo_hash", listado)
        self.entrar(self.carlos)
        self.assertEqual(self.client.get("/api/admin/codigos-cadastro/").status_code, 403)
        self.assertEqual(self.post("/api/admin/codigos-cadastro/", {"perfil": "ESTUDANTE"}).status_code, 403)

    def test_cadastro_consumo_auditoria_e_sessao(self):
        novo = self.convite(turma="8A", instituicao_ensino="Escola do convite")
        publico = APIClient()
        codigo = novo["codigo"].lower().replace("-", " ")
        r = publico.post("/api/auth/codigo-cadastro/verificar/", {"codigo": codigo}, format="json")
        self.assertEqual(r.status_code, 200)
        r = publico.post("/api/auth/cadastro/", {
            "codigo": codigo, "nome_completo": "Bia Lima", "email": "BIA@escola.br", "senha": SENHA,
            "turma": "outra", "instituicao_ensino": "outra"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["perfil"], "estudante")
        self.assertNotIn("senha", r.json())
        u = Usuario.objects.get(email="bia@escola.br")
        self.assertTrue(u.conferir_senha(SENHA))
        self.assertEqual(u.estudante.turma, "8A")
        self.assertEqual(u.estudante.instituicao_ensino, "Escola do convite")
        self.assertEqual(CodigoCadastro.objects.get(pk=novo["id_codigo_cadastro"]).usos, 1)
        self.assertTrue(UsoCodigoCadastro.objects.filter(usuario=u).exists())
        self.assertEqual(publico.get("/api/auth/eu/").json()["id_usuario"], u.pk)

    def test_email_repetido_nao_consume_e_limite_de_usos(self):
        novo = self.convite(usos_maximos=2)
        publico = APIClient()
        base = {"codigo": novo["codigo"], "nome_completo": "Nova", "senha": SENHA}
        r = publico.post("/api/auth/cadastro/", {**base, "email": "ANA@mk.br"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(CodigoCadastro.objects.get(pk=novo["id_codigo_cadastro"]).usos, 0)
        for i in range(3):
            r = publico.post("/api/auth/cadastro/", {**base, "email": f"nova{i}@escola.br"}, format="json")
            self.assertEqual(r.status_code, 201 if i < 2 else 400, r.content)
        self.assertEqual(UsoCodigoCadastro.objects.count(), 2)

    def test_mesma_mensagem_para_convites_invalidos(self):
        publico = APIClient()
        rota = "/api/auth/codigo-cadastro/verificar/"
        inexistente = publico.post(rota, {"codigo": "NAOEXISTE"}, format="json").json()
        for alteracao in ({"criado_em": timezone.now() - timedelta(days=2),
                           "expira_em": timezone.now() - timedelta(seconds=1)},
                          {"revogado_em": timezone.now()}, {"usos": 1}):
            novo = self.convite()
            CodigoCadastro.objects.filter(pk=novo["id_codigo_cadastro"]).update(**alteracao)
            r = publico.post(rota, {"codigo": novo["codigo"]}, format="json")
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.json(), inexistente)

    def test_revogar_convite_e_validar_parametros(self):
        novo = self.convite()
        for _ in range(2):
            r = self.post(f'/api/admin/codigos-cadastro/{novo["id_codigo_cadastro"]}/revogar/')
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()["situacao"], "REVOGADO")
            self.assertNotIn("codigo", r.json())
        for campos in ({"perfil": "PROFESSOR", "turma": "8A"}, {"usos_maximos": 201}, {"validade_dias": 31}):
            r = self.post("/api/admin/codigos-cadastro/", {"perfil": "ESTUDANTE", **campos})
            self.assertEqual(r.status_code, 400, r.content)

    def test_cadastro_de_todos_os_perfis_e_validacao_crp(self):
        for perfil in ("PROFESSOR", "PSICOLOGO_ESCOLAR", "PSICOLOGO_CLINICO"):
            novo = self.convite(perfil=perfil)
            base = {"codigo": novo["codigo"], "nome_completo": "Profissional", "email": f"{perfil}@escola.br", "senha": SENHA}
            publico = APIClient()
            if perfil != "PROFESSOR":
                self.assertEqual(publico.post("/api/auth/cadastro/", base, format="json").status_code, 400)
                base.update(registro_profissional="12345", estado_registro="ZZ")
                self.assertEqual(publico.post("/api/auth/cadastro/", base, format="json").status_code, 400)
                base["estado_registro"] = "pr"
            r = publico.post("/api/auth/cadastro/", base, format="json")
            self.assertEqual(r.status_code, 201, r.content)
            self.assertEqual(r.json()["perfil"], perfil.lower())

    def test_token_gerar_outro_e_cancelar(self):
        primeiro = self.token()
        segundo = self.token()
        self.assertEqual(CodigoVinculo.objects.get(pk=primeiro["id_codigo_vinculo"]).status, "REVOGADO")
        c = CodigoVinculo.objects.get(pk=segundo["id_codigo_vinculo"])
        self.assertEqual(c.codigo_hash, hash_codigo(segundo["codigo"]))
        self.assertAlmostEqual((c.expira_em - c.criado_em).total_seconds(), 86400, delta=2)
        atual = self.client.get("/api/vinculos/codigos/atual/").json()
        self.assertNotIn("codigo", atual)
        self.assertEqual(atual["id_codigo_vinculo"], c.pk)
        self.assertEqual(self.client.delete("/api/vinculos/codigos/atual/").status_code, 204)
        self.assertEqual(self.client.get("/api/vinculos/codigos/atual/").status_code, 204)
        self.assertEqual(self.solicitar(primeiro).status_code, 400)
        self.assertEqual(self.solicitar(segundo).status_code, 400)

    def test_aceite_libera_acesso_e_reativa_vinculo(self):
        ProfessorEstudante.objects.filter(professor=self.carlos, estudante=self.ana).update(ativo=False)
        token = self.token()
        r = self.solicitar(token)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["estudante"], {"primeiro_nome": "Ana", "turma": "9A"})
        self.assertEqual(self.client.get(f"/api/estudantes/{self.ana.pk}/").status_code, 404)
        self.assertEqual(len(self.client.get("/api/vinculos/enviados/").json()), 1)
        self.entrar(self.ana)
        self.assertEqual(self.client.get("/api/vinculos/solicitacoes/").json()[0]["profissional"]["nome_completo"], "Carlos")
        self.assertEqual(self.responder(token).json()["status"], "ACEITO")
        qs = ProfessorEstudante.objects.filter(professor=self.carlos, estudante=self.ana)
        self.assertEqual(qs.count(), 1)
        self.assertTrue(qs.get().ativo)
        self.entrar(self.carlos)
        self.assertEqual(self.client.get(f"/api/estudantes/{self.ana.pk}/").status_code, 200)
        self.assertEqual(self.client.get("/api/vinculos/enviados/").json(), [])
        self.assertEqual(self.solicitar(token).status_code, 400)
        self.assertEqual(self.responder(token).status_code, 400)

    def test_psicologo_escolar_novo_vinculo_e_recusa(self):
        token = self.token(self.bruno)
        self.assertEqual(self.solicitar(token, self.sofia).status_code, 200)
        self.assertEqual(self.responder(token, aceitar=False, estudante=self.bruno).json()["status"], "RECUSADO")
        self.assertFalse(PsicologoEscolarEstudante.objects.filter(psicologo_escolar=self.sofia, estudante=self.bruno).exists())
        token = self.token(self.bruno)
        self.assertEqual(self.solicitar(token, self.sofia).status_code, 200)
        self.assertEqual(self.responder(token, estudante=self.bruno).status_code, 200)
        self.assertTrue(PsicologoEscolarEstudante.objects.get(psicologo_escolar=self.sofia, estudante=self.bruno).ativo)

    def test_vinculo_existente_nao_consume_codigo(self):
        token = self.token()
        self.assertEqual(self.solicitar(token).status_code, 409)
        self.assertEqual(CodigoVinculo.objects.get(pk=token["id_codigo_vinculo"]).status, "ABERTO")

    def test_permissoes_expiracao_e_contas_inativas(self):
        token = self.token(self.bruno)
        for perfil in (self.admin, self.marta, self.ana):
            self.assertEqual(self.solicitar(token, perfil).status_code, 403)
        self.assertEqual(self.solicitar(token, self.sofia).status_code, 200)
        self.assertEqual(self.responder(token, estudante=self.ana).status_code, 404)
        self.sofia.usuario.ativo = False
        self.sofia.usuario.save()
        self.assertEqual(self.responder(token, estudante=self.bruno).status_code, 400)
        token = self.token(self.bruno)
        CodigoVinculo.objects.filter(pk=token["id_codigo_vinculo"]).update(
            criado_em=timezone.now() - timedelta(days=2), expira_em=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.solicitar(token).status_code, 400)
        self.assertEqual(self.responder(token, estudante=self.bruno).status_code, 400)

    def test_limite_de_tentativas_por_ip_e_por_usuario(self):
        publico = APIClient()
        for _ in range(10):
            self.assertEqual(publico.post("/api/auth/codigo-cadastro/verificar/", {"codigo": "INVALIDO"}, format="json").status_code, 400)
        self.assertEqual(publico.post("/api/auth/cadastro/", {"codigo": "INVALIDO"}, format="json").status_code, 429)
        self.entrar(self.carlos)
        for _ in range(10):
            self.assertEqual(self.post("/api/vinculos/resgatar/", {"codigo": "INVALIDO"}).status_code, 400)
        self.assertEqual(self.post("/api/vinculos/resgatar/", {"codigo": "INVALIDO"}).status_code, 429)
        self.entrar(self.sofia)
        self.assertEqual(self.post("/api/vinculos/resgatar/", {"codigo": "INVALIDO"}).status_code, 400)

    def test_rotas_de_vinculo_exigem_csrf(self):
        cliente = APIClient(enforce_csrf_checks=True)
        r = cliente.post("/api/auth/login/", {"email": self.ana.usuario.email, "senha": SENHA}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(cliente.post("/api/vinculos/codigos/", {}, format="json").status_code, 403)
        cliente.get("/api/auth/csrf/")
        r = cliente.post("/api/vinculos/codigos/", {}, format="json", HTTP_X_CSRFTOKEN=cliente.cookies["csrftoken"].value)
        self.assertEqual(r.status_code, 201, r.content)


@skipUnlessDBFeature("has_select_for_update")
class CodigosConcorrenciaTestes(TransactionTestCase):
    """Executados também no PostgreSQL; SQLite não oferece bloqueio de linhas."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.estudante = Estudante.objects.create(usuario=criar_usuario("Estudante", "est@teste.br"))
        self.professores = [Professor.objects.create(usuario=criar_usuario(f"Prof {i}", f"prof{i}@teste.br")) for i in range(2)]

    def paralelo(self, tarefas):
        barreira = Barrier(len(tarefas))

        def executar(tarefa):
            close_old_connections()
            perfil, rota, corpo = tarefa
            try:
                cliente = APIClient()
                if perfil:
                    login = cliente.post("/api/auth/login/", {"email": perfil.usuario.email, "senha": SENHA}, format="json")
                    self.assertEqual(login.status_code, 200)
                barreira.wait(timeout=10)
                return cliente.post(rota, corpo, format="json").status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(executor.map(executar, tarefas))

    def test_geracoes_simultaneas_deixam_um_so_codigo_aberto(self):
        tarefa = (self.estudante, "/api/vinculos/codigos/", {})
        self.assertEqual(self.paralelo([tarefa, tarefa]), [201, 201])
        self.assertEqual(CodigoVinculo.objects.filter(status="ABERTO").count(), 1)
        self.assertEqual(CodigoVinculo.objects.filter(status="REVOGADO").count(), 1)

    def test_dois_profissionais_nao_resgatam_o_mesmo_codigo(self):
        CodigoVinculo.objects.create(estudante=self.estudante, codigo_hash=hash_codigo("ABCDEF"),
                                     expira_em=timezone.now() + timedelta(hours=24))
        tarefas = [(prof, "/api/vinculos/resgatar/", {"codigo": "ABC-DEF"}) for prof in self.professores]
        self.assertEqual(sorted(self.paralelo(tarefas)), [200, 400])
        self.assertEqual(CodigoVinculo.objects.get().status, "AGUARDANDO_ESTUDANTE")

    def test_ultimo_uso_de_convite_nao_cria_duas_contas(self):
        admin = Administrador.objects.create(usuario=criar_usuario("Admin", "admin@teste.br"))
        CodigoCadastro.objects.create(administrador=admin, perfil="ESTUDANTE", codigo_hash=hash_codigo("ABCDEFGHIJ"),
                                      sufixo="HIJ", expira_em=timezone.now() + timedelta(days=1))
        tarefas = [(None, "/api/auth/cadastro/", {"codigo": "ABCDE-FGHIJ", "nome_completo": "Nova conta",
                                                "email": f"nova{i}@teste.br", "senha": SENHA}) for i in range(2)]
        self.assertEqual(sorted(self.paralelo(tarefas)), [201, 400])
        self.assertEqual(CodigoCadastro.objects.get().usos, 1)
        self.assertEqual(UsoCodigoCadastro.objects.count(), 1)
