"""
Tratamento de erros da API.

Violações de restrição e erros de gatilho do PostgreSQL viram mensagens
compreensíveis, sem expor detalhes do banco (doc. do banco, item 7.8).
O detalhe técnico vai só para o log do servidor.
"""
import logging

from django.db import DatabaseError, IntegrityError
from django.db.models import ProtectedError, RestrictedError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

log = logging.getLogger("mkpause")


class Conflito(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Esta ação conflita com o estado atual do registro."


def tratar_excecao(exc, context):
    resposta = exception_handler(exc, context)
    if resposta is not None:
        return resposta

    if isinstance(exc, (ProtectedError, RestrictedError)):
        return Response({"detail": "Este registro tem histórico ligado a ele. Desative em vez de apagar."},
                        status=status.HTTP_409_CONFLICT)
    if isinstance(exc, IntegrityError):
        log.warning("IntegrityError: %s", exc)
        return Response({"detail": "Não conseguimos salvar: os dados conflitam com um registro existente "
                                   "ou com uma regra do banco. Confira os campos e tente de novo."},
                        status=status.HTTP_409_CONFLICT)
    if isinstance(exc, DatabaseError):
        log.error("DatabaseError: %s", exc)
        return Response({"detail": "Não conseguimos salvar agora. Tente de novo em instantes."},
                        status=status.HTTP_400_BAD_REQUEST)
    return None
