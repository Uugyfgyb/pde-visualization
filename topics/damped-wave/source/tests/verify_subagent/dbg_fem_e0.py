# -*- coding: utf-8 -*-
"""诊断：FEM 检查里 E_w(0) 为何比解析值低 3.9%。"""
import math
import numpy as np
from vlib import simpson, dx4, grid

l, a = 1.0, 1.0
A1, A3, B2 = 0.05, 0.02, 0.03
for J in [50, 100, 200, 400]:
    x = grid(l, J); h = l / J
    w = A1 * np.sin(np.pi * x) + A3 * np.sin(3 * np.pi * x)
    wt = B2 * np.sin(2 * np.pi * x)
    d = dx4(w, h)
    dw_exact = A1 * math.pi * np.cos(np.pi * x) + A3 * 3 * math.pi * np.cos(3 * np.pi * x)
    print("J=%4d  Simpson(wt^2)=%.10g (解析 %.10g)  Simpson((dx4 w)^2)=%.10g (解析 %.10g)  相对误差 dx4=%.3g"
          % (J, simpson(wt ** 2, h), 0.5 * l * B2 ** 2, simpson(d ** 2, h),
             0.5 * l * (A1 ** 2 * math.pi ** 2 + A3 ** 2 * (3 * math.pi) ** 2),
             np.max(np.abs(d - dw_exact)) / np.max(np.abs(dw_exact))))
print("解析 2E_w(0) =", B2 ** 2 * 0.5 * l + (A1 ** 2 * math.pi ** 2 + A3 ** 2 * (3 * math.pi) ** 2) * 0.5 * l)
