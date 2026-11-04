from django.core.management.base import BaseCommand
from nucleo.emails import processar_emails


class Command(BaseCommand):
    help = "Processa a fila de e-mail pendente e tenta novamente falhas disponíveis (até cinco tentativas)."

    def add_arguments(self, parser):
        parser.add_argument("--limite", type=int, default=50)

    def handle(self, *args, limite=50, **options):
        enviados = processar_emails(max(0, min(limite, 500)))
        self.stdout.write(f"{enviados} e-mail(s) aceito(s) pelo backend de envio configurado.")
