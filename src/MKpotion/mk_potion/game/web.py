"""Integração com o navegador (pygbag) e com o site MKpause.

Quando o jogo roda dentro do MKpause (iframe com ?mkpause=1 no endereço):
- a tela é desenhada no tamanho real da área do site (CSS × densidade de pixels),
  então fica nítida e ocupa todo o espaço, no computador e no celular;
- somem o que o site já oferece (Respirar) e a tela de boas-vindas com a mascote.
Fora do MKpause (desktop ou outro site) nada muda.
"""
import math
import sys

NO_NAVEGADOR = sys.platform == "emscripten"

# Limite de pixels desenhados por quadro: acima disso o navegador perde fluidez.
MAX_PIXELS = 1_800_000


def _janela():
    import platform
    return platform.window


def _no_mkpause() -> bool:
    if not NO_NAVEGADOR:
        return False
    try:
        return "mkpause" in str(_janela().location.search)
    except Exception:
        return False


EMBUTIDO = _no_mkpause()


def preparar_canvas() -> None:
    """O jogo cuida do tamanho do canvas: ele ocupa a página inteira do iframe."""
    try:
        w = _janela()
        w.config.user_canvas_managed = 1
        # Regra com !important: vence o estilo que o pygbag escreve direto no canvas.
        css = w.document.createElement("style")
        css.textContent = (
            "html, body { margin: 0; overflow: hidden; }"
            " #canvas { position: fixed !important; inset: 0 !important; margin: 0 !important;"
            " width: 100vw !important; height: 100vh !important; }"
        )
        w.document.head.appendChild(css)
    except Exception:
        pass


def tamanho_ideal(minimo):
    """Tamanho em pixels reais da área do jogo, sem distorcer e sem passar de MAX_PIXELS."""
    try:
        w = _janela()
        largura, altura = float(w.innerWidth), float(w.innerHeight)
        densidade = float(w.devicePixelRatio or 1)
    except Exception:
        return None
    if largura < 1 or altura < 1:
        return None
    fator = densidade
    fator = min(fator, math.sqrt(MAX_PIXELS / (largura * altura)))
    # Garante o tamanho mínimo do layout mantendo a proporção da área (sem esticar o desenho).
    fator = max(fator, minimo[0] / largura, minimo[1] / altura)
    return int(round(largura * fator)), int(round(altura * fator))
