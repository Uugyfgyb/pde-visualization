# -*- coding: utf-8 -*-
"""make_figures.py — 阻尼波动方程 u_tt = a^2 u_xx - c u_t 的静态验证图与数值报告
用 Python 独立重写一遍模态解（与 JS 引擎不同代码、同一数学），生成：
  figures/fig1_decay.png      能量递减 / 耗散率恒等式 / 时空图 / 形状衰减
  figures/fig2_stability.png  对初值与对 f 的稳定性 + 有限差分二阶收敛
  figures/evidence.json       页面与最终答复引用的关键数字
运行： python make_figures.py
"""
import json, math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import cm

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)

l, a, c = 1.0, 1.0, 0.4


# ----------------------------- 模态精确解 -----------------------------
class Modal:
    """T_n'' + c T_n' + (a k_n)^2 T_n = f_n，逐步解析传播 + 单步 Simpson 源项积分"""

    def __init__(self, N=200, c=c, phi_n=None, psi_n=None, src=None):
        self.N, self.c, self.a, self.l = N, c, a, l
        self.k = np.arange(N + 1) * np.pi / l
        self.lam = a * self.k
        self.T = np.zeros(N + 1)
        self.V = np.zeros(N + 1)
        if phi_n is not None:
            self.T[: len(phi_n)] = phi_n
        if psi_n is not None:
            self.V[: len(psi_n)] = psi_n
        self.src = src if src is not None else (lambda t: np.zeros(N + 1))
        self.t = 0.0
        self.Adiss = 0.0     # ∫∫ u_t^2
        self.Aforce = 0.0    # ∫∫ f u_t
        self.Asrc = 0.0      # ∫ |f|^2 ds

    def energy(self):
        return 0.25 * self.l * np.sum(self.V ** 2 + self.lam ** 2 * self.T ** 2)

    def diss(self):
        return 0.5 * self.l * np.sum(self.V ** 2)

    def l2(self):
        return 0.5 * self.l * np.sum(self.T ** 2)

    def force_inner_ut(self):
        return 0.5 * self.l * np.sum(self.fn(self.t) * self.V)

    def fn(self, t):
        return self.src(t)

    def step(self, dt):
        N, cc = self.N, self.c
        half = dt / 2
        D0, F0 = self.diss(), self.force_inner_ut()
        d = self.lam ** 2 - cc ** 2 / 4
        for n in range(1, N + 1):
            lam = self.lam[n]
            T0, V0 = self.T[n], self.V[n]
            e = math.exp(-cc * dt / 2)
            if d[n] > 1e-14:
                w = math.sqrt(d[n])
                A = (V0 + cc * T0 / 2) / w
                C, S = math.cos(w * dt), math.sin(w * dt)
                T = e * (T0 * C + A * S)
                V = e * (A * w * C - T0 * w * S - cc / 2 * (T0 * C + A * S))
            elif d[n] < -1e-14:
                mu = math.sqrt(-d[n])
                A = (V0 + cc * T0 / 2) / mu
                C, S = math.cosh(mu * dt), math.sinh(mu * dt)
                T = e * (T0 * C + A * S)
                V = e * (T0 * mu * S + A * mu * C - cc / 2 * (T0 * C + A * S))
            else:
                A = V0 + cc * T0 / 2
                T = e * (T0 + A * dt)
                V = e * (A - cc / 2 * (T0 + A * dt))
            f0, fh, f1 = self.fn(self.t)[n], self.fn(self.t + half)[n], self.fn(self.t + dt)[n]
            if f0 or fh or f1:
                T += half / 3 * (K(lam, cc, 0) * f1 + 4 * K(lam, cc, half) * fh + K(lam, cc, dt) * f0)
                V += half / 3 * (KD(lam, cc, 0) * f1 + 4 * KD(lam, cc, half) * fh + KD(lam, cc, dt) * f0)
            self.T[n], self.V[n] = T, V
        self.t += dt
        D1, F1 = self.diss(), self.force_inner_ut()
        self.Adiss += dt / 2 * (D0 + D1)
        self.Aforce += dt / 2 * (F0 + F1)
        # ||f(.,s)||^2_{L^2(0,l)} = (l/2) * sum_n f_n(s)^2  —— 别漏掉 (l/2)
        self.Asrc += (self.l / 2) * dt / 6 * (np.sum(self.fn(self.t - dt) ** 2) + 4 * np.sum(self.fn(self.t - half) ** 2) + np.sum(self.fn(self.t) ** 2))
        return self

    def field(self, x):
        S = np.sin(np.outer(x, self.k[1:]))
        return S @ self.T[1:]

    def field_t(self, x):
        S = np.sin(np.outer(x, self.k[1:]))
        return S @ self.V[1:]


def K(lam, cc, tau):
    d = lam * lam - cc * cc / 4
    if d > 1e-14:
        return math.exp(-cc * tau / 2) * math.sin(math.sqrt(d) * tau) / math.sqrt(d)
    if d < -1e-14:
        return math.exp(-cc * tau / 2) * math.sinh(math.sqrt(-d) * tau) / math.sqrt(-d)
    return math.exp(-cc * tau / 2) * tau


def KD(lam, cc, tau):
    d = lam * lam - cc * cc / 4
    e = math.exp(-cc * tau / 2)
    if d > 1e-14:
        w = math.sqrt(d)
        return e * (math.cos(w * tau) - cc / (2 * w) * math.sin(w * tau))
    if d < -1e-14:
        mu = math.sqrt(-d)
        return e * (math.cosh(mu * tau) - cc / (2 * mu) * math.sinh(mu * tau))
    return e * (1 - cc * tau / 2)


def pluck_coefs(xp, N):
    """三角拨弦初值 phi 的正弦系数（解析）"""
    out = np.zeros(N + 1)
    A, B = xp, l - xp
    for n in range(1, N + 1):
        k = n * np.pi / l
        sk, ck = math.sin(k * A), math.cos(k * A)
        I1 = (sk - k * A * ck) / (A * k * k)
        kl = k * l
        s1 = (math.cos(k * A) - math.cos(kl)) / k
        s2 = (math.sin(kl) - kl * math.cos(kl) - (sk - k * A * ck)) / (k * k)
        out[n] = 2 / l * (I1 + (l * s1 - s2) / B)
    return out


def gauss_coefs(x0, w, N):
    xs = np.linspace(0, l, 8001)
    g = np.exp(-((xs - x0) ** 2) / (2 * w * w))
    out = np.zeros(N + 1)
    for n in range(1, N + 1):
        k = n * np.pi / l
        out[n] = 2 / l * np.trapezoid(g * np.sin(k * xs), xs)
    return out


def run(model, T, dt, every=1):
    hist = [(model.t, model.energy(), model.diss())]
    n = int(round(T / dt))
    for i in range(n):
        model.step(dt)
        if (i + 1) % every == 0:
            hist.append((model.t, model.energy(), model.diss()))
    return np.array(hist)


# ----------------------------- 计算 -----------------------------
phi = pluck_coefs(l / 3, 200)
m0 = Modal(200, c=c, phi_n=phi)
E0 = m0.energy()
hist = run(m0, 12.0, 2e-3, every=5)
ts, Es, Ds = hist[:, 0], hist[:, 1], hist[:, 2]
dEdt = np.gradient(Es, ts)
resid_identity = abs(E0 - c * m0.Adiss - m0.energy()) / E0
gamma = c * l / (2 * np.pi * a)
kappa = c * (1 - gamma) / (1 + gamma)

# 初值扰动：w 满足齐次方程、零边界，初值 = δφ, δψ
mphi = gauss_coefs(0.35, 0.05, 250)
mpsi = np.zeros(251); mpsi[2] = 0.01; mpsi[3] = 0.005
mw = Modal(250, c=c, phi_n=mphi, psi_n=mpsi)
Ew0 = mw.energy()
hw = run(mw, 10.0, 2e-3, every=5)
tw, Ew = hw[:, 0], hw[:, 1]
# 重跑一遍记录 L2 范数 ||w(·,t)||
mw3 = Modal(250, c=c, phi_n=mphi, psi_n=mpsi)
l2w = [mw3.l2()]
for i in range(5000):
    mw3.step(2e-3)
    if (i + 1) % 5 == 0:
        l2w.append(mw3.l2())
l2w = np.array(l2w)
boundE = np.full_like(tw, Ew0)
boundL2 = 2 * l * l / (np.pi ** 2 * a * a) * Ew0

# f 扰动：w 满足方程带源 F = 0.05 sin(3πx/l) cos(1.7 t)，零初值
def srcF(t):
    v = np.zeros(251); v[3] = 0.05 * math.cos(1.7 * t); return v
mwf = Modal(250, c=c, src=srcF)
hf = run(mwf, 10.0, 2e-4, every=50)
tf, Ewf = hf[:, 0], hf[:, 1]
mwf2 = Modal(250, c=c, src=srcF)
Asrc = [0.0]
for i in range(50000):
    mwf2.step(2e-4)
    if (i + 1) % 50 == 0:
        Asrc.append(mwf2.Asrc)
Asrc = np.array(Asrc)
boundF = Asrc / (2 * c)

# 有限差分（numpy）与模态解比较：二阶收敛
def fd_solve(J, T, phi_fun, c=c, a=a, cfl=0.9):
    dx = l / J
    h = cfl * dx / a
    r2 = (a * h / dx) ** 2
    x = np.linspace(0, l, J + 1)
    up = phi_fun(x)
    d2 = np.zeros(J + 1)
    d2[1:-1] = (phi_fun(x[2:]) - 2 * phi_fun(x[1:-1]) + phi_fun(x[:-2])) / dx ** 2
    uc = up + h * h / 2 * (a * a * d2)
    uc[0] = uc[-1] = 0
    n = int(math.ceil(T / h))
    k1, k2 = 1 - c * h / 2, 1 + c * h / 2
    for _ in range(n):
        lap = np.zeros(J + 1)
        lap[1:-1] = uc[2:] - 2 * uc[1:-1] + uc[:-2]
        nx = (2 * uc - k1 * up + r2 * lap) / k2
        nx[0] = nx[-1] = 0
        up, uc = uc, nx
    # 启动层在 t=h，之后又走了 n 步，故 uc 位于 t=(n+1)h
    return (n + 1) * h, x, uc


phi_fun = lambda x: np.exp(-((x - 0.3) ** 2) / (2 * 0.06 ** 2))
errs, Js = [], [50, 100, 200, 400]
for J in Js:
    Tstar, x, ufd = fd_solve(J, 0.5, phi_fun)
    mm = Modal(800, c=c, phi_n=gauss_coefs(0.3, 0.06, 800))
    mm.step(Tstar)
    errs.append(float(np.max(np.abs(ufd - mm.field(x)))))
orders = [math.log2(errs[i] / errs[i + 1]) for i in range(len(errs) - 1)]

# ----------------------------- 图 1 -----------------------------
fig, ax = plt.subplots(2, 2, figsize=(13, 8.4))
xs = np.linspace(0, l, 401)
m1 = Modal(200, c=c, phi_n=phi)
snap_t = [0.0, 0.5, 1.0, 2.0, 4.0, 8.0]
colors = cm.viridis(np.linspace(0.95, 0.15, len(snap_t)))
for tt, col in zip(snap_t, colors):
    m1.step(tt - m1.t)
    ax[0, 0].plot(xs, m1.field(xs), color=col, lw=1.8, label=f"t = {tt:g}")
ax[0, 0].set_title("(a) 弦的形状：摩擦使振动逐渐消失", fontsize=11)
ax[0, 0].set_xlabel("x"); ax[0, 0].set_ylabel("u(x,t)")
ax[0, 0].legend(fontsize=8, ncol=2); ax[0, 0].grid(alpha=.25)

# 时空图
m2 = Modal(200, c=c, phi_n=phi)
Tmap, dtm = 6.0, 2e-3
nm = int(Tmap / dtm)
U = np.zeros((nm // 20 + 1, len(xs)))
kk = 0
for i in range(nm + 1):
    if i % 20 == 0:
        U[kk] = m2.field(xs); kk += 1
    m2.step(dtm)
im = ax[0, 1].imshow(U, aspect="auto", origin="lower", cmap="RdBu_r",
                     extent=[0, l, 0, Tmap], vmin=-1, vmax=1)
ax[0, 1].set_title("(b) 时空图 u(x,t)：能量沿特征线往返并被摩擦耗散", fontsize=11)
ax[0, 1].set_xlabel("x"); ax[0, 1].set_ylabel("t")
plt.colorbar(im, ax=ax[0, 1], label="u")

ax[1, 0].semilogy(ts, Es / E0, lw=2, color="#1f77b4", label=r"$E(t)/E(0)$（数值）")
ax[1, 0].semilogy(ts, np.exp(-c * ts), "k--", lw=1.2, label=r"$e^{-ct}$（衰减率参考）")
ax[1, 0].semilogy(ts, (1 + gamma) / (1 - gamma) * np.exp(-kappa * ts), "r:", lw=1.6,
                  label=r"Lyapunov 上界 $\frac{1+\gamma}{1-\gamma}e^{-\kappa t}$")
ax[1, 0].semilogy(ts, np.ones_like(ts), color="gray", lw=1, label=r"$E(0)$（单调不增的水平线）")
ax[1, 0].set_xlabel("t"); ax[1, 0].set_ylabel(r"$E/E(0)$")
ax[1, 0].set_title(r"(c) 能量单调递减：$\dot E=-c\int u_t^2\,dx\leq 0$", fontsize=11)
ax[1, 0].legend(fontsize=8); ax[1, 0].grid(alpha=.25, which="both")

ax[1, 1].plot(ts, dEdt, lw=2, label=r"数值 $\mathrm{d}E/\mathrm{d}t$")
ax[1, 1].plot(ts, -c * Ds, "r--", lw=1.4, label=r"$-c\int_0^l u_t^2\,\mathrm{d}x$（由证明给出）")
ax[1, 1].set_xlabel("t"); ax[1, 1].set_ylabel("耗散功率")
ax[1, 1].set_title("(d) 恒等式 dE/dt = −c∫u_t² 的数值核对（两条曲线重合）", fontsize=11)
ax[1, 1].legend(fontsize=8); ax[1, 1].grid(alpha=.25)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig1_decay.png"), dpi=150)
plt.close(fig)

# ----------------------------- 图 2 -----------------------------
fig, ax = plt.subplots(2, 2, figsize=(13, 8.4))
ax[0, 0].plot(tw, Ew / Ew0, lw=2, label=r"$E_w(t)/E_w(0)$（初值扰动差）")
ax[0, 0].plot(tw, np.ones_like(tw), "k--", lw=1.2, label=r"上界 $E_w(0)$")
ax[0, 0].plot(tw, l2w / boundL2, lw=1.6, color="#2ca02c",
              label=r"$||w||^2 / \frac{2l^2}{\pi^2a^2}E_w(0)$")
ax[0, 0].set_ylim(0, 1.15); ax[0, 0].set_xlabel("t"); ax[0, 0].set_ylabel("归一化")
ax[0, 0].set_title("(a) 对初值的稳定性：误差能量不增长，且远低于证明给出的界", fontsize=11)
ax[0, 0].legend(fontsize=8); ax[0, 0].grid(alpha=.25)

ax[0, 1].semilogy(tf, Ewf, lw=2, label=r"$E_w(t)$（f 扰动引起的差）")
ax[0, 1].semilogy(tf, boundF, "r--", lw=1.6, label=r"$\frac{1}{2c}\int_0^t||F||^2\mathrm{d}s$（上界）")
ax[0, 1].set_xlabel("t"); ax[0, 1].set_ylabel("能量")
ax[0, 1].set_title(r"(b) 对非齐次项 $f$ 的稳定性：$E_w\leq\frac{1}{2c}\int_0^t(f_1-f_2)^2\mathrm{d}s$", fontsize=11)
ax[0, 1].legend(fontsize=8); ax[0, 1].grid(alpha=.25, which="both")

ax[1, 0].loglog(np.array(Js), errs, "o-", lw=1.8, label="有限差分误差（光滑初值）")
ref = errs[-1] * (np.array(Js) / Js[-1]) ** -2
ax[1, 0].loglog(np.array(Js), ref, "k--", lw=1.2, label=r"$\propto \Delta x^{2}$（二阶）")
ax[1, 0].set_xlabel("网格数 J"); ax[1, 0].set_ylabel(r"$\max|u_{FD}-u_{exact}|$")
ax[1, 0].set_title(f"(c) 两种独立算法收敛到同一个解（观测阶 {', '.join(f'{o:.2f}' for o in orders)}）", fontsize=11)
ax[1, 0].legend(fontsize=8); ax[1, 0].grid(alpha=.25, which="both")

cum = np.concatenate([[0], np.cumsum(0.5 * (Ds[1:] + Ds[:-1]) * np.diff(ts))]) * c
ax[1, 1].plot(ts, (E0 - Es) / E0, lw=2, label=r"$(E(0)-E(t))/E(0)$")
ax[1, 1].plot(ts, cum / E0, "r--", lw=1.4, label=r"$\frac{c}{E(0)}\int_0^t\!\!\int u_t^2\,\mathrm{d}x\,\mathrm{d}s$")
ax[1, 1].set_xlabel("t"); ax[1, 1].set_ylabel("耗散比例")
ax[1, 1].set_title("(d) 能量守恒式：损失的能量恰等于摩擦耗散的能量", fontsize=11)
ax[1, 1].legend(fontsize=8); ax[1, 1].grid(alpha=.25)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig2_stability.png"), dpi=150)
plt.close(fig)

evidence = {
  "parameters": {"l": l, "a": a, "c": c, "gamma": gamma, "kappa": kappa},
  "energy": {
    "E0": E0, "E_at_12": float(Es[-1]),
    "identity_residual_rel": float(resid_identity),
    "monotone_decreasing": bool(np.all(np.diff(Es) <= 1e-14 * E0)),
    "observed_rate_log_slope": float(np.polyfit(ts[200:], np.log(Es[200:]), 1)[0]),
    "lyapunov_bound_max_ratio": float(np.max(Es / ((1 + gamma) / (1 - gamma) * E0 * np.exp(-kappa * ts)))),
  },
  "initial_data_stability": {"max_Ew_over_Ew0": float(np.max(Ew / Ew0)),
                             "max_l2w_over_bound": float(np.max(l2w / boundL2))},
  "source_stability": {"max_Ew_over_bound": float(np.max(Ewf[1:] / boundF[1:]))},
  "convergence": {"J": Js, "err": errs, "orders": orders},
}
with open(os.path.join(HERE, "figures", "evidence.json"), "w", encoding="utf-8") as fh:
    json.dump(evidence, fh, ensure_ascii=False, indent=2)
print(json.dumps(evidence, ensure_ascii=False, indent=2))
