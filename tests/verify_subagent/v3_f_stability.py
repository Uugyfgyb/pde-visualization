# -*- coding: utf-8 -*-
"""(c) f 扰动的稳定性：E_w(t) ≤ (1/2c)∫_0^t||F||² ds（定理 4 及其 L² 常数）。
同时用"缺少 l/2 因子"的 Asrc 复现 figures/evidence.json 里的 0.0278，以定位该因子问题。
"""
import json, math
import numpy as np
from vlib import Spectral, simpson, grid

l, a, c = 1.0, 1.0, 0.4
G = grid(l, 400); h = l / 400

def field(s, x):
    S = np.sin(np.outer(x, s.k[1:]))
    return S @ s.T[1:], S @ s.V[1:]

def run(src, T=10.0, dt=1e-4, Ts=0.005):
    s = Spectral(l=l, a=a, c=c, N=16, phi=np.zeros(17), psi=np.zeros(17), src=src)
    nper = int(round(Ts / dt)); hist = []
    def snap(): hist.append((s.t,) + field(s, G))
    snap()
    for i in range(int(round(T / dt))):
        s.step(dt)
        if (i + 1) % nper == 0: snap()
    return s, hist

# F(x,t) = A cos(w t) sin(3pi x/l) + A2 cos(w2 t) sin(2pi x/l)
A, w = 0.05, 1.7
A2, w2 = 0.03, 0.9
def src_common(t):
    v = np.zeros(17); v[1] = A2 * math.cos(w2 * t); return v
def src1(t):
    v = src_common(t); v[3] = A * math.cos(w * t); return v
def src2(t):
    return src_common(t)

def F_norm2_int(t):   # ∫_0^t ||F||² ds，解析
    half = 0.5 * l
    I1 = A ** 2 * (t / 2 + math.sin(2 * w * t) / (4 * w))
    I2 = A2 ** 2 * (t / 2 + math.sin(2 * w2 * t) / (4 * w2))
    return half * (I1 + I2)

s1, H1 = run(src1); s2, H2 = run(src2)
rec = {}
worstE = worstL2 = worstVt = 0.0
worstE_bad = 0.0
for (t, u1, v1), (t2, u2, v2) in zip(H1, H2):
    w_, wt = u1 - u2, v1 - v2
    Ew = 0.5 * simpson(wt ** 2, h) + 0.5 * a * a * simpson(
        (np.gradient(w_, h)) ** 2, h)
    L2w = simpson(w_ ** 2, h)
    Vt2 = simpson(wt ** 2, h)
    I = F_norm2_int(t)
    if I > 1e-12:
        worstE = max(worstE, Ew / (I / (2 * c)))
        worstL2 = max(worstL2, L2w / ((l * l / (math.pi ** 2 * a * a * c)) * I))
        worstVt = max(worstVt, Vt2 / (I / c))
        worstE_bad = max(worstE_bad, Ew / ((2 * I) / (2 * c)))   # 缺少 l/2 的 Asrc
rec["max_ratios"] = {
    "Ew / [(1/2c)∫||F||²] (<=1)": worstE,
    "||w||² / [l²∫||F||²/(π²a²c)] (<=1)": worstL2,
    "||w_t||² / [∫||F||²/c] (<=1)": worstVt,
    "Ew / [(1/2c)·(2∫||F||²)] （缺少 l/2 的错误归一化，对应 evidence.json 0.0278）": worstE_bad,
}
rec["Ew(T)"] = Ew; rec["bound(T)"] = F_norm2_int(10.0) / (2 * c)

# ---- 慢变（准静态）F，看界有多紧
A3, w3 = 0.05, 0.2
def src3(t):
    v = np.zeros(17); v[1] = A3 * math.cos(w3 * t); return v
s3, H3 = run(src3)
wE = 0.0
for (t, u, v) in H3:
    Ew = 0.5 * simpson(v ** 2, h) + 0.5 * a * a * simpson((np.gradient(u, h)) ** 2, h)
    I = 0.5 * l * A3 ** 2 * (t / 2 + math.sin(2 * w3 * t) / (4 * w3))
    if I > 1e-12: wE = max(wE, Ew / (I / (2 * c)))
rec["slow_source_max_ratio"] = wE
print(json.dumps(rec, indent=2, ensure_ascii=False))
json.dump(rec, open("out_v3_f.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
