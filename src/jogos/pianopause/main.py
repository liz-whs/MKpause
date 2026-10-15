
import asyncio
import array
import math
import random
import pygame

try:
    from pygame import gfxdraw
except ImportError:
    gfxdraw = None

pygame.mixer.pre_init(22050, -16, 1, 512)
pygame.init()

LARGURA = 480
ALTURA = 720

tela = pygame.display.set_mode((LARGURA, ALTURA))
pygame.display.set_caption("PIANOPAUSE | MKPAUSE")
relogio = pygame.time.Clock()

LAVENDER = (204, 195, 209)
LEAF = (193, 188, 119)
GRASS = (141, 139, 76)
JUNGLE = (101, 97, 63)
SKY = (175, 184, 205)
CACAO = (107, 64, 59)
PEONY = (247, 221, 213)
ROSE = (216, 164, 175)
BRANCO = (255, 250, 247)

CORES_NOTAS = [LAVENDER, LEAF, SKY, ROSE]

fonte_titulo = pygame.font.Font(None, 58)
fonte_grande = pygame.font.Font(None, 48)
fonte_media = pygame.font.Font(None, 31)
fonte_pequena = pygame.font.Font(None, 23)

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

tabuleiro = pygame.Rect(40, 155, 400, 445)
largura_coluna = 100
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
            print("Formato de audio inesperado:", formato)
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
            f"Audio iniciado: {len(resultado)} notas."
        )

    except (pygame.error, OSError) as erro:
        print("Erro ao iniciar audio:", erro)
        return []

    return resultado


sons = criar_sons()

CENTRO_RESPIRACAO = (240, 280)
RAIO_EXTERNO = 100
RAIO_INTERNO = 70
ESCALA_MINIMA = 0.75
ESCALA_MAXIMA = 1.15

camada_transicao = pygame.Surface(
    (LARGURA, ALTURA)
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
        rect.center = (x, y)
    else:
        rect.topleft = (x, y)

    tela.blit(superficie, rect)


def desenhar_check(
    x,
    y,
    cor=CACAO,
    tamanho=1.0
):
    pontos = [
        (
            int(x - 12 * tamanho),
            int(y)
        ),
        (
            int(x - 3 * tamanho),
            int(y + 9 * tamanho)
        ),
        (
            int(x + 15 * tamanho),
            int(y - 12 * tamanho)
        )
    ]

    pygame.draw.lines(
        tela,
        cor,
        False,
        pontos,
        max(2, int(4 * tamanho))
    )


def desenhar_nota_musical(
    x,
    y,
    cor=CACAO
):
    pygame.draw.ellipse(
        tela,
        cor,
        (x - 14, y + 9, 15, 11)
    )

    pygame.draw.line(
        tela,
        cor,
        (x, y + 14),
        (x, y - 17),
        4
    )

    pygame.draw.polygon(
        tela,
        cor,
        [
            (x, y - 17),
            (x + 17, y - 12),
            (x + 17, y - 4),
            (x, y - 9)
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

    mouse_x, mouse_y = pygame.mouse.get_pos()
    hover = rect.collidepoint(mouse_x, mouse_y)

    if selecionado:
        cor_final = LEAF
        texto_final = CACAO

    elif hover:
        cor_final = LEAF
        texto_final = CACAO

    else:
        cor_final = cor
        texto_final = cor_texto

    pygame.draw.rect(
        tela,
        cor_final,
        rect,
        border_radius=18
    )

    if selecionado:
        pygame.draw.rect(
            tela,
            JUNGLE,
            rect,
            2,
            border_radius=18
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
        (raio * 2, raio * 2),
        pygame.SRCALPHA
    )

    pygame.draw.circle(
        bolha,
        (*cor, transparencia),
        (raio, raio),
        raio
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
            (
                round(novo_x - raio),
                round(novo_y - raio)
            )
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
            (
                int(particula["x"]),
                int(particula["y"])
            ),
            raio
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

    pygame.draw.circle(
        tela,
        LAVENDER,
        (240, 142),
        43
    )

    desenhar_nota_musical(
        240,
        140,
        CACAO
    )

    texto(
        "PIANOPAUSE",
        240,
        225,
        CACAO,
        fonte_titulo
    )

    texto(
        "Um momento para desacelerar.",
        240,
        275,
        CACAO,
        fonte_pequena
    )

    pygame.draw.line(
        tela,
        LAVENDER,
        (185, 318),
        (295, 318),
        2
    )

    texto(
        "Escolha seu ritmo",
        240,
        365,
        CACAO,
        fonte_media
    )

    botao(
        "Lento",
        45, 400, 185, 65,
        JUNGLE,
        BRANCO,
        selecionado=(ritmo == "Lento")
    )

    botao(
        "Moderado",
        250, 400, 185, 65,
        JUNGLE,
        BRANCO,
        selecionado=(ritmo == "Moderado")
    )

    botao(
        "Comecar",
        65, 520, 350, 70,
        CACAO,
        BRANCO,
        fonte_grande
    )

    texto(
        "Sem pressa. Sem competicao.",
        240,
        655,
        CACAO,
        fonte_pequena
    )


def desenhar_jogo():
    tela.fill(PEONY)

    texto(
        "PIANOPAUSE | Nivel 1",
        240,
        27
    )

    botao(
        "Pausar",
        20, 53, 145, 48,
        JUNGLE,
        BRANCO,
        fonte_pequena
    )

    botao(
        "Encerrar",
        315, 53, 145, 48,
        CACAO,
        BRANCO,
        fonte_pequena
    )

    tempo_decorrido = int(tempo)
    minutos = tempo_decorrido // 60
    segundos = tempo_decorrido % 60

    texto(
        f"Tempo: {minutos:02d}:{segundos:02d}",
        110,
        125,
        CACAO,
        fonte_pequena
    )

    texto(
        f"Notas: {notas_tocadas}",
        355,
        125,
        CACAO,
        fonte_pequena
    )

    pygame.draw.rect(
        tela,
        BRANCO,
        tabuleiro,
        border_radius=12
    )

    for i in range(1, 4):
        x = (
            tabuleiro.x
            + i * largura_coluna
        )

        pygame.draw.line(
            tela,
            LAVENDER,
            (x, tabuleiro.top),
            (x, tabuleiro.bottom),
            2
        )

    clip_anterior = tela.get_clip()
    tela.set_clip(tabuleiro)

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
            rect,
            border_radius=12
        )

        pygame.draw.rect(
            tela,
            BRANCO,
            rect,
            2,
            border_radius=12
        )

    pygame.draw.line(
        tela,
        GRASS,
        (tabuleiro.left, LINHA_TOQUE),
        (tabuleiro.right, LINHA_TOQUE),
        3
    )

    desenhar_particulas()
    tela.set_clip(clip_anterior)

    pygame.draw.rect(
        tela,
        GRASS,
        tabuleiro,
        2,
        border_radius=12
    )

    texto(
        "Toque nas teclas no seu proprio ritmo.",
        240,
        636,
        CACAO,
        fonte_pequena
    )

    texto(
        "Voce pode pausar quando quiser.",
        240,
        668,
        CACAO,
        fonte_pequena
    )


def desenhar_pausa():
    tela.fill(PEONY)

    texto(
        "Hora de respirar",
        240,
        115,
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
        CENTRO_RESPIRACAO,
        RAIO_EXTERNO * escala + 6 + 10 * suavizado,
        int(45 + 55 * suavizado)
    )

    desenhar_circulo_fluido(
        tela,
        LAVENDER,
        CENTRO_RESPIRACAO,
        RAIO_EXTERNO * escala
    )

    desenhar_circulo_fluido(
        tela,
        SKY,
        CENTRO_RESPIRACAO,
        RAIO_INTERNO * escala
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
        240,
        430,
        CACAO,
        fonte_pequena
    )

    botao(
        "Continuar",
        85, 465, 310, 60,
        JUNGLE
    )

    botao(
        "Encerrar",
        85, 540, 310, 60,
        CACAO
    )


def desenhar_final():
    tela.fill(PEONY)
    desenhar_decoracao_final()

    pygame.draw.circle(
        tela,
        LEAF,
        (240, 155),
        49
    )

    desenhar_check(
        240,
        153,
        CACAO,
        1.5
    )

    texto(
        "Muito bem!",
        240,
        255,
        CACAO,
        fonte_grande
    )

    texto(
        "Voce dedicou um momento a si.",
        240,
        305,
        CACAO,
        fonte_pequena
    )

    texto(
        "Como voce esta se sentindo agora?",
        240,
        345,
        CACAO,
        fonte_pequena
    )

    tempo_final = int(tempo)
    minutos = tempo_final // 60
    segundos = tempo_final % 60

    pygame.draw.rect(
        tela,
        BRANCO,
        pygame.Rect(
            95, 390, 290, 65
        ),
        border_radius=18
    )

    texto(
        f"Tempo: {minutos:02d}:{segundos:02d}",
        240,
        422,
        CACAO,
        fonte_media
    )

    botao(
        "Jogar novamente",
        65, 495, 350, 65,
        JUNGLE
    )

    botao(
        "Voltar ao inicio",
        65, 575, 350, 65,
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


def clique(x, y):
    global ritmo

    if estado == "inicio":
        if 400 <= y <= 465:
            if 45 <= x <= 230:
                ritmo = "Lento"

            elif 250 <= x <= 435:
                ritmo = "Moderado"

        elif (
            520 <= y <= 590
            and 65 <= x <= 415
        ):
            iniciar_jogo()

    elif estado == "jogando":
        if 53 <= y <= 101:
            if 20 <= x <= 165:
                mudar_estado("pausado")

            elif 315 <= x <= 460:
                mudar_estado("final")

        else:
            tocar_tecla(x, y)

    elif estado == "pausado":
        if (
            465 <= y <= 525
            and 85 <= x <= 395
        ):
            mudar_estado("jogando")

        elif (
            540 <= y <= 600
            and 85 <= x <= 395
        ):
            mudar_estado("final")

    elif estado == "final":
        if (
            495 <= y <= 560
            and 65 <= x <= 415
        ):
            iniciar_jogo()

        elif (
            575 <= y <= 640
            and 65 <= x <= 415
        ):
            mudar_estado("inicio")


async def main():
    global tempo
    global tempo_spawn
    global intervalo_spawn
    global tempo_respiracao
    global tempo_animacao_fundo
    global opacidade_transicao

    executando = True

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
                    clique(*evento.pos)

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

    pygame.quit()


asyncio.run(main())
