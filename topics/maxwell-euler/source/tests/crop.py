# crop.py <full.png> <top> <height> <out.png> [width_scale]
import sys
sys.path.insert(0, r'D:\Deepseek\_pylibs')
from PIL import Image
src, top, h, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 0.78
im = Image.open(src)
top = max(0, min(top, im.size[1] - 10))
h = min(h, im.size[1] - top)
c = im.crop((0, top, im.size[0], top + h))
if scale != 1:
    c = c.resize((int(c.size[0] * scale), int(c.size[1] * scale)), Image.LANCZOS)
c.save(out)
print(out, c.size)
