/* =========================================================================
   app_maxwell.js — experiments 1-4: Gauss, no-monopoles, Faraday, Ampere
   ========================================================================= */
(function () {
'use strict';
var A = window.APP, PH = A.PH, C = A.C;

/* ------------------------------------------------------------------ W1 --
   Gauss's law.  The surface integral is done by quadrature in physics.js,
   over the very same super-ellipsoid family that is drawn.            */
A.defWidget('gauss', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var Q = 1.0e-9, aRel = 0.62, p = 2;
  var ctlQ = ct.slider({ label: '电荷 $Q$', min: -2, max: 2, step: 0.1, value: 1, cls: 'e',
    fmt: function (v) { return v.toFixed(1) + ' nC'; }, oninput: function (v) { Q = v * 1e-9; upd(); } });
  var ctlA = ct.slider({ label: '高斯面大小', min: 0.3, max: 0.95, step: 0.01, value: 0.62,
    fmt: function (v) { return (v / 0.62).toFixed(2) + '\u00d7'; }, oninput: function (v) { aRel = v; upd(); } });
  var ctlP = ct.slider({ label: '形状指数 $p$（2=球，8=近立方）', min: 2, max: 8, step: 0.25, value: 2,
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { p = v; upd(); } });
  ct.note('面元数 48\u00d796 = 4608');

  ro.add('q', '$Q_{enc}$', ''); ro.add('flux', '$\\oint E\\cdot dA$（数值）', 'hi');
  ro.add('exact', '$Q/\eps_0$（解析）', 'bv'); ro.add('err', '相对误差', '');
  ro.add('dep', '与半径/形状有关？', 'ok');

  var flux = 0, exact = 0;
  function upd() {
    flux = Q === 0 ? 0 : PH.gaussFluxPointCharge(Q, 1.0, p, 48, 96);
    exact = Q / PH.consts.EPS0;
    var rel = (exact === 0) ? Math.abs(flux) : Math.abs(flux - exact) / Math.abs(exact);
    ro.set('q', A.fx(Q * 1e9, 2) + ' nC');
    ro.set('flux', A.fg(flux, 6) + ' V\u00b7m');
    ro.set('exact', A.fg(exact, 6) + ' V\u00b7m');
    ro.set('err', (rel * 100).toFixed(3) + ' %', rel < 5e-3 ? 'ok' : 'bad');
    ro.set('dep', Q === 0 ? '没有电荷' : '无关（仅与 $Q$ 有关）', 'ok');
    s.render && s.redraw();
  }

  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * 0.44;
    var a = R * aRel;

    /* background field arrows on a polar grid */
    var nr = 5, na = 18, i, j;
    for (i = 1; i <= nr; i++) {
      var r = a * 0.28 * i + a * 0.12;
      for (j = 0; j < na; j++) {
        var th = j * 2 * Math.PI / na + (i % 2) * Math.PI / na;
        var x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
        if (Math.hypot(x - cx, y - cy) > R * 0.98) continue;
        var sc = Math.max(2.5, Math.min(12, 3 + 26 * (a * a * 0.25) / (r * r)));   /* |E| ~ 1/r^2 arrow length */
        var dx = Math.cos(th) * sc * (Q >= 0 ? 1 : -1), dy = Math.sin(th) * sc * (Q >= 0 ? 1 : -1);
        A.arrow(ctx, x - dx * 0.5, y - dy * 0.5, x + dx * 0.5, y + dy * 0.5,
          { color: A.rgba(Q >= 0 ? C.E : '#7aa2f7', 0.30), width: 1.1, head: 4.5 });
      }
    }
    /* a few bold field lines */
    for (j = 0; j < 16; j++) {
      var t2 = j * 2 * Math.PI / 16 + 0.1;
      var x0 = cx + a * 0.16 * Math.cos(t2), y0 = cy + a * 0.16 * Math.sin(t2);
      var x1 = cx + R * 1.02 * Math.cos(t2), y1 = cy + R * 1.02 * Math.sin(t2);
      if (Q < 0) { var t3 = x0; x0 = x1; x1 = t3; var t4 = y0; y0 = y1; y1 = t4; }
      A.arrow(ctx, x0, y0, x1, y1, { color: A.rgba(Q >= 0 ? C.E : '#7aa2f7', 0.55), width: 1.5, head: 7 });
    }
    /* the Gaussian surface: r(phi) on |x/a|^p+|y/a|^p = 1 */
    ctx.beginPath();
    for (j = 0; j <= 240; j++) {
      var ph = j / 240 * 2 * Math.PI, cph = Math.abs(Math.cos(ph)), sph = Math.abs(Math.sin(ph));
      var rr = a / Math.pow(Math.pow(cph, p) + Math.pow(sph, p), 1 / p);
      var px = cx + rr * Math.cos(ph), py = cy + rr * Math.sin(ph);
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = A.rgba('#7ee787', 0.055); ctx.fill();
    ctx.strokeStyle = A.rgba('#7ee787', 0.95); ctx.lineWidth = 2; ctx.stroke();
    /* outward normals + (E.n) sign */
    for (j = 0; j < 28; j++) {
      var ph2 = j / 28 * 2 * Math.PI;
      var r2 = a / Math.pow(Math.pow(Math.abs(Math.cos(ph2)), p) + Math.pow(Math.abs(Math.sin(ph2)), p), 1 / p);
      var qx = cx + r2 * Math.cos(ph2), qy = cy + r2 * Math.sin(ph2);
      var nx = Math.cos(ph2), ny = Math.sin(ph2);
      var sgn = Q >= 0 ? 1 : -1;
      A.arrow(ctx, qx, qy, qx + nx * 13 * sgn, qy + ny * 13 * sgn, { color: A.rgba('#7ee787', 0.85), width: 1.2, head: 5 });
    }
    /* the charge */
    var qr = 5 + 7 * Math.min(1, Math.abs(Q) / 2e-9);
    A.dot(ctx, cx, cy, qr, Q >= 0 ? '#ff6b6b' : '#4fc3f7', '#fff');
    A.text(ctx, Q >= 0 ? '+' : '\u2212', cx, cy + 5, { color: '#fff', size: 15, align: 'center', font: 'bold 15px "Segoe UI",sans-serif' });
    A.text(ctx, '$Q$ = ' + A.fx(Q * 1e9, 2) + ' nC', cx + qr + 9, cy - 8, { color: C.dim, size: 12 });
    A.text(ctx, '\u9ad8\u65af\u9762\uff1a$|x/a|^p+|y/a|^p+|z/a|^p=1$', 12, 20, { color: '#7ee787', size: 12.5 });
    A.text(ctx, '\u9762\u79ef\u5206 \u222eE\u00b7dA = ' + A.fg(flux, 5) + ' V\u00b7m', 12, 38, { color: '#fff', size: 12.5 });
    A.text(ctx, 'Q/\u03b5\u2080 = ' + A.fg(exact, 5) + ' V\u00b7m', 12, 55, { color: C.B, size: 12.5 });
  });
  upd();
  A.onReady(function () { s.resize(); upd(); });
});

/* ------------------------------------------------------------------ W2 --
   div B = 0.  Field lines are integrated with RK4, and the flux through a
   movable sphere is computed by quadrature.                          */
A.defWidget('divb', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var R0 = 0.45, off = 0.0, mono = 0;
  ct.slider({ label: '高斯球半径', min: 0.15, max: 1.1, step: 0.01, value: 0.45, fmt: function (v) { return v.toFixed(2) + ' a'; }, oninput: function (v) { R0 = v; updFlux(); draw(); } });
  ct.slider({ label: '球心偏移', min: -1.2, max: 1.2, step: 0.02, value: 0, fmt: function (v) { return v.toFixed(2) + ' a'; }, oninput: function (v) { off = v; updFlux(); draw(); } });
  ct.seg({ label: '反事实：', options: [{ label: '真实世界（无磁单极）', value: 0 }, { label: '假设有磁单极', value: 1 }], value: 0,
    onchange: function (v) { mono = v; updFlux(); draw(); } });
  ct.button({ label: '\u91cd\u7f6e\u573a\u7ebf', onclick: function () { traceLines(); draw(); } });

  ro.add('flux', '$\\oint B\\cdot dA$（数值）', 'bv');
  ro.add('norm', '相对 $|\\vv{B}|a^2$ 的尺度', '');
  ro.add('verdict', '结论', 'ok');
  ro.add('loop', '场线闭合（回到起点）', '');

  var m0 = 1e-3, SCALE = 1.0;        /* m = m0 * yhat, lengths in units of a */
  function B(x, y) {
    var b = PH.dipoleB(0, m0, 0, x, y, 0);
    if (mono) {                          /* counterfactual magnetic charge */
      var r2 = x * x + y * y, r = Math.sqrt(r2), r3 = r2 * r;
      var g = 3e-4;
      b[0] += g * x / r3; b[1] += g * y / r3;
    }
    return b;
  }
  function unitB(x, y) {
    var b = B(x, y), n = Math.hypot(b[0], b[1]) || 1e-30;
    return [b[0] / n, b[1] / n];
  }
  /* integrate dr/ds = B/|B| with RK4, both directions */
  function trace(x0, y0, dir, Rmax, steps, h) {
    var pts = [[x0, y0]], x = x0, y = y0, k;
    for (k = 0; k < steps; k++) {
      var k1 = unitB(x, y);
      var k2 = unitB(x + dir * h / 2 * k1[0], y + dir * h / 2 * k1[1]);
      var k3 = unitB(x + dir * h / 2 * k2[0], y + dir * h / 2 * k2[1]);
      var k4 = unitB(x + dir * h * k3[0], y + dir * h * k3[1]);
      x += dir * h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      y += dir * h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      pts.push([x, y]);
      if (x * x + y * y > Rmax * Rmax * 4) break;
    }
    return pts;
  }
  var LINES = [];
  function traceLines() {
    LINES = [];
    var seeds = [];
    for (var i = 1; i <= 7; i++) {
      var r = 0.12 + 0.13 * i;
      seeds.push([r, 0], [-r, 0], [0, r], [0, -r]);
    }
    seeds.push([0.2, 0.35], [-0.2, 0.35], [0.2, -0.35], [-0.2, -0.35]);
    for (var j = 0; j < seeds.length; j++) {
      var fwd = trace(seeds[j][0], seeds[j][1], 1, 3.2, 2600, 0.012);
      var bwd = trace(seeds[j][0], seeds[j][1], -1, 3.2, 2600, 0.012);
      bwd.reverse(); bwd.pop();
      LINES.push(bwd.concat(fwd));
    }
  }
  function updFlux() {
    var mvec = [0, m0, 0];
    var fl = PH.dipoleFluxSphere(0, m0, 0, off, 0, 0, R0, 40, 80);
    if (mono) {
      /* flux of the added monopole term through the same sphere */
      var r2 = off * off, r = Math.sqrt(r2);
      if (r > 1e-9 && R0 > r) fl += 3e-4 * 4 * Math.PI;     /* encloses the charge */
    }
    var scale = m0 * PH.consts.MU0 / (4 * Math.PI) / (R0 * R0) * (R0 * R0);
    ro.set('flux', A.sci(fl, 3) + ' T\u00b7m\u00b2', Math.abs(fl) < 1e-12 ? 'ok' : 'bad');
    ro.set('norm', A.sci(fl / (m0 * PH.consts.MU0 / (4 * Math.PI)), 2));
    ro.set('verdict', Math.abs(fl) < 1e-12 ? '与 0 不可区分（\u226410\u207b\u00b9\u00b2）' : '非零！与 \u2207\u00b7B=0 矛盾',
      Math.abs(fl) < 1e-12 ? 'ok' : 'bad');
    /* closure test: last point vs first point of each traced line */
    var worst = 0;
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      if (L.length < 10) continue;
      var d = Math.hypot(L[L.length - 1][0] - L[0][0], L[L.length - 1][1] - L[0][1]);
      if (d < 0.4 && d > worst) worst = d;
    }
    ro.set('loop', worst > 0 ? worst.toExponential(1) + ' a' : '\u2014');
    s.redraw();
  }
  function draw() {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var cx = W * 0.5, cy = H * 0.5, S = Math.min(W, H) * 0.34;
    var X = function (x) { return cx + x * S; }, Y = function (y) { return cy - y * S; };
    /* dipole */
    ctx.save();
    ctx.fillStyle = A.rgba('#ff6b6b', 0.9); ctx.beginPath(); ctx.arc(cx, cy - 10, 6, 0, 7); ctx.fill();
    ctx.fillStyle = A.rgba('#4fc3f7', 0.9); ctx.beginPath(); ctx.arc(cx, cy + 10, 6, 0, 7); ctx.fill();
    ctx.restore();
    A.text(ctx, 'N', cx, cy - 20, { color: '#ff9f9f', size: 11, align: 'center' });
    A.text(ctx, 'S', cx, cy + 30, { color: '#9fdcff', size: 11, align: 'center' });
    /* field lines */
    ctx.save(); ctx.strokeStyle = A.rgba(C.B, 0.75); ctx.lineWidth = 1.35; ctx.beginPath();
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      for (var k = 0; k < L.length; k++) {
        var px = X(L[k][0]), py = Y(L[k][1]);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    }
    ctx.stroke(); ctx.restore();
    /* arrowheads along the lines to show direction */
    for (i = 0; i < LINES.length; i += 2) {
      var Ln = LINES[i];
      for (var k2 = 40; k2 < Ln.length - 40; k2 += 260) {
        var p0 = Ln[k2], p1 = Ln[k2 + 6];
        A.arrow(ctx, X(p0[0]), Y(p0[1]), X(p1[0]), Y(p1[1]), { color: A.rgba(C.B, 0.95), width: 1.2, head: 6 });
      }
    }
    /* Gaussian sphere */
    var gx = X(off), gy = Y(0), gr = R0 * S;
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7);
    ctx.fillStyle = A.rgba('#7ee787', 0.07); ctx.fill();
    ctx.strokeStyle = A.rgba('#7ee787', 0.95); ctx.lineWidth = 2; ctx.stroke();
    for (var j = 0; j < 16; j++) {
      var th = j / 16 * 2 * Math.PI;
      A.arrow(ctx, gx + gr * Math.cos(th), gy + gr * Math.sin(th),
        gx + gr * (1 + 0.09) * Math.cos(th), gy + gr * (1 + 0.09) * Math.sin(th),
        { color: A.rgba('#7ee787', 0.8), width: 1.1, head: 4.5 });
    }
    A.text(ctx, '\u9ad8\u65af\u9762 \u222eB\u00b7dA = ' + A.sci(PH.dipoleFluxSphere(0, m0, 0, off, 0, 0, R0, 40, 80), 2) + ' T\u00b7m\u00b2',
      12, 20, { color: '#7ee787', size: 12.5 });
    if (mono) A.text(ctx, '\u53cd\u4e8b\u5b9e\uff1a\u5df2\u52a0\u5165\u78c1\u5355\u6781\u5b50\u9879', 12, 38, { color: '#ffab70', size: 12.5 });
    A.text(ctx, '\u573a\u7ebf\u7531 RK4 \u79ef\u5206 $d\\vv{r}/ds=\\hat{B}$ \u5f97\u5230 \u00b7 ' + LINES.length + ' \u6761', W - 12, H - 12, { color: C.dim2, size: 11.5, align: 'right' });
  }
  s.onDraw(draw);
  traceLines(); updFlux();
  A.onReady(function () { s.resize(); updFlux(); });
});

/* ------------------------------------------------------------------ W3 --
   Faraday + Lenz.  EMF is obtained by numerically differentiating Phi(t). */
A.defWidget('faraday', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var B0 = 0.6, freq = 0.25, aLoop = 0.55, t = 0, run = true, k = 0;
  ct.slider({ label: '$B_0$', min: 0.1, max: 1.5, step: 0.05, value: 0.6, cls: 'b',
    fmt: function (v) { return v.toFixed(2) + ' T'; }, oninput: function (v) { B0 = v; } });
  ct.slider({ label: '频率 $f$', min: 0.05, max: 1.2, step: 0.01, value: 0.25,
    fmt: function (v) { return v.toFixed(2) + ' Hz'; }, oninput: function (v) { freq = v; } });
  ct.slider({ label: '回路半径 $a$', min: 0.2, max: 1.0, step: 0.01, value: 0.55,
    fmt: function (v) { return v.toFixed(2) + ' m'; }, oninput: function (v) { aLoop = v; } });
  ct.seg({ label: '', options: [{ label: '\u25b6 \u64ad\u653e', value: 1 }, { label: '\u23f8 \u6682\u505c', value: 0 }], value: 1,
    onchange: function (v) { run = !!v; } });

  ro.add('phi', '$\\Phi(t)$', 'bv'); ro.add('emfN', '$\\mathrm{EMF}$（数值微分）', 'hi');
  ro.add('emfA', '$-\\pi a^2\\,\\mathrm{d}B/\\mathrm{d}t$（解析）', ''); ro.add('err', '相对差', 'ok');
  ro.add('lenz', '楞次定律方向', '');

  var HIST = [], MAXH = 480, emfNum = 0;
  function Bz(tt) { return B0 * Math.sin(2 * Math.PI * freq * tt); }
  function draw() {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var topH = H * 0.60;
    var cx = W * 0.34, cy = topH * 0.52, R = Math.min(W * 0.30, topH * 0.40) * (0.55 + aLoop * 0.5);
    /* B field symbols */
    var b = Bz(t), frac = b / Math.max(B0, 1e-9);
    var nGrid = 9;
    for (var i = 0; i < nGrid; i++) for (var j = 0; j < 5; j++) {
      var x = W * (0.04 + 0.62 * i / (nGrid - 1)), y = topH * (0.10 + 0.80 * j / 4);
      if (Math.hypot(x - cx, y - cy) < R + 12) continue;
      var al = Math.abs(frac);
      ctx.save();
      ctx.strokeStyle = A.rgba(C.B, 0.15 + 0.75 * al); ctx.lineWidth = 1.6;
      var r = 3 + 4 * al;
      if (b > 0) { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 7); ctx.fillStyle = A.rgba(C.B, 0.2 + 0.7 * al); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }
      ctx.restore();
    }
    /* loop */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
    ctx.strokeStyle = A.rgba('#e0e6f0', 0.9); ctx.lineWidth = 2.4; ctx.stroke();
    /* induced E circulation: E_phi = -(r/2) dB/dt */
    var dB = 2 * Math.PI * freq * B0 * Math.cos(2 * Math.PI * freq * t);
    var sgn = dB > 0 ? -1 : 1;
    for (var m = 0; m < 12; m++) {
      var th = m / 12 * 2 * Math.PI;
      var x0 = cx + R * Math.cos(th), y0 = cy + R * Math.sin(th);
      var tx = -Math.sin(th) * sgn, ty = Math.cos(th) * sgn;
      A.arrow(ctx, x0 - tx * 8, y0 - ty * 8, x0 + tx * 11, y0 + ty * 11,
        { color: A.rgba('#ff9f43', 0.35 + 0.6 * Math.min(1, Math.abs(dB))), width: 1.6, head: 6 });
    }
    A.text(ctx, '\u56de\u8def\u9762\u79ef $a$ = ' + aLoop.toFixed(2) + ' m', cx, cy + R + 20, { color: C.dim, size: 11.5, align: 'center' });
    A.text(ctx, '$B_z$ = ' + b.toFixed(3) + ' T ' + (b > 0 ? '\uff08\u6307\u5411\u5c4f\u5185\uff09' : '\uff08\u6307\u5411\u5c4f\u5916\uff09'),
      cx, cy - R - 12, { color: C.B, size: 12.5, align: 'center' });

    /* time plot */
    var box = { x: 42, y: topH + 18, w: W - 62, h: H - topH - 42 };
    A.gridPlot(ctx, box, { nx: 8, ny: 2 });
    var T = 1 / freq;
    var t0 = t - 3.2 * T, t1 = t + 0.6 * T;
    var X = A.mapper(t0, t1, box.x, box.x + box.w);
    var Y = A.mapper(-1.15, 1.15, box.y + box.h, box.y);
    var pPhi = [], pEmf = [], pAna = [];
    for (var q = 0; q <= 240; q++) {
      var tt = t0 + (t1 - t0) * q / 240;
      var bb = B0 * Math.sin(2 * Math.PI * freq * tt);
      var phi = Math.PI * aLoop * aLoop * bb, emf = -Math.PI * aLoop * aLoop * 2 * Math.PI * freq * B0 * Math.cos(2 * Math.PI * freq * tt);
      pPhi.push([X(tt), Y(phi / (Math.PI * aLoop * aLoop * Math.max(B0, 1e-9)))]);
      pEmf.push([X(tt), Y(emf / (Math.PI * aLoop * aLoop * Math.max(B0, 1e-9) * 2 * Math.PI * freq))]);
    }
    A.curve(ctx, pPhi, A.rgba(C.B, 0.9), 1.8);
    A.curve(ctx, pEmf, A.rgba(C.E, 0.95), 1.8);
    A.line(ctx, X(t), box.y, X(t), box.y + box.h, '#ffffff', 1.2, [4, 4]);
    A.text(ctx, '$\\Phi$ \u00f7 \u03c0a\u00b2B\u2080', box.x + 6, box.y + 13, { color: C.B, size: 11.5 });
    A.text(ctx, 'EMF \u00f7 \u03c0a\u00b2B\u20802\u03c0f', box.x + 6, box.y + 29, { color: C.E, size: 11.5 });
    A.text(ctx, '\u65f6\u95f4 \u2192', box.x + box.w - 6, box.y + box.h + 15, { color: C.dim2, size: 11.5, align: 'right' });
  }
  function upd() {
    var b = Bz(t), dB = 2 * Math.PI * freq * B0 * Math.cos(2 * Math.PI * freq * t);
    var phi = Math.PI * aLoop * aLoop * b;
    /* numerical derivative of Phi: (Phi(t)-Phi(t-h))/h */
    var h = 1e-4;
    var phiPrev = Math.PI * aLoop * aLoop * B0 * Math.sin(2 * Math.PI * freq * (t - h));
    emfNum = -(phi - phiPrev) / h;
    var emfA = -Math.PI * aLoop * aLoop * dB;
    var rel = Math.abs(emfNum - emfA) / Math.max(1e-12, Math.abs(emfA));
    ro.set('phi', phi.toFixed(5) + ' Wb');
    ro.set('emfN', emfNum.toFixed(5) + ' V');
    ro.set('emfA', emfA.toFixed(5) + ' V');
    ro.set('err', (rel * 100).toFixed(3) + ' %', rel < 0.05 ? 'ok' : '');
    ro.set('lenz', Math.abs(dB) < 1e-9 ? '\u78c1\u901a\u4e0d\u53d8\uff0c\u65e0\u611f\u5e94' :
      (dB > 0 ? '\u78c1\u901a\u5411\u5185\u589e\u52a0 \u2192 \u611f\u5e94\u7535\u6d41\u9006\u65f6\u9488' : '\u78c1\u901a\u5411\u5185\u51cf\u5c11 \u2192 \u611f\u5e94\u7535\u6d41\u987a\u65f6\u9488'));
  }
  A.onReady(function () {
    s.animate(function (dt) {
      if (run) t += dt * 0.5;
      k++; if (k % 3 === 0) upd();
      draw();
    });
  });
});

/* ------------------------------------------------------------------ W4 --
   Ampere-Maxwell: two surfaces on one loop.                           */
A.defWidget('ampere', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var I0 = 1.0, t = 0, surf = 1, run = true, f = 0.18;
  ct.slider({ label: '\u7535\u6d41\u5e45\u503c $I_0$', min: 0.2, max: 3, step: 0.05, value: 1,
    fmt: function (v) { return v.toFixed(2) + ' A'; }, oninput: function (v) { I0 = v; } });
  ct.seg({ label: '\u5f20\u5728\u56de\u8def\u4e0a\u7684\u66f2\u9762\uff1a', options: [{ label: '$S_1$ \u5e73\u9762\uff08\u7a7f\u8fc7\u5bfc\u7ebf\uff09', value: 1 }, { label: '$S_2$ \u9f13\u9762\uff08\u7a7f\u8fc7\u7535\u5bb9\u5668\uff09', value: 2 }],
    value: 1, onchange: function (v) { surf = v; } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { run = !!v; } });

  ro.add('icond', '$I_{cond}$（穿过所选曲面）', 'hi');
  ro.add('idisp', '$I_{disp}=\eps_0\\,\\mathrm{d}\Phi_E/\\mathrm{d}t$', 'bv');
  ro.add('itot', '$I_{cond}+I_{disp}$', 'ok');
  ro.add('circ', '$\mu_0 I_{enc}$', 'sv');
  ro.add('note', '\u8bf4\u660e', '');

  function draw() {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var cy = H * 0.52, x0 = W * 0.12, x1 = W * 0.88;
    var I = I0 * Math.cos(2 * Math.PI * f * t);
    var Q = I0 / (2 * Math.PI * f) * Math.sin(2 * Math.PI * f * t);
    /* wire */
    var gapL = W * 0.44, gapR = W * 0.56;
    ctx.save();
    ctx.strokeStyle = '#c9d6e8'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(gapL, cy); ctx.moveTo(gapR, cy); ctx.lineTo(x1, cy); ctx.stroke();
    ctx.restore();
    /* capacitor plates */
    ctx.save(); ctx.strokeStyle = '#c9d6e8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(gapL, cy - 46); ctx.lineTo(gapL, cy + 46); ctx.moveTo(gapR, cy - 46); ctx.lineTo(gapR, cy + 46); ctx.stroke();
    ctx.restore();
    /* E field between plates */
    var Efrac = Q / (I0 / (2 * Math.PI * f));
    var nA = 5;
    for (var i = 0; i < nA; i++) {
      var yy = cy - 34 + 17 * i;
      A.arrow(ctx, gapL + 6, yy, gapR - 6, yy, { color: A.rgba(C.E, 0.15 + 0.7 * Math.abs(Efrac)), width: 1.5, head: 6 });
    }
    A.text(ctx, '\u677f\u95f4\u7535\u573a $E=\\sigma/\\eps_0$ \u6b63\u5728' + (Math.abs(Efrac) < 1e-9 ? '\u4e3a\u96f6' : (Efrac > 0 ? '\u589e\u957f' : '\u51cf\u5c11')),
      (gapL + gapR) / 2, cy - 60, { color: C.E, size: 12, align: 'center' });
    /* conduction current arrows along the wire */
    var dir = I >= 0 ? 1 : -1;
    for (var k = 0; k < 7; k++) {
      var xx = x0 + (gapL - x0) * (k + 0.5) / 7;
      A.arrow(ctx, xx - dir * 9, cy, xx + dir * 9, cy, { color: A.rgba('#ff9f43', 0.25 + 0.75 * Math.abs(I) / I0), width: 2, head: 7 });
    }
    for (k = 0; k < 7; k++) {
      xx = gapR + (x1 - gapR) * (k + 0.5) / 7;
      A.arrow(ctx, xx - dir * 9, cy, xx + dir * 9, cy, { color: A.rgba('#ff9f43', 0.25 + 0.75 * Math.abs(I) / I0), width: 2, head: 7 });
    }
    A.text(ctx, '$I(t)$ = ' + I.toFixed(3) + ' A', x0 + 10, cy - 16, { color: '#ff9f43', size: 12.5 });
    /* the Ampere loop, drawn around the wire */
    var lx = W * 0.28, lR = Math.min(58, H * 0.17), lRy = lR * 0.34;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(lx, cy, lR, lRy, 0, 0, 7);
    ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();
    A.text(ctx, '\u5b89\u57f9\u56de\u8def $\\partial\\Sigma$', lx, cy - lRy - 22, { color: '#7ee787', size: 12, align: 'center' });
    /* B field rings around the wire */
    for (var rr = 1; rr <= 3; rr++) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(lx, cy, lR * (0.42 * rr), lRy * (0.42 * rr), 0, 0, 7);
      ctx.strokeStyle = A.rgba(C.B, 0.15 + 0.5 * Math.abs(I) / I0 / rr); ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.restore();
    }
    /* the two surfaces */
    var ss = surf === 1 ? 1 : 2;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(lx, cy, lR, lRy, 0, 0, 7);
    ctx.fillStyle = A.rgba(ss === 1 ? '#ffd166' : '#c792ea', ss === 1 ? 0.16 : 0.05);
    ctx.fill();
    if (ss === 1) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    if (ss === 2) {
      /* balloon surface: a big lens/ellipse passing through the gap */
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lx, cy - lRy);
      ctx.bezierCurveTo(lx + W * 0.05, cy - H * 0.30, gapL + 30, cy - H * 0.30, (gapL + gapR) / 2, cy - 52);
      ctx.lineTo((gapL + gapR) / 2, cy + 52);
      ctx.bezierCurveTo(gapL + 30, cy + H * 0.30, lx + W * 0.05, cy + H * 0.30, lx, cy + lRy);
      ctx.closePath();
      ctx.fillStyle = A.rgba('#c792ea', 0.13); ctx.fill();
      ctx.strokeStyle = '#c792ea'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      A.text(ctx, '$S_2$\uff1a\u53ea\u6709\u4f4d\u79fb\u7535\u6d41', (gapL + gapR) / 2 + 8, cy - 62, { color: '#c792ea', size: 12 });
    } else {
      A.text(ctx, '$S_1$\uff1a\u53ea\u6709\u4f20\u5bfc\u7535\u6d41', lx - lR, cy + lRy + 20, { color: '#ffd166', size: 12 });
    }
    var icond = (ss === 1) ? I : 0, idisp = (ss === 1) ? 0 : I;
    A.text(ctx, '$I_{cond}$ = ' + icond.toFixed(3) + ' A   $I_{disp}$ = ' + idisp.toFixed(3) + ' A   $\\mu_0 I_{enc}$ = ' +
      A.sci(PH.consts.MU0 * (icond + idisp), 3) + ' T\u00b7m', 12, 20, { color: '#fff', size: 12.5 });
    return { icond: icond, idisp: idisp };
  }
  A.onReady(function () {
    s.animate(function (dt) {
      if (run) t += dt * 0.35;
      var r = draw();
      ro.set('icond', r.icond.toFixed(4) + ' A', 'hi');
      ro.set('idisp', r.idisp.toFixed(4) + ' A', 'bv');
      ro.set('itot', (r.icond + r.idisp).toFixed(4) + ' A', 'ok');
      ro.set('circ', A.sci(PH.consts.MU0 * (r.icond + r.idisp), 4) + ' T\u00b7m', 'sv');
      ro.set('note', surf === 1 ? '\u9762 $S_1$\uff1a\u4f20\u5bfc\u7535\u6d41' : '\u9762 $S_2$\uff1a\u4f4d\u79fb\u7535\u6d41\u8865\u9f50\uff0c\u79ef\u5206\u503c\u76f8\u540c');
    });
  });
});
})();
