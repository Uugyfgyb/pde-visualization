# -*- coding: utf-8 -*-
"""用第二种自研方法（P1 有限元 + RK4）复核 (b) 与 (c)，确认结论不依赖空间离散方式。"""
import json, math
import numpy as np
from vlib import FEM1, simpson, dx4

l, a, c = 1.0, 1.0, 0.4
out = {}

def run(phi, psi, src=None, T=10.0, J=200, Ts=0.01):
    f = FEM1(l=l, a=a, c=c, J=J, phi=phi, psi=psi, src=src)
    dt = f.dtmax; nper = max(1, int(round(Ts / dt)))
    hist = []
    def snap():
        u = np.zeros(J + 1); v = np.zeros(J + 1)
        u[1:J] = f.u; v[1:J] = f.v
        hist.append((f.t, u, v))
    snap()
    for i in range(int(round(T / dt))):
        f.step(dt)
        if (i + 1) % nper == 0: snap()
    return f, hist, dt

# ---- (b) 初值扰动
phi1 = lambda x: 0.3 * np.sin(np.pi * x) + 0.2 * np.sin(3 * np.pi * x)
psi1 = lambda x: -0.15 * np.sin(2 * np.pi * x)
A1, A3, B2 = 0.05, 0.02, 0.03
dphi = lambda x: A1 * np.sin(np.pi * x) + A3 * np.sin(3 * np.pi * x)
dpsi = lambda x: B2 * np.sin(2 * np.pi * x)
phi2 = lambda x: phi1(x) + dphi(x)
psi2 = lambda x: psi1(x) + dpsi(x)

f1, H1, dt1 = run(phi1, psi1)
f2, H2, dt2 = run(phi2, psi2)
nrm_dpsi2 = 0.5 * l * B2 ** 2
nrm_dphip2 = 0.5 * l * ((math.pi / l) ** 2 * A1 ** 2 + (3 * math.pi / l) ** 2 * A3 ** 2)
bound2 = nrm_dpsi2 + a * a * nrm_dphip2
bound1 = (l * l / (math.pi ** 2 * a * a)) * bound2
h = f1.h
Ew0 = None; mE = mL = mV = 0.0; worst_up = -1e9
for (t, u1, v1), (t2, u2, v2) in zip(H1, H2):
    w = u1 - u2; wt = v1 - v2; wx = dx4(w, h)
    Ew = 0.5 * simpson(wt ** 2 + a * a * wx ** 2, h)
    L2 = simpson(w ** 2, h); V2 = simpson(wt ** 2, h)
    if Ew0 is None: Ew0 = Ew
    mE = max(mE, Ew / Ew0); mL = max(mL, L2 / bound1); mV = max(mV, V2 / bound2)
    if t > 0: worst_up = max(worst_up, Ew / Ew0)
out["FEM_b_ic"] = {"J": 200, "dt": dt1, "Ew0": Ew0,
                   "Ew0_analytic": 0.5 * bound2,
                   "max_all_t Ew/Ew0": mE, "max_t>0 Ew/Ew0": worst_up,
                   "max ||w||²/bound_L2": mL, "max ||w_t||²/bound_vt": mV}

# ---- (c) f 扰动
A, w_ = 0.05, 1.7
src1 = lambda x, t: A * np.cos(w_ * t) * np.sin(3 * np.pi * x / l)
f3, H3, dt3 = run(lambda x: np.zeros_like(x), lambda x: np.zeros_like(x), src=src1)
mE = mL = mV = 0.0
for (t, u, v) in H3:
    if t < 1e-12: continue
    I = 0.5 * l * A ** 2 * (t / 2 + math.sin(2 * w_ * t) / (4 * w_))
    wx = dx4(u, h)
    Ew = 0.5 * simpson(v ** 2 + a * a * wx ** 2, h)
    L2 = simpson(u ** 2, h); V2 = simpson(v ** 2, h)
    mE = max(mE, Ew / (I / (2 * c)))
    mL = max(mL, L2 / ((l * l / (math.pi ** 2 * a * a * c)) * I))
    mV = max(mV, V2 / (I / c))
out["FEM_c_source"] = {"J": 200, "dt": dt3, "max Ew/[(1/2c)∫||F||²]": mE,
                       "max ||w||²/[l²∫||F||²/(π²a²c)]": mL, "max ||w_t||²/[∫||F||²/c]": mV}
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("out_v8_fem_stability.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
