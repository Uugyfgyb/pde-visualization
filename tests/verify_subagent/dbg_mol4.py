# -*- coding: utf-8 -*-
"""诊断：四阶单侧边界 stencil 的 MOL 系统是否稳定（特征值实部）。"""
import numpy as np, json
from vlib import lap4, grid

def op_matrix(J, l=1.0):
    h = l / J
    A = np.zeros((J - 1, J - 1))
    for k in range(J - 1):
        e = np.zeros(J + 1); e[k + 1] = 1.0
        A[:, k] = lap4(e, h)[1:J]
    return A, h

out = {}
for J in [40, 80, 160]:
    A, h = op_matrix(J)
    ev = np.linalg.eigvals(A)
    out[f"J={J}"] = {"h": h, "max_real_eig": float(np.max(ev.real)),
                     "min_real_eig": float(np.min(ev.real)),
                     "max_abs_imag": float(np.max(np.abs(ev.imag))),
                     "n_positive_real": int(np.sum(ev.real > 0))}
    # 对照：纯内部四阶算子（Dirichlet 用奇延拓的三点公式在边界）的稳定性
print(json.dumps(out, indent=2))
