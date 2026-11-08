"""Carregamento web dos quatro efeitos prontos, sem síntese PCM em tempo real."""
import logging
from pathlib import Path
import pygame


class SoundManager:
    def __init__(self, settings):
        self.settings = settings
        self.sounds = {}
        self.available = False
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=1024)
            pygame.mixer.set_num_channels(8)
            raiz = Path(__file__).resolve().parent.parent / 'assets' / 'audio'
            self.sounds = {nome: pygame.mixer.Sound(str(raiz / f'{nome}.ogg')) for nome in ('select', 'pour', 'undo', 'win')}
            self.available = True
        except (pygame.error, OSError) as erro:
            logging.getLogger(__name__).warning('Áudio indisponível: %s', erro)

    def play(self, name):
        if not (self.available and self.settings.sound_enabled):
            return
        som = self.sounds.get(name)
        if som is not None:
            som.set_volume(max(0.0, min(1.0, self.settings.volume)))
            # Sem forçar canais: evita interromper outra nota com um corte abrupto.
            som.play()
