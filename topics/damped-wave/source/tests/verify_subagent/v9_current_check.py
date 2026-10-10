# -*- coding: utf-8 -*-
"""复核当前版本：(i) make_figures.py 的 Asrc 归一化是否仍然缺 l/2；
(ii) 新的锐常数 γ=cl/(2πa), κ=c(1-γ)/(1+γ) 的 Lyapunov 界用我自己的解独立验证。"""
import json, math, os
import numpy as np
from vlib import Spectral, simpson, grid

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sandbox2", "make_figures.py")
src = open(SRC, encoding="utf-8").read()
head = src.split("# ----------------------------- 计算")[0]
ns = {"__name__": "mf_head", "__file__": SRC}
exec(compile(head, SRC, "exec"), ns)
Modal = ns["Modal"]
l, a, c = 1.0, 1.0, 0.4
A, w = 0.05, 1.7
def srcF(t):
    v = np.zeros(251); v[3] = A * math.cos(w * t); return v
m = Modal(250, c=c, src=srcF)
for i in range(50000):
    m.step(2e-4)
Asrc_true = 0.5 * l * A ** 2 * (10.0 / 2 + math.sin(2 * w * 10.0) / (4 * w))
asrc = {"Asrc_current_make_figures": m.Asrc, "Asrc_true": Asrc_true, "ratio": m.Asrc / Asrc_true,
        "current_gamma_in_script": ns["l"] and (lambda: None)()}

# ---- 用自己的 Spectral 解验证新的锐 Lyapunov 界（check.js 的拨弦 xp=l/2 初值）
N = 200
phi = np.zeros(N + 1)
Apl, Bpl = l / 2, l - l / 2
for n in range(1, N + 1):
    k = n * math.pi / l
    sk, ck = math.sin(k * Apl), math.cos(k * Apl)
    I1 = (sk - k * Apl * ck) / (Apl * k * k)
    kl = k * l
    s1 = (math.cos(k * Apl) - math.cos(kl)) / k
    s2 = (math.sin(kl) - kl * math.cos(kl) - (sk - k * Apl * ck)) / (k * k)
    phi[n] = 2 / l * (I1 + (l * s1 - s2) / Bpl)

s = Spectral(l=l, a=a, c=c, N=N, phi=phi, psi=np.zeros(N + 1))
E0 = s.E()
gam = c * l / (2 * math.pi * a); kap = c * (1 - gam) / (1 + gam)
dt, Ts = 2e-4, 5e-3
nper = int(round(Ts / dt))
worst = 0.0; worstG = 0.0; worstH = 0.0
Hp = []
for i in range(int(round(12.0 / dt))):
    s.step(dt)
    if (i + 1) % nper == 0:
        E = s.E(); G = s.G()
        worst = max(worst, E / (((1 + gam) / (1 - gam)) * E0 * math.exp(-kap * s.t)))
        worstG = max(worstG, abs(G) / E)
        worstH = max(worstH, abs(E + 0.5 * c * G - E) / E)   # |H-E|/E = (c/2)|G|/E
        Hp.append((s.t, E, G))
Hp = np.array(Hp)
Hl = Hp[:, 1] + 0.5 * c * Hp[:, 2]
dH = (Hl[2:] - Hl[:-2]) / (Hp[2:, 0] - Hp[:-2, 0])
rhs = -c * Hp[1:-1, 1] - 0.5 * c * c * Hp[1:-1, 2]
res = float(np.max(np.abs(dH - rhs)) / np.max(np.abs(rhs)))
out = {"asrc_check_current_version": asrc,
       "sharp_lyapunov_mine": {"gamma": gam, "kappa": kap, "E0": E0,
            "max_ratio_page_bound": worst, "check_js_reported": 0.9166,
            "max|G|/E": worstG, "sharp_constant_l/(pi a)": l / (math.pi * a),
            "max|H-E|/E": worstH, "gamma_bound_1+gamma": 1 + gam,
            "max_rel_resid_H'_eq": res}}
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open(os.path.join(HERE, "out_v9_current.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
