# -*- coding: utf-8 -*-
"""交叉校验：我自研的 Spectral(RK4) 与交付 engine.js 的 ModalSolver（解析传播子）对比。"""
import json
import numpy as np
from vlib import Spectral

l, a, c = 1.0, 1.0, 0.4
phi = np.zeros(17); phi[1], phi[3], phi[5] = 1.0, 0.4, 0.15
psi = np.zeros(17); psi[2], psi[4] = 0.3, -0.2

ref = json.load(open("out_cross_engine.json", encoding="utf-8"))

s = Spectral(l=l, a=a, c=c, N=16, phi=phi, psi=psi)
s.advance(3.0, 1e-4)
mine = {"E": s.E(), "D": s.D(), "L2": s.L2(), "H1": s.H1(), "G": s.G(),
        "T": list(s.T[1:7]), "V": list(s.V[1:7])}
refT = ref["T"][1:7]; refV = ref["V"][1:7]
out = {
    "t_engine": ref["t"], "t_mine": s.t,
    "E_engine": ref["E"], "E_mine": mine["E"], "E_rel_diff": abs(ref["E"] - mine["E"]) / ref["E"],
    "D_engine": ref["D"], "D_mine": mine["D"], "D_rel_diff": abs(ref["D"] - mine["D"]) / ref["D"],
    "L2_rel_diff": abs(ref["L2"] - mine["L2"]) / ref["L2"],
    "H1_rel_diff": abs(ref["H1"] - mine["H1"]) / ref["H1"],
    "G_rel_diff": abs(ref["G"] - mine["G"]) / max(abs(ref["G"]), 1e-30),
    "T_max_abs_diff": float(np.max(np.abs(np.array(refT) - np.array(mine["T"])))),
    "V_max_abs_diff": float(np.max(np.abs(np.array(refV) - np.array(mine["V"])))),
}
# 场对比（engine 的 FD 解在 t=3.0015 与我自研 Spectral 在同一时刻比较）
tfd = ref["fd"]["tHi"]
s2 = Spectral(l=l, a=a, c=c, N=16, phi=phi, psi=psi); s2.advance(tfd, 1e-4)
ufd = []
for k, v in ref["fd"]["field"].items():
    x = float(k); ue, _ = s2.sample(np.array([x]))
    ufd.append({"x": x, "u_FD_engine": v, "u_mine_spectral": float(ue[0]), "abs_diff": abs(v - float(ue[0]))})
out["fd_vs_mine_at_t=%.4f" % tfd] = ufd
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("out_v5_cross.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
