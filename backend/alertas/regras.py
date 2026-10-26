"""
Destinatários dos alertas (RN12, RN13; doc. do banco item 7.5):
  nível 1 -> sem alerta
  nível 2 -> professores vinculados
  nível 3 -> professores e psicólogos escolares vinculados

O psicólogo clínico não pode ser destinatário na V1 (CHECK
ck_destinatario_alerta_tipo); ele consulta os alertas dos estudantes
vinculados pela listagem (RF15).
"""
from contas.models import Professor, PsicologoEscolar

from .models import DestinatarioAlerta

NIVEIS_DE_ALERTA = (2, 3)

AJUDA_IMEDIATA = ("O MKpause não é um serviço de emergência. Se você estiver em perigo agora, "
                  "procure um adulto por perto ou ligue 192 (SAMU) ou 188 (CVV).")


def destinatarios_para(estudante, nivel):
    """Lista de (usuario, tipo_destinatario), sem repetir usuário."""
    escolhidos = {}
    professores = Professor.objects.filter(
        ativo=True, usuario__ativo=True, vinculos__estudante=estudante, vinculos__ativo=True)
    for prof in professores.select_related("usuario"):
        escolhidos.setdefault(prof.usuario_id, (prof.usuario, DestinatarioAlerta.Tipo.PROFESSOR))
    if nivel == 3:
        escolares = PsicologoEscolar.objects.filter(
            ativo=True, usuario__ativo=True, vinculos__estudante=estudante, vinculos__ativo=True)
        for psi in escolares.select_related("usuario"):
            escolhidos.setdefault(psi.usuario_id, (psi.usuario, DestinatarioAlerta.Tipo.PSICOLOGO_ESCOLAR))
    return list(escolhidos.values())


def mensagem_ao_estudante(nivel):
    if nivel == 2:
        return "Seu aviso foi enviado. Você pode fazer sua pausa."
    return "Seu pedido foi enviado. Você não precisa explicar nada agora. " + AJUDA_IMEDIATA
