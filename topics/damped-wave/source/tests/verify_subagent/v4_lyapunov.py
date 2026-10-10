# -*- coding: utf-8 -*-
"""注记 6（Lyapunov 指数衰减）的独立核对：
   H' = -cE - (c²/2)G, |G| ≤ (2l/πa)E（页面用的常数）以及更尖锐的 |G| ≤ (l/πa)E，
   (1-γ)E ≤ H ≤ (1+γ)E, E(t) ≤ ((1+γ)/(1-γ))E(0)e^{-κt}, γ = cl/(πa), κ = c(1-γ)/(1+γ)。
"""
import json, math
import numpy as np
from vlib import Spectral, simpson, grid

def run(l, a, c, T, modes, dt=1e-4, Ts=0.005):
    phi = np.zeros(17)
    for n, amp in modes: phi[n] = amp
    s = Spectral(l=l, a=a, c=c, N=16, phi=phi, psi=np.zeros(17))
    nper = int(round(Ts / dt)); hist = [(0.0, s.E(), s.D(), s.G())]
    for i in range(int(round(T / dt))):
        s.step(dt)
        if (i + 1) % nper == 0: hist.append((s.t, s.E(), s.D(), s.G()))
    return np.array(hist)

out = {}
for tag, (l, a, c, T, modes) in {
    "base(c=0.4,l=1,a=1)": (1.0, 1.0, 0.4, 10.0, [(1, 0.5), (2, 0.3), (3, 0.2)]),
    "weak(c=0.1)": (1.0, 1.0, 0.1, 30.0, [(1, 0.5), (2, 0.3), (3, 0.2)]),
    "geom(l=2,a=0.4,c=0.3)": (2.0, 0.4, 0.3, 20.0, [(1, 0.5), (3, 0.3)]),
}.items():
    H = run(l, a, c, T, modes)
    t, E, D, G = H[:, 0], H[:, 1], H[:, 2], H[:, 3]
    gam = c * l / (math.pi * a)
    kap = c * (1 - gam) / (1 + gam)
    Hl = E + 0.5 * c * G
    dH = (Hl[2:] - Hl[:-2]) / (t[2:] - t[:-2])
    rhs = -c * E[1:-1] - 0.5 * c * c * G[1:-1]
    rel = float(np.max(np.abs(dH - rhs)) / np.max(np.abs(rhs)))
    sharp = l / (math.pi * a)
    loose = 2 * l / (math.pi * a)
    rec = {
        "gamma": gam, "kappa": kap,
        "max|G|/E": float(np.max(np.abs(G) / E)),
        "bound_loose_2l/(pi a)": loose, "bound_sharp_l/(pi a)": sharp,
        "max_rel_resid_H'_eq": rel,
        "min(H/E)": float(np.min(Hl / E)), "1-gamma": 1 - gam,
        "max(H/E)": float(np.max(Hl / E)), "1+gamma": 1 + gam,
        "max_t E(t)/((1+γ)/(1-γ)E0 e^{-κt})": float(np.max(E / (((1 + gam) / (1 - gam)) * E[0] * np.exp(-kap * t)))),
    }
    gs = gam / 2.0; ks = c * (1 - gs) / (1 + gs)
    rec["improved_with_sharp_G: gamma'=gamma/2, kappa'"] = {"gamma'": gs, "kappa'": ks,
        "max_ratio": float(np.max(E / (((1 + gs) / (1 - gs)) * E[0] * np.exp(-ks * t))))}
    out[tag] = rec

# 强阻尼：H 是否可能变负（说明 γ<1 的限制来自证明所用的较松常数）
Hs = run(1.0, 1.0, 8.0, 6.0, [(1, 0.5), (2, 0.3)], Ts=0.002)
t, E, D, G = Hs[:, 0], Hs[:, 1], Hs[:, 2], Hs[:, 3]
Hl = E + 4.0 * G
out["strong_damping(c=8)"] = {"min(H/E)": float(np.min(Hl / E)), "gamma": 8 / math.pi,
                              "note": "γ>1 时 |G|≤2lE/(πa) 不能保证 H≥0"}
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("out_v4_lyap.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
