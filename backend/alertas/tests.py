from alertas.models import DestinatarioAlerta
from contas.models import ProfessorEstudante
from nucleo.fabrica import CasoMKpause


class AlertaTestes(CasoMKpause):
    def emitir(self, nivel, **extra):
        return self.post("/api/alertas/", {"nivel": nivel, **extra})

    def test_nivel_2_so_professor(self):
        self.entrar(self.ana)
        r = self.emitir(2)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["avisados"], ["Carlos"])

    def test_nivel_3_professor_e_psicologo_escolar(self):
        self.entrar(self.ana)
        r = self.emitir(3)
        tipos = {d["tipo_destinatario"] for d in r.json()["alerta"]["destinatarios"]}
        self.assertEqual(tipos, {"PROFESSOR", "PSICOLOGO_ESCOLAR"})
        self.assertIn("188", r.json()["mensagem"])  # RN37

    def test_nivel_1_nao_gera_alerta(self):
        self.entrar(self.ana)
        self.assertEqual(self.emitir(1).status_code, 400)

    def test_sem_vinculo_nao_cria_alerta_vazio(self):
        ProfessorEstudante.objects.filter(estudante=self.bruno).update(ativo=False)
        self.entrar(self.bruno)
        self.assertEqual(self.emitir(2).status_code, 409)

    def test_sessao_de_outro_estudante(self):
        self.entrar(self.bruno)
        sid = self.post("/api/sessoes/", {"id_atividade": self.respiracao.pk, "humor_pre": 1}).json()["sessao"]["id_sessao"]
        self.entrar(self.ana)
        self.assertEqual(self.emitir(3, id_sessao=sid).status_code, 400)

    def test_recebimento_leitura_e_status(self):
        self.entrar(self.ana)
        aid = self.emitir(3).json()["alerta"]["id_alerta"]

        self.entrar(self.sofia)
        self.assertEqual([a["id_alerta"] for a in self.client.get("/api/alertas/").json()], [aid])
        self.post(f"/api/alertas/{aid}/lido/")
        dest = DestinatarioAlerta.objects.get(alerta_id=aid, usuario=self.sofia.usuario)
        self.assertEqual(dest.status_notificacao, "LIDA")
        self.assertEqual(self.patch(f"/api/alertas/{aid}/", {"status": "EM_ACOMPANHAMENTO"}).json()["status"],
                         "EM_ACOMPANHAMENTO")

        self.entrar(self.marta)  # clínica vê, mas não muda (não é destinatária)
        self.assertEqual(len(self.client.get("/api/alertas/").json()), 1)
        self.assertEqual(self.patch(f"/api/alertas/{aid}/", {"status": "RESOLVIDO"}).status_code, 403)

        self.entrar(self.ana)  # estudante só cancela
        self.assertEqual(self.patch(f"/api/alertas/{aid}/", {"status": "RESOLVIDO"}).status_code, 403)
        self.assertEqual(self.patch(f"/api/alertas/{aid}/", {"status": "CANCELADO"}).status_code, 200)

    def test_observacoes(self):
        self.entrar(self.ana)
        aid = self.emitir(2).json()["alerta"]["id_alerta"]
        self.entrar(self.carlos)
        r = self.post(f"/api/alertas/{aid}/observacoes/", {"conteudo": "Ana voltou para a sala às 10h20."})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.post(f"/api/alertas/{aid}/observacoes/", {"conteudo": "   "}).status_code, 400)

        self.entrar(self.marta)  # RF14: lê; gatilho do banco impede que escreva
        self.assertEqual(len(self.client.get(f"/api/alertas/{aid}/observacoes/").json()), 1)
        self.assertEqual(self.post(f"/api/alertas/{aid}/observacoes/", {"conteudo": "x"}).status_code, 403)


class FichaEAvisoTestes(CasoMKpause):
    def test_ficha(self):
        url = f"/api/estudantes/{self.ana.pk}/ficha/"
        self.entrar(self.marta)
        self.assertEqual(self.patch(url, {"informacoes_acompanhamento": "Evolução boa."}).status_code, 200)
        self.entrar(self.carlos)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.entrar(self.sofia)
        self.assertEqual(self.client.get(url).json()["informacoes_acompanhamento"], "Evolução boa.")
        self.assertEqual(self.patch(url, {"informacoes_acompanhamento": "x"}).status_code, 403)
        self.entrar(self.admin)
        self.assertEqual(self.post(f"/api/estudantes/{self.bruno.pk}/ficha/", {}).status_code, 201)
        self.assertEqual(self.post(url, {}).status_code, 409)

    def test_avisos_por_publico(self):
        self.entrar(self.admin)
        self.post("/api/avisos/", {"titulo": "Reunião", "conteudo": "Sexta, 14h.", "publico_destinatario": "PROFESSORES"})
        self.post("/api/avisos/", {"titulo": "Boas-vindas", "conteudo": "Que bom ter você aqui."})
        self.entrar(self.ana)
        self.assertEqual([a["titulo"] for a in self.client.get("/api/avisos/").json()], ["Boas-vindas"])
        self.assertEqual(self.post("/api/avisos/", {"titulo": "x", "conteudo": "y"}).status_code, 403)
        self.entrar(self.carlos)
        self.assertEqual(len(self.client.get("/api/avisos/").json()), 2)
