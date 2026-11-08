#!/usr/bin/env python3
"""Anima a própria PNG aprovada, preservando suas cores e todos os traços.

Uma deformação suave e localizada move barriga e braços como uma única imagem.
Rosto e orelhas ficam estáveis; corpo e patas acompanham o mesmo movimento.
Não há redesenho de patas, quantização
de cores, interpolação entre poses distintas ou sobreposição de partes.
Requer Pillow, numpy, OpenCV, scipy, aggdraw e FFmpeg.
"""
import argparse
import math
import os
import subprocess
from pathlib import Path

import aggdraw
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.interpolate import UnivariateSpline

ROOT = Path(__file__).resolve().parent
BG, INK = '#F6EFE4', '#594131'


def breath(t, inhale=4, exhale=6):
    """Ciclo periódico com velocidade zero nas duas trocas de fase."""
    t %= inhale + exhale
    phase = t / inhale if t < inhale else (t - inhale) / exhale
    eased = (1 - math.cos(math.pi * phase)) / 2
    return eased if t < inhale else 1 - eased


class Character:
    """Imagem única, com alfa limpo e RGB original preservado."""
    def __init__(self):
        rgba = np.array(Image.open(ROOT / 'chinchila-restaurada.png').convert('RGBA'))
        # A PNG gerada contém pixels residuais quase transparentes no fundo.
        # Remove somente esse resíduo; não pinta nem substitui cores da personagem.
        mask = (rgba[:, :, 3] > 24).astype(np.uint8)
        _, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
        keep = labels == 1 + np.argmax(stats[1:, 4])
        rgba[~keep, 3] = 0
        rgba[rgba[:, :, 3] > 240, 3] = 255
        self.original = rgba
        alpha = rgba[:, :, 3:4].astype(np.float32) / 255
        self.premultiplied = np.concatenate((rgba[:, :, :3]*alpha, alpha), axis=2).astype(np.float32)
        h, w = rgba.shape[:2]
        self.gx, self.gy = np.meshgrid(np.arange(w,dtype=np.float32),np.arange(h,dtype=np.float32))
        # A região clara e as mãos conservam a expansão da prévia aprovada.
        # As curvas dos dois ombros recebem uma correção contínua separada.
        self.motion_weight = (self.smootherstep((self.gy-790)/115)*
                              self.smootherstep((self.gx-180)/170))
        self.rest_edge = self.right_edge(rgba[:, :, 3] > 128)
        rows = np.arange(800, 1191, dtype=float)
        self.edge_spline = UnivariateSpline(rows, self.rest_edge[800:1191], s=120)
        self.rows = np.arange(h, dtype=np.float64)
        self.shoulder_fade = (self.smootherstep((self.rows-800)/40)*
                              self.smootherstep((1150-self.rows)/60))
        self.inner_edge = 800+130*self.smootherstep((self.rows-790)/110)
        self.rest_curve = self.edge_curve(self.rows, 0)
        radius = float(self.edge_spline(1025)-640)
        neck = float(self.edge_spline(800)-640)

        def arc(rx):
            ry = 225/np.sqrt(1-(neck/rx)**2)
            return 640+rx*np.sqrt(np.maximum(0, 1-((self.rows-1025)/ry)**2))

        self.round_expansion = arc(radius+40)-arc(radius)

    @staticmethod
    def smootherstep(v):
        """Transição com primeira e segunda derivadas nulas nas extremidades."""
        v = np.clip(v, 0, 1)
        return v*v*v*(v*(6*v-15)+10)

    def right_edge(self, mask):
        return np.where(mask.any(axis=1), mask.shape[1]-1-np.argmax(mask[:, ::-1], axis=1), -1)

    def inner_maps(self, amount):
        scale = 1+.12*amount
        dx = ((self.gx-640)/scale+640-self.gx)*self.motion_weight
        dy = ((self.gy-1230)/scale+1230-self.gy)*self.motion_weight
        return self.gx+dx, self.gy+dy

    def edge_curve(self, rows, amount):
        """Contorno analítico: não depende de limiares por quadro nem de máscaras recortadas."""
        weight = self.smootherstep((rows-790)/115)
        k = 1-(1-1/(1+.12*amount))*weight
        source_y = k*rows+(1-k)*1230
        return 640+(self.edge_spline(source_y)-640)/k

    def maps(self, amount, silhouette=True):
        if amount == 0 or not silhouette:
            return self.inner_maps(amount)
        actual = self.edge_curve(self.rows, amount)
        desired = self.rest_curve+amount*self.round_expansion
        delta = (actual-desired)*self.shoulder_fade
        target = actual-delta
        width = np.maximum(target-self.inner_edge, 1)

        # Mantém exatamente a curva direita aprovada na primeira revisão.
        q = (self.gx-self.inner_edge[:, None])/width[:, None]
        offset = (delta[:, None]*self.smootherstep(q)).astype(np.float32)
        outer_x = self.gx+offset
        scale = 1+.12*amount
        weight = (self.smootherstep((self.gy-790)/115)*
                  self.smootherstep((outer_x-180)/170))
        right_x = outer_x+((outer_x-640)/scale+640-outer_x)*weight
        right_y = self.gy+((self.gy-1230)/scale+1230-self.gy)*weight

        # O traço esquerdo fica na zona que acompanha o corpo. A transição
        # para a cauda ocorre longe desse traço, sem congelar partes das patas.
        gx, gy = self.gx[:, :640], self.gy[:, :640]
        q = (1280-gx-self.inner_edge[:, None])/width[:, None]
        tail_fade = self.smootherstep((gx-80)/140)
        offset = (-delta[:, None]*self.smootherstep(q)*tail_fade).astype(np.float32)
        outer_x = gx+offset
        weight = (self.smootherstep((gy-790)/115)*
                  self.smootherstep((outer_x-80)/140))
        right_x[:, :640] = outer_x+((outer_x-640)/scale+640-outer_x)*weight
        right_y[:, :640] = gy+((gy-1230)/scale+1230-gy)*weight
        return right_x, right_y

    def pose(self, amount, silhouette=True):
        if amount == 0:
            return Image.fromarray(self.original, 'RGBA')
        map_x,map_y = self.maps(amount,silhouette)
        warped = cv2.remap(self.premultiplied,map_x,map_y,
                           cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
        alpha = np.clip(warped[:, :, 3:4], 0, 1)
        rgb = np.divide(warped[:, :, :3], alpha, out=np.zeros_like(warped[:, :, :3]), where=alpha>1e-5)
        rgba = np.concatenate((np.clip(rgb,0,255),alpha*255),axis=2)
        return Image.fromarray(np.rint(rgba).astype(np.uint8), 'RGBA')


class Renderer:
    def __init__(self, scale=4, landscape=False, font=None, inhale=4, exhale=6):
        self.character = Character()
        cv2.setNumThreads(2)
        self.k, self.landscape = scale, landscape
        self.w, self.h = ((1920, 1080) if landscape else (720, 960))
        self.size = (round(self.w*scale), round(self.h*scale))
        self.inhale, self.exhale = inhale, exhale
        self.period = inhale + exhale
        self.cx = self.w/2
        self.cy = 505 if landscape else 440
        self.s = 3.35 if landscape else 2.8
        self.bottom = 820 if landscape else 688
        font = font or str(ROOT.parent.parent / 'MKpotion/mk_potion/assets/fonts_mkpause/Fraunces-SemiBold.ttf')
        self.font = ImageFont.truetype(font, round((44 if landscape else 40)*scale))
        self.labels = {}
        for key, text in [('in', 'Inspire devagar'), ('ex', 'Solte o ar devagar')]:
            layer = Image.new('RGBA', self.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(layer)
            draw.text((self.cx*scale, (940 if landscape else 800)*scale), text,
                      font=self.font, fill=INK, anchor='mt')
            self.labels[key] = layer

    def frame(self, t):
        t %= self.period
        e = breath(t, self.inhale, self.exhale)
        im = Image.new('RGB', self.size, BG)
        context = aggdraw.Draw(im)
        k, cx, cy = self.k, self.cx, self.cy
        for radius, color in [(290 if self.landscape else 280, '#E4DEDD'),
                              (220 if self.landscape else 212, '#D4D2D7')]:
            r = radius*(.96+.07*e)
            context.ellipse(((cx-r)*k, (cy-r)*k, (cx+r)*k, (cy+r)*k), aggdraw.Brush(color))
        sy = (self.bottom+6)*k
        context.ellipse(((cx-164)*k, sy-12*k, (cx+164)*k, sy+12*k), aggdraw.Brush('#E4CAC7'))

        context.flush()
        # A mesma textura, cores e traços da imagem aprovada em todos os quadros.
        # Faz a transformação antes de redimensionar, evitando sucessivas ampliações.
        sprite = self.character.pose(e)
        factor = self.s * k * 176 / 1204
        size = (round(sprite.width*factor), round(sprite.height*factor))
        sprite = sprite.resize(size, Image.Resampling.LANCZOS)
        x = round(cx*k-640*factor)
        y = round(self.bottom*k-1249*factor)
        im.paste(sprite,(x,y),sprite)

        # As instruções desaparecem e reaparecem brevemente na troca de fase,
        # inclusive na emenda do MP4. O movimento não para entre os ciclos.
        local = t if t < self.inhale else t-self.inhale
        duration = self.inhale if t < self.inhale else self.exhale
        opacity = min(1, local/.22, (duration-local)/.22)
        label = self.labels['in' if t < self.inhale else 'ex']
        if opacity < 1:
            label = label.copy()
            label.putalpha(label.getchannel('A').point(lambda a: round(a*opacity)))
        # O player desenha a instrução localizada; o vídeo contém só a animação.
        return im


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='chinchila.mp4')
    parser.add_argument('--scale', type=float, default=4)
    parser.add_argument('--fps', type=int, default=60)
    parser.add_argument('--cycles', type=int, default=1)
    parser.add_argument('--inhale', type=float, default=4)
    parser.add_argument('--exhale', type=float, default=6)
    parser.add_argument('--font')
    parser.add_argument('--landscape', action='store_true')
    parser.add_argument('--frames', type=int, default=0)
    parser.add_argument('--preview', help='salva uma imagem em vez do vídeo')
    parser.add_argument('--time', type=float, default=1)
    # Compatibilidade com o comando antigo; a referência é a PNG aprovada.
    parser.add_argument('--sheet')
    args = parser.parse_args()
    renderer = Renderer(args.scale, args.landscape, args.font, args.inhale, args.exhale)
    if args.preview:
        renderer.frame(args.time).save(args.preview)
        return
    frames = args.frames or round(args.fps*renderer.period*args.cycles)
    w,h = renderer.size
    ff = subprocess.Popen([os.environ.get('FFMPEG', 'ffmpeg'),'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24',
        '-s',f'{w}x{h}','-r',str(args.fps),'-i','-','-an',
        '-filter_threads','2','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709',
        '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
        '-c:v','libx264','-preset','fast',
        '-crf','15','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',args.out],stdin=subprocess.PIPE)
    try:
        for frame in range(frames):
            ff.stdin.write(renderer.frame(frame/args.fps).tobytes())
            if frame % args.fps == 0:
                print(f'Quadro {frame}/{frames} ({w}x{h}, {args.fps} fps)',flush=True)
    finally:
        ff.stdin.close()
    if ff.wait() != 0:
        raise RuntimeError('FFmpeg não concluiu a renderização.')
    print(f'Concluído: {args.out}',flush=True)


if __name__ == '__main__':
    main()
