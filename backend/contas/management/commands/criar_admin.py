"""
python manage.py criar_admin --email admin@escola.br --nome "Administração"

Cria o primeiro administrador (usuario + administrador). Sem o Django Admin,
é a forma de entrar no sistema pela primeira vez. A senha é pedida no terminal.
"""
from getpass import getpass

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from contas.models import Administrador, Usuario
from nucleo.conexao import exigir_banco


class Command(BaseCommand):
    help = "Cria um usuário administrador."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--nome", required=True)
        parser.add_argument("--senha", help="Evite em produção: fica no histórico do terminal.")

    def handle(self, *args, email, nome, senha=None, **options):
        exigir_banco(self.stdout)  # antes de pedir a senha, para não parecer travado
        email = email.lower()
        if Usuario.objects.filter(email__iexact=email).exists():
            raise CommandError("Já existe uma conta com este e-mail.")
        senha = senha or getpass("Senha (o que você digita não aparece na tela, é normal): ")
        if len(senha) < settings.SENHA_TAMANHO_MINIMO:
            raise CommandError(f"A senha precisa de pelo menos {settings.SENHA_TAMANHO_MINIMO} caracteres.")
        with transaction.atomic():
            usuario = Usuario(nome_completo=nome, email=email)
            usuario.definir_senha(senha)
            usuario.save()
            Administrador.objects.create(usuario=usuario)
        self.stdout.write(self.style.SUCCESS(f"Administrador {email} criado."))
