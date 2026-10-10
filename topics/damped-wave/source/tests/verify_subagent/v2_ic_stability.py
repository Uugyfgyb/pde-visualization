# -*- coding: utf-8 -*-
"""(b) 初值扰动的稳定性：E_w(t) ≤ E_w(0)，以及定理 3 的两个常数是否正确。

做法：用自研 Spectral(RK4) 分别独立求解 u1（初值 φ1,ψ1）与 u2（初值 φ1+δφ, ψ1+δψ），
再相减得到 w —— 而不是直接解 w 的方程，这样同时检验了叠加原理。
右端常数用解析初值算，并用 Simpson 独立复核。
"""
import json, math
import numpy as np
from vlib import Spectral, simpson, grid

l, a, c = 1.0, 1.0, 0.4
G = grid(l, 400)          # Simpson 网格
h = l / 400

def field(s, x):
    S = np.sin(np.outer(x, s.k[1:]))
    return S @ s.T[1:], S @ s.V[1:], S @ (s.k[1:] * s.T[1:])   # u, u_t, u_x

def run(phi, psi, T=10.0, dt=1e-4, Ts=0.005, src=None):
    s = Spectral(l=l, a=a, c=c, N=16, phi=phi, psi=psi, src=src)
    nper = int(round(Ts / dt))
    hist = []
    def snap():
        u, ut, ux = field(s, G)
        hist.append((s.t, u, ut, ux))
    snap()
    for i in range(int(round(T / dt))):
        s.step(dt)
        if (i + 1) % nper == 0:
            snap()
    return s, hist

# ---- 初值（modes 1,3 基态；模式 2,4 初速）
phi1 = np.zeros(17); phi1[1], phi1[3] = 0.3, 0.2
psi1 = np.zeros(17); psi1[2] = -0.15
# ---- 扰动
A1, A3, B2 = 0.05, 0.02, 0.03
dphi = np.zeros(17); dphi[1], dphi[3] = A1, A3
dpsi = np.zeros(17); dpsi[2] = B2
phi2, psi2 = phi1 + dphi, psi1 + dpsi

s1, H1 = run(phi1, psi1)
s2, H2 = run(phi2, psi2)
sD, HD = run(dphi, dpsi)          # 直接解 w 方程（对照）

# 解析常数
nrm_dpsi2 = 0.5 * l * B2 ** 2
nrm_dphip2 = 0.5 * l * ((math.pi / l) ** 2 * A1 ** 2 + (3 * math.pi / l) ** 2 * A3 ** 2)
bound2 = nrm_dpsi2 + a * a * nrm_dphip2          # ||δψ||² + a²||δφ'||²
bound1 = (l * l / (math.pi ** 2 * a * a)) * bound2
# Simpson 复核
nrm_dpsi2_s = simpson((np.sin(2 * np.pi * G / l) * B2) ** 2, h)
nrm_dphip2_s = simpson((A1 * (math.pi / l) * np.cos(np.pi * G / l) + A3 * (3 * math.pi / l) * np.cos(3 * np.pi * G / l)) ** 2, h)

rec = {"analytic": {"||dpsi||^2": nrm_dpsi2, "||dphi'||^2": nrm_dphip2,
                    "||dpsi||^2_simpson": nrm_dpsi2_s, "||dphi'||^2_simpson": nrm_dphip2_s,
                    "bound_L2": bound1, "bound_vt": bound2}}
Ew0 = None
maxE, maxL2, maxVt, maxD = 0.0, 0.0, 0.0, 0.0
maxE_diff, maxL2_diff = 0.0, 0.0
worst_mono = -1e30
for (t1, u1, v1, g1), (t2, u2, v2, g2), (t3, u3, v3, g3) in zip(H1, H2, HD):
    w, wt, wx = u1 - u2, v1 - v2, g1 - g2
    Ew = 0.5 * simpson(wt ** 2 + a * a * wx ** 2, h)
    L2w = simpson(w ** 2, h)
    Dw = simpson(wt ** 2, h)
    # 与"直接解 w 方程"的结果对比（叠加原理）
    maxE_diff = max(maxE_diff, abs(Ew - 0.5 * simpson(v3 ** 2 + a * a * g3 ** 2, h)))
    maxL2_diff = max(maxL2_diff, abs(L2w - simpson(u3 ** 2, h)))
    if Ew0 is None:
        Ew0 = Ew
    maxE = max(maxE, Ew / Ew0)
    maxL2 = max(maxL2, L2w / bound1)
    maxVt = max(maxVt, Dw / bound2)
    worst_mono = max(worst_mono, 0.0)
rec["check"] = {
    "Ew0": Ew0, "Ew(T)": Ew, "Ew(T)/Ew0": Ew / Ew0,
    "max_t Ew/Ew0 (<=1)": maxE,
    "max_t ||w||^2/bound_L2 (<=1)": maxL2,
    "max_t ||w_t||^2/bound_vt (<=1)": maxVt,
    "superposition_max_abs_diff_E": maxE_diff,
    "superposition_max_abs_diff_L2": maxL2_diff,
}

# ---- 常数尖锐性：δφ = A sin(πx/l), δψ = 0，t -> 0 时比值 -> 1
sharp = {}
for m, A in [(1, 0.05), (2, 0.05)]:
    ph = np.zeros(17); ph[m] = A
    s, H = run(ph, np.zeros(17), T=0.02, dt=1e-5, Ts=2e-4)
    r = []
    for (t, u, v, g) in H[:6]:
        L2w = simpson(u ** 2, h)
        b2 = 0.5 * l * a * a * (m * math.pi / l) ** 2 * A ** 2
        b1 = (l * l / (math.pi ** 2 * a * a)) * b2
        r.append({"t": t, "ratio_L2": L2w / b1})
    sharp[f"mode{m}"] = r
rec["sharpness_phi_only"] = sharp

# ---- 尖锐性：δφ = 0, δψ = B sin(πx/l) -> ||w_t||² 界在 t=0 取等号
ph = np.zeros(17); ps = np.zeros(17); ps[1] = 0.05
s = Spectral(l=l, a=a, c=c, N=16, phi=ph, psi=ps)
rec["sharpness_psi_only_t0"] = {"||w_t(0)||^2": s.D(), "bound_vt": 0.5 * l * 0.05 ** 2,
                                "ratio": s.D() / (0.5 * l * 0.05 ** 2)}
print(json.dumps(rec, indent=2, ensure_ascii=False))
json.dump(rec, open("out_v2_ic.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
