"""
Regras da sessão de autorregulação (RN06–RN10, RN35).

A avaliação do humor é apoio ao fluxo, não diagnóstico (RN35). O critério
abaixo é provisório: a equipe pode mudá-lo aqui sem mexer nas views.
"""

HUMOR_MIN, HUMOR_MAX = 1, 5  # CHECK ck_registro_humor_estado


def avaliar_humor(estado):
    """Humor (1 = muito mal ... 5 = muito bem) -> nível de suporte sugerido (1 a 3)."""
    if estado <= 1:
        return 3
    if estado == 2:
        return 2
    return 1


MENSAGEM_POR_NIVEL = {
    1: "Que tal fazer uma atividade no seu ritmo?",
    2: "Se quiser, você pode avisar seu professor que vai sair para fazer uma pausa.",
    3: "Se quiser, você pode pedir ajuda. Avisamos seu professor e a psicóloga da escola.",
}
