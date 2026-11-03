"""Convites de cadastro e vínculos mediante aceite (contrato em docs/codigos-de-acesso.md)."""
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import perfis as p
from .autenticacao import entrar
from .codigos import formatar, gerar, hash_codigo
from .models import (CodigoCadastro, CodigoVinculo, Estudante, ProfessorEstudante,
                     PsicologoEscolarEstudante, UsoCodigoCadastro, Usuario)
from .permissoes import SomenteAdministrador, somente
from .serializers import (EstudanteSerializer, ProfessorSerializer, PsicologoClinicoSerializer,
                          PsicologoEscolarSerializer)
from .views import _dados_da_conta

CADASTRO_INVALIDO = "Código inválido ou expirado. Peça um novo à escola."
VINCULO_INVALIDO = "Código inválido ou expirado. Peça um novo ao estudante."
SERIALIZERS = {
    "ESTUDANTE": EstudanteSerializer, "PROFESSOR": ProfessorSerializer,
    "PSICOLOGO_ESCOLAR": PsicologoEscolarSerializer, "PSICOLOGO_CLINICO": PsicologoClinicoSerializer,
}
S = CodigoVinculo.Status


class CodigoThrottle(ScopedRateThrottle):
    """Usa a identidade própria do MKpause, sem depender de django.contrib.auth."""

    def get_cache_key(self, request, view):
        ident = request.user.pk if self.scope == "vinculo" and request.user else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class Conflito(APIException):
    status_code = 409
    default_detail = "Você já acompanha este estudante."


class TextoCodigoSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=100)


class NovoCodigoSerializer(serializers.Serializer):
    perfil = serializers.ChoiceField(choices=list(SERIALIZERS))
    usos_maximos = serializers.IntegerField(min_value=1, max_value=200, default=1)
    validade_dias = serializers.IntegerField(min_value=1, max_value=30, default=7)
    turma = serializers.CharField(max_length=80, required=False, allow_blank=True, allow_null=True)
    instituicao_ensino = serializers.CharField(max_length=160, required=False, allow_blank=True, allow_null=True)

    def validate(self, dados):
        if dados["perfil"] != "ESTUDANTE" and {"turma", "instituicao_ensino"} & dados.keys():
            raise ValidationError("Turma e escola no código são só para estudante.")
        return dados


def texto_codigo(request):
    dados = TextoCodigoSerializer(data=request.data)
    dados.is_valid(raise_exception=True)
    return dados.validated_data["codigo"]


def situacao(c):
    if c.revogado_em:
        return "REVOGADO"
    if c.expira_em <= timezone.now():
        return "EXPIRADO"
    return "ESGOTADO" if c.usos >= c.usos_maximos else "ATIVO"


def dados_cadastro(c):
    return {
        "id_codigo_cadastro": c.pk, "sufixo": c.sufixo, "perfil": c.perfil,
        "turma": c.turma, "instituicao_ensino": c.instituicao_ensino,
        "usos_maximos": c.usos_maximos, "usos": c.usos, "expira_em": c.expira_em,
        "revogado_em": c.revogado_em, "situacao": situacao(c), "criado_em": c.criado_em,
        "usado_por": [{"id_usuario": u.usuario_id, "nome_completo": u.usuario.nome_completo,
                       "email": u.usuario.email, "usado_em": u.usado_em}
                      for u in c.utilizacoes.all()],
    }


def codigo_cadastro(texto, bloquear=False):
    qs = CodigoCadastro.objects
    if bloquear:
        qs = qs.select_for_update()
    c = qs.filter(codigo_hash=hash_codigo(texto)).first()
    if c is None or situacao(c) != "ATIVO":
        raise ValidationError({"detail": CADASTRO_INVALIDO})
    return c


class CodigosCadastroView(APIView):
    permission_classes = [SomenteAdministrador]

    def get(self, request):
        lista = CodigoCadastro.objects.order_by("-criado_em", "-pk").prefetch_related("utilizacoes__usuario")
        return Response([dados_cadastro(c) for c in lista])

    def post(self, request):
        dados = NovoCodigoSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        campos = dict(dados.validated_data)
        validade = campos.pop("validade_dias")
        texto = gerar(10)
        c = CodigoCadastro.objects.create(
            **campos, administrador=request.user.dados_perfil, codigo_hash=hash_codigo(texto),
            sufixo=texto[-3:], expira_em=timezone.now() + timedelta(days=validade))
        return Response({**dados_cadastro(c), "codigo": formatar(texto)}, status=201)


class RevogarCadastroView(APIView):
    permission_classes = [SomenteAdministrador]

    @transaction.atomic
    def post(self, request, id_codigo):
        c = get_object_or_404(CodigoCadastro.objects.select_for_update(), pk=id_codigo)
        if not c.revogado_em:
            c.revogado_em = timezone.now()
            c.save(update_fields=["revogado_em"])
        return Response(dados_cadastro(c))


class CadastroPublicoView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [CodigoThrottle]
    throttle_scope = "cadastro"


class VerificarCadastroView(CadastroPublicoView):
    def post(self, request):
        c = codigo_cadastro(texto_codigo(request))
        return Response({"perfil": c.perfil, "turma": c.turma, "instituicao_ensino": c.instituicao_ensino})


class CadastrarComCodigoView(CadastroPublicoView):
    def post(self, request):
        texto = texto_codigo(request)
        try:
            with transaction.atomic():
                c = codigo_cadastro(texto, bloquear=True)
                campos = {k: v for k, v in request.data.items() if k != "codigo"}
                if c.perfil == "ESTUDANTE":
                    for campo in ("turma", "instituicao_ensino"):
                        if getattr(c, campo) is not None:
                            campos[campo] = getattr(c, campo)
                dados = SERIALIZERS[c.perfil](data=campos)
                dados.is_valid(raise_exception=True)
                perfil = dados.save()
                c.usos += 1
                c.save(update_fields=["usos"])
                UsoCodigoCadastro.objects.create(codigo_cadastro=c, usuario=perfil.usuario)
        except IntegrityError:
            # Uma tentativa concorrente com o mesmo e-mail também não consome o convite.
            if Usuario.objects.filter(email__iexact=campos.get("email", "")).exists():
                raise ValidationError({"email": ["Já existe uma conta com este e-mail."]})
            raise
        usuario = perfil.usuario
        p.carregar_perfil(usuario)
        entrar(request, usuario)
        return Response(_dados_da_conta(usuario), status=201)


def abertos(estudante):
    return CodigoVinculo.objects.filter(estudante=estudante, status=S.ABERTO, revogado_em__isnull=True)


def revogar_abertos(estudante):
    abertos(estudante).update(status=S.REVOGADO, revogado_em=timezone.now())


class GerarVinculoView(APIView):
    permission_classes = [somente(p.ESTUDANTE)]

    @transaction.atomic
    def post(self, request):
        # A linha do estudante também serializa a geração quando ainda não há código.
        estudante = Estudante.objects.select_for_update().get(pk=request.user.dados_perfil.pk)
        revogar_abertos(estudante)
        texto = gerar(6)
        c = CodigoVinculo.objects.create(estudante=estudante, codigo_hash=hash_codigo(texto),
                                         expira_em=timezone.now() + timedelta(hours=24))
        return Response({"id_codigo_vinculo": c.pk, "codigo": formatar(texto), "expira_em": c.expira_em}, status=201)


class VinculoAtualView(APIView):
    permission_classes = [somente(p.ESTUDANTE)]

    def get(self, request):
        c = abertos(request.user.dados_perfil).filter(expira_em__gt=timezone.now()).first()
        return Response({"id_codigo_vinculo": c.pk, "expira_em": c.expira_em, "status": c.status}) if c else Response(status=204)

    @transaction.atomic
    def delete(self, request):
        estudante = Estudante.objects.select_for_update().get(pk=request.user.dados_perfil.pk)
        revogar_abertos(estudante)
        return Response(status=204)


def profissional_ativo(c):
    profissional = c.professor if c.professor_id else c.psicologo_escolar
    return profissional if profissional and profissional.ativo and profissional.usuario.ativo else None


def pendentes():
    return CodigoVinculo.objects.filter(status=S.AGUARDANDO_ESTUDANTE, revogado_em__isnull=True,
                                        expira_em__gt=timezone.now()).select_related(
        "professor__usuario", "psicologo_escolar__usuario", "estudante__usuario")


class SolicitacoesView(APIView):
    permission_classes = [somente(p.ESTUDANTE)]

    def get(self, request):
        lista = []
        for c in pendentes().filter(estudante=request.user.dados_perfil).order_by("-resgatado_em"):
            profissional = profissional_ativo(c)
            if profissional is None:
                continue
            detalhe = profissional.cargo if c.professor_id else f"CRP {profissional.registro_profissional}/{profissional.estado_registro}"
            lista.append({"id_codigo_vinculo": c.pk, "resgatado_em": c.resgatado_em,
                          "profissional": {"nome_completo": profissional.usuario.nome_completo,
                                           "perfil": p.PROFESSOR if c.professor_id else p.PSICOLOGO_ESCOLAR,
                                           "detalhe": " · ".join(filter(None, [detalhe, profissional.instituicao_ensino]))}})
        return Response(lista)


def bloquear_codigo(qs, mensagem):
    # Mesma ordem de bloqueio da geração: estudante, depois código.
    estudante_id = qs.values_list("estudante_id", flat=True).first()
    if estudante_id is None:
        raise ValidationError({"detail": mensagem})
    estudante = Estudante.objects.select_for_update().get(pk=estudante_id)
    c = qs.select_for_update().first()
    if c is None or c.revogado_em or c.expira_em <= timezone.now() or not estudante.ativo or not estudante.usuario.ativo:
        raise ValidationError({"detail": mensagem})
    return c


def vinculo_do_profissional(perfil, profissional, estudante):
    if perfil == p.PROFESSOR:
        return ProfessorEstudante.objects.filter(professor=profissional, estudante=estudante)
    return PsicologoEscolarEstudante.objects.filter(psicologo_escolar=profissional, estudante=estudante)


def resumo_estudante(c):
    return {"primeiro_nome": c.estudante.usuario.nome_completo.split()[0], "turma": c.estudante.turma or ""}


class ResgatarVinculoView(APIView):
    permission_classes = [somente(p.PROFESSOR, p.PSICOLOGO_ESCOLAR)]
    throttle_classes = [CodigoThrottle]
    throttle_scope = "vinculo"

    @transaction.atomic
    def post(self, request):
        c = bloquear_codigo(CodigoVinculo.objects.filter(codigo_hash=hash_codigo(texto_codigo(request))), VINCULO_INVALIDO)
        if c.status != S.ABERTO:
            raise ValidationError({"detail": VINCULO_INVALIDO})
        profissional = request.user.dados_perfil
        if vinculo_do_profissional(request.user.perfil, profissional, c.estudante).filter(ativo=True).exists():
            raise Conflito()
        campo = "professor" if request.user.perfil == p.PROFESSOR else "psicologo_escolar"
        setattr(c, campo, profissional)
        c.resgatado_em, c.status = timezone.now(), S.AGUARDANDO_ESTUDANTE
        c.save(update_fields=[campo, "resgatado_em", "status"])
        return Response({"status": c.status, "estudante": resumo_estudante(c)})


class PedidosEnviadosView(APIView):
    permission_classes = [somente(p.PROFESSOR, p.PSICOLOGO_ESCOLAR)]

    def get(self, request):
        campo = "professor" if request.user.perfil == p.PROFESSOR else "psicologo_escolar"
        lista = pendentes().filter(**{campo: request.user.dados_perfil}, estudante__ativo=True,
                                   estudante__usuario__ativo=True).order_by("-resgatado_em")
        return Response([{"id_codigo_vinculo": c.pk, "estudante": resumo_estudante(c),
                          "resgatado_em": c.resgatado_em} for c in lista])


class ResponderVinculoView(APIView):
    permission_classes = [somente(p.ESTUDANTE)]

    @transaction.atomic
    def post(self, request, id_codigo, resposta):
        qs = CodigoVinculo.objects.filter(pk=id_codigo, estudante=request.user.dados_perfil)
        get_object_or_404(qs)
        mensagem = "Este pedido não está mais disponível."
        c = bloquear_codigo(qs, mensagem)
        if c.status != S.AGUARDANDO_ESTUDANTE or profissional_ativo(c) is None:
            raise ValidationError({"detail": mensagem})
        if resposta == "aceitar":
            campo = "professor" if c.professor_id else "psicologo_escolar"
            modelo = ProfessorEstudante if c.professor_id else PsicologoEscolarEstudante
            modelo.objects.update_or_create(
                **{campo: getattr(c, campo), "estudante": c.estudante}, defaults={"ativo": True})
        c.status = S.ACEITO if resposta == "aceitar" else S.RECUSADO
        c.respondido_em = timezone.now()
        c.save(update_fields=["status", "respondido_em"])
        return Response({"status": c.status})
