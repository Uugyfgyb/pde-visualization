/* 数值验证脚本：node tests/check.js
 * 逐条核对页面中证明所依赖的结论（模态精确解 + 有限差分两个独立求解器交叉验证）。
 */
const DW = require("../engine.js");
const fs = require("fs");
const path = require("path");

const out = [];
const rec = (name, ok, detail) => {
  out.push({ check: name, pass: !!ok, detail });
  console.log((ok ? "  [PASS] " : "  [FAIL] ") + name + "  " + detail);
};

const l = 1, a = 1;
const grid = DW.linspace(0, l, 401);
const maxDiff = (A, B) => { let m = 0; for (let i = 0; i < A.length; i++) m = Math.max(m, Math.abs(A[i] - B[i])); return m; };
const sampleOnGrid = (sim) => { const u = new Float64Array(grid.length); for (let i = 0; i < grid.length; i++) u[i] = sim.u(grid[i]); return u; };

/* ---------- 0. 无阻尼 (c=0)：能量守恒 ---------- */
{
  const s = new DW.ModalSolver({ l, a, c: 0, N: 200, phi: { type: "pluck", xp: l / 3 }, psi: { type: "zero" }, source: { type: "none" } });
  const E0 = s.energy();
  let worst = 0;
  for (let i = 0; i < 3000; i++) { s.step(0.002); worst = Math.max(worst, Math.abs(s.energy() - E0) / E0); }
  rec("c=0 能量守恒（模态解，t=6）", worst < 1e-10, "相对漂移 " + worst.toExponential(2));

  const fd = new DW.FDSolver({ l, a, c: 0, J: 200, phi: { type: "pluck", xp: l / 3 }, psi: { type: "zero" }, source: { type: "none" } });
  let drift = 0, mono = true, prev = fd.discreteEnergy(), d0 = prev;
  for (let i = 0; i < 500; i++) { fd.step(0.01); const d = fd.discreteEnergy(); drift = Math.max(drift, Math.abs(d - d0) / d0); if (d > prev + 1e-12 * d0) mono = false; prev = d; }
  rec("c=0 离散能量守恒（leapfrog, J=200）", drift < 1e-10 && mono, "相对漂移 " + drift.toExponential(2) + "，单调=" + mono);
}

/* ---------- 1. 能量恒等式、单调递减、耗散率恒等式 ---------- */
{
  const base = { l, a, c: 0.4, N: 200, phi: { type: "pluck", xp: l / 3 }, psi: { type: "zero" }, source: { type: "none" } };
  const s = new DW.ModalSolver(base);
  const E0 = s.energy();
  const T = 12, dt = 0.004, n = Math.round(T / dt);
  const hist = [{ t: 0, E: E0, D: s.dissipation() }];
  for (let i = 0; i < n; i++) { s.step(dt); hist.push({ t: s.t, E: s.energy(), D: s.dissipation() }); }
  const resid = Math.abs(E0 - base.c * s.Adiss - s.energy()) / E0;
  rec("能量恒等式 E(0) - c∫∫u_t²dxds = E(t)", resid < 1e-4, "相对残差 " + resid.toExponential(2));
  let minDrop = Infinity, mono = true;
  for (const h of hist) { if (h.t > 0) minDrop = Math.min(minDrop, E0 - h.E); if (h.E > E0 * (1 + 1e-14)) mono = false; }
  rec("E(t) 单调不增，且 t>0 时严格下降", mono && minDrop > 0, "最小降幅/E(0) = " + (minDrop / E0).toExponential(3));
}

/* ---------- 1b. 瞬时恒等式 dE/dt = -c∫u_t²（光滑初值 + 细步长） ---------- */
{
  const s = new DW.ModalSolver({ l, a, c: 0.4, N: 200, phi: { type: "modes", amps: [1, 0.4, 0] }, psi: { type: "modes", amps: [0, 0.3, 0.2] }, source: { type: "none" } });
  const h = 2e-4;
  const hist = [{ E: s.energy(), D: s.dissipation() }];
  for (let i = 0; i < 8000; i++) { s.step(h); hist.push({ E: s.energy(), D: s.dissipation() }); }
  let worst = 0, scale = 0;
  for (let i = 1; i < hist.length - 1; i++) {
    const dEdt = (hist[i + 1].E - hist[i - 1].E) / (2 * h);   // 中心差分 O(h^2)
    const rhs = -0.4 * hist[i].D;                             // 同一时刻的 -c∫u_t²
    worst = Math.max(worst, Math.abs(dEdt - rhs));
    scale = Math.max(scale, Math.abs(rhs));
  }
  rec("瞬时恒等式 dE/dt = -c∫u_t²dx（数值微分）", worst / scale < 5e-4, "最大相对偏差 " + (worst / scale).toExponential(2) + "（含 O(h) 数值微分误差）");

  // 严格递减的正确性：E(t) < E(0)
  let drop = 0;
  for (let i = 0; i < 200; i++) { s.step(0.01); drop = Math.max(drop, s.energy0 - s.energy()); }
  rec("非平凡初值下 E(t) 严格小于 E(0)", drop > 0, "t=2 时降幅 " + drop.toExponential(3));
}

/* ---------- 2. Poincaré 不等式（稳定性常数的来源） ---------- */
{
  const s = new DW.ModalSolver({ l, a, c: 0.4, N: 200, phi: { type: "pluck", xp: l / 3 }, psi: { type: "zero" }, source: { type: "none" } });
  let worst = 0;
  for (let i = 0; i < 1000; i++) {
    s.step(0.01);
    worst = Math.max(worst, s.l2norm() / ((l * l / (Math.PI * Math.PI)) * s.h1seminorm()));
  }
  rec("Poincaré: ||u||² ≤ (l²/π²)||u_x||²", worst <= 1 + 1e-9, "最大比值 " + worst.toFixed(6) + " (<1 表示严格成立)");
}

/* ---------- 3. 两个独立求解器一致 + 二阶收敛（光滑初值） ---------- */
{
  const T = 0.5, Nref = 600;
  const ex = new DW.ModalSolver({ l, a, c: 0.4, N: Nref, phi: { type: "gauss", x0: 0.3 * l, width: 0.06 * l }, psi: { type: "zero" }, source: { type: "none" } });
  ex.step(T);
  const ref = sampleOnGrid(ex);
  const errs = [];
  for (const J of [50, 100, 200, 400]) {
    // 比较"节点层"：FD 推进到 tHi >= T，模态解取到同一时刻 tHi（避免时间插值误差混入收敛阶）
    const fd = new DW.FDSolver({ l, a, c: 0.4, J, phi: { type: "gauss", x0: 0.3 * l, width: 0.06 * l }, psi: { type: "zero" }, source: { type: "none" } });
    while (fd.tHi < T - 1e-12) fd._stepOnce(fd.dt);
    const exT = new DW.ModalSolver({ l, a, c: 0.4, N: Nref, phi: { type: "gauss", x0: 0.3 * l, width: 0.06 * l }, psi: { type: "zero" }, source: { type: "none" } });
    exT.step(fd.tHi);
    let e = 0;
    for (let j = 0; j <= fd.J; j++) e = Math.max(e, Math.abs(fd.uCur[j] - exT.u(j * fd.dx)));
    errs.push({ J, err: e });
  }
  const orders = [];
  for (let i = 1; i < errs.length; i++) orders.push(Math.log2(errs[i - 1].err / errs[i].err));
  rec("有限差分 vs 模态精确解（光滑初值）", orders.every((o) => o > 1.8 && o < 2.3),
    errs.map((e) => "J=" + e.J + ":" + e.err.toExponential(2)).join(" ") + " | 观测阶 " + orders.map((o) => o.toFixed(2)).join(", "));

  // 含阻尼 + 源项 + 非平凡初值
  const src = { type: "modes", amps: [0, 0, 1], omega: 2, amp: 0.03 };
  const phi = { type: "modes", amps: [1, 0.5, 0] }, psi = { type: "modes", amps: [0, 0.5, 0] };
  const ex2 = new DW.ModalSolver({ l, a, c: 0.5, N: Nref, phi, psi, source: src });
  ex2.step(0.8);
  const ref2 = sampleOnGrid(ex2);
  const errs2 = [];
  for (const J of [60, 120, 240, 480]) {
    const fd = new DW.FDSolver({ l, a, c: 0.5, J, phi, psi, source: src });
    while (fd.tHi < 0.8 - 1e-12) fd._stepOnce(fd.dt);
    const exT = new DW.ModalSolver({ l, a, c: 0.5, N: Nref, phi, psi, source: src });
    exT.step(fd.tHi);
    let e = 0;
    for (let j = 0; j <= fd.J; j++) e = Math.max(e, Math.abs(fd.uCur[j] - exT.u(j * fd.dx)));
    errs2.push({ J, err: e });
  }
  const orders2 = [];
  for (let i = 1; i < errs2.length; i++) orders2.push(Math.log2(errs2[i - 1].err / errs2[i].err));
  rec("含阻尼+源项：两格式一致（二阶）", orders2.every((o) => o > 1.7 && o < 2.3),
    errs2.map((e) => "J=" + e.J + ":" + e.err.toExponential(2)).join(" ") + " | 观测阶 " + orders2.map((o) => o.toFixed(2)).join(", "));
}

/* ---------- 4. 对初值的稳定性 ---------- */
{
  const w = new DW.ModalSolver({
    l, a, c: 0.4, N: 250,
    phi: { type: "gauss", x0: 0.35 * l, width: 0.05 * l },   // δφ
    psi: { type: "modes", amps: [0, 0.01, 0.005] },            // δψ
    source: { type: "none" },
  });
  const Ew0 = w.energy();
  const boundL2 = ((2 * l * l) / (Math.PI * Math.PI * a * a)) * Ew0;
  let worstE = 0, worstL2 = 0, worstVt = 0;
  for (let i = 0; i < 2000; i++) {
    w.step(0.005);
    worstE = Math.max(worstE, w.energy() / Ew0);
    worstL2 = Math.max(worstL2, w.l2norm() / boundL2);
    worstVt = Math.max(worstVt, w.dissipation() / (2 * Ew0));
  }
  rec("初值扰动: E_w(t) ≤ E_w(0)", worstE <= 1 + 1e-9, "max E_w/E_w(0) = " + worstE.toFixed(9));
  rec("初值扰动: ||w||² ≤ 2l²E_w(0)/(π²a²)", worstL2 <= 1 + 1e-9, "max 比值 = " + worstL2.toFixed(6));
  rec("初值扰动: ||w_t||² ≤ 2E_w(0)", worstVt <= 1 + 1e-9, "max 比值 = " + worstVt.toFixed(6));
}

/* ---------- 5. 对非齐次项 f 的稳定性 ---------- */
{
  const F = { type: "modes", amps: [0, 0, 1], omega: 1.7, amp: 0.05 };
  const w = new DW.ModalSolver({ l, a, c: 0.4, N: 250, phi: { type: "zero" }, psi: { type: "zero" }, source: F });
  const c = 0.4;
  let worst = 0, worstL2 = 0;
  for (let i = 0; i < 4000; i++) {
    w.step(0.0025);
    worst = Math.max(worst, w.energy() / (w.Asrc / (2 * c)));
    worstL2 = Math.max(worstL2, w.l2norm() / ((l * l) / (Math.PI * Math.PI * a * a * c) * w.Asrc));
  }
  rec("f 扰动: E_w ≤ (1/2c)∫||F||²ds", worst <= 1 + 1e-9, "max 比值 = " + worst.toFixed(4));
  rec("f 扰动: ||w||² ≤ l²‖F‖²_{L²L²}/(π²a²c)", worstL2 <= 1 + 1e-9, "max 比值 = " + worstL2.toFixed(4));
  const resid = Math.abs(w.energy() - (w.energy0 - c * w.Adiss + w.Aforce)) / w.energy();
  rec("含源能量恒等式 E = E(0) - c∫∫u_t² + ∫∫f u_t", resid < 1e-4, "相对残差 " + resid.toExponential(2));
}

/* ---------- 6. Lyapunov 指数衰减上界 ---------- */
{
  const c = 0.4, gamma = (c * l) / (2 * Math.PI * a), kappa = (c * (1 - gamma)) / (1 + gamma);
  const s = new DW.ModalSolver({ l, a, c, N: 200, phi: { type: "pluck", xp: l / 2 }, psi: { type: "zero" }, source: { type: "none" } });
  const E0 = s.energy();
  let worst = 0; const rate = [];
  for (let i = 0; i < 6000; i++) {
    s.step(0.002);
    const bound = ((1 + gamma) / (1 - gamma)) * E0 * Math.exp(-kappa * s.t);
    worst = Math.max(worst, s.energy() / bound);
    if (i % 1500 === 0) rate.push({ t: +s.t.toFixed(2), rate: +(Math.log(E0 / s.energy()) / s.t).toFixed(4) });
  }
  rec("Lyapunov 界 E(t) ≤ ((1+γ)/(1-γ))E(0)e^{-κt}", worst <= 1 + 1e-9,
    "γ=" + gamma.toFixed(4) + ", κ=" + kappa.toFixed(4) + ", max 比值 = " + worst.toFixed(4));
  rec("观测到的能量衰减率 ≈ c", rate.length === 4 && Math.abs(rate[2].rate - c) < 0.02,
    "log(E0/E(t))/t = " + rate.map((r) => r.t + ":" + r.rate).join(", "));
}

/* ---------- 7. 唯一性：不同分辨率/不同格式都收敛到同一个解 ---------- */
{
  // 拨弦（有拐点）初值：用 Richardson 自比较，避免参考解截断误差
  const phi = { type: "pluck", xp: 0.4 * l }, psi = { type: "modes", amps: [0, 0.5] };
  const mk = (J) => new DW.FDSolver({ l, a, c: 0.5, J, phi, psi, source: { type: "modes", amps: [0, 0, 1], omega: 2, amp: 0.03 } });
  const sols = {};
  for (const J of [100, 200, 400, 800]) { const s = mk(J); s.advanceTo(0.8); sols[J] = sampleOnGrid(s); }
  const e1 = maxDiff(sols[100], sols[200]), e2 = maxDiff(sols[200], sols[400]), e3 = maxDiff(sols[400], sols[800]);
  rec("唯一性（数值）：加密网格下解收敛到同一极限", e1 > e2 && e2 > e3 && e3 < 2e-3,
    "|u100-u200|=" + e1.toExponential(2) + ", |u200-u400|=" + e2.toExponential(2) + ", |u400-u800|=" + e3.toExponential(2));
}

console.log("\n" + out.filter((o) => !o.pass).length + " 项失败 / 共 " + out.length + " 项");
fs.writeFileSync(path.join(__dirname, "report.json"), JSON.stringify(out, null, 2));
