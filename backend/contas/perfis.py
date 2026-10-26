"""Descobre o perfil de um usuario a partir das tabelas de perfil."""
from .models import Administrador, Estudante, Professor, PsicologoClinico, PsicologoEscolar

ESTUDANTE = "estudante"
PROFESSOR = "professor"
PSICOLOGO_ESCOLAR = "psicologo_escolar"
PSICOLOGO_CLINICO = "psicologo_clinico"
ADMINISTRADOR = "administrador"

PROFISSIONAIS = {PROFESSOR, PSICOLOGO_ESCOLAR, PSICOLOGO_CLINICO}

# Ordem de prioridade caso o mesmo usuario apareça em mais de uma tabela
# (a V1 não impede isso; o projeto prevê perfil exclusivo).
MODELOS_DE_PERFIL = [
    (ADMINISTRADOR, Administrador),
    (PSICOLOGO_CLINICO, PsicologoClinico),
    (PSICOLOGO_ESCOLAR, PsicologoEscolar),
    (PROFESSOR, Professor),
    (ESTUDANTE, Estudante),
]


def carregar_perfil(usuario):
    """
    Preenche usuario.perfil (nome) e usuario.dados_perfil (instância).
    Responsável não tem login, então não entra aqui. Retorna False se o
    usuario não tem nenhum perfil ativo.
    """
    for nome, modelo in MODELOS_DE_PERFIL:
        dados = modelo.objects.filter(usuario=usuario, ativo=True).first()
        if dados:
            usuario.perfil, usuario.dados_perfil = nome, dados
            return True
    usuario.perfil, usuario.dados_perfil = None, None
    return False
