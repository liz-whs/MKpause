
import asyncio
import array
import math
import os
import random
import sys
import pygame

try:
    from pygame import gfxdraw
except ImportError:
    gfxdraw = None

pygame.mixer.pre_init(22050, -16, 1, 512)
pygame.init()

def modo_computador():
    # No site do MKpause, a tela do jogo no computador abre o
    # jogo com "?modo=computador": ai o layout e deitado
    # (paisagem). No celular, e rodando "python main.py",
    # o layout continua o original, em pe.
    if sys.platform != "emscripten":
        return False

    try:
        import platform as plataforma
        return "modo=computador" in str(
            plataforma.window.location.search
        )
    except Exception:
        return False


MODO_COMPUTADOR = modo_computador()

LARGURA = 1200 if MODO_COMPUTADOR else 480
ALTURA = 720

# Resolucao de desenho. A logica do jogo (posicoes, toques,
# velocidades) fica em LARGURA x ALTURA; so o desenho e
# multiplicado por ESCALA. No navegador o canvas e ampliado
# para caber na tela, entao desenhar em escala maior evita o
# aspecto pixelado. Fora do navegador fica 1x para a janela
# caber na tela.
if sys.platform != "emscripten":
    ESCALA = 1
elif MODO_COMPUTADOR:
    ESCALA = 1.5
else:
    ESCALA = 2


def px(valor):
    # Converte uma medida da logica para pixels da tela.
    return round(valor * ESCALA)


def ponto(posicao):
    return (px(posicao[0]), px(posicao[1]))


def retangulo(rect):
    rect = pygame.Rect(rect)
    return pygame.Rect(
        px(rect.x),
        px(rect.y),
        px(rect.width),
        px(rect.height)
    )


def para_logica(posicao):
    # Converte um ponto da tela (mouse) para a logica do jogo.
    return (
        int(posicao[0] / ESCALA),
        int(posicao[1] / ESCALA)
    )


tela = pygame.display.set_mode((px(LARGURA), px(ALTURA)))
pygame.display.set_caption("PIANOPAUSE | MKPAUSE")
relogio = pygame.time.Clock()

LAVENDER = (204, 195, 209)
LEAF = (193, 188, 119)
GRASS = (141, 139, 76)
JUNGLE = (101, 97, 63)
SKY = (175, 184, 205)
CACAO = (89, 65, 49)
CACAO_HOVER = (157, 125, 99)
PEONY = (247, 221, 213)
ROSE = (216, 164, 175)
BRANCO = (255, 250, 247)

CORES_NOTAS = [LAVENDER, LEAF, SKY, ROSE]

# Mesmas fontes do site do MKpause: Fraunces nos titulos e
# Lexend nos textos e botoes (arquivos em fontes/, licenca OFL).
PASTA_FONTES = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "fontes"
)


def carregar_fonte(arquivo, tamanho):
    try:
        return pygame.font.Font(
            os.path.join(PASTA_FONTES, arquivo),
            px(tamanho)
        )
    except (FileNotFoundError, OSError, pygame.error):
        # Sem o arquivo, usa a fonte padrao do pygame.
        return pygame.font.Font(None, px(tamanho * 1.45))


fonte_titulo = carregar_fonte("Fraunces-SemiBold.ttf", 40)
fonte_grande = carregar_fonte("Fraunces-SemiBold.ttf", 32)
fonte_botao_grande = carregar_fonte("Lexend-SemiBold.ttf", 26)
fonte_media = carregar_fonte("Lexend-SemiBold.ttf", 19)
fonte_pequena = carregar_fonte("Lexend-SemiBold.ttf", 14)

DURACAO = 120
VOLUME_FIXO = 0.45

ritmo = "Lento"
estado = "inicio"

tempo = 0.0
tempo_spawn = 0.0
intervalo_spawn = 1.15
notas_tocadas = 0

indice_melodia = 0
indice_frase = 0

teclas = []
particulas = []

tempo_respiracao = 0.0
tempo_animacao_fundo = 0.0
opacidade_transicao = 0.0

# Posicoes de cada tela. "EM_PE" e o layout original (celular);
# "DEITADO" e o layout do computador, em duas colunas.
# O desenho e os cliques usam os mesmos valores.
EM_PE = {
    "inicio_icone": (240, 142),
    "inicio_titulo": (240, 225),
    "inicio_subtitulo": (240, 275),
    "inicio_linha": ((185, 318), (295, 318)),
    "inicio_ritmo": (240, 365),
    "botao_lento": (45, 400, 185, 65),
    "botao_moderado": (250, 400, 185, 65),
    "botao_comecar": (65, 520, 350, 70),
    "inicio_rodape": (240, 655),

    "tabuleiro": (40, 155, 400, 445),
    "jogo_titulo": (240, 27),
    "botao_pausar": (20, 53, 145, 48),
    "botao_encerrar_jogo": (315, 53, 145, 48),
    "jogo_tempo": (110, 125),
    "jogo_notas": (355, 125),
    "jogo_dica_1": (240, 636),
    "jogo_dica_2": (240, 668),

    "pausa_titulo": (240, 115),
    "pausa_centro": (240, 280),
    "pausa_texto": (240, 430),
    "botao_continuar": (85, 465, 310, 60),
    "botao_encerrar_pausa": (85, 540, 310, 60),

    "final_icone": (240, 155),
    "final_titulo": (240, 255),
    "final_texto_1": (240, 305),
    "final_texto_2": (240, 345),
    "final_caixa": (95, 390, 290, 65),
    "final_tempo": (240, 422),
    "botao_jogar_novamente": (65, 495, 350, 65),
    "botao_voltar": (65, 575, 350, 65),
}

def deslocar(valor, dx):
    # Move um ponto, um retangulo (x, y, w, h) ou uma linha
    # (dois pontos) dx pixels para a direita.
    if isinstance(valor[0], tuple):
        return tuple(deslocar(p, dx) for p in valor)
    return (valor[0] + dx, *valor[1:])


# No computador os elementos continuam um embaixo do outro,
# como no celular: a mesma coluna, centralizada na tela larga.
DEITADO = {
    nome: deslocar(valor, (1200 - 480) // 2)
    for nome, valor in EM_PE.items()
}

# Na partida, o tabuleiro fica mais largo (600 em vez de 400)
# e o resto acompanha as bordas dele, ainda em coluna.
DEITADO.update({
    "tabuleiro": (300, 155, 600, 445),
    "jogo_titulo": (600, 27),
    "botao_pausar": (280, 53, 145, 48),
    "botao_encerrar_jogo": (775, 53, 145, 48),
    "jogo_tempo": (370, 125),
    "jogo_notas": (830, 125),
    "jogo_dica_1": (600, 636),
    "jogo_dica_2": (600, 668),
})

L = DEITADO if MODO_COMPUTADOR else EM_PE

tabuleiro = pygame.Rect(L["tabuleiro"])
largura_coluna = tabuleiro.width // 4
altura_tecla = 90
LINHA_TOQUE = tabuleiro.bottom - 105

frequencias = [
    261.63,
    293.66,
    329.63,
    392.00
]

MELODIAS = [
    [
        (0, 1.0),
        (1, 1.0),
        (2, 1.0),
        (3, 2.0),
        (2, 1.0),
        (1, 1.0),
        (0, 2.0)
    ],
    [
        (2, 1.0),
        (3, 1.0),
        (2, 1.0),
        (1, 2.0),
        (0, 1.0),
        (1, 1.0),
        (2, 2.0)
    ],
    [
        (0, 1.0),
        (2, 1.0),
        (3, 2.0),
        (2, 1.0),
        (1, 1.0),
        (0, 2.0)
    ]
]


def criar_sons():
    resultado = []

    try:
        if not pygame.mixer.get_init():
            pygame.mixer.init(
                frequency=22050,
                size=-16,
                channels=1
            )

        taxa, formato, canais = pygame.mixer.get_init()

        if formato != -16:
            print("Formato de áudio inesperado:", formato)
            return []

        for frequencia in frequencias:
            amostras = array.array("h")
            duracao_som = 0.8
            total = int(taxa * duracao_som)

            for i in range(total):
                t = i / taxa

                ataque = min(1.0, t / 0.04)
                saida = max(0.0, 1.0 - t / duracao_som)
                envelope = ataque * saida ** 2

                onda = (
                    math.sin(2 * math.pi * frequencia * t)
                    + 0.12 * math.sin(
                        4 * math.pi * frequencia * t
                    )
                )

                valor = int(7000 * onda * envelope)
                valor = max(-32768, min(32767, valor))

                for _ in range(canais):
                    amostras.append(valor)

            som = pygame.mixer.Sound(
                buffer=amostras.tobytes()
            )

            som.set_volume(VOLUME_FIXO)
            resultado.append(som)

        print(
            f"Áudio iniciado: {len(resultado)} notas."
        )

    except (pygame.error, OSError) as erro:
        print("Erro ao iniciar áudio:", erro)
        return []

    return resultado


# Os sons sao gerados logo depois do primeiro quadro (em main),
# para a tela inicial aparecer antes: gerar as 4 notas leva
# quase 1 segundo no navegador.
sons = []

CENTRO_RESPIRACAO = L["pausa_centro"]
RAIO_EXTERNO = 100
RAIO_INTERNO = 70
ESCALA_MINIMA = 0.75
ESCALA_MAXIMA = 1.15

camada_transicao = pygame.Surface(
    (px(LARGURA), px(ALTURA))
)

camada_transicao.fill(PEONY)


def desenhar_circulo_fluido(
    superficie,
    cor,
    centro,
    raio,
    transparencia=255
):
    # O raio e float: a parte inteira vira o circulo
    # e a parte fracionaria vira uma borda semitransparente.
    # Assim o circulo cresce em subpixels, sem "degraus".
    x, y = centro
    raio_inteiro = int(raio)
    fracao = raio - raio_inteiro

    if gfxdraw is None:
        pygame.draw.circle(
            superficie,
            cor,
            centro,
            round(raio)
        )
        return

    gfxdraw.filled_circle(
        superficie,
        x,
        y,
        raio_inteiro,
        (*cor, transparencia)
    )

    if transparencia < 255:
        return

    gfxdraw.aacircle(
        superficie,
        x,
        y,
        raio_inteiro,
        cor
    )

    if fracao > 0.02:
        gfxdraw.aacircle(
            superficie,
            x,
            y,
            raio_inteiro + 1,
            (*cor, int(255 * fracao))
        )


def texto(
    mensagem,
    x,
    y,
    cor=CACAO,
    fonte=fonte_media,
    centralizado=True
):
    superficie = fonte.render(
        str(mensagem),
        True,
        cor
    )

    rect = superficie.get_rect()

    if centralizado:
        rect.center = ponto((x, y))
    else:
        rect.topleft = ponto((x, y))

    tela.blit(superficie, rect)


def desenhar_check(
    x,
    y,
    cor=CACAO,
    tamanho=1.0
):
    pontos = [
        ponto((int(x - 12 * tamanho), int(y))),
        ponto((int(x - 3 * tamanho), int(y + 9 * tamanho))),
        ponto((int(x + 15 * tamanho), int(y - 12 * tamanho)))
    ]

    pygame.draw.lines(
        tela,
        cor,
        False,
        pontos,
        px(max(2, int(4 * tamanho)))
    )


def desenhar_nota_musical(
    x,
    y,
    cor=CACAO
):
    pygame.draw.ellipse(
        tela,
        cor,
        retangulo((x - 14, y + 9, 15, 11))
    )

    pygame.draw.line(
        tela,
        cor,
        ponto((x, y + 14)),
        ponto((x, y - 17)),
        px(4)
    )

    pygame.draw.polygon(
        tela,
        cor,
        [
            ponto((x, y - 17)),
            ponto((x + 17, y - 12)),
            ponto((x + 17, y - 4)),
            ponto((x, y - 9))
        ]
    )


def botao(
    mensagem,
    x,
    y,
    largura,
    altura,
    cor,
    cor_texto=BRANCO,
    fonte=fonte_media,
    selecionado=False
):
    rect = pygame.Rect(
        x,
        y,
        largura,
        altura
    )

    mouse_x, mouse_y = para_logica(pygame.mouse.get_pos())
    hover = rect.collidepoint(mouse_x, mouse_y)

    if selecionado:
        cor_final = LEAF
        texto_final = CACAO

    elif hover and cor == CACAO:
        cor_final = CACAO_HOVER
        texto_final = cor_texto

    elif hover:
        cor_final = LEAF
        texto_final = CACAO

    else:
        cor_final = cor
        texto_final = cor_texto

    pygame.draw.rect(
        tela,
        cor_final,
        retangulo(rect),
        border_radius=px(18)
    )

    if selecionado:
        pygame.draw.rect(
            tela,
            JUNGLE,
            retangulo(rect),
            px(2),
            border_radius=px(18)
        )

    texto(
        mensagem,
        rect.centerx,
        rect.centery,
        texto_final,
        fonte
    )

    if selecionado:
        desenhar_check(
            rect.right - 22,
            rect.centery,
            JUNGLE,
            0.45
        )

    return rect


def criar_bolha(cor, raio, transparencia):
    # Pre-renderiza a bolha uma unica vez.
    # Antes era criada uma superficie do tamanho
    # da tela inteira a cada quadro.
    bolha = pygame.Surface(
        (px(raio) * 2, px(raio) * 2),
        pygame.SRCALPHA
    )

    pygame.draw.circle(
        bolha,
        (*cor, transparencia),
        (px(raio), px(raio)),
        px(raio)
    )

    return bolha


# (x, y, raio, cor, alpha, amplitude_x, amplitude_y,
#  velocidade, fase)
# Antes a amplitude era ~10 px e a velocidade ~0.2,
# o que dava menos de 3 px por segundo: as bolas
# pareciam paradas.
BOLHAS_INICIO = [
    (405, 95, 115, LAVENDER, 95, 34, 26, 0.55, 0),
    (55, 585, 95, SKY, 75, 30, 38, 0.45, 1.8),
    (435, 440, 55, LEAF, 65, 24, 32, 0.65, 3.2)
]

BOLHAS_FINAL = [
    (45, 115, 110, LAVENDER, 90, 32, 28, 0.5, 0),
    (430, 590, 115, SKY, 75, 36, 30, 0.42, 2)
]

if MODO_COMPUTADOR:
    # Mesmas bolhas, espalhadas pela tela larga.
    BOLHAS_INICIO = [
        (1110, 100, 115, LAVENDER, 95, 34, 26, 0.55, 0),
        (90, 610, 95, SKY, 75, 30, 38, 0.45, 1.8),
        (1140, 560, 55, LEAF, 65, 24, 32, 0.65, 3.2)
    ]

    BOLHAS_FINAL = [
        (80, 120, 110, LAVENDER, 90, 32, 28, 0.5, 0),
        (1130, 600, 115, SKY, 75, 36, 30, 0.42, 2)
    ]

superficies_bolhas = {}

for (
    _x, _y, _raio, _cor,
    _alpha, *_resto
) in BOLHAS_INICIO + BOLHAS_FINAL:
    superficies_bolhas[(_raio, _cor, _alpha)] = (
        criar_bolha(_cor, _raio, _alpha)
    )


def desenhar_bolhas(bolhas):
    t = tempo_animacao_fundo

    for (
        x, y, raio, cor, alpha,
        dx, dy, velocidade, fase
    ) in bolhas:
        novo_x = (
            x + math.sin(t * velocidade + fase) * dx
        )

        novo_y = (
            y + math.cos(t * velocidade * 0.8 + fase) * dy
        )

        tela.blit(
            superficies_bolhas[(raio, cor, alpha)],
            ponto((novo_x - raio, novo_y - raio))
        )


def desenhar_decoracao_inicio():
    desenhar_bolhas(BOLHAS_INICIO)


def desenhar_decoracao_final():
    desenhar_bolhas(BOLHAS_FINAL)


def mudar_estado(novo_estado):
    global estado
    global opacidade_transicao
    global tempo_respiracao

    if estado != novo_estado:
        estado = novo_estado
        opacidade_transicao = 125.0

        if novo_estado == "pausado":
            tempo_respiracao = 0.0


def criar_particulas(x, y, cor):
    for i in range(8):
        angulo = 2 * math.pi * i / 8
        velocidade = random.uniform(35, 65)

        particulas.append({
            "x": float(x),
            "y": float(y),
            "vx": math.cos(angulo) * velocidade,
            "vy": math.sin(angulo) * velocidade,
            "vida": 0.55,
            "vida_max": 0.55,
            "cor": cor
        })


def atualizar_particulas(dt):
    for particula in particulas[:]:
        particula["x"] += (
            particula["vx"] * dt
        )

        particula["y"] += (
            particula["vy"] * dt
        )

        particula["vida"] -= dt

        if particula["vida"] <= 0:
            particulas.remove(particula)


def desenhar_particulas():
    for particula in particulas:
        proporcao = max(
            0.0,
            particula["vida"]
            / particula["vida_max"]
        )

        raio = max(
            1,
            int(5 * proporcao)
        )

        pygame.draw.circle(
            tela,
            particula["cor"],
            ponto((particula["x"], particula["y"])),
            px(raio)
        )


def obter_proxima_nota():
    global indice_melodia
    global indice_frase

    frase = MELODIAS[
        indice_frase % len(MELODIAS)
    ]

    nota, duracao = frase[indice_melodia]
    indice_melodia += 1

    if indice_melodia >= len(frase):
        indice_melodia = 0

        indice_frase = (
            indice_frase + 1
        ) % len(MELODIAS)

    return nota, duracao


def criar_tecla():
    nota, duracao = obter_proxima_nota()

    teclas.append({
        "coluna": nota,
        "y": -altura_tecla,
        "nota": nota
    })

    return duracao


def iniciar_jogo():
    global tempo
    global tempo_spawn
    global intervalo_spawn
    global notas_tocadas
    global indice_melodia
    global indice_frase

    tempo = 0.0
    tempo_spawn = 0.0
    notas_tocadas = 0

    indice_melodia = 0
    indice_frase = 0

    teclas.clear()
    particulas.clear()

    duracao = criar_tecla()

    tempo_base = (
        1.15 if ritmo == "Lento"
        else 0.85
    )

    intervalo_spawn = tempo_base * duracao

    mudar_estado("jogando")


def desenhar_inicio():
    tela.fill(PEONY)
    desenhar_decoracao_inicio()

    icone_x, icone_y = L["inicio_icone"]

    pygame.draw.circle(
        tela,
        LAVENDER,
        ponto((icone_x, icone_y)),
        px(43)
    )

    desenhar_nota_musical(
        icone_x,
        icone_y - 2,
        CACAO
    )

    texto(
        "PIANOPAUSE",
        *L["inicio_titulo"],
        CACAO,
        fonte_titulo
    )

    texto(
        "Um momento para desacelerar.",
        *L["inicio_subtitulo"],
        CACAO,
        fonte_pequena
    )

    inicio_linha, fim_linha = L["inicio_linha"]

    pygame.draw.line(
        tela,
        LAVENDER,
        ponto(inicio_linha),
        ponto(fim_linha),
        px(2)
    )

    texto(
        "Escolha seu ritmo",
        *L["inicio_ritmo"],
        CACAO,
        fonte_media
    )

    botao(
        "Lento",
        *L["botao_lento"],
        JUNGLE,
        BRANCO,
        selecionado=(ritmo == "Lento")
    )

    botao(
        "Moderado",
        *L["botao_moderado"],
        JUNGLE,
        BRANCO,
        selecionado=(ritmo == "Moderado")
    )

    botao(
        "Começar",
        *L["botao_comecar"],
        CACAO,
        BRANCO,
        fonte_botao_grande
    )

    texto(
        "Sem pressa. Sem competição.",
        *L["inicio_rodape"],
        CACAO,
        fonte_pequena
    )


def desenhar_jogo():
    tela.fill(PEONY)

    texto(
        "PIANOPAUSE | Nível 1",
        *L["jogo_titulo"]
    )

    botao(
        "Pausar",
        *L["botao_pausar"],
        JUNGLE,
        BRANCO,
        fonte_pequena
    )

    botao(
        "Encerrar",
        *L["botao_encerrar_jogo"],
        CACAO,
        BRANCO,
        fonte_pequena
    )

    tempo_decorrido = int(tempo)
    minutos = tempo_decorrido // 60
    segundos = tempo_decorrido % 60

    texto(
        f"Tempo: {minutos:02d}:{segundos:02d}",
        *L["jogo_tempo"],
        CACAO,
        fonte_pequena
    )

    texto(
        f"Notas: {notas_tocadas}",
        *L["jogo_notas"],
        CACAO,
        fonte_pequena
    )

    pygame.draw.rect(
        tela,
        BRANCO,
        retangulo(tabuleiro),
        border_radius=px(12)
    )

    for i in range(1, 4):
        x = (
            tabuleiro.x
            + i * largura_coluna
        )

        pygame.draw.line(
            tela,
            LAVENDER,
            ponto((x, tabuleiro.top)),
            ponto((x, tabuleiro.bottom)),
            px(2)
        )

    clip_anterior = tela.get_clip()
    tela.set_clip(retangulo(tabuleiro))

    for tecla in teclas:
        x = (
            tabuleiro.x
            + tecla["coluna"] * largura_coluna
            + 5
        )

        y = (
            tabuleiro.y
            + int(tecla["y"])
        )

        rect = pygame.Rect(
            x,
            y,
            largura_coluna - 10,
            altura_tecla
        )

        pygame.draw.rect(
            tela,
            CORES_NOTAS[tecla["coluna"]],
            retangulo(rect),
            border_radius=px(12)
        )

        pygame.draw.rect(
            tela,
            BRANCO,
            retangulo(rect),
            px(2),
            border_radius=px(12)
        )

    pygame.draw.line(
        tela,
        GRASS,
        ponto((tabuleiro.left, LINHA_TOQUE)),
        ponto((tabuleiro.right, LINHA_TOQUE)),
        px(3)
    )

    desenhar_particulas()
    tela.set_clip(clip_anterior)

    pygame.draw.rect(
        tela,
        GRASS,
        retangulo(tabuleiro),
        px(2),
        border_radius=px(12)
    )

    texto(
        "Toque nas teclas no seu próprio ritmo.",
        *L["jogo_dica_1"],
        CACAO,
        fonte_pequena
    )

    texto(
        "Você pode pausar quando quiser.",
        *L["jogo_dica_2"],
        CACAO,
        fonte_pequena
    )


def desenhar_pausa():
    tela.fill(PEONY)

    texto(
        "Hora de respirar",
        *L["pausa_titulo"],
        CACAO,
        fonte_grande
    )

    fase = tempo_respiracao % 8.0

    if fase < 4.0:
        instrucao = "Inspire"
        progresso = fase / 4.0

        suavizado = (
            1 - math.cos(
                math.pi * progresso
            )
        ) / 2

    else:
        instrucao = "Expire"
        progresso = (
            fase - 4.0
        ) / 4.0

        suavizado = (
            1 + math.cos(
                math.pi * progresso
            )
        ) / 2

    # Antes: smoothscale de uma imagem a cada quadro.
    # O tamanho so mudava de pixel em pixel (com "pulos"
    # do centro entre tamanhos par/impar) e o redimensionamento
    # era pesado no navegador. Agora os circulos sao
    # desenhados direto com raio fracionario.
    escala = (
        ESCALA_MINIMA
        + (ESCALA_MAXIMA - ESCALA_MINIMA) * suavizado
    )

    # Halo: a transparencia muda de forma continua,
    # o que reforca a sensacao de fluidez.
    desenhar_circulo_fluido(
        tela,
        LAVENDER,
        ponto(CENTRO_RESPIRACAO),
        (RAIO_EXTERNO * escala + 6 + 10 * suavizado) * ESCALA,
        int(45 + 55 * suavizado)
    )

    desenhar_circulo_fluido(
        tela,
        LAVENDER,
        ponto(CENTRO_RESPIRACAO),
        RAIO_EXTERNO * escala * ESCALA
    )

    desenhar_circulo_fluido(
        tela,
        SKY,
        ponto(CENTRO_RESPIRACAO),
        RAIO_INTERNO * escala * ESCALA
    )

    texto(
        instrucao,
        CENTRO_RESPIRACAO[0],
        CENTRO_RESPIRACAO[1],
        CACAO,
        fonte_media
    )

    texto(
        "Acompanhe a respiração guiada até se sentir melhor.",
        *L["pausa_texto"],
        CACAO,
        fonte_pequena
    )

    botao(
        "Continuar",
        *L["botao_continuar"],
        JUNGLE
    )

    botao(
        "Encerrar",
        *L["botao_encerrar_pausa"],
        CACAO
    )


def desenhar_final():
    tela.fill(PEONY)
    desenhar_decoracao_final()

    icone_x, icone_y = L["final_icone"]

    pygame.draw.circle(
        tela,
        LEAF,
        ponto((icone_x, icone_y)),
        px(49)
    )

    desenhar_check(
        icone_x,
        icone_y - 2,
        CACAO,
        1.5
    )

    texto(
        "Muito bem!",
        *L["final_titulo"],
        CACAO,
        fonte_grande
    )

    texto(
        "Você dedicou um momento a si.",
        *L["final_texto_1"],
        CACAO,
        fonte_pequena
    )

    texto(
        "Como você está se sentindo agora?",
        *L["final_texto_2"],
        CACAO,
        fonte_pequena
    )

    tempo_final = int(tempo)
    minutos = tempo_final // 60
    segundos = tempo_final % 60

    pygame.draw.rect(
        tela,
        BRANCO,
        retangulo(L["final_caixa"]),
        border_radius=px(18)
    )

    texto(
        f"Tempo: {minutos:02d}:{segundos:02d}",
        *L["final_tempo"],
        CACAO,
        fonte_media
    )

    botao(
        "Jogar novamente",
        *L["botao_jogar_novamente"],
        JUNGLE
    )

    botao(
        "Voltar ao início",
        *L["botao_voltar"],
        CACAO
    )


def tocar_tecla(x, y):
    global notas_tocadas

    if not tabuleiro.collidepoint(x, y):
        return

    for tecla in reversed(teclas):
        px = (
            tabuleiro.x
            + tecla["coluna"] * largura_coluna
            + 5
        )

        py = (
            tabuleiro.y
            + int(tecla["y"])
        )

        rect = pygame.Rect(
            px,
            py,
            largura_coluna - 10,
            altura_tecla
        )

        if rect.collidepoint(x, y):
            if sons:
                sons[tecla["nota"]].play()

            criar_particulas(
                rect.centerx,
                rect.centery,
                CORES_NOTAS[tecla["coluna"]]
            )

            teclas.remove(tecla)
            notas_tocadas += 1
            break


def dentro(nome, x, y):
    # O clique usa o mesmo retangulo do desenho (bordas incluidas).
    rect = pygame.Rect(L[nome])
    return (
        rect.left <= x <= rect.right
        and rect.top <= y <= rect.bottom
    )


def clique(x, y):
    global ritmo

    if estado == "inicio":
        if dentro("botao_lento", x, y):
            ritmo = "Lento"

        elif dentro("botao_moderado", x, y):
            ritmo = "Moderado"

        elif dentro("botao_comecar", x, y):
            iniciar_jogo()

    elif estado == "jogando":
        if dentro("botao_pausar", x, y):
            mudar_estado("pausado")

        elif dentro("botao_encerrar_jogo", x, y):
            mudar_estado("final")

        else:
            tocar_tecla(x, y)

    elif estado == "pausado":
        if dentro("botao_continuar", x, y):
            mudar_estado("jogando")

        elif dentro("botao_encerrar_pausa", x, y):
            mudar_estado("final")

    elif estado == "final":
        if dentro("botao_jogar_novamente", x, y):
            iniciar_jogo()

        elif dentro("botao_voltar", x, y):
            mudar_estado("inicio")


async def main():
    global tempo
    global tempo_spawn
    global intervalo_spawn
    global tempo_respiracao
    global tempo_animacao_fundo
    global opacidade_transicao

    executando = True
    sons_pendentes = True

    while executando:
        dt = min(
            relogio.tick(60) / 1000,
            0.05
        )

        tempo_animacao_fundo += dt

        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                executando = False

            elif evento.type == pygame.MOUSEBUTTONDOWN:
                if evento.button == 1:
                    clique(*para_logica(evento.pos))

            elif evento.type == pygame.FINGERDOWN:
                clique(
                    int(evento.x * LARGURA),
                    int(evento.y * ALTURA)
                )

            elif evento.type == pygame.KEYDOWN:
                if evento.key == pygame.K_ESCAPE:
                    if estado == "jogando":
                        mudar_estado("pausado")

                    elif estado == "pausado":
                        mudar_estado("jogando")

        if estado == "jogando":
            tempo += dt
            tempo_spawn += dt

            velocidade = (
                105 if ritmo == "Lento"
                else 155
            )

            tempo_base = (
                1.15 if ritmo == "Lento"
                else 0.85
            )

            while tempo_spawn >= intervalo_spawn:
                tempo_spawn -= intervalo_spawn

                duracao = criar_tecla()
                intervalo_spawn = (
                    tempo_base * duracao
                )

            for tecla in teclas[:]:
                tecla["y"] += velocidade * dt

                posicao_inferior = (
                    tabuleiro.y
                    + tecla["y"]
                    + altura_tecla
                )

                if posicao_inferior >= LINHA_TOQUE:
                    centro_x = (
                        tabuleiro.x
                        + tecla["coluna"]
                        * largura_coluna
                        + largura_coluna // 2
                    )

                    criar_particulas(
                        centro_x,
                        LINHA_TOQUE,
                        CORES_NOTAS[
                            tecla["coluna"]
                        ]
                    )

                    teclas.remove(tecla)

            atualizar_particulas(dt)

            if tempo >= DURACAO:
                tempo = DURACAO
                mudar_estado("final")

        elif estado == "pausado":
            tempo_respiracao += dt

        if estado == "inicio":
            desenhar_inicio()

        elif estado == "jogando":
            desenhar_jogo()

        elif estado == "pausado":
            desenhar_pausa()

        elif estado == "final":
            desenhar_final()

        if opacidade_transicao > 0:
            camada_transicao.set_alpha(
                int(opacidade_transicao)
            )

            tela.blit(camada_transicao, (0, 0))

            opacidade_transicao = max(
                0.0,
                opacidade_transicao - 350 * dt
            )

        pygame.display.flip()
        await asyncio.sleep(0)

        if sons_pendentes:
            sons_pendentes = False
            sons.extend(criar_sons())

    pygame.quit()


asyncio.run(main())
