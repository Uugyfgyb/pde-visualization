/* 交叉校验：用交付的 engine.js（只读）产生参考值，供我的独立 Python 解对比 */
const DW = require(require("path").join(__dirname, "..", "..", "engine.js")); // 交付的 engine.js（只读）
const fs = require("fs");

const l = 1, a = 1, c = 0.4;
const T = 3.0, dt = 1e-4;
// engine 的 amps[i] 对应模式 i+1：amps[0]=mode1
const phiAmps = [1, 0, 0.4, 0, 0.15];      // modes 1,3,5
const psiAmps = [0, 0.3, 0, -0.2];         // modes 2,4

const s = new DW.ModalSolver({ l, a, c, N: 16, phi: { type: "modes", amps: phiAmps }, psi: { type: "modes", amps: psiAmps }, source: { type: "none" } });
const n = Math.round(T / dt);
for (let i = 0; i < n; i++) s.step(dt);
const out = {
  t: s.t, E: s.energy(), D: s.dissipation(), L2: s.l2norm(), H1: s.h1seminorm(), G: s.cross(),
  T: Array.from(s.T), V: Array.from(s.V),
  field: {},
};
for (const x of [0.1, 0.3, 0.55, 0.8]) out.field[x] = [s.u(x), s.ut(x)];

// FD 解（J=200）在同一时刻的场，供第二条独立通道比较
const fd = new DW.FDSolver({ l, a, c, J: 200, phi: { type: "modes", amps: phiAmps }, psi: { type: "modes", amps: psiAmps }, source: { type: "none" } });
while (fd.tHi < T - 1e-12) fd._stepOnce(fd.dt);
out.fd = { tHi: fd.tHi, field: {} };
for (const x of [0.1, 0.3, 0.55, 0.8]) out.fd.field[x] = fd.u(x);

fs.writeFileSync(__dirname + "/out_cross_engine.json", JSON.stringify(out, null, 2));
console.log("engine modal t=", out.t, "E=", out.E, "D=", out.D);
console.log("T =", out.T.slice(1, 7).map(v => v.toFixed(12)).join(" "));
console.log("fd tHi=", out.fd.tHi);
