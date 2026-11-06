"""
python manage.py criar_demo

Cria contas de demonstração (administrador, estudante, professor, psicólogo
escolar e clínico), os vínculos entre elas e as quatro atividades da interface web.
Só para o banco de desenvolvimento. Pode rodar de novo: o que já existe fica.

A senha das contas vem de DEMO_SENHA no .env (ou --senha).
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from atividades.models import Atividade
from contas.models import (Administrador, Estudante, Professor, ProfessorEstudante, PsicologoClinico,
                           PsicologoClinicoEstudante, PsicologoEscolar, PsicologoEscolarEstudante, Usuario)
from nucleo.conexao import exigir_banco

ESCOLA = "Escola Modelo"

ATIVIDADES = [
    ("Respire&Pause", "RESPIRACAO", "respiracao"),
    ("PianoPause", "JOGO", "/jogos/pianopause/index.html"),
    ("MK Potion", "JOGO", "/jogos/mkpotion/index.html"),
    ("MK Breath", "VIDEO", "video"),
]


class Command(BaseCommand):
    help = "Cria contas, vínculos e atividades de demonstração."

    def add_arguments(self, parser):
        parser.add_argument("--senha", help="Senha das contas de demonstração (padrão: DEMO_SENHA do .env).")

    def _usuario(self, email, nome, senha):
        usuario = Usuario.objects.filter(email__iexact=email).first()
        if usuario is None:
            usuario = Usuario(nome_completo=nome, email=email)
            usuario.definir_senha(senha)
            usuario.save()
            self.stdout.write(f"  conta {email} criada")
        return usuario

    def handle(self, *args, senha=None, **options):
        exigir_banco(self.stdout)
        senha = senha or os.environ.get("DEMO_SENHA")
        if not senha or len(senha) < settings.SENHA_TAMANHO_MINIMO:
            raise CommandError(f"Defina DEMO_SENHA no .env (pelo menos {settings.SENHA_TAMANHO_MINIMO} caracteres).")

        with transaction.atomic():
            for nome, tipo, ref in ATIVIDADES:
                atividade, _ = Atividade.objects.get_or_create(
                    tipo=tipo, conteudo_ou_referencia=ref, defaults={"nome": nome})
                if atividade.nome in ("Respiração da chinchila", "Chinchila respirando", "Vídeo: um minuto de calma", "Respiração guiada em vídeo"):
                    atividade.nome = nome
                    atividade.save(update_fields=["nome"])

            est, _ = Estudante.objects.get_or_create(
                usuario=self._usuario("ana.demo@mkpause.dev", "Ana Lima", senha),
                defaults={"turma": "8º A", "instituicao_ensino": ESCOLA})
            prof, _ = Professor.objects.get_or_create(
                usuario=self._usuario("professor.demo@mkpause.dev", "Marcos Prado", senha),
                defaults={"cargo": "Matemática", "instituicao_ensino": ESCOLA})
            pe, _ = PsicologoEscolar.objects.get_or_create(
                usuario=self._usuario("psicologo.demo@mkpause.dev", "Paula Esteves", senha),
                defaults={"registro_profissional": "08/12345", "estado_registro": "PR", "instituicao_ensino": ESCOLA})
            pc, _ = PsicologoClinico.objects.get_or_create(
                usuario=self._usuario("clinico.demo@mkpause.dev", "Carlos Pires", senha),
                defaults={"registro_profissional": "08/54321", "estado_registro": "PR"})

            Administrador.objects.get_or_create(
                usuario=self._usuario("admin.demo@mkpause.dev", "Admin Demo", senha))

            ProfessorEstudante.objects.get_or_create(professor=prof, estudante=est)
            PsicologoEscolarEstudante.objects.get_or_create(psicologo_escolar=pe, estudante=est)
            PsicologoClinicoEstudante.objects.get_or_create(psicologo_clinico=pc, estudante=est)

        self.stdout.write(self.style.SUCCESS("Demonstração pronta."))
