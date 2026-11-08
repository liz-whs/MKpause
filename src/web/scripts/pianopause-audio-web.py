"""Carrega somente os sons prontos; não importa o gerador no navegador."""
from pathlib import Path
import pygame


def aplicar_audio(g, raiz):
    def criar_sons():
        if not pygame.mixer.get_init():
            pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=1024)
        pygame.mixer.set_num_channels(8)
        sons = [pygame.mixer.Sound(str(Path(raiz) / 'audio' / f'nota-{i}.ogg')) for i in range(4)]
        for som in sons:
            som.set_volume(0.7)
        return sons
    g.update(criar_sons=criar_sons, VOLUME_FIXO=0.7)
