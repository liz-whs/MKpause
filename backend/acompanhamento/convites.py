"""Convites assinados. O banco não armazena o token do link nem cria login para o responsável."""
from datetime import timedelta
from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError as ErroDjango
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from contas.models import (Estudante, Responsavel, PsicologoClinico, EstudanteResponsavel,
                           PsicologoClinicoEstudante)
from contas.permissoes import SomenteAdministrador
from contas.views_codigos import CodigoThrottle
from nucleo.emails import agendar_envio, processar_emails
from .models import ConviteResponsavel, NotificacaoEmail

SALT = "mkpause.convite-responsavel.v1"
INVALIDO = "Convite indisponível. Peça um novo à escola."
VERSAO = "2026-11-v1"


def link_convite(c):
    token = signing.dumps({"id": c.pk, "nonce": str(c.nonce)}, salt=SALT)
    return f"{settings.PUBLIC_BASE_URL}/convite-responsavel#token={token}"


def teste_local():
    return settings.DEBUG and settings.EMAIL_BACKEND == "django.core.mail.backends.filebased.EmailBackend"


def caixa_local():
    return settings.EMAIL_BACKEND == "django.core.mail.backends.filebased.EmailBackend"


def dados_convite(c):
    email = NotificacaoEmail.objects.filter(convite=c).first()
    return {"id_convite": c.pk, "estudante": c.estudante_id, "responsavel": c.responsavel_id,
            "nome_responsavel": c.responsavel.nome_completo, "email_destino": c.email_destino,
            "psicologo_clinico": c.psicologo_clinico_id,
            "status": "EXPIRADO" if c.status == "PENDENTE" and c.expira_em <= timezone.now() else c.status,
            "criado_em": c.criado_em, "expira_em": c.expira_em, "respondido_em": c.respondido_em,
            "envio": email.status if email else None, "caixa_local": caixa_local(),
            "link_teste": link_convite(c) if teste_local() and c.status == "PENDENTE" else None}


class CriarConviteSerializer(serializers.Serializer):
    responsavel = serializers.IntegerField(required=False)
    nome_completo = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(max_length=254, required=False)
    telefone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    parentesco = serializers.CharField(max_length=60, required=False, allow_blank=True)
    psicologo_clinico = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, dados):
        if not dados.get("responsavel") and not (dados.get("nome_completo") and dados.get("email")):
            raise ValidationError("Informe nome e e-mail do responsável.")
        return dados


class ConvitesAdminView(APIView):
    permission_classes = [SomenteAdministrador]

    def get(self, request, id_estudante):
        get_object_or_404(Estudante, pk=id_estudante)
        return Response([dados_convite(c) for c in ConviteResponsavel.objects.filter(
            estudante_id=id_estudante).select_related("responsavel").order_by("-criado_em", "-pk")])

    @transaction.atomic
    def post(self, request, id_estudante):
        dados = CriarConviteSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        d = dados.validated_data
        estudante = get_object_or_404(Estudante.objects.select_for_update(), pk=id_estudante, ativo=True, usuario__ativo=True)
        clinico = get_object_or_404(PsicologoClinico, pk=d["psicologo_clinico"], ativo=True,
                                   usuario__ativo=True) if d.get("psicologo_clinico") else None
        if d.get("responsavel"):
            contato = get_object_or_404(Responsavel, pk=d["responsavel"], ativo=True)
            if not contato.email:
                raise ValidationError({"email": "Cadastre um e-mail para o responsável."})
        else:
            contato = Responsavel.objects.filter(nome_completo=d["nome_completo"], email__iexact=d["email"], ativo=True).first()
            if contato is None:
                contato = Responsavel.objects.create(nome_completo=d["nome_completo"], email=d["email"].lower(),
                                                      telefone=d.get("telefone") or None)
        ConviteResponsavel.objects.filter(estudante=estudante, psicologo_clinico=clinico, status="PENDENTE").update(
            status="REVOGADO", revogado_em=timezone.now())
        termo = "Confirmo que sou responsável pelo estudante indicado e autorizo o vínculo do meu contato com ele no MKpause."
        if clinico:
            termo += (f" Autorizo {clinico.usuario.nome_completo}, CRP {clinico.registro_profissional}/{clinico.estado_registro}, "
                      "a acompanhar o estudante no MKpause e acessar seus registros de pausas, humores, alertas e ficha de acompanhamento.")
        termo += " Posso solicitar à escola a revogação desta autorização. Não preciso criar uma conta."
        c = ConviteResponsavel.objects.create(estudante=estudante, responsavel=contato, psicologo_clinico=clinico,
            administrador=request.user.dados_perfil, email_destino=contato.email, parentesco=d.get("parentesco") or None,
            termo_versao=VERSAO, termo_texto=termo, expira_em=timezone.now() + timedelta(days=7))
        NotificacaoEmail.objects.create(convite=c, email_destino=c.email_destino)
        agendar_envio()
        return Response(dados_convite(c), status=201)


def revogar(c):
    era_aceito = c.status == "ACEITO"
    c.status, c.revogado_em = "REVOGADO", timezone.now()
    c.save(update_fields=["status", "revogado_em"])
    NotificacaoEmail.objects.filter(convite=c, status__in=["PENDENTE", "FALHA"]).update(status="CANCELADA")
    if era_aceito:
        outros = ConviteResponsavel.objects.filter(estudante=c.estudante, status="ACEITO", responsavel__ativo=True).exclude(pk=c.pk)
        if not outros.filter(responsavel=c.responsavel).exists():
            EstudanteResponsavel.objects.filter(estudante=c.estudante, responsavel=c.responsavel).update(ativo=False)
        if c.psicologo_clinico_id and not outros.filter(psicologo_clinico=c.psicologo_clinico).exists():
            PsicologoClinicoEstudante.objects.filter(estudante=c.estudante, psicologo_clinico=c.psicologo_clinico).update(ativo=False)


class RevogarConviteView(APIView):
    permission_classes = [SomenteAdministrador]

    @transaction.atomic
    def post(self, request, id_convite):
        inicial = get_object_or_404(ConviteResponsavel, pk=id_convite)
        Estudante.objects.select_for_update().get(pk=inicial.estudante_id)
        c = ConviteResponsavel.objects.select_for_update().get(pk=id_convite)
        revogar(c)
        return Response(dados_convite(c))


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=1000)


def obter_convite(request, bloquear=False):
    dados = TokenSerializer(data=request.data)
    dados.is_valid(raise_exception=True)
    try:
        assinado = signing.loads(dados.validated_data["token"], salt=SALT, max_age=7 * 24 * 3600)
        c = ConviteResponsavel.objects.filter(pk=assinado["id"], nonce=assinado["nonce"]).first()
    except (signing.BadSignature, ValueError, KeyError, TypeError, ErroDjango):
        c = None
    if c and bloquear:
        Estudante.objects.select_for_update().get(pk=c.estudante_id)
        c = ConviteResponsavel.objects.select_for_update().get(pk=c.pk)
    if (c is None or c.status != "PENDENTE" or c.expira_em <= timezone.now() or not c.responsavel.ativo
            or c.email_destino != c.responsavel.email or not c.estudante.ativo or not c.estudante.usuario.ativo
            or (c.psicologo_clinico_id and (not c.psicologo_clinico.ativo or not c.psicologo_clinico.usuario.ativo))):
        raise ValidationError({"detail": INVALIDO})
    return c


class ConvitePublicoView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [CodigoThrottle]
    throttle_scope = "convite"

    def post(self, request):
        c = obter_convite(request)
        return Response({"estudante": c.estudante.usuario.nome_completo.split()[0],
                         "responsavel": c.responsavel.nome_completo.split()[0], "termo": c.termo_texto,
                         "versao": c.termo_versao, "expira_em": c.expira_em})


class ResponderConviteView(ConvitePublicoView):
    @transaction.atomic
    def post(self, request, resposta):
        c = obter_convite(request, bloquear=True)
        if resposta == "aceitar":
            if request.data.get("confirmo_responsabilidade") is not True or request.data.get("aceito_termo") is not True:
                raise ValidationError({"detail": "Confirme sua responsabilidade e leia a autorização antes de aceitar."})
            EstudanteResponsavel.objects.update_or_create(estudante=c.estudante, responsavel=c.responsavel,
                                                          defaults={"ativo": True, "grau_parentesco": c.parentesco})
            if c.psicologo_clinico_id:
                PsicologoClinicoEstudante.objects.update_or_create(estudante=c.estudante, psicologo_clinico=c.psicologo_clinico,
                                                                   defaults={"ativo": True})
        c.status = "ACEITO" if resposta == "aceitar" else "RECUSADO"
        c.respondido_em = timezone.now()
        c.save(update_fields=["status", "respondido_em"])
        return Response({"status": c.status})


class EmailsAdminView(APIView):
    permission_classes = [SomenteAdministrador]

    def get(self, request):
        lista = NotificacaoEmail.objects.order_by("-criado_em")[:100]
        return Response({"caixa_local": caixa_local(), "emails": [{"id": e.pk, "para": e.email_destino,
            "tipo": "CONVITE" if e.convite_id else "ALERTA", "status": e.status, "tentativas": e.tentativas,
            "criado_em": e.criado_em, "enviado_em": e.enviado_em, "erro": e.erro} for e in lista]})

    def post(self, request):
        return Response({"processados": processar_emails(limite=20), "caixa_local": caixa_local()})
