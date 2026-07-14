#!/usr/bin/env python3
"""Gera os icones a partir de tools/src-icon.png.
A imagem tem o cracha VERDE circular com brilhos/artefatos semi-transparentes
espalhados. Detectamos o cracha pela COR VERDE (mais confiavel que o alfa),
recortamos justo, deixamos quadrado e aplicamos mascara circular (fundo 100%
transparente)."""
import os
from PIL import Image, ImageChops, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
src = os.path.join(here, "src-icon.png")
outdir = os.path.join(root, "icons")
os.makedirs(outdir, exist_ok=True)

im = Image.open(src).convert("RGBA")
r, g, b, a = im.split()

def thr(ch, t):
    return ch.point(lambda v: 255 if v > t else 0)

gr = thr(ImageChops.subtract(g, r), 20)   # g - r > 20
gb = thr(ImageChops.subtract(g, b), 20)   # g - b > 20
gg = thr(g, 80)                            # verde presente
aa = thr(a, 120)                           # opaco
green = ImageChops.multiply(ImageChops.multiply(gr, gb), ImageChops.multiply(gg, aa))

bbox = green.getbbox()
if not bbox:
    raise SystemExit("nao achei o cracha verde")
# pequena folga para incluir o anel branco externo e o anti-aliasing
pad = int(0.02 * max(bbox[2] - bbox[0], bbox[3] - bbox[1]))
x0 = max(0, bbox[0] - pad); y0 = max(0, bbox[1] - pad)
x1 = min(im.width, bbox[2] + pad); y1 = min(im.height, bbox[3] + pad)
im = im.crop((x0, y0, x1, y1))

# quadra (canvas transparente, centralizado)
w, h = im.size
side = max(w, h)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(im, ((side - w) // 2, (side - h) // 2), im)

# mascara circular com supersampling (borda suave) -> cantos transparentes
scale = 4
big = Image.new("L", (side * scale, side * scale), 0)
ImageDraw.Draw(big).ellipse((0, 0, side * scale - 1, side * scale - 1), fill=255)
mask = big.resize((side, side), Image.LANCZOS)
sq.putalpha(ImageChops.multiply(sq.getchannel("A"), mask))

for s in (16, 32, 48, 128):
    sq.resize((s, s), Image.LANCZOS).save(os.path.join(outdir, f"icon{s}.png"))
    print("ok", f"icon{s}.png")
print("bbox verde:", bbox, "cracha:", (w, h), "quadrado:", side)
