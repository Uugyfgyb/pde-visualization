# -*- coding: utf-8 -*-
"""诊断 2：MOL4 短程运行，观察能量随时间的演化。"""
import numpy as np
from vlib import MOL4, lap4, grid

l, a, c = 1.0, 1.0, 0.4
J = 50
m = MOL4(l=l, a=a, c=c, J=J,
         phi=lambda x: np.sin(np.pi * x) + 0.4 * np.sin(3 * np.pi * x) + 0.15 * np.sin(5 * np.pi * x),
         psi=lambda x: 0.3 * np.sin(2 * np.pi * x) - 0.2 * np.sin(4 * np.pi * x))
print("h =", m.h, "dtmax =", m.dtmax)
dt = 0.2 * m.h / a
for i in range(1, 2001):
    m.step(dt)
    if i in (1, 2, 10, 100, 500, 1000, 2000):
        print(i, "t=%.4f" % m.t, "E=%.12g" % m.E(), "max|u|=%.6g" % np.max(np.abs(m.u)))
# 检查 lap4 的对称性（应近似对称）
h = m.h
A = np.zeros((J - 1, J - 1))
for k in range(J - 1):
    e = np.zeros(J + 1); e[k + 1] = 1.0
    A[:, k] = lap4(e, h)[1:J]
print("asym =", np.max(np.abs(A - A.T)))
