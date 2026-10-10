/* =========================================================================
   app_euler.js — experiments 10-17: continuity, advection, point vortices,
   sound speed, tube modes, characteristics/shock formation, Sod shock tube,
   Mach cone.
   ========================================================================= */
(function () {
'use strict';
var A = window.APP, PH = A.PH, C = A.C;

/* ----------------------------------------------------------------- W10 --
   Continuity equation, term by term.                                   */
A.defWidget('continuity', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var b = 0.35, aGrad = 0.30, xp = 0.55;
  ct.slider({ label: '\u5bc6\u5ea6\u6ce2\u5e45\u5ea6', min: 0, max: 0.8, step: 0.01, value: 0.35, cls: 'e',
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { b = v; upd(); } });
  ct.slider({ label: '\u901f\u5ea6\u68af\u5ea6 $\u2202_xu$', min: -0.8, max: 0.8, step: 0.01, value: 0.3, cls: 'b',
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { aGrad = v; upd(); } });
  ct.slider({ label: '\u63a2\u9488\u4f4d\u7f6e', min: 0.05, max: 0.95, step: 0.01, value: 0.55,
    fmt: function (v) { return v.toFixed(2) + ' L'; }, oninput: function (v) { xp = v; upd(); } });

  ro.add('rho', '$\\rho$', 'hi'); ro.add('u', '$u$', 'bv');
  ro.add('drho', '$\partial_x\\rho$', ''); ro.add('du', '$\partial_xu$', '');
  ro.add('t1', '$-\\,u\\,\partial_x\\rho$', 'hi'); ro.add('t2', '$-\\,\\rho\\,\partial_xu$', 'bv');
  ro.add('sum', '\u4e24\u9879\u4e4b\u548c', 'ok'); ro.add('flux', '$-\partial_x(\\rho u)$\uff08\u6570\u503c\uff09', 'sv');
  ro.add('res', '\u5dee\u503c', 'ok');

  var L = 1, rho0 = 1;
  function rho(x) { return rho0 * (1 + b * Math.sin(2 * Math.PI * x / L)); }
  function u(x) { return 0.5 + aGrad * (x / L - 0.5); }
  function drho(x) { return rho0 * b * 2 * Math.PI / L * Math.cos(2 * Math.PI * x / L); }
  function du() { return aGrad / L; }
  function upd() {
    var r = rho(xp), uu = u(xp), dr = drho(xp), dU = du();
    var t1 = -uu * dr, t2 = -r * dU;
    var h = 1e-5;
    var fluxNum = -(rho(xp + h) * u(xp + h) - rho(xp - h) * u(xp - h)) / (2 * h);
    ro.set('rho', r.toFixed(4)); ro.set('u', uu.toFixed(4));
    ro.set('drho', dr.toFixed(4)); ro.set('du', dU.toFixed(4));
    ro.set('t1', t1.toFixed(4), 'hi'); ro.set('t2', t2.toFixed(4), 'bv');
    ro.set('sum', (t1 + t2).toFixed(4), 'ok');
    ro.set('flux', fluxNum.toFixed(4), 'sv');
    var res = Math.abs(t1 + t2 - fluxNum);
    ro.set('res', res.toExponential(1), res < 1e-6 ? 'ok' : 'bad');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var x0 = 46, x1 = W - 24, yR = H * 0.30, yU = H * 0.62, amp = H * 0.17;
    var X = A.mapper(0, 1, x0, x1);
    /* tube walls */
    A.line(ctx, x0 - 14, H * 0.16, x1 + 8, H * 0.16, A.rgba('#5d7291', 0.55), 1.6);
    A.line(ctx, x0 - 14, H - 22, x1 + 8, H - 22, A.rgba('#5d7291', 0.55), 1.6);
    /* density */
    var pR = [], pin = [];
    for (var i = 0; i <= 300; i++) {
      var xf = i / 300, xx = xf;
      pR.push([X(xx), yR - (rho(xx) / rho0 - 1) * amp * 3]);
      pin.push([X(xx), yR - (1.0 - 1) * amp]);
    }
    A.line(ctx, x0, yR, x1, yR, A.rgba('#5d7291', 0.35), 1, [4, 4]);
    A.curve(ctx, pR, C.rho, 2.2);
    A.text(ctx, '\u5bc6\u5ea6 $\\rho(x)$', x0, yR - amp * 3 - 8, { color: C.rho, size: 12 });
    /* velocity */
    var pU = [];
    for (i = 0; i <= 300; i++) { var xf2 = i / 300; pU.push([X(xf2), yU - (u(xf2) - 0.5) * amp * 3]); }
    A.line(ctx, x0, yU, x1, yU, A.rgba('#5d7291', 0.35), 1, [4, 4]);
    A.curve(ctx, pU, C.u, 2.2);
    A.text(ctx, '\u901f\u5ea6 $u(x)$', x0, yU - amp * 3 - 8, { color: C.u, size: 12 });
    /* flux arrows rho*u */
    for (i = 0; i <= 26; i++) {
      var xq = i / 26, fx = rho(xq) * u(xq);
      A.arrow(ctx, X(xq) - fx * 16, H - 40, X(xq) + fx * 16, H - 40, { color: A.rgba('#ffd166', 0.8), width: 1.5, head: 5 });
    }
    A.text(ctx, '\u901a\u91cf $\\rho u$', x0, H - 46, { color: '#ffd166', size: 11.5 });
    /* probe */
    var px = X(xp);
    A.line(ctx, px, 16, px, H - 18, '#ffffff', 1.3, [5, 4]);
    var rr = rho(xp), uu = u(xp), dr = drho(xp), dU = du(), dRhodt = -uu * dr - rr * dU;
    A.text(ctx, '\u63a2\u9488', px, 12, { color: '#fff', size: 11.5, align: 'center' });
    var ay = H * 0.44;
    A.arrow(ctx, px, ay, px, ay - Math.max(-34, Math.min(34, dRhodt * 90)), { color: dRhodt > 0 ? '#7ee787' : '#ff7b72', width: 2.2, head: 8 });
    A.text(ctx, '$\partial_t\\rho$ = ' + dRhodt.toFixed(3), px + 8, ay + 4, { color: dRhodt > 0 ? '#7ee787' : '#ff7b72', size: 12 });
    A.text(ctx, 'x \u2192', x1, H - 6, { color: C.dim2, size: 11, align: 'right' });
  });
  upd();
  A.onReady(function () { s.resize(); upd(); });
});

/* ----------------------------------------------------------------- W11 --
   Steady flow: du/dt = 0 but (u.grad)u != 0.                       */
A.defWidget('advection', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var m = 0.5, u0 = 0.6, probe = 0.5;
  var parts = []; for (var pi = 0; pi < 30; pi++) parts.push(pi / 30);
  ct.slider({ label: '\u901f\u5ea6\u53d8\u5316\u5e45\u5ea6', min: -0.9, max: 0.9, step: 0.02, value: 0.5,
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { m = v; upd(); } });
  ct.slider({ label: '\u5165\u53e3\u901f\u5ea6 $u(0)$', min: 0.2, max: 1.2, step: 0.02, value: 0.6,
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { u0 = v; upd(); } });
  ct.slider({ label: '\u63a2\u9488\u4f4d\u7f6e', min: 0.05, max: 0.95, step: 0.01, value: 0.5,
    fmt: function (v) { return v.toFixed(2) + ' L'; }, oninput: function (v) { probe = v; upd(); } });

  ro.add('dt', '$\partial_tu$', 'ok'); ro.add('conv', '$u\\,\partial_xu$', 'bv');
  ro.add('acc', '\u52a0\u901f\u5ea6 $a$', 'hi'); ro.add('dp', '$\\mathrm{d}p/\\mathrm{d}x$', '');
  ro.add('bern', '\u4f2f\u52aa\u5229\u6b8b\u5dee', 'sv'); ro.add('mid', '\u6d41\u4f53\u5143\u95f4\u8ddd', '');

  var L = 1, rho0 = 1, p0 = 1;
  function u(x) { return u0 * (1 + m * (2 * x / L - 1)); }
  function dudx() { return u0 * m * 2 / L; }
  function p(x) { return p0 - rho0 * 0.5 * (u(x) * u(x) - u(0) * u(0)); }
  function upd() {
    var uu = u(probe), acc = uu * dudx(), dp = -rho0 * uu * dudx();
    ro.set('dt', '0.000000  （定常）', 'ok');
    ro.set('conv', acc.toFixed(4), 'bv');
    ro.set('acc', acc.toFixed(4) + '  L/T\u00b2', 'hi');
    ro.set('dp', dp.toFixed(4));
    var worst = 0;
    for (var i = 0; i <= 100; i++) {
      var x = i / 100, B = p(x) + 0.5 * rho0 * u(x) * u(x);
      worst = Math.max(worst, Math.abs(B - (p0 + 0.5 * rho0 * u(0) * u(0))));
    }
    ro.set('bern', worst.toExponential(1), worst < 1e-12 ? 'ok' : 'bad');
    var n = 18, sp = [];
    for (i = 0; i < n; i++) sp.push((i + 0.5) / n);
    /* spacing between neighbouring tracers ~ 1/u(x): mass conservation in a nozzle */
    var midth = 1 / u(probe) * (u0 / 1);
    ro.set('mid', (1 / uu).toFixed(4) + '  (\u6b63\u6bd4\u4e8e 1/u)');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var x0 = 44, x1 = W - 24, yc = H * 0.52, amp = H * 0.22;
    var X = A.mapper(0, 1, x0, x1);
    /* nozzle outline: area ~ 1/u  (mass conservation) */
    ctx.save(); ctx.strokeStyle = A.rgba('#5d7291', 0.6); ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var i = 0; i <= 100; i++) {
      var xf = i / 100, hw = 0.10 / u(xf) * 1.2 * H;
      var px = X(xf);
      if (i === 0) ctx.moveTo(px, yc - hw); else ctx.lineTo(px, yc - hw);
    }
    for (i = 100; i >= 0; i--) { var xf2 = i / 100, hw2 = 0.10 / u(xf2) * 1.2 * H; ctx.lineTo(X(xf2), yc + hw2); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(30,45,72,.30)'; ctx.fill(); ctx.stroke(); ctx.restore();
    /* Lagrangian tracers: dx/dt = u(x).  Their spacing shows the
       continuity equation: fast regions stretch the fluid elements. */
    for (i = 0; i < parts.length; i++) {
      var px2 = X(parts[i]);
      A.dot(ctx, px2, yc, 3.2, A.rgba('#9fe8ff', 0.85));
    }
    A.text(ctx, '示踪粒子：距离随 $u$ 变化（$\partial_t\\rho+\partial_x(\\rho u)=0$ 的直观）)',
      x0, H - 10, { color: C.dim2, size: 11 });
    /* velocity profile */
    var pU = [];
    for (i = 0; i <= 200; i++) { var q = i / 200; pU.push([X(q), yc + amp * 1.5 - u(q) * amp * 0.9]); }
    A.curve(ctx, pU, C.u, 2.2);
    A.text(ctx, '$u(x)$', X(0.02), yc + amp * 1.5 - u(0.02) * amp * 0.9 - 8, { color: C.u, size: 12 });
    /* pressure profile */
    var pP = [];
    for (i = 0; i <= 200; i++) { var q2 = i / 200; pP.push([X(q2), yc - amp * 1.6 - p(q2) * amp * 0.9]); }
    A.curve(ctx, pP, C.p, 2.2);
    A.text(ctx, '$p(x)$ \uff08\u7531\u4f2f\u52aa\u5229\u5173\u7cfb\u5f97\u5230\uff09', X(0.02), yc - amp * 1.6 - p(0.02) * amp * 0.9 - 8, { color: C.p, size: 12 });
    /* probe + acceleration arrow */
    var px3 = X(probe), uu = u(probe), acc = uu * dudx();
    A.line(ctx, px3, 16, px3, H - 16, '#ffffff', 1.2, [5, 4]);
    A.arrow(ctx, px3 - 26, yc, px3 + 26, yc, { color: A.rgba('#ffd166', 0.95), width: 2.4, head: 9 });
    A.text(ctx, '$a=u\\,\\partial_xu$ = ' + acc.toFixed(3), px3 + 32, yc + 4, { color: '#ffd166', size: 12 });
    A.text(ctx, '\u6d41\u4f53\u5143\u5728\u5b9a\u5e38\u6d41\u573a\u4e2d\u52a0\u901f\uff1a$\partial_tu=0$ \u4f46 $a\\neq0$', 12, 18, { color: C.dim, size: 12 });
  });
  upd();
  A.onReady(function () {
    s.resize(); upd();
    s.animate(function (dt) {
      /* dx/dt = u(x): integrate the tracers and recycle them at the inlet */
      for (var i = 0; i < parts.length; i++) {
        parts[i] += u(parts[i]) * dt * 0.35;
        if (parts[i] > 1) parts[i] -= 1;
        if (parts[i] < 0) parts[i] += 1;
      }
      drawFn && drawFn();
    });
  });
});

/* ----------------------------------------------------------------- W12 --
   Point vortices: exact solutions of 2-D incompressible Euler.        */
A.defWidget('vortices', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var pv = null, H0 = 0, tracers = [], preset = 'pair', speed = 1, running = true;
  function setPreset(name) {
    preset = name;
    if (name === 'pair') pv = new PH.PointVortices([-0.3, 0.3], [0, 0], [1, -1]);
    else if (name === 'same') pv = new PH.PointVortices([-0.25, 0.25], [0, 0], [1, 1]);
    else if (name === 'tri') pv = new PH.PointVortices([0, 0.5, -0.5], [-0.35, 0.35, 0.35], [1, 1, 1]);
    else pv = new PH.PointVortices([-0.5, 0.4, 0.1, -0.2], [0.3, -0.4, 0.5, -0.2], [1, -0.7, 0.5, -1.2]);
    H0 = pv.hamiltonian();
    tracers = [];
    for (var i = 0; i < 60; i++) {
      var th = i / 60 * 2 * Math.PI, r = 0.18 + 0.5 * ((i * 37) % 100) / 100;
      tracers.push([r * Math.cos(th), r * Math.sin(th) * 0.8]);
    }
  }
  ct.seg({ label: '\u914d\u7f6e\uff1a', options: [{ label: '\u53cd\u5411\u6da1\u5bf9', value: 'pair' }, { label: '\u540c\u5411\u53cc\u6da1', value: 'same' }, { label: '\u4e09\u6da1', value: 'tri' }, { label: '\u56db\u6da1', value: 'quad' }],
    value: 'pair', onchange: function (v) { setPreset(v); } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { running = !!v; } });
  ct.slider({ label: '\u65f6\u95f4\u6b65\u957f', min: 0.2, max: 2.5, step: 0.1, value: 1,
    fmt: function (v) { return v.toFixed(1) + '\u00d7'; }, oninput: function (v) { speed = v; } });
  ct.button({ label: '\u91cd\u7f6e', onclick: function () { setPreset(preset); } });

  ro.add('n', '\u6da1\u6570 $N$', ''); ro.add('G', '$\\sum\Gamma_i$', 'sv');
  ro.add('H', '\u54c8\u5bc6\u987f\u91cf $H$', 'bv'); ro.add('dH', '\u76f8\u5bf9\u6f02\u79fb $|H-H_0|/|H_0|$', 'ok');
  ro.add('v', '\u5f15\u5bfc\u901f\u5ea6\u91cf\u7ea7', '');
  ro.add('pair', '\u6da1\u5bf9\u5e73\u79fb\u901f\u5ea6', '');

  function draw() {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var S = Math.min(W, H) * 0.42, cx = W * 0.5, cy = H * 0.5;
    var X = function (x) { return cx + x * S; }, Y = function (y) { return cy - y * S; };
    A.gridPlot(ctx, { x: X(-1.18), y: Y(1.18), w: 2.36 * S, h: 2.36 * S }, { nx: 8, ny: 8, bg: true });
    /* induced velocity field */
    var nG = 17;
    for (var i = 0; i < nG; i++) for (var j = 0; j < nG; j++) {
      var x = -1.05 + 2.1 * i / (nG - 1), y = -1.05 + 2.1 * j / (nG - 1);
      var ux = 0, uy = 0;
      for (var q = 0; q < pv.n; q++) {
        var dx = x - pv.x[q], dy = y - pv.y[q], r2 = dx * dx + dy * dy;
        if (r2 < 0.0025) { ux = NaN; break; }
        ux += -pv.G[q] / (2 * Math.PI) * dy / r2;
        uy += pv.G[q] / (2 * Math.PI) * dx / r2;
      }
      if (isNaN(ux)) continue;
      var mag = Math.hypot(ux, uy), sc = Math.min(13, mag * 26);
      if (sc < 2.2) continue;
      A.arrow(ctx, X(x) - ux / mag * sc * 0.5, Y(y) + uy / mag * sc * 0.5, X(x) + ux / mag * sc * 0.5, Y(y) - uy / mag * sc * 0.5,
        { color: 'rgba(122,162,247,.30)', width: 1, head: 3.6 });
    }
    /* tracers (passive particles: vorticity is frozen in 2-D) */
    for (i = 0; i < tracers.length; i++) A.dot(ctx, X(tracers[i][0]), Y(tracers[i][1]), 1.7, 'rgba(126,231,135,.55)');
    /* vortices */
    for (i = 0; i < pv.n; i++) {
      var rr = 6 + 5 * Math.min(1.4, Math.abs(pv.G[i]));
      A.dot(ctx, X(pv.x[i]), Y(pv.y[i]), rr, pv.G[i] > 0 ? A.rgba('#ff7b72', 0.9) : A.rgba('#4fc3f7', 0.9), 'rgba(255,255,255,.65)');
      A.text(ctx, (pv.G[i] > 0 ? '+' : '\u2212') + Math.abs(pv.G[i]).toFixed(1), X(pv.x[i]), Y(pv.y[i]) + 4,
        { color: '#04101f', size: 11, align: 'center', font: 'bold 11px "Segoe UI",sans-serif' });
    }
    A.text(ctx, '\u88ab\u52a8\u793a\u8e2a\u7c92\u5b50\uff08\u7eff\uff09\u968f\u6d41\u4f53\u5143\u8fd0\u52a8\uff1a\u4e8c\u7ef4\u4e0d\u53ef\u538b\u6b27\u62c9\u65b9\u7a0b\u4e2d\u6da1\u91cf\u88ab\u5b8c\u5168\u51bb\u7ed3', 12, 18, { color: C.dim, size: 11.5 });
    A.text(ctx, '\u80cc\u666f\u7bad\u5934\uff1a\u5404\u6da1\u5f15\u8d77\u7684\u5408\u901f\u5ea6\u573a', 12, H - 12, { color: C.dim2, size: 11.5 });
  }
  A.onReady(function () {
    setPreset('pair');
    s.animate(function (dt) {
      if (running) {
        var sub = 6, h = dt * 0.10 * speed / sub;
        for (var k = 0; k < sub; k++) {
          pv.stepRK4(h);
          for (var i = 0; i < tracers.length; i++) {
            var ux = 0, uy = 0;
            for (var q = 0; q < pv.n; q++) {
              var dx = tracers[i][0] - pv.x[q], dy = tracers[i][1] - pv.y[q], r2 = dx * dx + dy * dy;
              if (r2 < 0.0025) continue;
              ux += -pv.G[q] / (2 * Math.PI) * dy / r2;
              uy += pv.G[q] / (2 * Math.PI) * dx / r2;
            }
            tracers[i][0] += ux * h; tracers[i][1] += uy * h;
          }
        }
      }
      draw();
      ro.set('n', String(pv.n));
      var G = 0; for (var q2 = 0; q2 < pv.n; q2++) G += pv.G[q2];
      ro.set('G', G.toFixed(2), 'sv');
      var Hc = pv.hamiltonian();
      ro.set('H', Hc.toFixed(5), 'bv');
      var drift = Math.abs(Hc - H0) / Math.max(1e-12, Math.abs(H0));
      ro.set('dH', drift.toExponential(1), drift < 1e-6 ? 'ok' : 'bad');
      var vv = pv.velocities(), mx = 0;
      for (var i2 = 0; i2 < pv.n; i2++) mx = Math.max(mx, Math.hypot(vv.u[i2], vv.v[i2]));
      ro.set('v', mx.toFixed(3));
      if (preset === 'pair') {
        var d = Math.hypot(pv.x[0] - pv.x[1], pv.y[0] - pv.y[1]);
        ro.set('pair', (Math.abs(pv.G[0]) / (2 * Math.PI * d)).toFixed(4) + '  (\u89e3\u6790\u503c)');
      } else ro.set('pair', '\u2014');
    });
  });
});

/* ----------------------------------------------------------------- W13 --
   Sound speed: adiabatic vs isothermal vs empirical.                  */
A.defWidget('soundspeed', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var gas = 'air', Tc = 20, P0 = 101325;
  var names = Object.keys(PH.GASES);
  ct.seg({ label: '\u6c14\u4f53\uff1a', options: names.map(function (k) { return { label: PH.GASES[k].name, value: k }; }), value: 'air',
    onchange: function (v) { gas = v; upd(); } });
  ct.slider({ label: '\u6e29\u5ea6 $T$', min: -60, max: 600, step: 1, value: 20,
    fmt: function (v) { return v.toFixed(0) + ' \u00b0C'; }, oninput: function (v) { Tc = v; upd(); } });

  ro.add('c', '\u7edd\u70ed $c=\\sqrt{\\gamma RT/M}$', 'hi');
  ro.add('ci', '\u7b49\u6e29 $\\sqrt{RT/M}$', 'bv');
  ro.add('ce', '\u7ecf\u9a8c\u516c\u5f0f\uff08\u7a7a\u6c14\uff09', '');
  ro.add('dev', '\u7edd\u70ed vs \u7ecf\u9a8c \u504f\u5dee', 'ok');
  ro.add('gam', '$\u03b3$', ''); ro.add('M', '$M$ (g/mol)', '');
  ro.add('rho', '$\u03c1_0$ (1 atm)', ''); ro.add('Z', '\u58f0\u963b\u6297 $Z=\u03c1_0c$', 'sv');
  ro.add('iso', '\u7b49\u6e29/\u7edd\u70ed', '');

  function upd() {
    var g = PH.GASES[gas], T = Tc + 273.15;
    var c = PH.soundSpeed(g.gamma, T, g.M);
    var ci = Math.sqrt(PH.consts.RGAS * T / g.M);
    var ce = PH.soundSpeedAirEmpirical(Tc);
    var rho0 = P0 * g.M / (PH.consts.RGAS * T);
    ro.set('c', c.toFixed(2) + ' m/s', 'hi');
    ro.set('ci', ci.toFixed(2) + ' m/s', 'bv');
    ro.set('ce', gas === 'air' ? ce.toFixed(2) + ' m/s' : '\u2014');
    var dev = gas === 'air' ? Math.abs(c - ce) / ce : NaN;
    ro.set('dev', gas === 'air' ? (dev * 100).toFixed(3) + ' %' : '\u2014', dev < 0.005 ? 'ok' : '');
    ro.set('gam', g.gamma.toFixed(3)); ro.set('M', (g.M * 1000).toFixed(2));
    ro.set('rho', rho0.toFixed(4) + ' kg/m\u00b3');
    ro.set('Z', (rho0 * c).toFixed(1) + ' Pa\u00b7s/m', 'sv');
    ro.set('iso', (ci / c).toFixed(4) + '  (=1/\u221a\u03b3)', '');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var box = { x: 56, y: 30, w: W - 90, h: H - 74 };
    A.gridPlot(ctx, box, { nx: 6, ny: 4 });
    var g = PH.GASES[gas];
    var Tlo = -60, Thi = 600;
    var X = A.mapper(Tlo, Thi, box.x, box.x + box.w);
    var cmax = PH.soundSpeed(g.gamma, 873, g.M) * 1.05;
    var Y = A.mapper(0, cmax, box.y + box.h, box.y);
    var pc = [], pi = [], pe = [];
    for (var T = Tlo; T <= Thi; T += 2) {
      pc.push([X(T), Y(PH.soundSpeed(g.gamma, T + 273.15, g.M))]);
      pi.push([X(T), Y(Math.sqrt(PH.consts.RGAS * (T + 273.15) / g.M))]);
      if (gas === 'air') pe.push([X(T), Y(PH.soundSpeedAirEmpirical(T))]);
    }
    A.curve(ctx, pi, A.rgba(C.B, 0.75), 1.6, [5, 4]);
    if (pe.length) A.curve(ctx, pe, A.rgba(C.S, 0.8), 1.4, [2, 3]);
    A.curve(ctx, pc, C.E, 2.4);
    var cc = PH.soundSpeed(g.gamma, Tc + 273.15, g.M);
    A.dot(ctx, X(Tc), Y(cc), 5, '#fff', C.E);
    A.line(ctx, X(Tc), box.y, X(Tc), box.y + box.h, A.rgba('#ffffff', 0.35), 1, [4, 4]);
    A.text(ctx, '\u7edd\u70ed $\u221a(\u03b3RT/M)$', box.x + 8, box.y + 16, { color: C.E, size: 11.5 });
    A.text(ctx, '\u7b49\u6e29 $\u221a(RT/M)$\uff08\u725b\u987f\uff09', box.x + 8, box.y + 32, { color: C.B, size: 11.5 });
    if (gas === 'air') A.text(ctx, '\u7ecf\u9a8c $331.3\u221a(1+T/273)$', box.x + 8, box.y + 48, { color: C.S, size: 11.5 });
    A.text(ctx, '$T$ (\u00b0C) \u2192', box.x + box.w / 2, box.y + box.h + 20, { color: C.dim2, size: 11, align: 'center' });
    A.text(ctx, '$c$ (m/s)', box.x - 10, box.y + 4, { color: C.dim2, size: 11, align: 'right' });
    A.text(ctx, g.name + '   \u03b3 = ' + g.gamma + '   M = ' + (g.M * 1000).toFixed(2) + ' g/mol',
      box.x + box.w, box.y - 8, { color: '#fff', size: 12, align: 'right' });
  });
  upd();
  A.onReady(function () { s.resize(); upd(); });
});

/* ----------------------------------------------------------------- W14 --
   Standing waves in a tube: boundary conditions select the harmonics. */
A.defWidget('tube', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var bc = 'cc', n = 1, L = 0.6, cc = 343, t = 0, running = true;
  ct.seg({ label: '\u7aef\u70b9\uff1a', options: [{ label: '\u95ed\u2013\u95ed', value: 'cc' }, { label: '\u5f00\u2013\u5f00', value: 'oo' }, { label: '\u95ed\u2013\u5f00', value: 'co' }], value: 'cc',
    onchange: function (v) { bc = v; upd(); } });
  ct.slider({ label: '\u6a21\u6570 $n$', min: 1, max: 6, step: 1, value: 1, fmt: function (v) { return String(v); }, oninput: function (v) { n = v; upd(); } });
  ct.slider({ label: '\u7ba1\u957f $L$', min: 0.2, max: 1.5, step: 0.01, value: 0.6,
    fmt: function (v) { return v.toFixed(2) + ' m'; }, oninput: function (v) { L = v; upd(); } });
  ct.slider({ label: '$c$', min: 200, max: 1500, step: 10, value: 343, fmt: function (v) { return v.toFixed(0) + ' m/s'; }, oninput: function (v) { cc = v; upd(); } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { running = !!v; } });

  ro.add('f', '\u672c\u5f81\u9891\u7387 $f_n$', 'hi'); ro.add('lam', '\u6ce2\u957f $\u03bb_n$', 'bv');
  ro.add('k', '$k_n$', ''); ro.add('nodes', '\u8282\u70b9\u4f4d\u7f6e', '');
  ro.add('series', '\u524d 5 \u9636\u9891\u7387', 'sv');

  function omega() { return 2 * Math.PI * fn(); }
  function fn() {
    if (bc === 'co') return (2 * n - 1) * cc / (4 * L);
    return n * cc / (2 * L);
  }
  function shape(xf) {           /* pressure mode shape, unit amplitude */
    if (bc === 'cc') return Math.cos(n * Math.PI * xf);
    if (bc === 'oo') return Math.sin(n * Math.PI * xf);
    return Math.cos((2 * n - 1) * Math.PI * xf / 2);
  }
  function ushape(xf) {
    if (bc === 'cc') return Math.sin(n * Math.PI * xf);
    if (bc === 'oo') return Math.cos(n * Math.PI * xf);
    return Math.sin((2 * n - 1) * Math.PI * xf / 2);
  }
  function upd() {
    var f = fn();
    ro.set('f', f.toFixed(2) + ' Hz', 'hi');
    ro.set('lam', (cc / f).toFixed(3) + ' m', 'bv');
    ro.set('k', (2 * Math.PI * f / cc).toFixed(3) + ' 1/m');
    var nd = [];
    for (var i = 1; i < (bc === 'co' ? 2 * n : n); i++) {
      var xf = (bc === 'co') ? (2 * i - 1) / (2 * n) * 1 : i / n;   /* pressure nodes */
      nd.push((xf * L).toFixed(3));
    }
    ro.set('nodes', nd.length ? nd.join(', ') + ' m' : '\u65e0');
    var ser = [];
    for (i = 1; i <= 5; i++) {
      var fi = (bc === 'co') ? (2 * i - 1) * cc / (4 * L) : i * cc / (2 * L);
      ser.push(fi.toFixed(1));
    }
    ro.set('series', ser.join(' / ') + ' Hz', 'sv');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var x0 = 54, x1 = W - 34, yc = H * 0.44, amp = H * 0.20;
    var X = A.mapper(0, 1, x0, x1);
    /* tube walls: hatched for closed end, open for open end */
    var closedL = (bc === 'cc' || bc === 'co');
    var closedR = (bc === 'cc');
    A.line(ctx, x0, yc - amp * 1.35, x1, yc - amp * 1.35, A.rgba('#5d7291', 0.6), 1.6);
    A.line(ctx, x0, yc + amp * 1.35, x1, yc + amp * 1.35, A.rgba('#5d7291', 0.6), 1.6);
    function wall(x, w) {
      for (var i = -6; i <= 6; i++) {
        A.line(ctx, x + w * 0.0 + i * 1.6, yc - amp * 1.35, x + i * 1.6 - 8, yc + amp * 1.35, A.rgba('#8fa3bd', 0.35), 1);
      }
      A.line(ctx, x, yc - amp * 1.5, x, yc + amp * 1.5, '#8fa3bd', 2.4);
    }
    if (closedL) wall(x0, 0); else A.text(ctx, '\u5f00\u53e3', x0 - 26, yc + 4, { color: C.dim, size: 11.5 });
    if (closedR) wall(x1, 0); else A.text(ctx, '\u5f00\u53e3', x1 + 8, yc + 4, { color: C.dim, size: 11.5 });
    var w = omega(), ph = Math.cos(w * t), ph2 = Math.sin(w * t);
    var pP = [], pU = [];
    for (var i = 0; i <= 300; i++) {
      var xf = i / 300;
      pP.push([X(xf), yc - amp * shape(xf) * ph]);
      pU.push([X(xf), yc + amp * 1.9 + amp * 0.75 * ushape(xf) * ph2 * (cc / 343) / (cc / 343)]);
    }
    /* p about the axis, u offset below */
    var pP2 = [], pU2 = [];
    for (i = 0; i <= 300; i++) {
      var xf2 = i / 300;
      pP2.push([X(xf2), yc - amp * shape(xf2) * ph]);
      pU2.push([X(xf2), yc + amp * 1.55 - amp * 0.45 * ushape(xf2) * ph2]);
    }
    A.line(ctx, x0, yc, x1, yc, A.rgba('#5d7291', 0.4), 1, [4, 4]);
    A.curve(ctx, pP2, C.p, 2.2);
    A.curve(ctx, pU2, C.u, 1.8);
    A.text(ctx, '$p_1$', x1 - 4, yc - amp * 1.2, { color: C.p, size: 12, align: 'right' });
    A.text(ctx, '$u_1$', x1 - 4, yc + amp * 1.75, { color: C.u, size: 12, align: 'right' });
    /* nodes of p */
    var nmax = (bc === 'co') ? 2 * n - 1 : n;
    for (i = 1; i <= nmax; i++) {
      var xf3 = (bc === 'co') ? (2 * i - 1) / (2 * (2 * n - 1) * 0.5) : 0;
      xf3 = (bc === 'co') ? (i - 0.5) / n : i / n;
      if (xf3 > 1) continue;
      var px = X(xf3);
      A.line(ctx, px, yc - 6, px, yc + 6, A.rgba('#c792ea', 0.9), 1.6);
    }
    A.text(ctx, '\u7d2b\u8272\u77ed\u7ebf\uff1a\u538b\u5f3a\u8282\u70b9\uff08$u_1$ \u6700\u5927\u5904\uff09', x0, H - 10, { color: C.dim2, size: 11.5 });
    A.text(ctx, '$n$ = ' + n + '   $f$ = ' + fn().toFixed(2) + ' Hz', x1, 20, { color: '#fff', size: 12.5, align: 'right' });
    A.text(ctx, bc === 'cc' ? '\u95ed\u2013\u95ed\uff1a\u5168\u8c10\u97f3\u5217' : (bc === 'oo' ? '\u5f00\u2013\u5f00\uff1a\u5168\u8c10\u97f3\u5217' : '\u95ed\u2013\u5f00\uff1a\u53ea\u6709\u5947\u6b21\u8c10\u97f3'), x0, 20, { color: C.dim, size: 12 });
  });
  upd();
  A.onReady(function () {
    s.resize(); upd();
    s.animate(function (dt) { if (running) t += dt * 0.05; drawFn && drawFn(); });
  });
});

/* ----------------------------------------------------------------- W15 --
   Nonlinear steepening: characteristics, breaking time, equal-area shock. */
A.defWidget('characteristics', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var gam = 1.4, c0v = 1, Amp = 0.06, kk = 2 * Math.PI, tfac = 0, running = true;
  var tb = PH.simpleWaveBreakingTime(Amp, kk, gam, c0v);
  ct.slider({ label: '\u5e45\u503c $A$', min: 0.01, max: 0.2, step: 0.005, value: 0.06,
    fmt: function (v) { return v.toFixed(3); }, oninput: function (v) { Amp = v; tb = PH.simpleWaveBreakingTime(Amp, kk, gam, c0v); tfac = Math.min(tfac, 1.6); upd(); } });
  var ctlT = ct.slider({ label: '$t/t_b$', min: 0, max: 1.6, step: 0.005, value: 0, fmt: function (v) { return v.toFixed(3); },
    oninput: function (v) { tfac = v; last = upd(); drawFn && drawFn(); } });
  ct.seg({ label: '', options: [{ label: '\u25b6 \u6f14\u5316', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { running = !!v; } });
  ct.note('$\u03b3$ = 1.4, $c_0$ = 1, $u_0=A\\sin kx$');

  ro.add('tb', '\u7406\u8bba\u7834\u6ce2\u65f6\u95f4 $t_b$', 'hi');
  ro.add('t', '\u5f53\u524d\u65f6\u523b $t$', '');
  ro.add('st', '\u72b6\u6001', 'ok');
  ro.add('xs', '\u6fc0\u6ce2\u4f4d\u7f6e', 'sv');
  ro.add('res', '\u7b49\u9762\u79ef\u6b8b\u5dee', 'ok');
  ro.add('slope', '\u6700\u5927\u659c\u7387', '');

  function u0(xi) { return Amp * Math.sin(kk * xi); }
  function lam(xi) { return c0v + 0.5 * (gam + 1) * u0(xi); }
  function xof(xi, t) { return xi + lam(xi) * t; }

  function upd() {
    var t = tfac * tb;
    ro.set('tb', tb.toFixed(4));
    ro.set('t', t.toFixed(4));
    ro.set('st', tfac > 1 ? '\u5df2\u7834\u6ce2\uff1a\u51fa\u73b0\u591a\u503c\u533a\uff0c\u9700\u7528\u5f31\u89e3' : (tfac > 0.9 ? '\u4e34\u754c\uff08\u5373\u5c06\u7834\u6ce2\uff09' : '\u5149\u6ed1\u533a'), tfac > 1 ? 'bad' : 'ok');
    /* equal-area shock: thickness of the fold as a function of x */
    var Ns = 1400, i, xs = [], us = [];
    for (i = 0; i <= Ns; i++) { var xi = i / Ns; xs.push(xof(xi, t)); us.push(u0(xi)); }
    /* a shock exists only once characteristics really fold (dx/dxi < 0);
       restricting the equal-area search to that fold removes false positives
       from profiles that are merely steep but still single valued */
    var foldLo = -1, foldHi = -1;
    for (i = 1; i <= Ns; i++) if (xs[i] < xs[i - 1]) { if (foldLo < 0) foldLo = i - 1; foldHi = i; }
    var folded = (foldLo >= 0);
    var xmin = folded ? Math.min(xs[foldLo], xs[foldHi]) : 0;
    var xmax = folded ? Math.max(xs[foldLo], xs[foldHi]) : 0;
    var nb = 160, thick = new Float64Array(nb), cnt = 0;
    if (folded) for (i = 0; i < nb; i++) {
      var xa = xmin + (xmax - xmin) * i / (nb - 1), lo = Infinity, hi = -Infinity;
      for (var q = 0; q <= Ns; q++) {
        if (Math.abs(xs[q] - xa) < (xmax - xmin) / nb * 0.75) { if (us[q] < lo) lo = us[q]; if (us[q] > hi) hi = us[q]; }
      }
      thick[i] = (hi > lo) ? (hi - lo) : 0;
      if (thick[i] > 1e-6) cnt++;
    }
    var total = 0;
    for (i = 0; i < nb; i++) total += thick[i];
    var acc2 = 0, xsPos = NaN, best = Infinity;
    if (folded && cnt > 2 && total > 1e-9) {
      for (i = 0; i < nb; i++) {
        acc2 += thick[i];
        var bal = Math.abs(acc2 - (total - acc2));
        if (bal < best) { best = bal; xsPos = xmin + (xmax - xmin) * i / (nb - 1); }
      }
    }
    ro.set('xs', isFinite(xsPos) ? xsPos.toFixed(4) : '\u2014\uff08\u672a\u7834\u6ce2\uff09', 'sv');
    ro.set('res', total > 1e-9 ? (best / total).toExponential(1) : '\u2014', (best / total) < 0.02 ? 'ok' : '');
    var ms = 0;
    for (i = 1; i <= Ns; i++) ms = Math.max(ms, Math.abs(us[i] - us[i - 1]) / Math.abs(xs[i] - xs[i - 1] + 1e-30));
    ro.set('slope', isFinite(ms) ? ms.toFixed(3) : '\u221e');
    return { xs: xs, us: us, t: t, xmin: xmin, xmax: xmax, xsPos: xsPos, thick: thick, xminb: xmin, xmaxb: xmax };
  }
  var last = null;
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var tmax = 1.6 * tb;
    var xTop = 1 + (c0v + 0.5 * (gam + 1) * Amp) * tmax;
    var boxT = { x: 52, y: 24, w: W - 76, h: H * 0.50 };
    var boxB = { x: 52, y: H * 0.62, w: W - 76, h: H * 0.30 };
    A.gridPlot(ctx, boxT, { nx: 6, ny: 4 });
    A.gridPlot(ctx, boxB, { nx: 6, ny: 2 });
    var XT = A.mapper(0, xTop, boxT.x, boxT.x + boxT.w), TT = A.mapper(0, tmax, boxT.y + boxT.h, boxT.y);
    /* characteristics */
    for (var i = 0; i <= 34; i++) {
      var xi = i / 34;
      var x_end = xof(xi, tmax);
      var isShock = Math.abs(u0(xi) - Amp) < 1e-9;
      A.line(ctx, XT(xi), TT(0), XT(x_end), TT(tmax), A.rgba(isShock ? '#ff7b72' : C.u, isShock ? 0.85 : 0.42), isShock ? 1.6 : 1);
    }
    /* shock locus: t = tb at x = breaking point */
    var xb = xof(0.75, tb);
    A.dot(ctx, XT(xb), TT(tb), 5, '#ff6b6b', '#fff');
    A.text(ctx, '\u7834\u6ce2\u70b9 $(x_b,t_b)$', XT(xb) + 8, TT(tb) - 6, { color: '#ff9f9f', size: 11.5 });
    A.line(ctx, XT(0), TT(tb), XT(xTop), TT(tb), A.rgba('#ff6b6b', 0.25), 1, [4, 4]);
    A.text(ctx, '$x$ \u2192', boxT.x + boxT.w - 4, boxT.y + boxT.h + 15, { color: C.dim2, size: 11, align: 'right' });
    A.text(ctx, '$t$', boxT.x - 10, boxT.y + 10, { color: C.dim2, size: 11, align: 'right' });
    A.text(ctx, '\u7279\u5f81\u7ebf $x=\\xi+[c_0+\\frac{\\gamma+1}{2}u_0(\\xi)]t$', boxT.x + 6, boxT.y + 15, { color: C.dim, size: 11.5 });
    /* waveform at t */
    var t = tfac * tb;
    var XB = A.mapper(0, xTop, boxB.x, boxB.x + boxB.w);
    var YB = A.mapper(-Amp * 1.35, Amp * 1.35, boxB.y + boxB.h, boxB.y);
    A.line(ctx, boxB.x, YB(0), boxB.x + boxB.w, YB(0), A.rgba('#5d7291', 0.5), 1);
    var Ns = 1400, ptsF = [], ptsB = [];
    for (i = 0; i <= Ns; i++) {
      var xi2 = i / Ns, xv = xof(xi2, t), uu = u0(xi2);
      (xof(xi2, tb) < xb ? ptsB : ptsF).push([XB(xv), YB(uu)]);
    }
    A.curve(ctx, ptsB, A.rgba(C.u, 0.35), 1.4, [4, 4]);
    A.curve(ctx, ptsF, C.E, 2.2);
    if (last && isFinite(last.xsPos)) {
      A.line(ctx, XB(last.xsPos), boxB.y + 4, XB(last.xsPos), boxB.y + boxB.h - 4, '#ff6b6b', 2.2);
      A.text(ctx, '\u6fc0\u6ce2\uff08\u7b49\u9762\u79ef\u6cd5\u5219\uff09', XB(last.xsPos) + 6, boxB.y + boxB.h - 8, { color: '#ff6b6b', size: 11.5 });
    }
    A.text(ctx, '\u6ce2\u5f62\uff08\u5b9e\u7ebf\uff1a\u7269\u7406\u5206\u652f\uff1b\u865a\u7ebf\uff1a\u975e\u7269\u7406\u7684\u591a\u503c\u90e8\u5206\uff09', boxB.x + 6, boxB.y + 15, { color: C.dim, size: 11.5 });
    A.text(ctx, '$u$', boxB.x - 10, boxB.y + boxB.h / 2, { color: C.dim2, size: 11, align: 'right' });
  });
  A.onReady(function () {
    s.resize();
    s.animate(function (dt) {
      if (running) { tfac += dt * 0.16; if (tfac > 1.6) tfac = 0; ctlT.set(tfac.toFixed(3)); }
      last = upd();
      drawFn && drawFn();
    });
  });
});

/* ----------------------------------------------------------------- W16 --
   Sod shock tube, HLL finite volume.                                  */
A.defWidget('sod', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var N = 400, tEnd = 0.2, show = 'all', solver = null, an = null;
  ct.seg({ label: '\u7f51\u683c\uff1a', options: [{ label: '200', value: 200 }, { label: '400', value: 400 }, { label: '800', value: 800 }], value: 400,
    onchange: function (v) { N = v; solve(); } });
  ct.slider({ label: '\u65f6\u523b $t$', min: 0.05, max: 0.25, step: 0.005, value: 0.2,
    fmt: function (v) { return v.toFixed(3); }, oninput: function (v) { tEnd = v; solve(); } });
  ct.seg({ label: '\u663e\u793a\uff1a', options: [{ label: '\u5168\u90e8', value: 'all' }, { label: '\u5bc6\u5ea6', value: 'rho' }, { label: '\u901f\u5ea6', value: 'u' }, { label: '\u538b\u5f3a', value: 'p' }],
    value: 'all', onchange: function (v) { show = v; } });

  ro.add('ps', '$p^*$', 'hi'); ro.add('us', '$u^*$', '');
  ro.add('rl', '$\u03c1^*_L$', 'bv'); ro.add('rr', '$\u03c1^*_R$', 'bv');
  ro.add('ss', '\u6fc0\u6ce2\u901f\u5ea6', 'sv');
  ro.add('ep', 'p* \u8bef\u5dee', 'ok'); ro.add('er', '\u03c1*_R \u8bef\u5dee', 'ok');
  ro.add('cons', '\u8d28\u91cf/\u80fd\u91cf\u5b88\u6052', 'ok');
  ro.add('pos', '\u6b63\u6027', 'ok');

  function solve() {
    var t0 = performance.now();
    solver = PH.sodProblem(N, tEnd, 0.9, 1.4);
    var ms = performance.now() - t0;
    an = PH.analyzeSod(solver);
    ro.set('ps', an.pStarL.toFixed(5) + '  (\u53c2\u8003 0.30313)', 'hi');
    ro.set('us', an.uStarL.toFixed(5) + '  (\u53c2\u8003 0.92745)');
    ro.set('rl', an.rhoStarL.toFixed(5) + '  (0.42632)', 'bv');
    ro.set('rr', an.rhoStarR.toFixed(5) + '  (0.26557)', 'bv');
    ro.set('ss', an.shockSpeed.toFixed(4) + '  (1.7522)', 'sv');
    ro.set('ep', (an.errP * 100).toFixed(2) + ' %', an.errP < 0.05 ? 'ok' : 'bad');
    ro.set('er', (an.errRhoR * 100).toFixed(2) + ' %', an.errRhoR < 0.05 ? 'ok' : 'bad');
    var m0 = 0.5625, E0 = 1.375;
    var em = Math.abs(solver.totalMass() - m0) / m0, ee = Math.abs(solver.totalEnergy() - E0) / E0;
    ro.set('cons', 'm: ' + em.toExponential(1) + '  E: ' + ee.toExponential(1), (em < 1e-12 && ee < 1e-12) ? 'ok' : '');
    var okp = solver.minDensity() > 0 && solver.minPressure() > 0;
    ro.set('pos', okp ? '\u03c1>0, p>0' : '\u51fa\u73b0\u8d1f\u503c\uff01', okp ? 'ok' : 'bad');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    if (!solver) return;
    var pr = solver.primitive(), x = solver.x, n = solver.n;
    var box = { x: 48, y: 26, w: W - 74, h: H - 92 };
    A.gridPlot(ctx, box, { nx: 5, ny: 4 });
    var X = A.mapper(0, 1, box.x, box.x + box.w);
    var series = [];
    if (show === 'all' || show === 'rho') series.push({ d: pr.rho, col: C.rho, lab: '\u03c1', max: 1.05 });
    if (show === 'all' || show === 'u') series.push({ d: pr.u, col: C.u, lab: 'u', max: 1.15 });
    if (show === 'all' || show === 'p') series.push({ d: pr.p, col: C.p, lab: 'p', max: 1.05 });
    series.forEach(function (S) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push([X(x[i]), box.y + box.h * (1 - S.d[i] / S.max)]);
      A.curve(ctx, pts, S.col, 1.8);
    });
    /* analytic wave positions scaled from the t=0.2 reference */
    var sc = tEnd / 0.2;
    var marks = [
      { x: 0.5 + (PH.SOD_REF.headPos - 0.5) * sc, lab: '\u7a00\u758f\u6ce2\u5934', col: '#9fe8ff' },
      { x: 0.5 + (PH.SOD_REF.tailPos - 0.5) * sc, lab: '\u7a00\u758f\u6ce2\u5c3e', col: '#9fe8ff' },
      { x: 0.5 + (PH.SOD_REF.contactPos - 0.5) * sc, lab: '\u63a5\u89e6\u95f4\u65ad', col: '#ffd166' },
      { x: 0.5 + (PH.SOD_REF.shockPos - 0.5) * sc, lab: '\u6fc0\u6ce2', col: '#ff6b6b' }
    ];
    marks.forEach(function (mk) {
      if (mk.x < 0 || mk.x > 1) return;
      A.line(ctx, X(mk.x), box.y, X(mk.x), box.y + box.h, A.rgba(mk.col, 0.55), 1.2, [4, 4]);
      A.text(ctx, mk.lab, X(mk.x), box.y - 6, { color: mk.col, size: 10.5, align: 'center' });
    });
    A.text(ctx, 'x \u2192', box.x + box.w - 4, box.y + box.h + 16, { color: C.dim2, size: 11, align: 'right' });
    series.forEach(function (S, i) {
      A.text(ctx, S.lab, box.x + 8 + i * 26, box.y + 15, { color: S.col, size: 12.5 });
    });
    A.text(ctx, 't = ' + tEnd.toFixed(3) + '   n = ' + N + '   HLL', box.x + box.w - 6, box.y + 15, { color: C.dim, size: 11.5, align: 'right' });
    A.text(ctx, '\u865a\u7ebf\uff1a\u7cbe\u786e\u89e3\u7684\u6ce2\u4f4d\u7f6e\uff08\u6309 t \u7f29\u653e\uff09', box.x + 8, box.y + box.h + 16, { color: C.dim2, size: 11 });
  });
  A.onReady(function () { s.resize(); solve(); });
});

/* ----------------------------------------------------------------- W17 --
   Mach cone / Doppler.                                                */
A.defWidget('mach', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var M = 1.8, t = 0, running = true, emit = 0.30;
  ct.slider({ label: '\u9a6c\u8d6b\u6570 $M=v/c$', min: 0.15, max: 3.5, step: 0.01, value: 1.8, cls: 'e',
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { M = v; } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { running = !!v; } });
  ct.slider({ label: '\u53d1\u6ce2\u95f4\u9694', min: 0.12, max: 0.6, step: 0.01, value: 0.30,
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { emit = v; } });
  ct.button({ label: '\u91cd\u7f6e', onclick: function () { t = 0; fronts.length = 0; } });

  ro.add('th', '\u7406\u8bba\u9a6c\u8d6b\u89d2 $\\arcsin(1/M)$', 'hi');
  ro.add('thm', '\u51e0\u4f55\u6d4b\u5f97\u89d2', '');
  ro.add('err', '\u504f\u5dee', 'ok');
  ro.add('dopp', '\u591a\u666e\u52d2\u56e0\u5b50\uff08\u524d/\u540e\uff09', 'bv');
  ro.add('reg', '\u533a\u57df', 'sv');

  var fronts = [], nextEmit = 0;
  function upd() {
    var th = PH.machAngle(M);
    ro.set('th', isFinite(th) ? A.deg(th).toFixed(3) + '\u00b0' : '\u2014\uff08M\u22641\uff0c\u65e0\u9525\u9762\uff09', 'hi');
    /* geometric measurement: for each front, the tangent half-angle from the source */
    if (M > 1 && fronts.length) {
      var P = [t * M, 0], sum = 0, cnt = 0;
      for (var i = 0; i < fronts.length; i++) {
        var d = Math.hypot(P[0] - fronts[i][0], 0 - fronts[i][1]);
        var r = t - fronts[i][2];
        if (r <= 0 || d <= r * 1.0000001 || d < 1e-6) continue;
        sum += Math.asin(r / d); cnt++;
      }
      if (cnt) {
        var meas = sum / cnt;
        ro.set('thm', A.deg(meas).toFixed(3) + '\u00b0  (' + cnt + ' \u4e2a\u6ce2\u524d)');
        ro.set('err', (Math.abs(A.deg(meas) - A.deg(th)) / A.deg(th) * 100).toFixed(3) + ' %', 'ok');
      } else { ro.set('thm', '\u2014'); ro.set('err', '\u2014'); }
    } else { ro.set('thm', '\u2014'); ro.set('err', '\u2014'); }
    ro.set('dopp', PH.dopplerFactor(M, 1).toFixed(3) + ' / ' + PH.dopplerFactor(M, -1).toFixed(3), 'bv');
    ro.set('reg', M < 1 ? '\u4e9a\u97f3\u901f\uff1a\u6ce2\u524d\u4e92\u4e0d\u76f8\u4ea4' : (Math.abs(M - 1) < 0.02 ? '\u8de8\u97f3\u901f\uff08\u6ce2\u524d\u5171\u70b9\uff09' : '\u8d85\u97f3\u901f\uff1a\u9a6c\u8d6b\u9525'), 'sv');
  }
  A.onReady(function () {
    s.animate(function (dt) {
      if (running) {
        t += dt * 0.55;
        if (t > nextEmit) { fronts.push([t * M, 0, t]); nextEmit = t + emit; }
        if (t > 6 / Math.max(M, 0.2)) { t = 0; fronts.length = 0; nextEmit = 0; }
      }
      var W = s.W, H = s.H, ctx = s.ctx;
      s.clear();
      var x0 = 30, x1 = W - 20, yc = H * 0.5;
      var tmax = 6 / Math.max(M, 0.2);
      var X = A.mapper(-2.5, 3.5, x0, x1);
      var S = Math.min((x1 - x0) / 6.0, (H - 60) / 3.2);
      var PX = function (x) { return X(x); }, PY = function (y) { return yc - y * S; };
      A.line(ctx, x0, yc, x1, yc, A.rgba('#5d7291', 0.35), 1);
      /* wavefronts */
      for (var i = 0; i < fronts.length; i++) {
        var fx = fronts[i][0], ft = fronts[i][2], r = (t - ft) * S;
        if (r <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.arc(PX(fx), PY(0), r, 0, 7);
        ctx.strokeStyle = 'rgba(79,195,247,' + (0.14 + 0.5 * (1 - (t - ft) / Math.max(0.01, t))) + ')';
        ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      }
      var srcX = PX(t * M);
      /* Mach cone */
      if (M > 1) {
        var th = Math.asin(1 / M), Lc = 900;
        A.line(ctx, srcX, yc, srcX - Lc * Math.cos(th), yc - Lc * Math.sin(th), A.rgba('#ff6b6b', 0.85), 1.8);
        A.line(ctx, srcX, yc, srcX - Lc * Math.cos(th), yc + Lc * Math.sin(th), A.rgba('#ff6b6b', 0.85), 1.8);
        ctx.save(); ctx.strokeStyle = A.rgba('#ff6b6b', 0.6); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(srcX, yc, 54, Math.PI - th, Math.PI + th); ctx.stroke(); ctx.restore();
        A.text(ctx, '\u03b8 = ' + A.deg(th).toFixed(2) + '\u00b0', srcX - 72, yc - 14, { color: '#ff9f9f', size: 12 });
      }
      /* source */
      A.dot(ctx, srcX, yc, 6, '#ffd166', '#fff');
      A.arrow(ctx, srcX, yc, srcX + Math.min(46, 26 * M), yc, { color: '#ffd166', width: 2.4, head: 9 });
      A.text(ctx, '\u6e90 $v$ = ' + M.toFixed(2) + ' c', srcX + Math.min(52, 30 * M), yc - 12, { color: '#ffd166', size: 12 });
      A.text(ctx, '  \u2192  \u8fd0\u52a8\u65b9\u5411', x1 - 4, yc + 18, { color: C.dim2, size: 11, align: 'right' });
      upd();
    });
  });
});
})();
