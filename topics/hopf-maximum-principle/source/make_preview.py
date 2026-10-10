"""Draw a clearly illustrative topic card (not a browser screenshot).

Requires Pillow. Run: python make_preview.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 675
im = Image.new("RGB", (W, H), "#0a0e15")
px = im.load()
for y in range(H):
    for x in range(W):
        glow = max(0, 1 - math.hypot((x - 850) / 870, (y - 190) / 700))
        px[x, y] = (int(10 + 9 * glow), int(14 + 17 * glow), int(21 + 29 * glow))
d = ImageDraw.Draw(im)

FONT_PATHS = [
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/simhei.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]
font_path = next((p for p in FONT_PATHS if p.exists()), None)
if font_path is None:
    raise RuntimeError("Need a CJK font to rebuild the preview")
font = lambda size: ImageFont.truetype(str(font_path), size)

d.rounded_rectangle((57, 58, 306, 99), 20, fill="#102c39", outline="#286178", width=2)
d.text((77, 65), "椭圆型 · 势场与平衡", font=font(22), fill="#64d1ee")
d.text((56, 141), "Hopf 最大值原理", font=font(57), fill="#f0f5fa")
d.text((58, 228), "边界点引理 · 3D 几何与障碍函数", font=font(28), fill="#a7b8cd")
d.text((60, 315), "Δu ≥ 0", font=font(45), fill="#5ecaf2")
d.text((60, 377), "边界严格最大值：∂u/∂ν(x0) > 0", font=font(30), fill="#f4cc6d")
d.line((58, 463, 590, 463), fill="#32475d", width=2)
d.text((61, 491), "外法向导数为何严格为正？", font=font(25), fill="#d9e6f2")
d.text((61, 533), "调节 α，观察 Δv 的正性区域", font=font(23), fill="#9daec1")
d.text((61, 625), "专题示意预览", font=font(18), fill="#6c8199")

# A shaded ball: the warm patch marks the strict maximum at x0.
cx, cy, radius = 903, 333, 214
for y in range(cy - radius, cy + radius + 1):
    for x in range(cx - radius, cx + radius + 1):
        xx, yy = (x - cx) / radius, (y - cy) / radius
        rr = xx * xx + yy * yy
        if rr > 1:
            continue
        zz = math.sqrt(1 - rr)
        light = max(0.15, min(1, 0.58 + 0.25 * (-xx - yy) + 0.34 * zz))
        hot = math.exp(-((xx - .53) ** 2 + (yy + .37) ** 2) / .12)
        base = (29 + 185 * hot, 89 + 45 * hot, 148 - 85 * hot)
        px[x, y] = tuple(int(min(255, c * light)) for c in base)

d = ImageDraw.Draw(im)
d.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline="#6ea9ca", width=3)
for fraction in [-.63, -.30, .30, .63]:
    half = radius * math.sqrt(1 - fraction * fraction)
    d.arc((cx-half, cy+fraction*radius-half*.24, cx+half, cy+fraction*radius+half*.24), 0, 180, fill="#7bb7ce", width=2)
d.arc((cx-110, cy-radius, cx+110, cy+radius), 70, 290, fill="#7bb7ce", width=2)
d.arc((cx-110, cy-radius, cx+110, cy+radius), 250, 110, fill="#7bb7ce", width=2)

point = (cx + 117, cy - 130)
d.ellipse((point[0]-11, point[1]-11, point[0]+11, point[1]+11), fill="#ff6b57", outline="#ffd4a5", width=3)
tip = (1127, 112)
d.line((*point, *tip), fill="#ff6b57", width=7)
angle = math.atan2(tip[1]-point[1], tip[0]-point[0])
for offset in [-.55, .55]:
    p = (tip[0] - 30 * math.cos(angle + offset), tip[1] - 30 * math.sin(angle + offset))
    d.line((*tip, *p), fill="#ff6b57", width=7)
d.text((1081, 71), "ν", font=font(32), fill="#ffb49c")
d.rounded_rectangle((813, 581, 1045, 622), 18, fill="#142538", outline="#38576e", width=2)
d.text((835, 588), "球域 B_R(y) · x0", font=font(20), fill="#dceaf7")

im.save(ROOT / "preview.png", optimize=True)
print(ROOT / "preview.png")
