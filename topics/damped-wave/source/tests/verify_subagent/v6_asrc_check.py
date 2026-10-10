# -*- coding: utf-8 -*-
"""定位 make_figures.py 中 Asrc 的归一化问题：
   scripts 里 self.Asrc += dt/6*(sum(f_n^2)+...) 少乘了 l/2（因为 ||f||^2 = (l/2)Σ f_n^2）。
   本脚本直接 exec 交付脚本的头部（含其 Modal 类本体），不修改任何交付文件。
"""
import json, math, os
import numpy as np
from vlib import Spectral, simpson, grid

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sandbox", "make_figures.py")
src = open(SRC, encoding="utf-8").read()
head = src.split("# ----------------------------- 计算")[0]
ns = {"__name__": "mf_head", "__file__": SRC}
exec(compile(head, SRC, "exec"), ns)
Modal = ns["Modal"]
l, a, c = 1.0, 1.0, 0.4
print("their l,a,c =", ns["l"], ns["a"], ns["c"])

A, w = 0.05, 1.7
def srcF(t):
    v = np.zeros(251); v[3] = A * math.cos(w * t); return v

# --- 1) 用交付脚本自己的 Modal 复现它的 Asrc
m = Modal(250, c=c, src=srcF)
for i in range(50000):
    m.step(2e-4)
Asrc_py = m.Asrc
Asrc_true = 0.5 * l * A ** 2 * (10.0 / 2 + math.sin(2 * w * 10.0) / (4 * w))
r1 = {"Asrc_make_figures": Asrc_py, "Asrc_true_(l/2)Sum": Asrc_true, "ratio": Asrc_py / Asrc_true,
      "E_w(10)": m.energy(), "bound_with_their_Asrc": Asrc_py / (2 * c),
      "bound_correct": Asrc_true / (2 * c)}

# --- 2) 我自研 Spectral，同样的 F，细采样求真实最大比值
def src_spectral(t):
    v = np.zeros(17); v[3] = A * math.cos(w * t); return v
s = Spectral(l=l, a=a, c=c, N=16, phi=np.zeros(17), psi=np.zeros(17), src=src_spectral)
dt, Ts = 2e-4, 2e-3
nper = int(round(Ts / dt))
best_correct, best_buggy, best_correct_coarse, best_buggy_coarse = 0, 0, 0, 0
t = 0.0
def ratio(t, correct=True):
    I = 0.5 * l * A ** 2 * (t / 2 + math.sin(2 * w * t) / (4 * w))
    if correct:
        return s.E() / (I / (2 * c))
    else:
        return s.E() / ((2 * I) / (2 * c))
for i in range(int(round(10.0 / dt))):
    s.step(dt)
    if (i + 1) % nper == 0:
        best_correct = max(best_correct, ratio(s.t, True))
        best_buggy = max(best_buggy, ratio(s.t, False))
    if (i + 1) % 500 == 0:      # 每 0.1 s（= make_figures.py 的采样间隔）
        best_correct_coarse = max(best_correct_coarse, ratio(s.t, True))
        best_buggy_coarse = max(best_buggy_coarse, ratio(s.t, False))

out = {
  "make_figures_Asrc_check": r1,
  "my_solver_same_F": {
     "max_ratio_correct_bound_fine_sampling": best_correct,
     "max_ratio_with_missing_l/2_fine_sampling": best_buggy,
     "max_ratio_correct_bound_0.1s_sampling": best_correct_coarse,
     "max_ratio_with_missing_l/2_0.1s_sampling": best_buggy_coarse,
  },
  "evidence_json_source_stability": 0.027788398416119874,
  "check_js_reported": 0.0578,
}
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open(os.path.join(HERE, "out_v6_asrc.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
