"""
Serializers de login e de cadastro (RF27–RF30, RF34).

Cada cadastro de perfil grava duas linhas na mesma transação: `usuario`
(nome, e-mail, senha) e a tabela do perfil. Para o frontend, os campos
aparecem juntos num objeto só.
"""
from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import (Estudante, EstudanteResponsavel, Professor, ProfessorEstudante, PsicologoClinico,
                     PsicologoClinicoEstudante, PsicologoEscolar, PsicologoEscolarEstudante, Responsavel,
                     Usuario)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(trim_whitespace=False)


class CadastroPerfilSerializer(serializers.ModelSerializer):
    """Base: junta os campos de `usuario` com os do perfil."""

    nome_completo = serializers.CharField(source="usuario.nome_completo", max_length=150)
    email = serializers.EmailField(source="usuario.email", max_length=254)
    senha = serializers.CharField(write_only=True, required=False, trim_whitespace=False,
                                  min_length=settings.SENHA_TAMANHO_MINIMO)
    ativo = serializers.BooleanField(read_only=True)
    criado_em = serializers.DateTimeField(read_only=True)

    CAMPOS_USUARIO = ["nome_completo", "email", "senha", "ativo", "criado_em"]
    exige_senha = True

    def validate_email(self, email):
        email = email.lower()
        existente = Usuario.objects.filter(email__iexact=email)
        if self.instance:
            existente = existente.exclude(pk=self.instance.usuario_id)
        if existente.exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return email

    def validate(self, dados):
        if self.instance is None and self.exige_senha and not dados.get("senha"):
            raise serializers.ValidationError({"senha": "Defina uma senha para o primeiro acesso."})
        if "estado_registro" in dados:
            dados["estado_registro"] = dados["estado_registro"].upper()
            if dados["estado_registro"] not in {
                "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
                "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
            }:
                raise serializers.ValidationError({"estado_registro": "Use uma UF válida, como PR."})
        return dados

    @transaction.atomic
    def create(self, dados):
        dados_usuario = dados.pop("usuario")
        usuario = Usuario(**dados_usuario)
        usuario.definir_senha(dados.pop("senha", None))  # None = sem login
        usuario.save()
        return self.Meta.model.objects.create(usuario=usuario, **dados)

    @transaction.atomic
    def update(self, instancia, dados):
        dados_usuario = dados.pop("usuario", {})
        senha = dados.pop("senha", None)
        usuario = instancia.usuario
        for campo, valor in dados_usuario.items():
            setattr(usuario, campo, valor)
        if senha:
            usuario.definir_senha(senha)
        usuario.save()
        return super().update(instancia, dados)


class EstudanteSerializer(CadastroPerfilSerializer):
    class Meta:
        model = Estudante
        fields = ["id_estudante", *CadastroPerfilSerializer.CAMPOS_USUARIO,
                  "data_nascimento", "telefone", "instituicao_ensino", "turma"]


class ProfessorSerializer(CadastroPerfilSerializer):
    class Meta:
        model = Professor
        fields = ["id_professor", *CadastroPerfilSerializer.CAMPOS_USUARIO,
                  "telefone", "instituicao_ensino", "cargo"]


class PsicologoEscolarSerializer(CadastroPerfilSerializer):
    estado_registro = serializers.RegexField(r"^[A-Za-z]{2}$", error_messages={"invalid": "Use a sigla da UF, ex.: PR."})

    class Meta:
        model = PsicologoEscolar
        fields = ["id_psicologo_escolar", *CadastroPerfilSerializer.CAMPOS_USUARIO,
                  "telefone", "registro_profissional", "estado_registro", "instituicao_ensino"]


class PsicologoClinicoSerializer(CadastroPerfilSerializer):
    estado_registro = serializers.RegexField(r"^[A-Za-z]{2}$", error_messages={"invalid": "Use a sigla da UF, ex.: PR."})

    class Meta:
        model = PsicologoClinico
        fields = ["id_psicologo_clinico", *CadastroPerfilSerializer.CAMPOS_USUARIO,
                  "telefone", "registro_profissional", "estado_registro"]


class ResponsavelSerializer(serializers.ModelSerializer):
    """Grava somente o contato; não cria nem altera registros em usuario."""

    class Meta:
        model = Responsavel
        fields = ["id_responsavel", "nome_completo", "email", "ativo", "criado_em", "telefone"]
        read_only_fields = ["ativo", "criado_em"]

    def validate_email(self, email):
        return email.lower() if email else email


class EstudanteResumoSerializer(serializers.ModelSerializer):
    """O que profissionais vinculados veem do estudante (dados básicos)."""

    nome_completo = serializers.CharField(source="usuario.nome_completo")
    email = serializers.EmailField(source="usuario.email")

    class Meta:
        model = Estudante
        fields = ["id_estudante", "nome_completo", "email", "instituicao_ensino", "turma"]


# ------------------------------------------------------------------ vínculos

def _vinculo_serializer(modelo, campo_profissional, extras=()):
    class _Serializer(serializers.ModelSerializer):
        class Meta:
            model = modelo
            fields = [campo_profissional, "estudante", *extras, "ativo", "criado_em"]
            read_only_fields = ["ativo", "criado_em"]
            validators = []  # duplicidade tratada na view (reativa o vínculo)

    _Serializer.__name__ = f"{modelo.__name__}Serializer"
    return _Serializer


VinculoProfessorSerializer = _vinculo_serializer(ProfessorEstudante, "professor")
VinculoPsicologoEscolarSerializer = _vinculo_serializer(PsicologoEscolarEstudante, "psicologo_escolar")
VinculoPsicologoClinicoSerializer = _vinculo_serializer(PsicologoClinicoEstudante, "psicologo_clinico")
VinculoResponsavelSerializer = _vinculo_serializer(EstudanteResponsavel, "responsavel", ["grau_parentesco"])
