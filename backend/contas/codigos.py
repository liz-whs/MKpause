"""Geração e identificação de códigos. O texto nunca é persistido no banco."""
import hmac
import secrets

from django.conf import settings

ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def gerar(tamanho):
    return "".join(secrets.choice(ALFABETO) for _ in range(tamanho))


def normalizar(texto):
    return "".join(texto.upper().split()).replace("-", "")


def hash_codigo(texto):
    return hmac.new(settings.SECRET_KEY.encode(), normalizar(texto).encode(), "sha256").hexdigest()


def formatar(texto):
    meio = len(texto) // 2
    return f"{texto[:meio]}-{texto[meio:]}"
