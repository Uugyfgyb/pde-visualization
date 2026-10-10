# -*- coding: utf-8 -*-
"""(a) 独立验证：能量单调递减 与 dE/dt = -c∫u_t^2 dx。

第三种方法（既不使用 engine.js 的 ModalSolver，也不使用 FDSolver）：
  A. Spectral : 正弦 Galerkin（空间精确）+ 经典 RK4；
  B. FEM1     : P1 有限元（一致质量阵）+ 经典 RK4。
能量/耗散全部由网格上的复合 Simpson / 质量矩阵二次型独立计算。
"""
import json, math
import numpy as np
from vlib import Spectral, FEM1, simpson, grid, lap4

l, a, c = 1.0, 1.0, 0.4
res = {}

# ---------- 0. 自检：算子与实现 ----------
ff = lambda x: np.sin(np.pi * x) + 0.3 * np.sin(3 * np.pi * x)
ffpp = lambda x: -(np.pi ** 2) * np.sin(np.pi * x) - 0.3 * 9 * np.pi ** 2 * np.sin(3 * np.pi * x)
err_int = []
for J in [40, 80, 160, 320]:
    x = grid(l, J); h = l / J
    d = lap4(ff(x), h) - ffpp(x)
    err_int.append(float(np.max(np.abs(d[3:J - 2]))))     # 纯内部点
orders_int = [math.log2(err_int[i] / err_int[i + 1]) for i in range(len(err_int) - 1)]
res["selftest_interior_stencil"] = {"max_err": err_int, "orders": orders_int}
# 单侧边界公式点态阶（仅看 j=1）
err_b = []
for J in [40, 80, 160, 320]:
    x = grid(l, J); h = l / J
    err_b.append(float(abs((lap4(ff(x), h) - ffpp(x))[1])))
res["selftest_boundary_stencil_order"] = [math.log2(err_b[i] / err_b[i + 1]) for i in range(len(err_b) - 1)]

# ---------- A. Spectral + RK4 ----------
phi = np.zeros(17); phi[1], phi[3], phi[5] = 1.0, 0.4, 0.15
psi = np.zeros(17); psi[2], psi[4] = 0.3, -0.2

def run_spectral(dt, Tsample, Tmax=10.0):
    s = Spectral(l=l, a=a, c=c, N=16, phi=phi, psi=psi)
    n_per = int(round(Tsample / dt))
    hist = [(0.0, s.E(), s.D())]
    for i in range(int(round(Tmax / dt))):
        s.step(dt)
        if (i + 1) % n_per == 0:
            hist.append((s.t, s.E(), s.D()))
    return s, np.array(hist)

resA = {}
for dt, Ts in [(1e-4, 5e-3), (1e-4, 1e-3), (1e-4, 2.5e-4)]:
    s, H = run_spectral(dt, Ts)
    t, E, D = H[:, 0], H[:, 1], H[:, 2]
    dEdt = (E[2:] - E[:-2]) / (t[2:] - t[:-2])
    rhs = -c * D[1:-1]
    rel = float(np.max(np.abs(dEdt - rhs)) / np.max(np.abs(rhs)))
    cum = np.concatenate([[0.0], np.cumsum(0.5 * (D[1:] + D[:-1]) * np.diff(t))])
    integ = float(np.max(np.abs(E[0] - c * cum - E)) / E[0])
    resA[f"sample={Ts:g}"] = {
        "E0": float(E[0]), "E(T=10)": float(E[-1]),
        "monotone_nonincreasing": bool(np.all(np.diff(E) <= 1e-14 * E[0])),
        "strict_decrease": bool(E[-1] < E[0]),
        "min_relative_drop_at_first_sample": float((E[0] - E[1]) / E[0]),
        "max_rel_resid_dEdt_vs_-cD": rel,
        "max_rel_resid_integral_form": integ,
    }
res["A_spectral_RK4"] = resA

# ---------- B. FEM1 + RK4，网格 refinement ----------
def run_fem(J, Tmax=6.0, Tsample=0.01):
    f = FEM1(l=l, a=a, c=c, J=J,
             phi=lambda x: np.sin(np.pi * x) + 0.4 * np.sin(3 * np.pi * x) + 0.15 * np.sin(5 * np.pi * x),
             psi=lambda x: 0.3 * np.sin(2 * np.pi * x) - 0.2 * np.sin(4 * np.pi * x))
    dt = f.dtmax
    n_per = max(1, int(round(Tsample / dt)))
    hist = [(0.0, f.Ec(), f.Eh(), f.Dc(), f.Dh())]
    for i in range(int(round(Tmax / dt))):
        f.step(dt)
        if (i + 1) % n_per == 0:
            hist.append((f.t, f.Ec(), f.Eh(), f.Dc(), f.Dh()))
    H = np.array(hist)
    return f, H, dt

resB = {}
for J in [40, 80, 160]:
    f, H, dt = run_fem(J)
    t, Ec, Eh, Dc, Dh = H[:, 0], H[:, 1], H[:, 2], H[:, 3], H[:, 4]
    dEh = (Eh[2:] - Eh[:-2]) / (t[2:] - t[:-2])
    rel_disc = float(np.max(np.abs(dEh + c * Dh[1:-1])) / np.max(np.abs(c * Dh[1:-1])))
    dEc = (Ec[2:] - Ec[:-2]) / (t[2:] - t[:-2])
    rel_cont = float(np.max(np.abs(dEc + c * Dc[1:-1])) / np.max(np.abs(c * Dc[1:-1])))
    resB[f"J={J}"] = {
        "dt": dt, "E0": float(Ec[0]), "E(T=6)": float(Ec[-1]),
        "monotone_nonincreasing_Ec": bool(np.all(np.diff(Ec) <= 1e-12 * Ec[0])),
        "strict_decrease": bool(Ec[-1] < Ec[0]),
        "max_rel_resid_discrete_M_identity": rel_disc,
        "max_rel_resid_continuous_simpson": rel_cont,
    }
res["B_FEM1_refine"] = resB

# ---------- C. c=0 对照 ----------
s = Spectral(l=l, a=a, c=0.0, N=16, phi=phi, psi=psi)
E0c = s.E(); worst = 0.0
for i in range(20000):
    s.step(1e-4)
    worst = max(worst, abs(s.E() - E0c) / E0c)
res["C_conservation_c0_spectral"] = {"rel_drift": float(worst)}

f0 = FEM1(l=l, a=a, c=0.0, J=80, phi=lambda x: np.sin(np.pi * x), psi=lambda x: 0.3 * np.sin(2 * np.pi * x))
E0h = f0.Eh(); worsth = 0.0
for i in range(20000):
    f0.step(f0.dtmax)
    worsth = max(worsth, abs(f0.Eh() - E0h) / E0h)
res["C_conservation_c0_FEM"] = {"rel_drift": float(worsth)}

print(json.dumps(res, indent=2, ensure_ascii=False))
with open("out_v1_energy.json", "w", encoding="utf-8") as fh:
    json.dump(res, fh, ensure_ascii=False, indent=2)
