"""Efeitos do mk potion na versão web, sem síntese PCM em tempo real.

No navegador os sons tocam pela Web Audio da página (mkpotion-som.js): o áudio do pygame
depende do ritmo dos quadros do jogo e chiava quando um quadro atrasava. Fora do navegador,
os mesmos sons tocam pelo pygame.mixer.
"""
import logging
from pathlib import Path
import sys
import pygame

NOMES = ('select', 'pour', 'undo', 'win')


def _tocador_da_pagina():
    """window.mkpauseSom, quando o jogo roda no navegador (pygbag)."""
    if sys.platform != 'emscripten':
        return None
    try:
        import platform
        return getattr(platform.window, 'mkpauseSom', None)
    except Exception:
        return None


class SoundManager:
    def __init__(self, settings):
        self.settings = settings
        self.sounds = {}
        self.pagina = _tocador_da_pagina()
        self.available = self.pagina is not None
        if self.available:
            return
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=48000, size=-16, channels=2, buffer=4096)
            pygame.mixer.set_num_channels(8)
            raiz = Path(__file__).resolve().parent.parent / 'assets' / 'audio'
            self.sounds = {nome: pygame.mixer.Sound(str(raiz / f'{nome}.ogg')) for nome in NOMES}
            self.available = True
        except (pygame.error, OSError) as erro:
            logging.getLogger(__name__).warning('Áudio indisponível: %s', erro)

    def play(self, name):
        if not (self.available and self.settings.sound_enabled):
            return
        volume = max(0.0, min(1.0, self.settings.volume))
        if self.pagina is not None:
            try:
                self.pagina.tocar(name, volume)
            except Exception as erro:
                logging.getLogger(__name__).warning('Som não tocou: %s', erro)
            return
        som = self.sounds.get(name)
        if som is not None:
            som.set_volume(volume)
            # Sem forçar canais: evita interromper outra nota com um corte abrupto.
            som.play()
