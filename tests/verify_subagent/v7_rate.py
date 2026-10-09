# -*- coding: utf-8 -*-
"""页面 (c) 面板把"观测衰减率"与"参考 c"并列。该结论只在弱阻尼（c<2aπ/l，首模态欠阻尼）成立。
这里给出滑块范围内（c=2, l=2, a=0.4, γ=3.18>1）的反例数值。"""
import json, math
import numpy as np
from vlib import Spectral

def rate(l, a, c, T):
    # 拨弦初值（正弦系数解析）
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
    s.advance(T, 1e-4)
    lam1 = a * math.pi / l
    under = c / 2 < lam1
    r = (c / 2 - math.sqrt((c / 2) ** 2 - lam1 ** 2)) if not under else c / 2
    return {"l": l, "a": a, "c": c, "gamma": c * l / (math.pi * a), "T": T,
            "E0": E0, "E(T)": s.E(),
            "observed_rate": math.log(E0 / s.E()) / T,
            "c": c, "first_mode_lambda": lam1, "first_mode_underdamped": under,
            "slow_mode_theory_rate": r}

out = [rate(1.0, 1.0, 0.4, 10.0), rate(2.0, 0.4, 2.0, 60.0), rate(2.0, 0.4, 2.0, 120.0)]
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("out_v7_rate.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
