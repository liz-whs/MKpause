from nucleo.fabrica import CasoMKpause
from sessoes.models import RegistroHumor, Sessao


class SessaoTestes(CasoMKpause):
    def iniciar(self, humor=2, atividade=None):
        return self.post("/api/sessoes/", {"id_atividade": (atividade or self.respiracao).pk, "humor_pre": humor})

    def test_fluxo_completo(self):
        self.entrar(self.ana)
        r = self.post("/api/sessoes/avaliar/", {"humor": 1})
        self.assertEqual(r.json()["nivel"], 3)
        self.assertEqual([a["nome"] for a in r.json()["atividades"]], ["Chinchila respirando"])

        r = self.iniciar(humor=2)
        self.assertEqual(r.status_code, 201, r.content)
        sessao = r.json()["sessao"]
        self.assertEqual((sessao["status"], sessao["nivel_avaliado"]), ("EM_ANDAMENTO", 2))

        r = self.post(f"/api/sessoes/{sessao['id_sessao']}/concluir/", {"humor_pos": 4, "observacoes_sessao": "Ajudou."})
        self.assertEqual(r.json()["sessao"]["status"], "CONCLUIDA")
        momentos = set(RegistroHumor.objects.filter(sessao_id=sessao["id_sessao"]).values_list("momento", "estado"))
        self.assertEqual(momentos, {("PRE", 2), ("POS", 4)})

        # Não conclui duas vezes
        self.assertEqual(self.post(f"/api/sessoes/{sessao['id_sessao']}/concluir/", {"humor_pos": 4}).status_code, 409)
        self.assertEqual(len(self.client.get("/api/sessoes/").json()), 1)

    def test_validacoes(self):
        self.entrar(self.ana)
        self.assertEqual(self.iniciar(humor=6).status_code, 400)
        self.assertEqual(self.iniciar(atividade=self.indisponivel).status_code, 400)  # RN31
        self.assertFalse(Sessao.objects.exists())

    def test_cancelar(self):
        self.entrar(self.ana)
        sid = self.iniciar().json()["sessao"]["id_sessao"]
        self.assertEqual(self.post(f"/api/sessoes/{sid}/cancelar/").json()["sessao"]["status"], "CANCELADA")

    def test_acesso_ao_historico(self):
        self.entrar(self.ana)
        sid = self.iniciar().json()["sessao"]["id_sessao"]
        self.entrar(self.bruno)  # outro estudante
        self.assertEqual(self.client.get(f"/api/sessoes/{sid}/").status_code, 404)
        self.entrar(self.marta)  # clínica vinculada (RF12)
        self.assertEqual(len(self.client.get(f"/api/sessoes/?estudante={self.ana.pk}").json()), 1)
        self.entrar(self.carlos)  # professor não vê histórico emocional
        self.assertEqual(self.client.get(f"/api/sessoes/?estudante={self.ana.pk}").status_code, 403)
