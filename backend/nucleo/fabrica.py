"""Criação rápida de dados para os testes."""
from rest_framework.test import APIClient, APITestCase

from acompanhamento.models import FichaAcompanhamento
from atividades.models import Atividade
from contas.models import (Administrador, Estudante, Professor, ProfessorEstudante, PsicologoClinico,
                           PsicologoClinicoEstudante, PsicologoEscolar, PsicologoEscolarEstudante, Usuario)

SENHA = "senha-de-teste"


def criar_usuario(nome, email):
    u = Usuario(nome_completo=nome, email=email)
    u.definir_senha(SENHA)
    u.save()
    return u


class CasoMKpause(APITestCase):
    """
    Cenário: Ana e Bruno (estudantes), Carlos (professor de ambos),
    Sofia (psi. escolar da Ana), Marta (psi. clínica da Ana), admin.
    """

    def setUp(self):
        self.admin = Administrador.objects.create(usuario=criar_usuario("Admin", "admin@mk.br"))
        self.ana = Estudante.objects.create(usuario=criar_usuario("Ana", "ana@mk.br"), turma="9A")
        self.bruno = Estudante.objects.create(usuario=criar_usuario("Bruno", "bruno@mk.br"), turma="9A")
        self.carlos = Professor.objects.create(usuario=criar_usuario("Carlos", "carlos@mk.br"))
        self.sofia = PsicologoEscolar.objects.create(usuario=criar_usuario("Sofia", "sofia@mk.br"),
                                                     registro_profissional="654321", estado_registro="PR")
        self.marta = PsicologoClinico.objects.create(usuario=criar_usuario("Marta", "marta@mk.br"),
                                                     registro_profissional="123456", estado_registro="PR")
        ProfessorEstudante.objects.create(professor=self.carlos, estudante=self.ana)
        ProfessorEstudante.objects.create(professor=self.carlos, estudante=self.bruno)
        PsicologoEscolarEstudante.objects.create(psicologo_escolar=self.sofia, estudante=self.ana)
        PsicologoClinicoEstudante.objects.create(psicologo_clinico=self.marta, estudante=self.ana)
        self.respiracao = Atividade.objects.create(nome="Chinchila respirando", tipo="RESPIRACAO")
        self.indisponivel = Atividade.objects.create(nome="Jogo antigo", tipo="JOGO", disponivel=False)
        FichaAcompanhamento.objects.create(estudante=self.ana, informacoes_acompanhamento="Início.")

    def entrar(self, perfil):
        self.client = APIClient()
        r = self.client.post("/api/auth/login/", {"email": perfil.usuario.email, "senha": SENHA}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def post(self, url, dados=None):
        return self.client.post(url, dados or {}, format="json")

    def patch(self, url, dados):
        return self.client.patch(url, dados, format="json")
