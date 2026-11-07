"""Verifica a continuidade da trajetória e dos quadros na emenda do vídeo."""
import json
import unittest

import numpy as np
import cv2
from PIL import Image

from gerar_video_chinchila import ROOT, Character, Renderer, breath


class ChinchilaLoopTest(unittest.TestCase):
    def test_posicao_e_velocidade_continuas_nas_trocas(self):
        for t in (0, 4, 10, 20):
            delta = 1e-4
            left, center, right = breath(t-delta), breath(t), breath(t+delta)
            self.assertLess(abs(left-right), 1e-7)
            self.assertLess(abs((right-center)/delta), 1e-4)
            self.assertLess(abs((center-left)/delta), 1e-4)

    def test_quadros_periodicos_incluindo_textos(self):
        renderer = Renderer(scale=.5)
        for t in (0, .6, 3.8, 4, 7.5):
            self.assertEqual(renderer.frame(t).tobytes(), renderer.frame(t+10).tobytes())

    def test_emenda_tem_variacao_pequena_a_sessenta_fps(self):
        renderer = Renderer(scale=.5)
        first = np.array(renderer.frame(0)).astype(float)
        last = np.array(renderer.frame(10-1/60)).astype(float)
        # Evita um salto global na personagem ou no fundo ao voltar ao início.
        self.assertLess(np.abs(first-last).mean(), .5)

    def test_formatos_do_video(self):
        self.assertEqual(Renderer(scale=4).size, (2880, 3840))
        self.assertEqual(Renderer(scale=2, landscape=True).size, (3840, 2160))

    def test_cores_da_png_aprovada_sao_preservadas(self):
        original = np.array(Image.open(ROOT / 'chinchila-restaurada.png'))
        pose = np.array(Character().pose(0))
        opaque = original[:, :, 3] > 240
        np.testing.assert_array_equal(pose[opaque, :3], original[opaque, :3])

    def test_rosto_orelhas_e_ponta_da_cauda_ficam_intactos(self):
        character = Character()
        start, peak = np.array(character.pose(0)), np.array(character.pose(1))
        face = start[:790, :, 3] > 240
        tail = start[:, :80, 3] > 240
        np.testing.assert_array_equal(start[:790][face], peak[:790][face])
        np.testing.assert_array_equal(start[:, :80][tail], peak[:, :80][tail])
        np.testing.assert_array_equal(start[:790, :, 3], peak[:790, :, 3])
        self.assertGreater(np.abs(start[790:1230].astype(float)-peak[790:1230]).sum(), 0)

    def test_barriga_clara_e_silhueta_crescem_juntas_e_retornam(self):
        character = Character()
        def areas(t):
            rgba = np.array(character.pose(breath(t)))
            opaque = rgba[:, :, 3] > 240
            light = opaque & (rgba[:, :, 0] > 190) & (rgba[:, :, 1] > 180) & (rgba[:, :, 2] > 170)
            light[:850] = False
            return np.count_nonzero(light), np.count_nonzero(opaque[850:1230])
        rest, middle, peak, exhaling, end = [areas(t) for t in (0, 2, 4, 7, 10)]
        self.assertGreater(peak[0], rest[0]*1.18)
        self.assertGreater(peak[1], rest[1]*1.01)
        for i in (0, 1):
            self.assertLess(rest[i], middle[i])
            self.assertLess(middle[i], peak[i])
            self.assertLess(rest[i], exhaling[i])
            self.assertLess(exhaling[i], peak[i])
        self.assertEqual(rest, end)

    def test_barriga_preserva_a_forma_original_ao_crescer(self):
        character = Character()
        def shape(amount):
            rgba = np.array(character.pose(amount))
            light = ((rgba[:,:,3]>240) & (rgba[:,:,0]>190) &
                     (rgba[:,:,1]>180) & (rgba[:,:,2]>170)).astype(np.uint8)
            light[:850] = 0
            contour = max(cv2.findContours(light,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)[0],key=cv2.contourArea)
            axes = cv2.fitEllipse(contour)[1]
            x,y,w,h = cv2.boundingRect(contour)
            normalized = cv2.resize(light[y:y+h,x:x+w],(256,192),interpolation=cv2.INTER_NEAREST)>0
            return min(axes)/max(axes),normalized
        ratio,reference = shape(0)
        for amount in (.25,.5,.75,1):
            current,patch = shape(amount)
            self.assertLess(abs(current-ratio),.035)
            self.assertGreater(np.count_nonzero(reference & patch)/np.count_nonzero(reference | patch),.95)

    def test_maos_e_patas_acompanham_o_corpo_sem_trocar_os_tracos(self):
        character = Character()
        reference = np.array(character.pose(0))
        for amount in (.25,.5,.75,1):
            pose = np.array(character.pose(amount))
            scale = 1+.12*amount
            # Pontos nas mãos em frente à barriga e pontos claros logo abaixo.
            for x,y in ((500,978),(800,978),(540,1010),(740,1010),(440,1198),(840,1198)):
                tx,ty = round(640+(x-640)*scale),round(1230+(y-1230)*scale)
                self.assertLessEqual(np.abs(pose[ty,tx,:3].astype(int)-reference[y,x,:3]).max(),4)

    def test_malha_nao_dobra_durante_a_inspiracao(self):
        character = Character()
        for amount in (.25,.5,.75,1):
            x,y = character.maps(amount)
            xy,xx = np.gradient(x)
            yy,yx = np.gradient(y)
            self.assertGreater(np.min(xx*yy-xy*yx),.6)

    def test_curvas_dos_ombros_preservam_a_barriga_clara(self):
        character = Character()
        for amount in (.25,.5,.75,1):
            baseline = np.array(character.pose(amount,silhouette=False))
            current = np.array(character.pose(amount))
            light = ((baseline[:,:,3]>240) & (baseline[:,:,0]>190) &
                     (baseline[:,:,1]>180) & (baseline[:,:,2]>170))
            light[:850] = False
            np.testing.assert_array_equal(current[light],baseline[light])

    def test_geometria_dos_dois_lados_corresponde_a_previa_aprovada(self):
        approved = json.loads((ROOT/'geometria-aprovada-v10.json').read_text(encoding='utf-8'))
        character = Character()
        for pose in approved['poses']:
            x,y = character.maps(pose['expansao'])
            for point in pose['pontos']:
                px,py = point['destino']
                np.testing.assert_allclose([x[py,px],y[py,px]],point['origem'],atol=.02,rtol=0)


if __name__ == '__main__':
    unittest.main()
