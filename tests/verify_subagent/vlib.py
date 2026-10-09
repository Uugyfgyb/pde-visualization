# -*- coding: utf-8 -*-
"""vlib.py —— 独立复核用的自研求解器与工具（第三种方法）。

与交付物中的 engine.js 无关：这里从零实现两种互相独立的方法
  (i)  Spectral : 正弦 Galerkin（空间精确） + 经典 RK4（时间） —— 与 ModalSolver 的"解析传播子"不同；
  (ii) MOL4     : 四阶中心差分（空间） + 经典 RK4（时间）      —— 与 FDSolver 的 leapfrog 不同。
所有能量/范数都用空间网格上的复合 Simpson 直接积分，不依赖交付脚本的任何函数。
"""
import numpy as np
import math

# ---------------------------------------------------------------- 工具


def simpson(y, h):
    n = len(y) - 1
    m = n if n % 2 == 0 else n - 1
    if m < 2:
        return 0.0
    s = y[0] + y[m]
    idx = np.arange(1, m)
    w = np.where(idx % 2 == 1, 4.0, 2.0)
    s += float(np.dot(w, y[1:m]))
    return s * h / 3.0


def grid(l, J):
    return np.linspace(0.0, l, J + 1)


# ---------------------------------------------------------------- 方法 (i)


class Spectral:
    """u(x,t)=sum_{n>=1} T_n(t) sin(n pi x/l)，T_n'' + c T_n' + lam_n^2 T_n = f_n(t)。"""

    def __init__(self, l=1.0, a=1.0, c=0.4, N=16, phi=None, psi=None, src=None):
        self.l, self.a, self.c, self.N = l, a, c, N
        self.k = np.arange(N + 1) * np.pi / l
        self.lam = a * self.k
        self.T = np.zeros(N + 1)
        self.V = np.zeros(N + 1)
        if phi is not None:
            self.T[:min(len(phi), N + 1)] = phi[:N + 1]
        if psi is not None:
            self.V[:min(len(psi), N + 1)] = psi[:N + 1]
        self.src = (lambda t: np.zeros(N + 1)) if src is None else src
        self.t = 0.0
        self.lam2 = self.lam ** 2

    def _f(self, T, V, t):
        return V, -self.lam2 * T - self.c * V + self.src(t)

    def step(self, dt):
        T, V, t = self.T, self.V, self.t
        k1T, k1V = self._f(T, V, t)
        k2T, k2V = self._f(T + 0.5 * dt * k1T, V + 0.5 * dt * k1V, t + 0.5 * dt)
        k3T, k3V = self._f(T + 0.5 * dt * k2T, V + 0.5 * dt * k2V, t + 0.5 * dt)
        k4T, k4V = self._f(T + dt * k3T, V + dt * k3V, t + dt)
        self.T = T + dt / 6.0 * (k1T + 2 * k2T + 2 * k3T + k4T)
        self.V = V + dt / 6.0 * (k1V + 2 * k2V + 2 * k3V + k4V)
        self.T[0] = self.V[0] = 0.0
        self.t = t + dt
        return self

    def advance(self, T_target, dt):
        n = int(round((T_target - self.t) / dt))
        for _ in range(n):
            self.step(dt)
        return self

    # 精确的模态泛函
    def E(self):
        return 0.25 * self.l * float(np.sum(self.V ** 2 + self.lam2 * self.T ** 2))

    def D(self):
        return 0.5 * self.l * float(np.sum(self.V ** 2))

    def L2(self):
        return 0.5 * self.l * float(np.sum(self.T ** 2))

    def H1(self):
        return 0.5 * self.l * float(np.sum(self.k ** 2 * self.T ** 2))

    def G(self):
        return 0.5 * self.l * float(np.sum(self.T * self.V))

    def sample(self, x):
        S = np.sin(np.outer(x, self.k[1:]))
        return S @ self.T[1:], S @ self.V[1:]


# ---------------------------------------------------------------- 方法 (ii)


def lap4(u, h):
    """四阶精度 u_xx（Dirichlet 端点 u_0=u_J=0 已在网格里）。矢量化的 5 点公式。"""
    J = len(u) - 1
    out = np.zeros_like(u)
    if J >= 7:
        out[1] = (35 * u[1] - 104 * u[2] + 114 * u[3] - 56 * u[4] + 11 * u[5]) / (12 * h * h)
        out[J - 1] = (35 * u[J - 1] - 104 * u[J - 2] + 114 * u[J - 3] - 56 * u[J - 4] + 11 * u[J - 5]) / (12 * h * h)
        out[2:J - 1] = (-u[4:J + 1] + 16 * u[3:J] - 30 * u[2:J - 1] + 16 * u[1:J - 2] - u[0:J - 3]) / (12 * h * h)
    else:  # 退化：二阶
        out[1:J] = (u[2:] - 2 * u[1:J] + u[0:J - 1]) / (h * h)
    return out


def dx4(u, h):
    """四阶精度 u_x（含端点单侧公式），用于能量泛函。矢量化。"""
    J = len(u) - 1
    d = np.zeros_like(u)
    d[0] = (-25 * u[0] + 48 * u[1] - 36 * u[2] + 16 * u[3] - 3 * u[4]) / (12 * h)
    d[J] = (25 * u[J] - 48 * u[J - 1] + 36 * u[J - 2] - 16 * u[J - 3] + 3 * u[J - 4]) / (12 * h)
    d[1] = (-3 * u[0] - 10 * u[1] + 18 * u[2] - 6 * u[3] + u[4]) / (12 * h)
    d[J - 1] = (3 * u[J] + 10 * u[J - 1] - 18 * u[J - 2] + 6 * u[J - 3] - u[J - 4]) / (12 * h)
    d[2:J - 1] = (u[0:J - 3] - 8 * u[1:J - 2] + 8 * u[3:J] - u[4:J + 1]) / (12 * h)
    return d


class MOL4:
    """u_tt = a^2 u_xx - c u_t + f 的四阶差分 + RK4。"""

    def __init__(self, l=1.0, a=1.0, c=0.4, J=200, phi=None, psi=None, src=None):
        self.l, self.a, self.c, self.J = l, a, c, J
        self.h = l / J
        self.x = grid(l, J)
        self.u = np.zeros(J + 1)
        self.v = np.zeros(J + 1)
        if phi is not None:
            self.u = np.asarray(phi(self.x), dtype=float)
        if psi is not None:
            self.v = np.asarray(psi(self.x), dtype=float)
        self.u[0] = self.u[J] = 0.0
        self.v[0] = self.v[J] = 0.0
        self.src = (lambda x, t: np.zeros_like(x)) if src is None else src
        self.t = 0.0
        # RK4 稳定步长
        self.dtmax = 0.2 * self.h / a

    def _f(self, u, v, t):
        return v, self.a ** 2 * lap4(u, self.h) - self.c * v + self.src(self.x, t)

    def step(self, dt):
        u, v, t = self.u, self.v, self.t
        k1u, k1v = self._f(u, v, t)
        k2u, k2v = self._f(u + 0.5 * dt * k1u, v + 0.5 * dt * k1v, t + 0.5 * dt)
        k3u, k3v = self._f(u + 0.5 * dt * k2u, v + 0.5 * dt * k2v, t + 0.5 * dt)
        k4u, k4v = self._f(u + dt * k3u, v + dt * k3v, t + dt)
        self.u = u + dt / 6.0 * (k1u + 2 * k2u + 2 * k3u + k4u)
        self.v = v + dt / 6.0 * (k1v + 2 * k2v + 2 * k3v + k4v)
        self.u[0] = self.u[self.J] = 0.0
        self.v[0] = self.v[self.J] = 0.0
        self.t = t + dt
        return self

    def advance(self, T_target, dt=None):
        dt = self.dtmax if dt is None else dt
        n = int(round((T_target - self.t) / dt))
        for _ in range(n):
            self.step(dt)
        return self

    def E(self):
        g = dx4(self.u, self.h)
        return 0.5 * simpson(self.v ** 2 + self.a ** 2 * g ** 2, self.h)

    def D(self):
        return simpson(self.v ** 2, self.h)

    def L2(self):
        return simpson(self.u ** 2, self.h)


    def G(self):
        return simpson(self.u * self.v, self.h)


# ---------------------------------------------------------------- 方法 (ii')

class FEM1:
    """P1 有限元（一致质量阵，Galerkin）+ RK4 —— 与 leapfrog 差分、模态解析传播子都不同。

    半离散：M u'' = -a^2 K u - c M u' + F(t)，M=(h/6)tridiag(1,4,1)，K=(1/h)tridiag(-1,2,-1)。
    离散能量 E_h = 1/2 (v^T M v + a^2 u^T K u) 满足 dE_h/dt = -c v^T M v（结构上精确）。
    """

    def __init__(self, l=1.0, a=1.0, c=0.4, J=200, phi=None, psi=None, src=None):
        self.l, self.a, self.c, self.J = l, a, c, J
        self.h = l / J
        self.x = grid(l, J)
        n = J - 1
        h = self.h
        off = (h / 6.0) * np.ones(n - 1)
        self.M = np.diag((4.0 * h / 6.0) * np.ones(n)) + np.diag(off, 1) + np.diag(off, -1)
        koff = (-1.0 / h) * np.ones(n - 1)
        self.K = np.diag((2.0 / h) * np.ones(n)) + np.diag(koff, 1) + np.diag(koff, -1)
        self.Minv = np.linalg.inv(self.M)
        self.u = np.asarray(phi(self.x), dtype=float)[1:J] if phi is not None else np.zeros(n)
        self.v = np.asarray(psi(self.x), dtype=float)[1:J] if psi is not None else np.zeros(n)
        self.src = (lambda x, t: np.zeros_like(x)) if src is None else src
        self.t = 0.0
        w2 = np.linalg.eigvals(np.linalg.solve(self.M, self.K)).real
        self.omega_max = a * math.sqrt(float(np.max(w2)))
        self.dtmax = 0.2 * 2.828 / self.omega_max

    def load(self, t):
        J = self.J
        gp = np.array([-math.sqrt(3.0 / 5.0), 0.0, math.sqrt(3.0 / 5.0)])
        gw = np.array([5.0 / 9.0, 8.0 / 9.0, 5.0 / 9.0]) * (self.h / 2.0)
        xg = self.x[:-1, None] + (self.h / 2.0) * (gp[None, :] + 1.0)
        fg = np.asarray(self.src(xg, t), dtype=float)
        F = np.zeros(J + 1)
        np.add.at(F, np.arange(J), np.sum(gw[None, :] * fg * (1.0 - gp)[None, :] / 2.0, axis=1))
        np.add.at(F, np.arange(1, J + 1), np.sum(gw[None, :] * fg * (1.0 + gp)[None, :] / 2.0, axis=1))
        return F[1:J]

    def _f(self, u, v, t):
        return v, self.Minv @ (-self.a ** 2 * (self.K @ u) - self.c * (self.M @ v) + self.load(t))

    def step(self, dt):
        u, v, t = self.u, self.v, self.t
        k1u, k1v = self._f(u, v, t)
        k2u, k2v = self._f(u + 0.5 * dt * k1u, v + 0.5 * dt * k1v, t + 0.5 * dt)
        k3u, k3v = self._f(u + 0.5 * dt * k2u, v + 0.5 * dt * k2v, t + 0.5 * dt)
        k4u, k4v = self._f(u + dt * k3u, v + dt * k3v, t + dt)
        self.u = u + dt / 6.0 * (k1u + 2 * k2u + 2 * k3u + k4u)
        self.v = v + dt / 6.0 * (k1v + 2 * k2v + 2 * k3v + k4v)
        self.t = t + dt
        return self

    def advance(self, T_target, dt=None):
        dt = self.dtmax if dt is None else dt
        n = int(round((T_target - self.t) / dt))
        for _ in range(n):
            self.step(dt)
        return self

    def Eh(self):
        return 0.5 * (self.v @ (self.M @ self.v) + self.a ** 2 * (self.u @ (self.K @ self.u)))

    def Dh(self):
        return float(self.v @ (self.M @ self.v))

    def _full(self, w):
        out = np.zeros(self.J + 1)
        out[1:self.J] = w
        return out

    def Ec(self):
        vf = self._full(self.v)
        return 0.5 * (simpson(vf ** 2, self.h) + self.a ** 2 * float(self.u @ (self.K @ self.u)))

    def Dc(self):
        return simpson(self._full(self.v) ** 2, self.h)

    def L2(self):
        return simpson(self._full(self.u) ** 2, self.h)

    def G(self):
        return simpson(self._full(self.u) * self._full(self.v), self.h)

