/* ============================================================================
 * engine.js — 有界弦上受摩擦阻尼的波动方程
 *     u_tt = a^2 u_xx - c u_t + f(x,t),   0 < x < l,  t > 0
 *     u(0,t) = u(l,t) = 0,   u(x,0) = phi(x),  u_t(x,0) = psi(x)
 *
 * 两个完全独立的求解器（都用于同一页面 / 同一验证脚本）：
 *   1) ModalSolver : 特征函数（正弦）展开 + 解析传播子。
 *                   对每个模态 T'' + cT' + (a k_n)^2 T = f_n 用解析公式推进，
 *                   源项用单步 Simpson 求积。除求积误差外是"精确解"，用作真解。
 *   2) FDSolver    : 二阶显式有限差分（leapfrog 时间离散 + 中心差分空间离散，
 *                   阻尼项取中心平均）。独立于模态方法。
 *
 * 二者都可以给出：能量 E(t) = 1/2 ∫ (u_t^2 + a^2 u_x^2) dx、
 *                  耗散率 ∫ u_t^2 dx、以及累积耗散 ∫_0^t ∫ u_t^2 dx ds。
 * ========================================================================== */
(function (root, factory) {
  const mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  else root.DW = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PI = Math.PI;

  /* ------------------------------ 数值工具 ------------------------------ */

  function simpson(f, a, b, m) {
    if (m % 2 === 1) m += 1;
    const h = (b - a) / m;
    let s = f(a) + f(b);
    for (let i = 1; i < m; i++) s += (i & 1 ? 4 : 2) * f(a + i * h);
    return (s * h) / 3;
  }

  /*  正弦系数 c_n = (2/l) ∫_0^l g(x) sin(k_n x) dx  （k_n = n pi / l） */
  function sineCoefficients(g, l, N, m) {
    const out = new Float64Array(N + 1);
    for (let n = 1; n <= N; n++) {
      const k = (n * PI) / l;
      out[n] = (2 / l) * simpson((x) => g(x) * Math.sin(k * x), 0, l, m || 2000);
    }
    return out;
  }

  /*  三角（拨弦）初值的正弦系数：解析公式，避免拐点处的求积误差。
   *  phi(x) = x/xp            (0 <= x <= xp)
   *         = (l-x)/(l-xp)    (xp <= x <= l)
   */
  function triangleCoefficients(xp, l, N) {
    const out = new Float64Array(N + 1);
    const A = xp, B = l - xp;
    for (let n = 1; n <= N; n++) {
      const k = (n * PI) / l;
      const sk = Math.sin(k * A), ck = Math.cos(k * A);
      // I1 = ∫_0^xp (x/A) sin(kx) dx = (sin(kA) - kA cos(kA)) / (A k^2)
      const I1 = (sk - k * A * ck) / (A * k * k);
      // I2 = ∫_xp^l ((l-x)/B) sin(kx) dx = [ l(cos(kA)+? ) ... ] 用原函数计算
      // ∫ sin(kx) dx = (cos(kA) - cos(kl))/k ,  ∫ x sin(kx) dx = (sin(kx)-kx cos(kx))/k^2
      const kl = k * l;
      const s1 = (Math.cos(k * A) - Math.cos(kl)) / k; // ∫_xp^l sin(kx) dx
      const s2 = (Math.sin(kl) - kl * Math.cos(kl) - (sk - k * A * ck)) / (k * k); // ∫_xp^l x sin(kx) dx
      const I2 = (l * s1 - s2) / B;
      out[n] = (2 / l) * (I1 + I2);
    }
    return out;
  }

  /*  初值/源项的空间形状 --> { value(x), coefs(Float64Array) }  */
  function spatialShape(spec, l, N) {
    if (!spec || spec.type === "zero") {
      return { value: () => 0, coefs: new Float64Array(N + 1), norm2: 0 };
    }
    if (spec.type === "modes") {
      const amps = spec.amps || [];
      const value = (x) => {
        let s = 0;
        for (let i = 0; i < amps.length; i++) {
          const n = i + 1;
          if (amps[i]) s += amps[i] * Math.sin((n * PI * x) / l);
        }
        return s;
      };
      const coefs = new Float64Array(N + 1);
      for (let i = 0; i < amps.length && i < N; i++) coefs[i + 1] = amps[i];
      // ∫_0^l (Σ a_n sin)^2 dx = (l/2) Σ a_n^2
      let s2 = 0;
      for (let i = 0; i < amps.length; i++) s2 += amps[i] * amps[i];
      return { value, coefs, norm2: (l / 2) * s2 };
    }
    if (spec.type === "pluck") {
      const xp = spec.xp === undefined ? l / 3 : spec.xp;
      const value = (x) => (x <= xp ? x / xp : (l - x) / (l - xp));
      const coefs = triangleCoefficients(xp, l, N);
      const norm2 = simpson((x) => value(x) * value(x), 0, l, 4000);
      return { value, coefs, norm2 };
    }
    if (spec.type === "gauss") {
      const x0 = spec.x0 === undefined ? l / 2 : spec.x0;
      const w = spec.width === undefined ? l / 12 : spec.width;
      const value = (x) => Math.exp(-((x - x0) * (x - x0)) / (2 * w * w));
      const coefs = sineCoefficients(value, l, N, 4000);
      const norm2 = simpson((x) => value(x) * value(x), 0, l, 2000);
      return { value, coefs, norm2 };
    }
    throw new Error("unknown spatial shape: " + spec.type);
  }

  /*  源项 f(x,t) = amp * g(x) * h(t)  */
  function makeSource(spec, l, N) {
    if (!spec || spec.type === "none" || !spec.amp) {
      return {
        amp: 0, h: () => 0, g: () => 0, coefs: new Float64Array(N + 1),
        norm2: 0, label: "f = 0", value: () => 0,
      };
    }
    const shape = spatialShape({ type: spec.shape || "modes", amps: spec.amps, m: spec.m, x0: spec.x0, width: spec.width, xp: spec.xp }, l, N);
    const om = spec.omega || 0;
    const h = om === 0 ? () => 1 : (t) => Math.cos(om * t);
    const amp = spec.amp;
    return {
      amp, h, g: shape.value, coefs: shape.coefs, norm2: amp * amp * shape.norm2,
      label: "f(x,t) = " + amp.toFixed(3) + " · g(x) · " + (om === 0 ? "1" : "cos(" + om.toFixed(2) + "t)"),
      value: (x, t) => amp * shape.value(x) * h(t),
    };
  }

  /* --------------------- 模态求解器（准精确解） --------------------- */

  // 齐次方程 T'' + c T' + lam^2 T = 0 的解析传播子
  function homPropagate(lam, c, T0, V0, tau) {
    const e = Math.exp((-c * tau) / 2);
    const d = lam * lam - (c * c) / 4;
    let T, V;
    if (d > 1e-14) {
      const w = Math.sqrt(d);
      const A = (V0 + (c * T0) / 2) / w;
      const C = Math.cos(w * tau), S = Math.sin(w * tau);
      T = e * (T0 * C + A * S);
      V = e * (A * w * C - T0 * w * S - (c / 2) * (T0 * C + A * S));
    } else if (d < -1e-14) {
      const mu = Math.sqrt(-d);
      const A = (V0 + (c * T0) / 2) / mu;
      const C = Math.cosh(mu * tau), S = Math.sinh(mu * tau);
      T = e * (T0 * C + A * S);
      V = e * (T0 * mu * S + A * mu * C - (c / 2) * (T0 * C + A * S));
    } else {
      const A = V0 + (c * T0) / 2;
      T = e * (T0 + A * tau);
      V = e * (A - (c / 2) * (T0 + A * tau));
    }
    return { T, V };
  }

  // 脉冲响应 G(tau) 与 G'(tau)：T'' + c T' + lam^2 T = delta
  function kernel(lam, c, tau) {
    const d = lam * lam - (c * c) / 4;
    if (d > 1e-14) {
      const w = Math.sqrt(d);
      return (Math.exp((-c * tau) / 2) * Math.sin(w * tau)) / w;
    }
    if (d < -1e-14) {
      const mu = Math.sqrt(-d);
      return (Math.exp((-c * tau) / 2) * Math.sinh(mu * tau)) / mu;
    }
    return Math.exp((-c * tau) / 2) * tau;
  }
  function kernelD(lam, c, tau) {
    const d = lam * lam - (c * c) / 4;
    const e = Math.exp((-c * tau) / 2);
    if (d > 1e-14) {
      const w = Math.sqrt(d);
      return e * (Math.cos(w * tau) - ((c / (2 * w)) * Math.sin(w * tau)));
    }
    if (d < -1e-14) {
      const mu = Math.sqrt(-d);
      return e * (Math.cosh(mu * tau) - ((c / (2 * mu)) * Math.sinh(mu * tau)));
    }
    return e * (1 - (c * tau) / 2);
  }

  class ModalSolver {
    /* opts: {l, a, c, N, phi:{...}, psi:{...}, source:{...}} */
    constructor(opts) {
      const l = (this.l = opts.l);
      this.a = opts.a;
      this.c = opts.c;
      this.N = opts.N || 160;
      this.k = new Float64Array(this.N + 1);
      this.lam = new Float64Array(this.N + 1);
      for (let n = 1; n <= this.N; n++) {
        this.k[n] = (n * PI) / l;
        this.lam[n] = this.a * this.k[n];
      }
      this.phiShape = spatialShape(opts.phi, l, this.N);
      this.psiShape = spatialShape(opts.psi, l, this.N);
      this.src = makeSource(opts.source, l, this.N);
      this.T = Float64Array.from(this.phiShape.coefs);
      this.V = Float64Array.from(this.psiShape.coefs);
      this.t = 0;
      this.Adiss = 0;   // ∫_0^t ∫ u_t^2 dx ds
      this.Aforce = 0;  // ∫_0^t ∫ f u_t dx ds
      this.Asrc = 0;    // ∫_0^t ||f(.,s)||^2 ds
      this.energy0 = this.energy();
      // 解析传播子对任意步长都精确；需要限制步长的只有源项求积和累积积分
      // （梯形法对 2*lam_n 的高频振荡有 aliasing 误差，实测 ~Delta^2）。
      const omSrc = opts.source && opts.source.amp ? Math.abs(opts.source.omega || 0) : 0;
      this.maxSub = omSrc > 0 ? Math.min(4e-4, 1 / (40 * omSrc)) : 0.004;
      this.sinTable = null;
    }

    energy() {
      // E = 1/2 ∫ (u_t^2 + a^2 u_x^2) dx = (l/4) Σ (V_n^2 + lam_n^2 T_n^2)
      let s = 0;
      for (let n = 1; n <= this.N; n++) {
        const L = this.lam[n];
        s += this.V[n] * this.V[n] + L * L * this.T[n] * this.T[n];
      }
      return (this.l / 4) * s;
    }
    dissipation() { // ∫ u_t^2 dx = (l/2) Σ V_n^2
      let s = 0;
      for (let n = 1; n <= this.N; n++) s += this.V[n] * this.V[n];
      return (this.l / 2) * s;
    }
    l2norm() { // ||u(.,t)||^2 = (l/2) Σ T_n^2
      let s = 0;
      for (let n = 1; n <= this.N; n++) s += this.T[n] * this.T[n];
      return (this.l / 2) * s;
    }
    h1seminorm() { // ||u_x||^2 = (l/2) Σ k_n^2 T_n^2
      let s = 0;
      for (let n = 1; n <= this.N; n++) s += this.k[n] * this.k[n] * this.T[n] * this.T[n];
      return (this.l / 2) * s;
    }
    cross() { // ∫ u u_t dx = (l/2) Σ T_n V_n  （Lyapunov 证明里用到的 G）
      let s = 0;
      for (let n = 1; n <= this.N; n++) s += this.T[n] * this.V[n];
      return (this.l / 2) * s;
    }
    u(x) {
      let s = 0;
      for (let n = 1; n <= this.N; n++) {
        const T = this.T[n];
        if (T !== 0) s += T * Math.sin(this.k[n] * x);
      }
      return s;
    }
    ut(x) {
      let s = 0;
      for (let n = 1; n <= this.N; n++) {
        const V = this.V[n];
        if (V !== 0) s += V * Math.sin(this.k[n] * x);
      }
      return s;
    }
    forceInnerUt() { // ∫ f u_t dx = amp h(t) (l/2) Σ g_n V_n
      if (!this.src.amp) return 0;
      let s = 0;
      for (let n = 1; n <= this.N; n++) s += this.src.coefs[n] * this.V[n];
      return this.src.amp * this.src.h(this.t) * (this.l / 2) * s;
    }

    step(dt) {
      let rem = dt;
      let guard = 0;
      while (rem > 1e-14 && guard++ < 100000) {
        const d = Math.min(rem, this.maxSub);
        this._stepOnce(d);
        rem -= d;
      }
      return this;
    }

    _stepOnce(dt) {
      const c = this.c, N = this.N, l = this.l;
      const t0 = this.t, th = t0 + dt / 2, t1 = t0 + dt;
      const amp = this.src.amp, h = this.src.h, gc = this.src.coefs;
      const half = dt / 6;
      const D0 = this.dissipation();
      const F0 = this.forceInnerUt();
      for (let n = 1; n <= N; n++) {
        const lam = this.lam[n];
        const pr = homPropagate(lam, c, this.T[n], this.V[n], dt);
        let T = pr.T, V = pr.V;
        if (amp) {
          const f0 = amp * gc[n] * h(t0);
          const fh = amp * gc[n] * h(th);
          const f1 = amp * gc[n] * h(t1);
          // T_p = ∫_0^dt G(sigma) f(t1 - sigma) dsigma （Simpson，sigma = 0, dt/2, dt）
          T += half * (kernel(lam, c, 0) * f1 + 4 * kernel(lam, c, dt / 2) * fh + kernel(lam, c, dt) * f0);
          V += half * (kernelD(lam, c, 0) * f1 + 4 * kernelD(lam, c, dt / 2) * fh + kernelD(lam, c, dt) * f0);
        }
        this.T[n] = T;
        this.V[n] = V;
      }
      this.t = t1;
      const D1 = this.dissipation();
      const F1 = this.forceInnerUt();
      this.Adiss += (dt / 2) * (D0 + D1);          // 梯形法累积 ∫∫ u_t^2
      this.Aforce += (dt / 2) * (F0 + F1);         // 梯形法累积 ∫∫ f u_t
      if (amp) {
        const n2 = this.src.norm2;
        this.Asrc += (dt / 6) * (n2 * h(t0) * h(t0) + 4 * n2 * h(th) * h(th) + n2 * h(t1) * h(t1));
      }
      return this;
    }

    /* 在给定网格上采样 (u, u_t)，网格点可自定义 */
    sample(grid) {
      const J = grid.length;
      const u = new Float64Array(J), ut = new Float64Array(J);
      for (let j = 0; j < J; j++) {
        const x = grid[j];
        let su = 0, sv = 0;
        for (let n = 1; n <= this.N; n++) {
          const s = Math.sin(this.k[n] * x);
          su += this.T[n] * s;
          sv += this.V[n] * s;
        }
        u[j] = su; ut[j] = sv;
      }
      return { u, ut, grid };
    }
  }

  /* ------------------------- 有限差分求解器 ------------------------- */

  class FDSolver {
    /* opts: {l, a, c, J, phi, psi, source, cfl} */
    constructor(opts) {
      const l = (this.l = opts.l);
      this.a = opts.a;
      this.c = opts.c;
      this.J = opts.J || 200;
      this.dx = l / this.J;
      this.dt = ((opts.cfl === undefined ? 0.9 : opts.cfl) * this.dx) / this.a;
      this.phiShape = spatialShape(opts.phi, l, this.J);
      this.psiShape = spatialShape(opts.psi, l, this.J);
      this.src = makeSource(opts.source, l, this.J);
      this.grid = new Float64Array(this.J + 1);
      for (let j = 0; j <= this.J; j++) this.grid[j] = j * this.dx;
      const J = this.J;
      this.uPrev = new Float64Array(J + 1);
      this.uCur = new Float64Array(J + 1);
      for (let j = 0; j <= J; j++) {
        const x = this.grid[j];
        this.uPrev[j] = this.phiShape.value(x);
      }
      // 二阶启动：u^1 = phi + dt psi + dt^2/2 (a^2 phi'' - c psi + f(x,0))
      const dt = this.dt, dx = this.dx;
      for (let j = 1; j < J; j++) {
        const x = this.grid[j];
        const d2 = (this.phiShape.value(x + dx) - 2 * this.phiShape.value(x) + this.phiShape.value(x - dx)) / (dx * dx);
        this.uCur[j] = this.uPrev[j] + dt * this.psiShape.value(x) +
          (dt * dt / 2) * (this.a * this.a * d2 - this.c * this.psiShape.value(x) + this.src.value(x, 0));
      }
      this.uCur[0] = this.uCur[J] = 0;
      this.steps = 1;
      this.lastDt = dt;          // 最近一步的步长（能量泛函用它做时间差分）
      // 时间区间记账：uPrev 位于 tLo，uCur 位于 tHi = tLo + lastDt；
      // 任意目标时刻 tDisp ∈ [tLo, tHi] 的解由两层的线性插值给出。
      this.tLo = 0;
      this.tHi = dt;
      this.tDisp = dt;
      this.Adiss = 0;
      this.discEnergyPrev = this.discreteEnergy();
    }

    get t() { return this.tDisp; }

    /* 把两层按显示时刻线性插值成一层 */
    fieldInto(out) {
      const th = Math.min(1, Math.max(0, (this.tDisp - this.tLo) / this.lastDt));
      for (let j = 0; j <= this.J; j++) out[j] = this.uPrev[j] + th * (this.uCur[j] - this.uPrev[j]);
      return out;
    }

    /* 离散能量（leapfrog 的精确守恒量）
     *   E^{n+1/2} = dx/2 [ Σ_{j=1}^{J-1} ((u^{n+1}_j-u^n_j)/dt)^2
     *                     + a^2 Σ_{j=0}^{J-1} D_+u^{n+1}_j D_+u^n_j ]
     * 注意梯度项的求和必须包含 j=0 这一项（否则波到达端点时能量会"跳变"）。 */
    discreteEnergy() {
      const { J, dx, a } = this;
      const dt = this.lastDt;
      let s = 0;
      for (let j = 1; j < J; j++) {
        const vt = (this.uCur[j] - this.uPrev[j]) / dt;
        s += vt * vt;
      }
      for (let j = 0; j < J; j++) {
        const gx1 = (this.uCur[j + 1] - this.uCur[j]) / dx;
        const gx0 = (this.uPrev[j + 1] - this.uPrev[j]) / dx;
        s += a * a * gx1 * gx0;
      }
      return 0.5 * dx * s;
    }

    /* 连续能量泛函（由数值解采样 + Simpson 计算），便于与模态解比较 */
    /* 连续能量泛函：在 J 个等距区间上做复合 Simpson（J 为偶数） */
    energy() {
      const { J, a, dx } = this;
      const w = this.fieldInto(this._scratchU());
      const g = (j) => {
        const gx = j === J ? (w[J] - w[J - 1]) / dx : (w[j + 1] - w[j]) / dx;
        const v = this._v(j);
        return v * v + a * a * gx * gx;
      };
      const m = J % 2 === 0 ? J : J - 1;
      let s = g(0) + g(m);
      for (let j = 1; j < m; j++) s += (j & 1 ? 4 : 2) * g(j);
      return 0.5 * (dx / 3) * s;
    }
    dissipation() {
      const J = this.J;
      return simpson((j) => this._v(j) * this._v(j), 0, J, J);
    }
    _scratchU() {
      if (!this._uScratch || this._uScratch.length !== this.J + 1) this._uScratch = new Float64Array(this.J + 1);
      return this._uScratch;
    }
    _v(j) { return (this.uCur[j] - this.uPrev[j]) / this.lastDt; }
    u(x) {
      const w = this.fieldInto(this._scratchU());
      const s = Math.min(Math.max(x / this.dx, 0), this.J - 1e-12);
      const j = Math.floor(s), f = s - j;
      return w[j] * (1 - f) + w[j + 1] * f;
    }
    ut(x) {
      const s = Math.min(Math.max(x / this.dx, 0), this.J - 1e-12);
      const j = Math.floor(s), f = s - j;
      return this._v(j) * (1 - f) + this._v(j + 1) * f;
    }
    /* 单步：步长固定为 CFL 步长 h（改步长会破坏 leapfrog 的相位一致性，故一律等步长） */
    _stepOnce(h) {
      const { J, dx, a, c } = this;
      const r2 = ((a * h) / dx) * ((a * h) / dx);
      const k1 = 1 - (c * h) / 2, k2 = 1 + (c * h) / 2;
      const un = this.uCur, up = this.uPrev;
      const tn = this.tHi;                       // 源项取 u^n 所在时刻
      const next = new Float64Array(J + 1);
      for (let j = 1; j < J; j++) {
        const lap = un[j + 1] - 2 * un[j] + un[j - 1];
        let rhs = 2 * un[j] - k1 * up[j] + r2 * lap;
        if (this.src.amp) rhs += h * h * this.src.value(this.grid[j], tn);
        next[j] = rhs / k2;
      }
      next[0] = next[J] = 0;
      this.uPrev = un;
      this.uCur = next;
      this.tLo = this.tHi;
      this.tHi += h;
      this.lastDt = h;
      this.steps++;
      return this;
    }
    /* 推进到任意时刻 T：走整数个等步长，解由 [tLo, tHi] 上的时间线性插值给出 */
    advanceTo(T) {
      while (this.tHi < T - 1e-12) this._stepOnce(this.dt);
      this.tDisp = Math.min(Math.max(T, this.tHi - this.lastDt), this.tHi);
      return this;
    }
    step(dt) { return this.advanceTo(this.tHi + dt); }
    sample() {
      const J = this.J;
      const u = this.fieldInto(new Float64Array(J + 1));
      const ut = new Float64Array(J + 1);
      for (let j = 0; j <= J; j++) ut[j] = this._v(j);
      return { u, ut, grid: this.grid };
    }
  }

  /* ------------------------------ 工具函数 ------------------------------ */

  function linspace(a, b, n) {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
    return out;
  }
  /* 对采样序列做 Simpson 积分（等距网格） */
  function integrateSamples(y, h) {
    const n = y.length - 1;
    let m = n % 2 === 1 ? n - 1 : n;
    if (m < 2) return 0;
    let s = y[0] + y[m];
    for (let i = 1; i < m; i++) s += (i & 1 ? 4 : 2) * y[i];
    return (s * h) / 3;
  }
  /* 两个采样场的内积 ∫ f g dx */
  function innerProductSamples(f, g, h) {
    const n = f.length;
    const p = new Float64Array(n);
    for (let i = 0; i < n; i++) p[i] = f[i] * g[i];
    return integrateSamples(p, h);
  }
  /* 差分场的能量：E = 1/2 ∫ (vt^2 + a^2 vx^2) dx */
  function fieldEnergy(u, ut, grid, a) {
    const n = grid.length;
    const h = grid[1] - grid[0];
    const d = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const gx = i === 0 ? (u[1] - u[0]) / h : i === n - 1 ? (u[n - 1] - u[n - 2]) / h : (u[i + 1] - u[i - 1]) / (2 * h);
      d[i] = ut[i] * ut[i] + a * a * gx * gx;
    }
    return 0.5 * integrateSamples(d, h);
  }
  function fieldL2(u, grid) {
    const n = grid.length;
    const h = grid[1] - grid[0];
    const d = new Float64Array(n);
    for (let i = 0; i < n; i++) d[i] = u[i] * u[i];
    return integrateSamples(d, h);
  }

  return {
    PI, simpson, sineCoefficients, triangleCoefficients, spatialShape, makeSource,
    homPropagate, kernel, kernelD, ModalSolver, FDSolver,
    linspace, integrateSamples, innerProductSamples, fieldEnergy, fieldL2,
  };
});
