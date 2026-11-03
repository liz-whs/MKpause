"""
Usuários, perfis e vínculos.

Tabelas (V1): usuario, estudante, professor, psicologo_escolar,
psicologo_clinico, responsavel, administrador, professor_estudante,
psicologo_escolar_estudante, psicologo_clinico_estudante,
estudante_responsavel.
"""
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone

from nucleo.models import ComAtivoETimestamps, TabelaDoFlyway


class Usuario(ComAtivoETimestamps):
    """Identidade central: nome, e-mail, hash da senha e estado da conta."""

    id_usuario = models.BigAutoField(primary_key=True)
    nome_completo = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, unique=True)
    senha_hash = models.CharField(max_length=255)

    class Meta(ComAtivoETimestamps.Meta):
        db_table = "usuario"

    def __str__(self):
        return self.nome_completo

    def definir_senha(self, senha):
        # None gera um hash inutilizável (conta sem login, ex.: responsável)
        self.senha_hash = make_password(senha)

    def conferir_senha(self, senha):
        return check_password(senha, self.senha_hash)


class Perfil(ComAtivoETimestamps):
    """Base dos perfis: cada um aponta para um único usuario."""

    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="+")

    class Meta(ComAtivoETimestamps.Meta):
        abstract = True

    def __str__(self):
        return self.usuario.nome_completo


class Estudante(Perfil):
    id_estudante = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="estudante")
    data_nascimento = models.DateField(null=True, blank=True)
    telefone = models.CharField(max_length=30, null=True, blank=True)
    instituicao_ensino = models.CharField(max_length=160, null=True, blank=True)
    turma = models.CharField(max_length=80, null=True, blank=True)

    class Meta(Perfil.Meta):
        db_table = "estudante"


class Professor(Perfil):
    id_professor = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="professor")
    telefone = models.CharField(max_length=30, null=True, blank=True)
    instituicao_ensino = models.CharField(max_length=160, null=True, blank=True)
    cargo = models.CharField(max_length=120, null=True, blank=True)

    class Meta(Perfil.Meta):
        db_table = "professor"


class PsicologoEscolar(Perfil):
    id_psicologo_escolar = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="psicologo_escolar")
    telefone = models.CharField(max_length=30, null=True, blank=True)
    registro_profissional = models.CharField(max_length=40)
    estado_registro = models.CharField(max_length=2)  # UF, CHECK ^[A-Z]{2}$
    instituicao_ensino = models.CharField(max_length=160, null=True, blank=True)

    class Meta(Perfil.Meta):
        db_table = "psicologo_escolar"


class PsicologoClinico(Perfil):
    id_psicologo_clinico = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="psicologo_clinico")
    telefone = models.CharField(max_length=30, null=True, blank=True)
    registro_profissional = models.CharField(max_length=40)
    estado_registro = models.CharField(max_length=2)  # UF, CHECK ^[A-Z]{2}$

    class Meta(Perfil.Meta):
        db_table = "psicologo_clinico"


class Responsavel(Perfil):
    """
    PENDENTE V2: a decisão do projeto é que o responsável seja só um contato,
    sem login, mas a V1 ainda exige id_usuario. Até a migração corretiva,
    o backend cria o usuario com senha inutilizável.
    """

    id_responsavel = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="responsavel")
    telefone = models.CharField(max_length=30, null=True, blank=True)

    class Meta(Perfil.Meta):
        db_table = "responsavel"


class Administrador(Perfil):
    id_administrador = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario",
                                   related_name="administrador")

    class Meta(Perfil.Meta):
        db_table = "administrador"


# ---------------------------------------------------------------- vínculos

class Vinculo(TabelaDoFlyway):
    """Tabelas associativas: PK composta, `ativo` e `criado_em`."""

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        abstract = True


class ProfessorEstudante(Vinculo):
    pk = models.CompositePrimaryKey("professor", "estudante")
    professor = models.ForeignKey(Professor, models.RESTRICT, db_column="id_professor",
                                  related_name="vinculos")
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="vinculos_professor")

    class Meta(Vinculo.Meta):
        db_table = "professor_estudante"


class PsicologoEscolarEstudante(Vinculo):
    pk = models.CompositePrimaryKey("psicologo_escolar", "estudante")
    psicologo_escolar = models.ForeignKey(PsicologoEscolar, models.RESTRICT,
                                          db_column="id_psicologo_escolar", related_name="vinculos")
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="vinculos_psicologo_escolar")

    class Meta(Vinculo.Meta):
        db_table = "psicologo_escolar_estudante"


class PsicologoClinicoEstudante(Vinculo):
    pk = models.CompositePrimaryKey("psicologo_clinico", "estudante")
    psicologo_clinico = models.ForeignKey(PsicologoClinico, models.RESTRICT,
                                          db_column="id_psicologo_clinico", related_name="vinculos")
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="vinculos_psicologo_clinico")

    class Meta(Vinculo.Meta):
        db_table = "psicologo_clinico_estudante"


class EstudanteResponsavel(Vinculo):
    pk = models.CompositePrimaryKey("estudante", "responsavel")
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante",
                                  related_name="vinculos_responsavel")
    responsavel = models.ForeignKey(Responsavel, models.RESTRICT, db_column="id_responsavel",
                                    related_name="vinculos")
    grau_parentesco = models.CharField(max_length=60, null=True, blank=True)

    class Meta(Vinculo.Meta):
        db_table = "estudante_responsavel"


class CodigoCadastro(TabelaDoFlyway):
    id_codigo_cadastro = models.BigAutoField(primary_key=True)
    codigo_hash = models.CharField(max_length=64, unique=True)
    sufixo = models.CharField(max_length=3)
    perfil = models.CharField(max_length=20)
    administrador = models.ForeignKey(Administrador, models.RESTRICT, db_column="id_administrador")
    turma = models.CharField(max_length=80, null=True, blank=True)
    instituicao_ensino = models.CharField(max_length=160, null=True, blank=True)
    usos_maximos = models.IntegerField(default=1)
    usos = models.IntegerField(default=0)
    expira_em = models.DateTimeField()
    revogado_em = models.DateTimeField(null=True)
    criado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "codigo_cadastro"


class UsoCodigoCadastro(TabelaDoFlyway):
    pk = models.CompositePrimaryKey("codigo_cadastro", "usuario")
    codigo_cadastro = models.ForeignKey(CodigoCadastro, models.RESTRICT, db_column="id_codigo_cadastro",
                                        related_name="utilizacoes")
    usuario = models.OneToOneField(Usuario, models.RESTRICT, db_column="id_usuario")
    usado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "uso_codigo_cadastro"


class CodigoVinculo(TabelaDoFlyway):
    class Status(models.TextChoices):
        ABERTO = "ABERTO"
        AGUARDANDO_ESTUDANTE = "AGUARDANDO_ESTUDANTE"
        ACEITO = "ACEITO"
        RECUSADO = "RECUSADO"
        REVOGADO = "REVOGADO"

    id_codigo_vinculo = models.BigAutoField(primary_key=True)
    codigo_hash = models.CharField(max_length=64, unique=True)
    estudante = models.ForeignKey(Estudante, models.RESTRICT, db_column="id_estudante")
    expira_em = models.DateTimeField()
    revogado_em = models.DateTimeField(null=True)
    professor = models.ForeignKey(Professor, models.RESTRICT, db_column="id_professor", null=True)
    psicologo_escolar = models.ForeignKey(PsicologoEscolar, models.RESTRICT,
                                         db_column="id_psicologo_escolar", null=True)
    resgatado_em = models.DateTimeField(null=True)
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.ABERTO)
    respondido_em = models.DateTimeField(null=True)
    criado_em = models.DateTimeField(default=timezone.now)

    class Meta(TabelaDoFlyway.Meta):
        db_table = "codigo_vinculo"
