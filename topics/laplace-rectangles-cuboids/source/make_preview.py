"""Generate a mathematical preview from the default analytic rectangle solution."""
from math import pi, sin, sinh
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "preview.png"
W, H = 1200, 675
a, b, q = 2.0, 1.4, 0.35


def u(x, y):
    return (sin(pi * x / a) * sinh(pi * y / a) / sinh(pi * b / a)
            + q * sin(3 * pi * x / a) * sinh(3 * pi * y / a) / sinh(3 * pi * b / a))


def color(value):
    zero = (18, 32, 63)
    target = (45, 212, 191) if value >= 0 else (236, 72, 153)
    t = min(1.0, abs(value) / 1.05) ** 0.78
    return tuple(round(z * (1 - t) + c * t) for z, c in zip(zero, target))


font_path = Path("C:/Windows/Fonts/msyh.ttc")
def font(size):
    return ImageFont.truetype(str(font_path), size)


im = Image.new("RGB", (W, H), (11, 16, 32))
d = ImageDraw.Draw(im)
d.rounded_rectangle((28, 25, W - 28, H - 26), radius=24, fill=(20, 31, 55), outline=(62, 82, 120), width=2)
d.text((58, 53), "HARMONIC FUNCTIONS  /  STRAUSS 6.1–6.2", fill=(251, 191, 36), font=font(20))
d.text((58, 92), "调和函数：从边界长进内部", fill=(237, 244, 255), font=font(42))
d.text((58, 155), "拉普拉斯方程 · 分离变量 · 边界模态衰减", fill=(177, 196, 225), font=font(22))

# Exact analytic values, rasterized as a 2D heatmap.
hx, hy, hw, hh = 60, 233, 500, 315
heat = Image.new("RGB", (hw, hh))
pixels = heat.load()
for j in range(hh):
    y = b * (1 - j / (hh - 1))
    for i in range(hw):
        pixels[i, j] = color(u(a * i / (hw - 1), y))
im.paste(heat, (hx, hy))
d = ImageDraw.Draw(im)
d.rectangle((hx, hy, hx + hw, hy + hh), outline=(111, 143, 189), width=2)
d.line((hx, hy, hx + hw, hy), fill=(251, 191, 36), width=5)
d.text((hx, hy - 34), "二维热图  u(x,y)", fill=(225, 236, 252), font=font(20))
d.text((hx + hw // 2 - 8, hy + hh + 11), "x", fill=(202, 217, 235), font=font(18))
d.text((hx - 24, hy + hh // 2), "y", fill=(202, 217, 235), font=font(18))

# A perspective drawing of the same exact solution. Height denotes u, not a third spatial coordinate.
ox, oy = 884, 435
def project(x, y, z):
    xx, yy = x / a - 0.5, y / b - 0.5
    return (round(ox + 365 * xx + 112 * yy),
            round(oy + 76 * xx - 108 * yy - 200 * z))

nx, ny = 34, 25
for j in range(ny):
    for i in range(nx):
        x0, x1 = a * i / nx, a * (i + 1) / nx
        y0, y1 = b * j / ny, b * (j + 1) / ny
        xy = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        poly = [project(x, y, u(x, y)) for x, y in xy]
        average = sum(u(x, y) for x, y in xy) / 4
        d.polygon(poly, fill=color(average))
        if i % 4 == 0 or j % 4 == 0:
            d.line(poly + [poly[0]], fill=(63, 119, 141), width=1)

top = [project(a * i / 100, b, u(a * i / 100, b)) for i in range(101)]
d.line(top, fill=(251, 191, 36), width=4)
for x, y in ((0, 0), (a, 0), (0, b), (a, b)):
    px, py = project(x, y, 0)
    d.ellipse((px - 5, py - 5, px + 5, py + 5), fill=(251, 191, 36))
d.text((633, 544), "三维曲面：高度表示 u", fill=(225, 236, 252), font=font(20))
d.text((663, 581), "金色 = 给定边界值", fill=(251, 206, 95), font=font(18))
d.text((61, 594), "青色正值  ·  粉色负值  ·  网格为无量纲坐标", fill=(177, 196, 225), font=font(18))
im.save(OUT)
print(OUT)
