# -*- coding: utf-8 -*-
"""独立复核 make_figures.py 里 lyapunov_bound_max_ratio = 0.9123660200978753（拨弦 xp=l/3）。"""
import json, math
import numpy as np
from vlib import Spectral

l, a, c = 1.0, 1.0, 0.4
N = 200
phi = np.zeros(N + 1)
A, B = l / 3, l - l / 3
for n in range(1, N + 1):
    k = n * math.pi / l
    sk, ck = math.sin(k * A), math.cos(k * A)
    I1 = (sk - k * A * ck) / (A * k * k)
    kl = k * l
    s1 = (math.cos(k * A) - math.cos(kl)) / k
    s2 = (math.sin(kl) - kl * math.cos(kl) - (sk - k * A * ck)) / (k * k)
    phi[n] = 2 / l * (I1 + (l * s1 - s2) / B)

s = Spectral(l=l, a=a, c=c, N=N, phi=phi, psi=np.zeros(N + 1))
E0 = s.E()
gam = c * l / (2 * math.pi * a); kap = c * (1 - gam) / (1 + gam)
dt, Ts = 2e-4, 5e-3
nper = int(round(Ts / dt)); worst = 0.0
for i in range(int(round(12.0 / dt))):
    s.step(dt)
    if (i + 1) % nper == 0:
        worst = max(worst, s.E() / (((1 + gam) / (1 - gam)) * E0 * math.exp(-kap * s.t)))
out = {"E0": E0, "gamma": gam, "kappa": kap, "max_ratio_mine": worst,
       "make_figures_evidence": 0.9123660200978753, "E_at_12_mine": s.E(),
       "evidence_E_at_12": 0.01834397015878343}
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("out_v10_lyap_mf.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
