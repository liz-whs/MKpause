from contas.models import EstudanteResponsavel, Responsavel, Usuario
from nucleo.fabrica import CasoMKpause, SENHA
from rest_framework.test import APIClient


class ResponsaveisV2Testes(CasoMKpause):
    rota = "/api/admin/responsaveis/"
    vinculos = "/api/admin/vinculos/responsaveis/"

    def criar(self, **campos):
        self.entrar(self.admin)
        r = self.post(self.rota, {"nome_completo": "Rosa Lima", **campos})
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def autorizar(self, contato):
        from acompanhamento.models import ConviteResponsavel
        from acompanhamento.convites import link_convite
        r = self.post(f"/api/admin/estudantes/{self.ana.pk}/convites-responsavel/", {
            "responsavel": contato["id_responsavel"], "parentesco": "Mãe"})
        self.assertEqual(r.status_code, 201, r.content)
        convite = ConviteResponsavel.objects.get(pk=r.json()["id_convite"])
        token = link_convite(convite).split("#token=", 1)[1]
        r = APIClient().post("/api/convites-responsavel/aceitar/", {
            "token": token, "confirmo_responsabilidade": True, "aceito_termo": True}, format="json")
        self.assertEqual(r.status_code, 200, r.content)

    def test_cadastro_sem_login_nao_cria_usuario(self):
        antes = Usuario.objects.count()
        contato = self.criar(email="ROSA@escola.br", telefone="41999990000", senha="nao-deve-ser-gravada")
        self.assertEqual(Usuario.objects.count(), antes)
        self.assertEqual(contato["email"], "rosa@escola.br")
        self.assertNotIn("senha", contato)
        self.assertNotIn("usuario", contato)
        self.assertEqual(str(Responsavel.objects.get(pk=contato["id_responsavel"])), "Rosa Lima")
        r = APIClient().post("/api/auth/login/", {"email": contato["email"], "senha": SENHA}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_email_e_telefone_opcionais_e_email_pode_ser_compartilhado(self):
        sem_contato = self.criar()
        self.assertIsNone(sem_contato["email"])
        self.assertIsNone(sem_contato["telefone"])
        self.criar(nome_completo="Contato A", email=self.ana.usuario.email)
        self.criar(nome_completo="Contato B", email=self.ana.usuario.email)
        self.assertEqual(Responsavel.objects.filter(email=self.ana.usuario.email).count(), 2)

    def test_listagem_ordenacao_edicao_e_filtro(self):
        zelia = self.criar(nome_completo="Zélia", email="zelia@escola.br")
        ana = self.criar(nome_completo="Ana")
        lista = self.client.get(self.rota).json()
        self.assertEqual([c["nome_completo"] for c in lista], ["Ana", "Zélia"])
        r = self.patch(f'{self.rota}{ana["id_responsavel"]}/', {
            "nome_completo": "Ana Silva", "email": "ANA@escola.br", "telefone": "41988880000"})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["email"], "ana@escola.br")
        self.assertEqual(self.client.get(f'{self.rota}{ana["id_responsavel"]}/').json()["nome_completo"], "Ana Silva")
        self.assertEqual(self.client.delete(f'{self.rota}{zelia["id_responsavel"]}/').status_code, 200)
        self.assertEqual([c["nome_completo"] for c in self.client.get(self.rota + "?ativo=true").json()], ["Ana Silva"])
        self.assertEqual([c["nome_completo"] for c in self.client.get(self.rota + "?ativo=false").json()], ["Zélia"])

    def test_desativar_preserva_vinculos_e_nao_altera_usuario_com_mesmo_email(self):
        contato = self.criar(email=self.ana.usuario.email)
        self.autorizar(contato)
        dados = {"responsavel": contato["id_responsavel"], "estudante": self.ana.pk, "grau_parentesco": "Mãe"}
        self.assertEqual(self.post(self.vinculos, dados).status_code, 200)
        usuarios = Usuario.objects.count()
        self.assertEqual(self.client.delete(f'{self.rota}{contato["id_responsavel"]}/').status_code, 200)
        self.assertFalse(Responsavel.objects.get(pk=contato["id_responsavel"]).ativo)
        self.assertTrue(EstudanteResponsavel.objects.filter(responsavel_id=contato["id_responsavel"]).exists())
        self.ana.usuario.refresh_from_db()
        self.assertTrue(self.ana.usuario.ativo)
        self.assertEqual(Usuario.objects.count(), usuarios)
        self.entrar(self.ana)

    def test_vinculo_cria_lista_desativa_e_reativa_sem_duplicar(self):
        contato = self.criar(email="rosa@teste.br")
        self.autorizar(contato)
        dados = {"responsavel": contato["id_responsavel"], "estudante": self.ana.pk, "grau_parentesco": "Mãe"}
        self.assertEqual(self.post(self.vinculos, dados).status_code, 200)
        lista = self.client.get(self.vinculos + f"?estudante={self.ana.pk}&ativo=true").json()
        self.assertEqual(lista[0]["responsavel"], contato["id_responsavel"])
        self.assertEqual(lista[0]["grau_parentesco"], "Mãe")
        self.assertEqual(self.client.delete(self.vinculos, dados, format="json").status_code, 200)
        self.assertEqual(self.post(self.vinculos, dados).status_code, 200)
        self.assertEqual(EstudanteResponsavel.objects.count(), 1)
        self.assertTrue(EstudanteResponsavel.objects.get().ativo)

    def test_nome_email_e_permissoes(self):
        self.entrar(self.admin)
        for dados in ({}, {"nome_completo": " "}, {"nome_completo": "Rosa", "email": "invalido"}):
            self.assertEqual(self.post(self.rota, dados).status_code, 400)
        contato = self.criar()
        for perfil in (self.ana, self.carlos, self.sofia, self.marta):
            self.entrar(perfil)
            self.assertEqual(self.client.get(self.rota).status_code, 403)
            self.assertEqual(self.post(self.rota, {"nome_completo": "Rosa"}).status_code, 403)
            self.assertEqual(self.patch(f'{self.rota}{contato["id_responsavel"]}/', {"nome_completo": "Outro"}).status_code, 403)
            self.assertEqual(self.client.delete(f'{self.rota}{contato["id_responsavel"]}/').status_code, 403)
