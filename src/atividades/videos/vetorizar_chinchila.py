"""Reconstrói curvas da referência restaurada e das poses da folha original. Executar apenas ao atualizar a referência.
Requer numpy, OpenCV e scipy; o vídeo usa o JSON vetorial resultante.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d

ROOT = Path(__file__).resolve().parent
PALETTE = np.array([tuple(bytes.fromhex(c)) for c in ['fff5eb', '5e3e2d', 'd28ea1', 'f7c7cd', 'f6e2d9', 'e8c9c5', '946c57']], np.uint8)

def classes(image):
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB).astype(float)
    palette = cv2.cvtColor(PALETTE[None], cv2.COLOR_RGB2LAB).astype(float)[0]
    return np.argmin(((lab[:, :, None] - palette[None, None]) ** 2).sum(-1), -1)

def contours(mask, count=1):
    # Suaviza a borda da máscara antes de extrair curvas; elimina o serrilhado JPEG.
    big = cv2.resize(mask.astype(np.float32), None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    big = (cv2.GaussianBlur(big, (0, 0), 4.0) > .5).astype(np.uint8)
    paths, _ = cv2.findContours(big, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    result = []
    for c in [c for c in sorted(paths, key=cv2.contourArea, reverse=True) if cv2.contourArea(c) > 48][:count]:
        q = c[:, 0].astype(float) / 4
        d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.vstack([q, q[:1]]), axis=0), axis=1))]
        q = np.vstack([q, q[:1]])
        target = np.linspace(0, d[-1], 256, endpoint=False)
        points = np.column_stack([np.interp(target, d, q[:, i]) for i in range(2)])
        result.append(gaussian_filter1d(points, 1.0, axis=0, mode='wrap'))
    return result

def radial(points):
    center = (points.min(0) + points.max(0)) / 2
    delta = points - center
    angle = np.arctan2(delta[:, 1], delta[:, 0])
    order = np.argsort(angle)
    a, r = angle[order], np.linalg.norm(delta, axis=1)[order]
    theta = np.linspace(-np.pi, np.pi, 96, endpoint=False)
    radius = np.interp(theta, np.r_[a[-1] - 2*np.pi, a, a[0]+2*np.pi], np.r_[r[-1], r, r[0]])
    radius = gaussian_filter1d(radius, 1.6, mode='wrap')
    return center + np.column_stack([np.cos(theta), np.sin(theta)]) * radius[:, None]

if __name__ == '__main__':
    image = cv2.cvtColor(cv2.imread(str(ROOT / 'Ciclo_de_Respiracao.jpeg')), cv2.COLOR_BGR2RGB)
    restored = np.array(Image.open(ROOT / 'chinchila-restaurada.png').convert('RGBA'))
    alpha = restored[:, :, 3] > 180
    _, lab, stats, _ = cv2.connectedComponentsWithStats(alpha.astype(np.uint8))
    main = 1 + np.argmax(stats[1:, 4])
    valid = lab == main
    ref = restored[:, :, :3]
    labels = classes(ref)
    h, w = valid.shape
    scale = 176 / stats[main, 3]
    # A cabeça permanece no mesmo ponto da referência de 181 x 192 unidades.
    shift = np.array([99-640*scale, 184-(stats[main, 1]+stats[main, 3])*scale])
    def normalize(points): return points*scale+shift
    yy = np.arange(h)[:, None]*scale+shift[1]
    silhouette = cv2.morphologyEx(valid.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35,35)))
    body = normalize(contours(silhouette)[0])
    ears = [normalize(p) for p in contours(np.isin(labels,[2,3]) & valid & (yy<88),2)]
    highlights = [normalize(p) for p in contours((labels==3) & valid & (yy<88),2)]
    belly = radial(normalize(contours((labels==4) & valid & (yy>120))[0]))
    eyes = [normalize(p) for p in contours(np.isin(labels,[0,4]) & valid & (yy>70) & (yy<107),2)]
    details = [normalize(p) for p in contours((labels==6) & valid,12) if cv2.contourArea(p.astype(np.float32)) > 250]
    peak_labels = classes(image[14:212, 1107:1299])
    peak_mask = peak_labels == 4
    peak_mask[:100] = False
    peak = radial(contours(peak_mask)[0])
    # Mantém cabeça, orelhas e pés estáveis; normaliza somente a barriga da outra pose.
    lo, hi = peak.min(0), peak.max(0)
    peak = (peak - lo) / (hi - lo) * [84, 73] + [57, 111]
    data = {'source': 'chinchila-restaurada.png (restauração de Ciclo_de_Respiracao.jpeg)', 'viewBox': [0, 0, 181, 192],
            'body': body.tolist(), 'ears': [p.tolist() for p in ears],
            'highlights': [p.tolist() for p in highlights], 'eyes': [p.tolist() for p in eyes],
            'details': [p.tolist() for p in details],
            'belly': belly.tolist(), 'bellyPeak': peak.tolist()}
    (ROOT / 'chinchila-vetorial.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
    print('Curvas vetoriais reconstruídas da folha original.')
