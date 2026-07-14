#!/usr/bin/env python3
"""Gera a imagem promocional 1280x800 para a Chrome Web Store / Edge Add-ons.
Renderiza em 2x e reduz para ficar nitido. Sem dados reais de servidor."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
outdir = os.path.join(root, "store-assets")
os.makedirs(outdir, exist_ok=True)

SC = 2
W, H = 1280 * SC, 800 * SC

GREEN = (30, 126, 52)
GREEN_DARK = (23, 103, 42)
GREEN_SOFT = (230, 244, 234)
PROG = (19, 115, 51)
TRACK = (214, 234, 217)
STATUS_BG = (239, 247, 241)
TEXT = (27, 27, 27)
MUTED = (106, 106, 106)
WHITE = (255, 255, 255)
BG = (255, 255, 255)
BACKDROP = (238, 246, 240)
BORDER = (216, 216, 216)
ROW_LINE = (240, 240, 240)

FDIR = "/usr/share/fonts/truetype/dejavu/"
def font(bold, size):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(os.path.join(FDIR, name), int(size * SC))

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
def s(v):
    return int(v * SC)

def rrect(box, radius, **kw):
    d.rounded_rectangle([s(box[0]), s(box[1]), s(box[2]), s(box[3])], radius=s(radius), **kw)

def text(x, y, t, f, fill, anchor="la", spacing=6):
    d.text((s(x), s(y)), t, font=f, fill=fill, anchor=anchor, spacing=int(spacing * SC))

def check_circle(cx, cy, r, color):
    d.ellipse([s(cx - r), s(cy - r), s(cx + r), s(cy + r)], fill=color)
    pts = [(cx - r * 0.42, cy), (cx - r * 0.1, cy + r * 0.35), (cx + r * 0.45, cy - r * 0.35)]
    d.line([(s(p[0]), s(p[1])) for p in pts], fill=WHITE, width=int(3 * SC), joint="curve")

def checkbox(x, y, size, checked):
    if checked:
        d.rounded_rectangle([s(x), s(y), s(x + size), s(y + size)], radius=s(3), fill=GREEN)
        pts = [(x + size * 0.22, y + size * 0.52), (x + size * 0.42, y + size * 0.72), (x + size * 0.8, y + size * 0.28)]
        d.line([(s(p[0]), s(p[1])) for p in pts], fill=WHITE, width=int(2.2 * SC), joint="curve")
    else:
        d.rounded_rectangle([s(x), s(y), s(x + size), s(y + size)], radius=s(3), outline=(150, 150, 150), width=int(1.5 * SC))

def badge(x, y, label, bg, fg):
    f = font(False, 12)
    tw = d.textlength(label, font=f)
    pad = 8
    d.rounded_rectangle([s(x), s(y), int(s(x) + tw + s(pad) * 2), s(y + 20)], radius=s(10), fill=bg)
    d.text((int(s(x) + tw / 2 + s(pad)), s(y + 10)), label, font=f, fill=fg, anchor="mm")

# ---------- Coluna esquerda ----------
icon = Image.open(os.path.join(root, "icons", "icon128.png")).convert("RGBA")
icon = icon.resize((s(96), s(96)), Image.LANCZOS)
img.paste(icon, (s(80), s(96)), icon)

text(80, 210, "Baixe suas portarias\ndo SUAP em lote", font(True, 44), GREEN)
text(80, 350, "Selecione e baixe todas de uma vez — cada\narquivo como numero-ano.pdf, direto na sua\npasta de Downloads.", font(False, 20), MUTED, spacing=8)

bullets = [
    "Usa o login que você já tem aberto",
    "Sem a caixa “Salvar como”",
    "Funciona no Chrome e no Edge",
]
by = 500
for b in bullets:
    check_circle(92, by + 11, 11, GREEN)
    text(116, by, b, font(False, 20), TEXT)
    by += 52

# ---------- Coluna direita: mockup do painel ----------
PX0, PY0, PX1, PY1 = 748, 120, 1148, 690
# sombra
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle([s(PX0 + 6), s(PY0 + 12), s(PX1 + 6), s(PY1 + 12)], radius=s(16), fill=(0, 0, 0, 70))
shadow = shadow.filter(ImageFilter.GaussianBlur(s(9)))
img.paste(shadow, (0, 0), shadow)

# corpo do painel
rrect((PX0, PY0, PX1, PY1), 16, fill=WHITE, outline=BORDER, width=int(1 * SC))

# cabecalho verde (cantos superiores arredondados via retangulo + topo)
d.rounded_rectangle([s(PX0), s(PY0), s(PX1), s(PY0 + 52)], radius=s(16), fill=GREEN)
d.rectangle([s(PX0), s(PY0 + 26), s(PX1), s(PY0 + 52)], fill=GREEN)
text(PX0 + 18, PY0 + 26, "Portarias do servidor", font(True, 16), WHITE, anchor="lm")
text(PX1 - 20, PY0 + 26, "×", font(False, 20), WHITE, anchor="mm")

# toolbar
ty = PY0 + 52
checkbox(PX0 + 16, ty + 14, 16, True)
text(PX0 + 42, ty + 22, "Selecionar todas", font(False, 15), TEXT, anchor="lm")
text(PX1 - 18, ty + 22, "3 selecionadas", font(False, 12), MUTED, anchor="rm")
d.line([s(PX0), s(ty + 44), s(PX1), s(ty + 44)], fill=ROW_LINE, width=int(1 * SC))

# lista
# numeros ficticios (apenas ilustrativos, nao sao portarias reais)
rows = [("15/2025", "OK"), ("12/2025", "OK"), ("08/2025", "OK"),
        ("21/2024", None), ("14/2024", None), ("03/2024", None)]
ry = ty + 44
rh = 40
for i, (label, st) in enumerate(rows):
    cy = ry + rh / 2
    checked = st is not None
    checkbox(PX0 + 16, cy - 8, 16, checked)
    col = TEXT if checked else (120, 120, 120)
    text(PX0 + 42, cy, label, font(False, 15), col, anchor="lm")
    if st == "OK":
        badge(PX1 - 66, cy - 10, "OK", GREEN_SOFT, PROG)
    d.line([s(PX0 + 14), s(ry + rh), s(PX1 - 14), s(ry + rh)], fill=ROW_LINE, width=int(1 * SC))
    ry += rh

# faixa de status
SB0 = PY1 - 168
d.rectangle([s(PX0), s(SB0), s(PX1), s(SB0 + 92)], fill=STATUS_BG)
d.line([s(PX0), s(SB0), s(PX1), s(SB0)], fill=(226, 238, 230), width=int(1 * SC))
text(PX0 + 16, SB0 + 22, "Concluído — 3 de 3 baixadas", font(True, 13), PROG, anchor="lm")
# barra de progresso
bx0, bx1, byy = PX0 + 16, PX1 - 16, SB0 + 44
d.rounded_rectangle([s(bx0), s(byy), s(bx1), s(byy + 7)], radius=s(3), fill=TRACK)
d.rounded_rectangle([s(bx0), s(byy), s(bx1), s(byy + 7)], radius=s(3), fill=PROG)
# iconezinho de pasta desenhado (a fonte nao tem emoji)
fx, fy = PX0 + 16, SB0 + 70
d.rounded_rectangle([s(fx), s(fy - 5), s(fx + 15), s(fy + 6)], radius=s(2), fill=MUTED)
d.rectangle([s(fx + 1), s(fy - 8), s(fx + 7), s(fy - 3)], fill=MUTED)
text(fx + 24, SB0 + 70, "Downloads › Portarias SUAP › (servidor)", font(False, 12), MUTED, anchor="lm")

# rodape com botoes
Fy0 = SB0 + 92
d.line([s(PX0), s(Fy0), s(PX1), s(Fy0)], fill=ROW_LINE, width=int(1 * SC))
# botao principal
b1x0, b1x1 = PX0 + 16, PX1 - 130
d.rounded_rectangle([s(b1x0), s(Fy0 + 14), s(b1x1), s(Fy0 + 50)], radius=s(8), fill=GREEN)
text((b1x0 + b1x1) / 2, Fy0 + 32, "Baixar selecionadas", font(True, 14), WHITE, anchor="mm")
# botao secundario
b2x0, b2x1 = PX1 - 120, PX1 - 16
d.rounded_rectangle([s(b2x0), s(Fy0 + 14), s(b2x1), s(Fy0 + 50)], radius=s(8), fill=GREEN_SOFT)
text((b2x0 + b2x1) / 2, Fy0 + 32, "Log CSV", font(True, 14), GREEN_DARK, anchor="mm")

# ---------- finaliza ----------
final = img.resize((1280, 800), Image.LANCZOS)
out = os.path.join(outdir, "screenshot-1280x800.png")
final.save(out)
print("ok", out, final.size)
