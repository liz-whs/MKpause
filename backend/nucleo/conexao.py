"""Checagem de conexão usada pelos comandos de terminal."""
from django.core.management.base import CommandError
from django.db import OperationalError, connection


def exigir_banco(stdout):
    """Conecta no PostgreSQL ou para com uma mensagem que diz o que conferir."""
    banco = connection.settings_dict
    stdout.write(f"Conectando em {banco['HOST']}:{banco['PORT']}, banco '{banco['NAME']}', "
                 f"usuário '{banco['USER']}'...")
    try:
        connection.ensure_connection()
    except OperationalError as exc:
        raise CommandError(
            "Não consegui conectar no PostgreSQL. Confira se:\n"
            "  1. o PostgreSQL está rodando (serviço 'postgresql' no Windows);\n"
            "  2. o arquivo .env existe nesta pasta (copie de .env.example) com DB_PASSWORD certo;\n"
            "  3. o banco foi criado pelo Flyway (flyway migrate).\n"
            f"Detalhe: {str(exc).strip() or exc}"
        )
