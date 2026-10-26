from rest_framework.test import APIClient

from contas.models import Usuario
from nucleo.fabrica import SENHA, CasoMKpause


class LoginTestes(CasoMKpause):
    def test_login_identifica_perfil(self):
        self.assertEqual(self.entrar(self.marta)["perfil"], "psicologo_clinico")
        self.assertEqual(self.client.get("/api/auth/eu/").json()["nome_completo"], "Marta")

    def test_senha_errada_e_conta_desativada(self):
        r = APIClient().post("/api/auth/login/", {"email": "ana@mk.br", "senha": "errada"}, format="json")
        self.assertEqual(r.status_code, 401)
        self.entrar(self.ana)
        Usuario.objects.filter(pk=self.ana.usuario_id).update(ativo=False)
        self.assertEqual(self.client.get("/api/auth/eu/").status_code, 401)

    def test_sem_login(self):
        self.assertEqual(APIClient().get("/api/sessoes/").status_code, 401)


class AdminTestes(CasoMKpause):
    def test_cadastrar_estudante_cria_usuario_e_perfil(self):
        self.entrar(self.admin)
        r = self.post("/api/admin/estudantes/", {"nome_completo": "Bia", "email": "BIA@mk.br",
                                                 "senha": "12345678", "turma": "8B"})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertNotIn("senha", r.json())
        self.assertTrue(Usuario.objects.get(email="bia@mk.br").conferir_senha("12345678"))
        r = self.post("/api/admin/estudantes/", {"nome_completo": "Outra", "email": "bia@mk.br", "senha": "12345678"})
        self.assertEqual(r.status_code, 400)

    def test_remover_desativa_e_preserva(self):
        self.entrar(self.admin)
        self.assertEqual(self.client.delete(f"/api/admin/estudantes/{self.bruno.pk}/").status_code, 200)
        self.bruno.refresh_from_db()
        self.assertFalse(self.bruno.ativo)
        r = APIClient().post("/api/auth/login/", {"email": "bruno@mk.br", "senha": SENHA}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_vinculo_cria_desativa_e_reativa(self):
        self.entrar(self.admin)
        url = "/api/admin/vinculos/psicologos-escolares/"
        corpo = {"psicologo_escolar": self.sofia.pk, "estudante": self.bruno.pk}
        self.assertEqual(self.post(url, corpo).status_code, 201)
        self.assertEqual(self.client.delete(url, corpo, format="json").status_code, 200)
        self.assertEqual(self.post(url, corpo).status_code, 200)  # reativado

    def test_so_admin_gerencia(self):
        self.entrar(self.carlos)
        self.assertEqual(self.client.get("/api/admin/estudantes/").status_code, 403)


class VinculadosTestes(CasoMKpause):
    def test_cada_profissional_ve_so_os_seus(self):
        self.entrar(self.carlos)
        nomes = {e["nome_completo"] for e in self.client.get("/api/estudantes/").json()}
        self.assertEqual(nomes, {"Ana", "Bruno"})
        self.entrar(self.marta)
        nomes = {e["nome_completo"] for e in self.client.get("/api/estudantes/").json()}
        self.assertEqual(nomes, {"Ana"})
        self.assertEqual(self.client.get(f"/api/estudantes/{self.bruno.pk}/").status_code, 404)
