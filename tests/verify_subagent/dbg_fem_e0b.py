# -*- coding: utf-8 -*-
import math
import numpy as np
from vlib import FEM1, simpson, dx4

l, a, c = 1.0, 1.0, 0.4
A1, A3, B2 = 0.05, 0.02, 0.03
phi1 = lambda x: 0.3 * np.sin(np.pi * x) + 0.2 * np.sin(3 * np.pi * x)
psi1 = lambda x: -0.15 * np.sin(2 * np.pi * x)
dphi = lambda x: A1 * np.sin(np.pi * x) + A3 * np.sin(3 * np.pi * x)
dpsi = lambda x: B2 * np.sin(2 * np.pi * x)
phi2 = lambda x: phi1(x) + dphi(x)
psi2 = lambda x: psi1(x) + dpsi(x)

f1 = FEM1(l=l, a=a, c=c, J=200, phi=phi1, psi=psi1)
f2 = FEM1(l=l, a=a, c=c, J=200, phi=phi2, psi=psi2)
print("dt1,dt2 =", f1.dtmax, f2.dtmax)
w = np.zeros(201); wt = np.zeros(201)
w[1:200] = f1.u - f2.u
wt[1:200] = f1.v - f2.v
h = f1.h
print("max|w - dphi| =", np.max(np.abs(w - dphi(f1.x))))
print("max|wt - dpsi| =", np.max(np.abs(wt - dpsi(f1.x))))
wx = dx4(w, h)
Ec = 0.5 * simpson(wt ** 2 + a * a * wx ** 2, h)
print("E_c(0) =", Ec, " 解析 =", 0.5 * (0.5*l*B2**2 + 0.5*l*(A1**2*math.pi**2 + A3**2*(3*math.pi)**2)))
print("simpson(wt^2) =", simpson(wt**2, h), " simpson(wx^2) =", simpson(wx**2, h))
print("完全体 u 数组长度:", len(f1.u), len(f2.u))
