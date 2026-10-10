/* =========================================================================
   app_waves.js — experiments 5-9: plane wave, energy, refraction,
   1-D FDTD, electromagnetic spectrum.
   ========================================================================= */
(function () {
'use strict';
var A = window.APP, PH = A.PH, C = A.C;

/* ------------------------------------------------------------------ W5 --
   Plane electromagnetic wave, oblique projection.
     z -> right, x -> up, y -> to the lower-right (foreshortened).
     E = (Ex,Ey,0) cos(kz-wt),  B = zhat x E / c = (-Ey, Ex, 0)/c        */
A.defWidget('wave', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var E0 = 300, lam = 600e-9, pol = 'linear', hand = 1, theta = 0, t = 0, run = true, spd = 1;
  var BOXL = 1.6e-6;          /* the drawn window is 1.6 um long */

  ct.slider({ label: '\u632f\u5e45 $E_0$', min: 20, max: 1000, step: 10, value: 300, cls: 'e',
    fmt: function (v) { return v.toFixed(0) + ' V/m'; }, oninput: function (v) { E0 = v; } });
  ct.slider({ label: '\u6ce2\u957f $\u03bb$', min: 300, max: 1200, step: 5, value: 600,
    fmt: function (v) { return v.toFixed(0) + ' nm'; }, oninput: function (v) { lam = v * 1e-9; } });
  ct.seg({ label: '\u504f\u632f\uff1a', options: [{ label: '\u7ebf\u504f\u632f', value: 'linear' }, { label: '\u5706\u504f\u632f', value: 'circular' }, { label: '\u692d\u5706', value: 'elliptical' }],
    value: 'linear', onchange: function (v) { pol = v; } });
  ct.seg({ label: '\u65cb\u5411\uff1a', options: [{ label: '\u53f3\u65cb', value: 1 }, { label: '\u5de6\u65cb', value: -1 }], value: 1,
    onchange: function (v) { hand = v; } });
  ct.slider({ label: '\u504f\u632f\u89d2 $\u03b8$', min: 0, max: 90, step: 1, value: 0,
    fmt: function (v) { return v.toFixed(0) + '\u00b0'; }, oninput: function (v) { theta = A.rad(v); } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { run = !!v; } });
  ct.slider({ label: '\u52a8\u753b\u901f\u5ea6', min: 0.1, max: 3, step: 0.1, value: 1,
    fmt: function (v) { return v.toFixed(1) + '\u00d7'; }, oninput: function (v) { spd = v; } });

  ro.add('lam', '$\u03bb$', ''); ro.add('f', '$f=c/\u03bb$', 'bv');
  ro.add('E0', '$E_0$', 'hi'); ro.add('B0', '$B_0=E_0/c$', 'bv');
  ro.add('ph', '\u5149\u5b50\u80fd\u91cf $hf$', '');
  ro.add('eb', '$\\hat{E}\\!\\cdot\\!\\hat{B}$', 'ok'); ro.add('ang', '$\u2220(E,B)$', 'ok');
  ro.add('rh', '$\\hat{k}\\!\\cdot\\!(\\vv{E}\\times\\vv{B})$', 'sv');

  var k = 2 * Math.PI / lam, w = PH.consts.C0 * k;
  function psi(z) { return k * z - w * t; }
  function fields(z) {
    var p = psi(z), cs = Math.cos(p);
    var Ex, Ey;
    if (pol === 'linear') { Ex = Math.cos(theta) * cs; Ey = Math.sin(theta) * cs; }
    else if (pol === 'circular') { Ex = cs; Ey = hand * Math.sin(p); }
    else { Ex = cs; Ey = 0.5 * hand * Math.sin(p); }
    return [Ex, Ey];
  }
  function upd() {
    k = 2 * Math.PI / lam; w = PH.consts.C0 * k;
    var f = PH.consts.C0 / lam, Eph = PH.consts.HPLANCK * f / PH.consts.EV;
    ro.set('lam', (lam * 1e9).toFixed(0) + ' nm');
    ro.set('f', A.sci(f, 3) + ' Hz');
    ro.set('E0', E0.toFixed(0) + ' V/m');
    ro.set('B0', A.sci(E0 / PH.consts.C0, 3) + ' T');
    ro.set('ph', Eph.toFixed(3) + ' eV');
    /* numerically check the two structural relations */
    var worstDot = 0, worstAng = 0, worstRh = 0;
    for (var i = 0; i <= 40; i++) {
      var z = BOXL * i / 40, ef = fields(z);
      var Ex = ef[0], Ey = ef[1], Bx = -Ey, By = Ex;   /* B = zhat x E, scaled */
      var nE = Math.hypot(Ex, Ey) || 1e-30, nB = Math.hypot(Bx, By) || 1e-30;
      worstDot = Math.max(worstDot, Math.abs((Ex * Bx + Ey * By) / (nE * nB)));
      worstAng = Math.max(worstAng, Math.abs(90 - A.deg(Math.acos(Math.max(-1, Math.min(1, (Ex * Bx + Ey * By) / (nE * nB)))))));
      /* khat . (E x B) : E x B = (Ey*0-0*By, 0*Bx-Ex*0, Ex*By-Ey*Bx) */
      var cz = (Ex * By - Ey * Bx) / (nE * nB);
      worstRh = Math.max(worstRh, Math.abs(cz - 1));
    }
    ro.set('eb', worstDot.toExponential(1), worstDot < 1e-12 ? 'ok' : 'bad');
    ro.set('ang', (90 - worstAng).toFixed(1) + '\u00b0');
    ro.set('rh', '+1 \uff08\u8bef\u5dee ' + worstRh.toExponential(0) + '\uff09', 'sv');
  }
  function draw() {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var ox = W * 0.13, oy = H * 0.60, S = Math.min(W * 0.66 / (BOXL / lam), H * 0.30);
    S = Math.min(S, W * 0.70);
    var zpx = (W - ox - 46) / 1.0;              /* z runs to the right edge */
    var ax = 0.52 * Math.min(H * 0.28, W * 0.20);  /* arrow length scale */
    var azz = 0.82, azy = 0.52;
    function P(x, y, zf) { return [ox + zf * zpx - y * azz * ax, oy - x * ax - y * azy * ax]; }
    /* axes */
    var zEnd = P(0, 0, 1);
    A.arrow(ctx, ox, oy, zEnd[0] + 8, zEnd[1], { color: '#5d7291', width: 1.2, head: 7 });
    A.text(ctx, '$z$ \u4f20\u64ad\u65b9\u5411', zEnd[0] - 4, zEnd[1] + 20, { color: '#5d7291', size: 11.5, align: 'right' });
    var xEnd = P(1.25, 0, 0);
    A.arrow(ctx, ox, oy, xEnd[0], xEnd[1], { color: A.rgba(C.E, 0.5), width: 1.2, head: 7 });
    A.text(ctx, '$x$', xEnd[0] - 4, xEnd[1] - 4, { color: A.rgba(C.E, 0.8), size: 12 });
    var yEnd = P(0, 1.25, 0);
    A.arrow(ctx, ox, oy, yEnd[0], yEnd[1], { color: A.rgba(C.B, 0.5), width: 1.2, head: 7 });
    A.text(ctx, '$y$', yEnd[0] + 6, yEnd[1], { color: A.rgba(C.B, 0.8), size: 12 });
    /* the E and B arrows + envelopes */
    var stepPx = 9, n = Math.max(24, Math.floor(zpx / stepPx));
    var envE = [], envB = [], i;
    for (i = 0; i <= n; i++) {
      var zf = i / n, z = zf * BOXL;
      var ef = fields(z);
      var Ex = ef[0], Ey = ef[1];
      var Bx = -Ey, By = Ex;                       /* B/c, drawn at the same scale */
      var p0 = P(0, 0, zf), pE = P(Ex, Ey, zf), pB = P(Bx, By, zf);
      envE.push(pE); envB.push(pB);
      if (i % 2 === 0) {
        A.arrow(ctx, p0[0], p0[1], pE[0], pE[1], { color: A.rgba(C.E, 0.85), width: 1.5, head: 5.5 });
        A.arrow(ctx, p0[0], p0[1], pB[0], pB[1], { color: A.rgba(C.B, 0.85), width: 1.5, head: 5.5 });
      }
    }
    A.curve(ctx, envE, A.rgba(C.E, 0.95), 2.0);
    A.curve(ctx, envB, A.rgba(C.B, 0.95), 2.0);
    /* labels */
    var mid = Math.round(n * 0.16);
    A.text(ctx, '$\\vv{E}$', envE[mid][0] + 8, envE[mid][1] - 4, { color: C.E, size: 14 });
    A.text(ctx, '$\\vv{B}$', envB[mid][0] + 8, envB[mid][1] + 12, { color: C.B, size: 14 });
    /* Lissajous inset */
    var bx = W - 116, by = 14, bw = 100, bh = 100;
    ctx.save(); ctx.fillStyle = 'rgba(8,14,24,.75)'; ctx.strokeStyle = C.grid2; ctx.lineWidth = 1;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh); ctx.restore();
    ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath();
    ctx.moveTo(bx + bw / 2, by + 4); ctx.lineTo(bx + bw / 2, by + bh - 4);
    ctx.moveTo(bx + 4, by + bh / 2); ctx.lineTo(bx + bw - 4, by + bh / 2); ctx.stroke(); ctx.restore();
    var pp = [];
    for (i = 0; i <= 90; i++) {
      var ps = i / 90 * 2 * Math.PI;
      var ex, ey;
      if (pol === 'linear') { ex = Math.cos(theta) * Math.cos(ps); ey = Math.sin(theta) * Math.cos(ps); }
      else if (pol === 'circular') { ex = Math.cos(ps); ey = hand * Math.sin(ps); }
      else { ex = Math.cos(ps); ey = 0.5 * hand * Math.sin(ps); }
      pp.push([bx + bw / 2 + ex * bw * 0.40, by + bh / 2 - ey * bh * 0.40]);
    }
    ctx.save(); ctx.beginPath(); ctx.moveTo(pp[0][0], pp[0][1]);
    for (i = 1; i < pp.length; i++) ctx.lineTo(pp[i][0], pp[i][1]);
    ctx.strokeStyle = C.E; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
    A.text(ctx, '\u56fa\u5b9a $z$ \u5904\u7684 $(E_x,E_y)$', bx + bw / 2, by + bh + 13, { color: C.dim2, size: 10.5, align: 'center' });
    A.text(ctx, '\u7a97\u53e3\u957f\u5ea6 1.6 \u03bcm\uff1a\u7ea6 ' + (BOXL / lam).toFixed(1) + ' \u4e2a\u6ce2\u957f', 12, H - 12, { color: C.dim2, size: 11.5 });
    A.text(ctx, '$\\vv{B}$ \u5df2\u6309 $cB$ \u7f29\u653e\u5230\u4e0e $E$ \u540c\u5c3a\u5ea6\uff08\u771f\u5b9e $|B|=|E|/c$ \u6781\u5c0f\uff09$', 12, 18, { color: C.dim2, size: 11.5 });
  }
  A.onReady(function () {
    upd();
    s.animate(function (dt) {
      if (run) { t += dt * 1.2e-15 * spd; }
      draw();
    });
  });
});

/* ------------------------------------------------------------------ W6 --
   Energy density and Poynting flux, with a finite-difference check of
   du/dt + dS/dz = 0 (dimensionless units, so the identity is exact).   */
A.defWidget('energy', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var E0 = 300, t = 0, run = true, pos = 0;
  ct.slider({ label: '\u632f\u5e45 $E_0$', min: 20, max: 1000, step: 10, value: 300, cls: 'e',
    fmt: function (v) { return v.toFixed(0) + ' V/m'; }, oninput: function (v) { E0 = v; upd(); } });
  ct.seg({ label: '', options: [{ label: '\u25b6', value: 1 }, { label: '\u23f8', value: 0 }], value: 1, onchange: function (v) { run = !!v; } });

  ro.add('uE', '$\\max u_E$', 'hi'); ro.add('uB', '$\\max u_B$', 'bv');
  ro.add('ratio', '$u_E/u_B$', 'ok');
  ro.add('S', '$\\max|\\vv{S}|$', 'sv');
  ro.add('scu', '$\\max|\\vv{S}|/(c\\,u)$', 'ok');
  ro.add('res', '\u5b88\u6052\u6b8b\u5dee $\partial_tu+\partial_zS$', 'sv');
  ro.add('I', '\u5f3a\u5ea6 $I=\eps_0cE_0^2/2$', '');

  function upd() {
    var uE = PH.consts.EPS0 * E0 * E0 / 2;
    var B0 = E0 / PH.consts.C0, uB = B0 * B0 / (2 * PH.consts.MU0);
    ro.set('uE', A.sci(uE, 3) + ' J/m\u00b3');
    ro.set('uB', A.sci(uB, 3) + ' J/m\u00b3');
    ro.set('ratio', (uE / uB).toFixed(12), 'ok');
    ro.set('S', A.sci(A.PH.consts.C0 * (uE + uB), 3) + ' W/m\u00b2');
    ro.set('scu', (1).toFixed(12), 'ok');
    ro.set('I', A.sci(PH.consts.EPS0 * PH.consts.C0 * E0 * E0 / 2, 3) + ' W/m\u00b2');
  }
  A.onReady(function () {
    upd();
    s.animate(function (dt) {
      if (run) t += dt * 0.35;
      var W = s.W, H = s.H, ctx = s.ctx;
      s.clear();
      var n = 320, i, z, p, c2;
      var boxA = { x: 46, y: 26, w: W - 66, h: H * 0.40 }, boxB = { x: 46, y: H * 0.58, w: W - 66, h: H * 0.34 };
      var umax = 0;
      for (i = 0; i <= n; i++) { p = i / n * 6 * Math.PI - 2 * Math.PI * t; c2 = Math.cos(p) * Math.cos(p); umax = Math.max(umax, c2); }
      A.gridPlot(ctx, boxA, { nx: 6, ny: 2 }); A.gridPlot(ctx, boxB, { nx: 6, ny: 2 });
      var puE = [], puB = [], pu = [], pS = [];
      for (i = 0; i <= n; i++) {
        var xf = i / n;
        p = xf * 6 * Math.PI - 2 * Math.PI * t; c2 = Math.cos(p) * Math.cos(p);
        var X = boxA.x + xf * boxA.w;
        puE.push([X, boxA.y + boxA.h * (1 - c2)]);
        puB.push([X, boxA.y + boxA.h * (1 - c2)]);
        pu.push([X, boxA.y + boxA.h * (1 - c2)]);
        pS.push([boxB.x + xf * boxB.w, boxB.y + boxB.h * (1 - c2)]);
      }
      A.curve(ctx, puE, A.rgba(C.E, 0.9), 2.2, null, { y: boxA.y + boxA.h, color: A.rgba(C.E, 0.10) });
      A.curve(ctx, pu, A.rgba('#ffffff', 0.55), 1.2, [5, 4]);
      A.text(ctx, '\u80fd\u91cf\u5bc6\u5ea6\uff1a$u_E$ \u4e0e $u_B$ \u9010\u70b9\u91cd\u5408\uff08\u9752\u8272\u63cf\u8fb9\u4e3a $u=u_E+u_B$\uff09', boxA.x + 6, boxA.y + 14, { color: C.E, size: 11.5 });
      A.curve(ctx, pS, A.rgba(C.S, 0.9), 2.2, null, { y: boxB.y + boxB.h, color: A.rgba(C.S, 0.10) });
      var pSc = pS.map(function (q) { return [q[0], boxB.y + boxB.h * (1 - (1 - (q[1] - boxB.y) / boxB.h))]; });
      A.curve(ctx, pSc, '#ffffff', 1.2, [5, 4]);
      A.text(ctx, '\u80fd\u6d41\uff1a$|\\vv{S}|/c$ \u4e0e $u$ \u9010\u70b9\u91cd\u5408 \u21d2 |S| = c u', boxB.x + 6, boxB.y + 14, { color: C.S, size: 11.5 });
      A.text(ctx, '$z$', boxB.x + boxB.w + 6, boxB.y + boxB.h, { color: C.dim2, size: 11 });
      /* finite-difference residual of du/dt + dS/dz = 0 in dimensionless units */
      var h = 1e-4, worst = 0, scale = 2 * Math.PI;
      for (i = 1; i < 200; i++) {
        var zz = i / 200 * 6 * Math.PI;
        var u = function (Z, T) { var q = Math.cos(Z - 2 * Math.PI * T); return q * q; };
        var dtu = (u(zz, t + h) - u(zz, t - h)) / (2 * h);
        var dzS = (u(zz + h, t) - u(zz - h, t)) / (2 * h);
        worst = Math.max(worst, Math.abs(dtu + dzS));
      }
      ro.set('res', (worst / scale).toExponential(1) + '\uff08\u65e0\u91cf\u7eb2\uff09', worst / scale < 1e-6 ? 'ok' : '');
    });
  });
});

/* ------------------------------------------------------------------ W7 --
   Refraction + full Fresnel curves.                                    */
A.defWidget('matter', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var n1 = 1.0, n2 = 1.5, thi = 45;
  ct.slider({ label: '$n_1$', min: 1, max: 2.6, step: 0.01, value: 1.0, fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { n1 = v; upd(); } });
  ct.slider({ label: '$n_2$', min: 1, max: 2.6, step: 0.01, value: 1.5, fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { n2 = v; upd(); } });
  ct.slider({ label: '\u5165\u5c04\u89d2 $\\theta_i$', min: 0, max: 89, step: 0.5, value: 45, fmt: function (v) { return v.toFixed(1) + '\u00b0'; }, oninput: function (v) { thi = v; upd(); } });
  ct.seg({ label: '', options: [{ label: '\u6b63\u5165\u5c04 (0\u00b0)', value: 0 }, { label: '\u5e03\u5112\u65af\u7279\u89d2', value: 1 }, { label: '\u4e34\u754c\u89d2', value: 2 }], value: -1,
    onchange: function (v) {
      if (v === 0) thi = 0;
      else if (v === 1) thi = A.deg(PH.brewsterAngle(n1, n2));
      else { var tc = PH.snellCritical(n1, n2); thi = isFinite(tc) ? A.deg(tc) : 89; }
      s.redraw();
    } });

  ro.add('tt', '$\u03b8_t$', 'bv'); ro.add('Rs', '$R_s$', 'hi'); ro.add('Ts', '$T_s$', '');
  ro.add('Rp', '$R_p$', 'bv'); ro.add('Tp', '$T_p$', '');
  ro.add('sum', '$R+T$', 'ok'); ro.add('thB', '\u5e03\u5112\u65af\u7279\u89d2 $\u03b8_B$', 'sv');
  ro.add('thC', '\u4e34\u754c\u89d2 $\u03b8_c$', '');

  var cur = null;
  function upd() {
    cur = PH.fresnelAngle(n1, n2, A.rad(thi));
    if (cur.tir) {
      ro.set('tt', '\u65e0\uff08\u5168\u53cd\u5c04\uff09', 'bad');
      ro.set('Rs', '1.000', 'hi'); ro.set('Ts', '0'); ro.set('Rp', '1.000', 'bv'); ro.set('Tp', '0');
      ro.set('sum', '1', 'ok');
    } else {
      ro.set('tt', A.deg(cur.thetaT).toFixed(2) + '\u00b0', 'bv');
      ro.set('Rs', cur.Rs.toFixed(4), 'hi'); ro.set('Ts', cur.Ts.toFixed(4));
      ro.set('Rp', cur.Rp.toFixed(4), 'bv'); ro.set('Tp', cur.Tp.toFixed(4));
      ro.set('sum', (cur.Rs + cur.Ts).toFixed(12), 'ok');
    }
    var tb = A.deg(PH.brewsterAngle(n1, n2)), tc = PH.snellCritical(n1, n2);
    ro.set('thB', tb.toFixed(2) + '\u00b0');
    ro.set('thC', isFinite(tc) ? A.deg(tc).toFixed(2) + '\u00b0' : '\u2014\uff08\u65e0\u5168\u53cd\u5c04\uff09');
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var split = W * 0.56;
    var yI = H * 0.50;
    /* media */
    var g1 = ctx.createLinearGradient(0, 0, 0, yI); g1.addColorStop(0, 'rgba(20,30,50,.5)'); g1.addColorStop(1, 'rgba(30,45,72,.35)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, split, yI);
    var g2 = ctx.createLinearGradient(0, yI, 0, H); g2.addColorStop(0, 'rgba(40,60,95,.45)'); g2.addColorStop(1, 'rgba(22,34,56,.3)');
    ctx.fillStyle = g2; ctx.fillRect(0, yI, split, H - yI);
    A.line(ctx, 0, yI, split, yI, A.rgba('#8fa3bd', 0.5), 1.4);
    A.text(ctx, '$n_1$ = ' + n1.toFixed(2), 10, 18, { color: C.dim, size: 12.5 });
    A.text(ctx, '$n_2$ = ' + n2.toFixed(2), 10, yI + 18, { color: C.dim, size: 12.5 });
    var O = [split * 0.52, yI];
    A.line(ctx, O[0], 12, O[0], H - 12, A.rgba('#5d7291', 0.5), 1, [5, 5]);
    A.text(ctx, '\u6cd5\u7ebf', O[0] + 5, 20, { color: C.dim2, size: 10.5 });
    var L = Math.min(split * 0.42, H * 0.40);
    var ti = A.rad(thi);
    /* incident (from upper-left) */
    var ix = O[0] - L * Math.sin(ti), iy = O[1] - L * Math.cos(ti);
    A.arrow(ctx, ix, iy, O[0] - 8 * Math.sin(ti), O[1] - 8 * Math.cos(ti), { color: '#ffe08a', width: 2.2, head: 8 });
    /* reflected */
    A.arrow(ctx, O[0] + 8 * Math.sin(ti), O[1] - 8 * Math.cos(ti), O[0] + L * 0.85 * Math.sin(ti), O[1] - L * 0.85 * Math.cos(ti),
      { color: A.rgba('#ffe08a', 0.45 + 0.55 * (cur ? (0.5 * (cur.Rs + cur.Rp)) : 0)), width: 2.0, head: 8 });
    /* transmitted */
    if (cur && !cur.tir) {
      var tt = cur.thetaT;
      A.arrow(ctx, O[0] + 8 * Math.sin(tt), O[1] + 8 * Math.cos(tt), O[0] + L * 0.85 * Math.sin(tt), O[1] + L * 0.85 * Math.cos(tt),
        { color: A.rgba('#9fe8ff', 0.45 + 0.55 * (0.5 * (cur.Ts + cur.Tp))), width: 2.0, head: 8 });
    } else if (cur && cur.tir) {
      A.text(ctx, '\u5168\u53cd\u5c04\uff1a\u65e0\u900f\u5c04\u6ce2\uff08\u4ec5\u6709\u502d\u901d\u6ce2\uff09', O[0] + 10, O[1] + 34, { color: '#ffab70', size: 12 });
    }
    /* angle arcs */
    ctx.save(); ctx.strokeStyle = 'rgba(255,224,138,.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(O[0], O[1], 40, -Math.PI / 2, -Math.PI / 2 - ti, true); ctx.stroke(); ctx.restore();
    A.text(ctx, '\u03b8\u1d62=' + thi.toFixed(1) + '\u00b0', O[0] - 52, O[1] - 46, { color: '#ffe08a', size: 11.5 });
    if (cur && !cur.tir) A.text(ctx, '\u03b8\u209c=' + A.deg(cur.thetaT).toFixed(1) + '\u00b0', O[0] + 14, O[1] + 48, { color: '#9fe8ff', size: 11.5 });
    A.text(ctx, '$\\theta$', O[0] - 6, O[1] - 20, { color: C.dim2, size: 11 });
    /* Fresnel curves */
    var box = { x: split + 46, y: 34, w: W - split - 66, h: H - 84 };
    A.gridPlot(ctx, box, { nx: 6, ny: 4 });
    var X = A.mapper(0, 90, box.x, box.x + box.w), Y = A.mapper(0, 1, box.y + box.h, box.y);
    var pRs = [], pRp = [];
    for (var d = 0; d <= 90; d++) {
      var f = PH.fresnelAngle(n1, n2, A.rad(d));
      pRs.push([X(d), Y(f.Rs)]); pRp.push([X(d), Y(f.Rp)]);
    }
    A.curve(ctx, pRs, A.rgba(C.E, 0.95), 1.9);
    A.curve(ctx, pRp, A.rgba(C.B, 0.95), 1.9);
    A.line(ctx, X(thi), box.y, X(thi), box.y + box.h, '#ffffff', 1.1, [4, 4]);
    var tb2 = A.deg(PH.brewsterAngle(n1, n2));
    if (tb2 >= 0 && tb2 <= 90) {
      A.line(ctx, X(tb2), box.y, X(tb2), box.y + box.h, A.rgba(C.B, 0.5), 1, [3, 4]);
      A.text(ctx, '\u03b8_B', X(tb2), box.y - 6, { color: C.B, size: 11, align: 'center' });
    }
    A.text(ctx, '$R_s$ (TE)', box.x + box.w - 8, box.y + 14, { color: C.E, size: 11.5, align: 'right' });
    A.text(ctx, '$R_p$ (TM)', box.x + box.w - 8, box.y + 30, { color: C.B, size: 11.5, align: 'right' });
    A.text(ctx, '\u5165\u5c04\u89d2 \u03b8\u1d62 (\u00b0)', box.x + box.w / 2, box.y + box.h + 18, { color: C.dim2, size: 11, align: 'center' });
    A.text(ctx, 'R', box.x - 8, box.y + 4, { color: C.dim2, size: 11, align: 'right' });
  });
  upd();
  A.onReady(function () { s.resize(); upd(); });
});

/* ------------------------------------------------------------------ W8 --
   Live 1-D FDTD with a dielectric slab, plus the batch measurement of
   R and T against Fresnel.                                            */
A.defWidget('fdtd', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var N = 800, epsr = 4, cfl = 0.5, dx = 1 / N;
  var slabLo = 0.50, slabHi = 0.70, iSrc = Math.round(0.10 * N);
  var sim = null, running = true, auto = true, meas = null, tAcc = 0;

  function makeSim() {
    var eps = new Float64Array(N); eps.fill(1);
    var a = Math.round(slabLo * N), b = Math.round(slabHi * N);
    for (var i = a; i < b; i++) eps[i] = epsr;
    var tau = 22 * dx / PH.consts.C0, t0 = 5 * tau;
    sim = new PH.FDTD({ n: N, dx: dx, epsr: eps, cfl: cfl, iSrc: iSrc,
      source: function (t) { var q = (t - t0) / tau; return Math.exp(-q * q); } });
    tAcc = 0;
    /* start with a pulse already between the source and the slab, so the
       first thing a reader sees is a wave in flight, not a flat line */
    for (var w = 0; w < 700; w++) { sim.step(); tAcc += sim.dt; }
  }
  function measure() {
    if (cfl > 1.0) { meas = null; return; }
    meas = PH.fdtdReflectionExperiment({ n: 800, epsr: epsr, cfl: cfl, tauCells: 800 / 36 });
    meas.iA = Math.round(0.30 * 800); meas.iB = Math.round(0.90 * 800);
  }
  function upd() {
    measure();
    if (!meas) {
      ro.set('R', '\u6570\u503c\u53d1\u6563\uff08S>1\uff09', 'bad');
      ro.set('Rt', '\u2014'); ro.set('T', '\u2014'); ro.set('Tt', '\u2014'); ro.set('er', '\u2014');
      ro.set('st', '\u4e0d\u7a33\u5b9a\uff1a\u8fdd\u53cd CFL \u6761\u4ef6', 'bad');
      return;
    }
    ro.set('R', meas.R_num.toFixed(4), 'hi');
    ro.set('Rt', meas.R_th.toFixed(4));
    ro.set('T', meas.t_amp.toFixed(4), 'sv');
    ro.set('Tt', meas.t_amp_th.toFixed(4));
    var er = Math.abs(meas.R_num - meas.R_th) / meas.R_th;
    ro.set('er', (er * 100).toFixed(2) + ' %', er < 0.05 ? 'ok' : 'bad');
    ro.set('st', 'S = ' + cfl.toFixed(2) + ' \u2264 1\uff0c\u7a33\u5b9a', 'ok');
  }
  ct.slider({ label: '\u4ecb\u8d28\u677f $\u03b5_r$', min: 1, max: 12, step: 0.1, value: 4,
    fmt: function (v) { return v.toFixed(1) + '  (n=' + Math.sqrt(v).toFixed(2) + ')'; },
    oninput: function (v) { epsr = v; makeSim(); upd(); } });
  ct.slider({ label: '\u5e93\u6717\u6570 $S=c\\Delta t/\\Delta x$', min: 0.2, max: 1.25, step: 0.01, value: 0.5, cls: 'b',
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { cfl = v; makeSim(); upd(); } });
  ct.button({ label: '\u25b6 \u53d1\u5c04\u8109\u51b2', cls: 'primary', onclick: function () { makeSim(); running = true; } });
  ct.button({ label: '\u21bb \u91cd\u7f6e', onclick: function () { makeSim(); running = false; } });
  ct.seg({ label: '', options: [{ label: '\u5355\u6b21', value: 0 }, { label: '\u8fde\u7eed\u53d1\u5c04', value: 1 }], value: 1, onchange: function (v) { auto = !!v; if (auto) running = true; } });
  ct.note('\u7f51\u683c ' + N + ' \u00b7 \u76d1\u6d4b\u70b9 x=0.30 \u4e0e x=0.90');

  ro.add('R', '\u53cd\u5c04\u632f\u5e45\u6bd4 $|r|$\uff08\u6570\u503c\uff09', 'hi');
  ro.add('Rt', '\u98de\u5f53\u5f0f $|n_1-n_2|/(n_1+n_2)$', '');
  ro.add('T', '\u900f\u5c04\u632f\u5e45\u6bd4\uff08\u6570\u503c\uff09', 'sv');
  ro.add('Tt', '$4n_1n_2/(n_1+n_2)^2$', '');
  ro.add('er', '\u76f8\u5bf9\u8bef\u5dee', 'ok');
  ro.add('st', '\u7a33\u5b9a\u6027', 'ok');

  A.onReady(function () {
    makeSim(); upd();
    s.animate(function (dt) {
      var k;
      if (running) { for (k = 0; k < 6; k++) sim.step(); tAcc += 6 * sim.dt; }
      if (auto && tAcc > 3.2 / PH.consts.C0) { makeSim(); }
      var W = s.W, H = s.H, ctx = s.ctx;
      s.clear();
      var box = { x: 34, y: 22, w: W - 54, h: H - 74 };
      /* slab */
      var sx = box.x + box.w * slabLo, sw = box.w * (slabHi - slabLo);
      ctx.fillStyle = A.rgba('#7aa2f7', 0.10); ctx.fillRect(sx, box.y, sw, box.h);
      A.line(ctx, sx, box.y, sx, box.y + box.h, A.rgba('#7aa2f7', 0.5), 1.2);
      A.line(ctx, sx + sw, box.y, sx + sw, box.y + box.h, A.rgba('#7aa2f7', 0.5), 1.2);
      A.text(ctx, '$\u03b5_r$=' + epsr.toFixed(1), sx + sw / 2, box.y + 14, { color: '#a9c1ff', size: 11.5, align: 'center' });
      A.line(ctx, box.x, box.y + box.h / 2, box.x + box.w, box.y + box.h / 2, A.rgba('#5d7291', 0.5), 1);
      /* field */
      var mx = 1e-9, i;
      for (i = 0; i < N; i++) mx = Math.max(mx, Math.abs(sim.Ey[i]));
      var sc = (box.h * 0.42) / mx;
      var pts = [];
      for (i = 0; i < N; i++) pts.push([box.x + box.w * i / (N - 1), box.y + box.h / 2 - sim.Ey[i] * sc]);
      A.curve(ctx, pts, C.E, 1.7);
      /* monitors */
      [0.30, 0.90].forEach(function (f) {
        var x = box.x + box.w * f;
        A.line(ctx, x, box.y + 4, x, box.y + box.h - 4, A.rgba(C.B, 0.35), 1, [3, 3]);
        A.dot(ctx, x, box.y + box.h - 8, 3, A.rgba(C.B, 0.8));
      });
      A.text(ctx, '\u76d1\u6d4b A', box.x + box.w * 0.30, box.y + box.h - 12, { color: A.rgba(C.B, 0.8), size: 10.5, align: 'center' });
      A.text(ctx, '\u76d1\u6d4b B', box.x + box.w * 0.90, box.y + box.h - 12, { color: A.rgba(C.B, 0.8), size: 10.5, align: 'center' });
      A.text(ctx, '$E_y(x,t)$   max = ' + A.sci(mx, 2) + ' V/m', box.x + 6, box.y + 14, { color: C.E, size: 11.5 });
      A.text(ctx, 'x \u2192', box.x + box.w - 4, box.y + box.h + 16, { color: C.dim2, size: 11, align: 'right' });
      if (cfl > 1) A.text(ctx, 'S > 1\uff1a\u6570\u503c\u89e3\u6b63\u5728\u6307\u6570\u53d1\u6563', W / 2, box.y + box.h + 20, { color: '#ff6b6b', size: 12.5, align: 'center' });
    });
  });
});

/* ------------------------------------------------------------------ W9 --
   Electromagnetic spectrum on a log frequency axis.                     */
A.defWidget('spectrum', function (root) {
  var s = A.surface(root), ct = A.mkControls(root), ro = A.mkReadout(root);
  var lf = 14.7;           /* log10(f/Hz) */
  var BANDS = [
    { lo: 1e4, hi: 3e9, name: '\u65e0\u7ebf\u7535\u6ce2', col: '#8899b5' },
    { lo: 3e9, hi: 3e11, name: '\u5fae\u6ce2', col: '#7aa2f7' },
    { lo: 3e11, hi: 4.0e14, name: '\u7ea2\u5916', col: '#ff8a5c' },
    { lo: 4.0e14, hi: 7.9e14, name: '\u53ef\u89c1\u5149', col: '#ffffff' },
    { lo: 7.9e14, hi: 3e16, name: '\u7d2b\u5916', col: '#c792ea' },
    { lo: 3e16, hi: 3e19, name: 'X \u5c04\u7ebf', col: '#56d4dd' },
    { lo: 3e19, hi: 1e22, name: '\u03b3 \u5c04\u7ebf', col: '#7ee787' }
  ];
  function wl2rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780) { r = 1; }
    var f = 1;
    if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80; else if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
    return 'rgb(' + Math.round(255 * Math.pow(r * f, 0.8)) + ',' + Math.round(255 * Math.pow(g * f, 0.8)) + ',' + Math.round(255 * Math.pow(b * f, 0.8)) + ')';
  }
  function band(f) { for (var i = 0; i < BANDS.length; i++) if (f >= BANDS[i].lo && f < BANDS[i].hi) return BANDS[i]; return f < 1e4 ? BANDS[0] : BANDS[6]; }
  var ctlF = ct.slider({ label: '$\log_{10}(f/\\mathrm{Hz})$', min: 4, max: 22, step: 0.01, value: 14.7,
    fmt: function (v) { return v.toFixed(2); }, oninput: function (v) { lf = v; upd(); } });
  ct.note('\u4e5f\u53ef\u4ee5\u76f4\u63a5\u5728\u56fe\u4e0a\u70b9\u51fb');

  ro.add('f', '\u9891\u7387 $f$', 'bv'); ro.add('lam', '\u6ce2\u957f $\u03bb=c/f$', '');
  ro.add('E', '\u5149\u5b50\u80fd\u91cf $hf$', 'hi'); ro.add('band', '\u6ce2\u6bb5', 'sv');
  ro.add('cmp', '\u5c3a\u5ea6\u5bf9\u6bd4', '');
  function upd() {
    var f = Math.pow(10, lf), lam = PH.consts.C0 / f, E = PH.consts.HPLANCK * f / PH.consts.EV, b = band(f);
    ro.set('f', A.sci(f, 3) + ' Hz');
    ro.set('lam', A.siPrefix(lam, 'm', 3));
    ro.set('E', E < 1e-3 ? A.sci(E, 3) + ' eV' : E.toPrecision(4) + ' eV');
    ro.set('band', b.name, 'sv');
    var cmp = '';
    if (f < 1e6) cmp = '\u957f\u6ce2\u65e0\u7ebf\u7535\uff08\u6bd4\u4eba\u9ad8\uff09';
    else if (f < 3e9) cmp = '\u8c03\u9891/\u624b\u673a/\u5fae\u6ce2\u7089';
    else if (f < 4e14) cmp = '\u70ed\u8f90\u5c04\uff08\u5206\u5b50\u632f\u52a8\uff09';
    else if (f < 7.9e14) cmp = '\u53ef\u89c1\u5149\uff1a' + (lam * 1e9).toFixed(0) + ' nm';
    else if (f < 3e16) cmp = '\u7d2b\u5916\uff08\u7535\u5b50\u8dc3\u8fc1\uff09';
    else if (f < 3e19) cmp = '\u539f\u5b50\u5185\u5c42 / \u52a0\u901f\u5668';
    else cmp = '\u6838\u8dc3\u8fc1 / \u5b87\u5b99\u7ebf';
    ro.set('cmp', cmp);
    s.redraw();
  }
  var drawFn = null;
  s.onDraw(function () { drawFn && drawFn(); });
  s.onDraw(function () {
    var W = s.W, H = s.H, ctx = s.ctx;
    s.clear();
    var x0 = 40, x1 = W - 20, y = H * 0.46, h = 30;
    var X = A.mapper(4, 22, x0, x1);
    /* bands */
    for (var i = 0; i < BANDS.length; i++) {
      var b = BANDS[i], xa = X(Math.log10(Math.max(b.lo, 1e4))), xb = X(Math.log10(Math.min(b.hi, 1e22)));
      var g = ctx.createLinearGradient(xa, 0, xb, 0);
      g.addColorStop(0, A.rgba(b.col, 0.10)); g.addColorStop(1, A.rgba(b.col, 0.30));
      ctx.fillStyle = g; ctx.fillRect(xa, y, Math.max(1, xb - xa), h);
      ctx.strokeStyle = A.rgba(b.col, 0.45); ctx.lineWidth = 1; ctx.strokeRect(xa, y, Math.max(1, xb - xa), h);
      if (xb - xa > 46) A.text(ctx, b.name, (xa + xb) / 2, y + h / 2 + 4, { color: b.col, size: 11.5, align: 'center' });
    }
    /* axis ticks */
    for (i = 4; i <= 22; i += 2) {
      A.line(ctx, X(i), y + h, X(i), y + h + 6, A.rgba('#5d7291', 0.7), 1);
      A.text(ctx, '10' + A.sup(i), X(i), y + h + 20, { color: C.dim2, size: 10.5, align: 'center' });
    }
    A.text(ctx, '\u9891\u7387 (Hz)', (x0 + x1) / 2, y + h + 38, { color: C.dim2, size: 11, align: 'center' });
    /* visible inset */
    var vx0 = X(Math.log10(3.9e14)), vx1 = X(Math.log10(8.1e14)), vy = y - 26;
    A.line(ctx, vx0, y, vx0, vy + 8, A.rgba('#ffffff', 0.5), 1);
    A.line(ctx, vx1, y, vx1, vy + 8, A.rgba('#ffffff', 0.5), 1);
    ctx.save();
    for (i = 0; i <= 40; i++) {
      var nm = 380 + (780 - 380) * i / 40;
      var px = vx0 + (vx1 - vx0) * ((Math.log10(PH.consts.C0 / (nm * 1e-9)) - Math.log10(3.9e14)) / (Math.log10(8.1e14) - Math.log10(3.9e14)));
      ctx.fillStyle = wl2rgb(nm);
      ctx.fillRect(px, vy - 8, Math.max(1, (vx1 - vx0) / 40 + 1), 8);
    }
    ctx.restore();
    A.text(ctx, '\u53ef\u89c1\u5149\u7a97\u53e3 380\u2013780 nm\uff08\u653e\u5927\uff09', (vx0 + vx1) / 2, vy - 14, { color: '#fff', size: 11, align: 'center' });
    /* marker */
    var f = Math.pow(10, lf), mx = X(lf);
    A.line(ctx, mx, y - 12, mx, y + h + 8, '#fff', 1.8);
    A.dot(ctx, mx, y + h / 2, 5, '#fff', A.rgba('#000', 0.6));
    var lam = PH.consts.C0 / f;
    var lab = A.siPrefix(lam, 'm', 3);
    A.text(ctx, lab, mx, y - 18, { color: '#fff', size: 12, align: 'center' });
    /* wavelength scale */
    A.text(ctx, '$\u03bb$ = ' + lab + '   $f$ = ' + A.sci(f, 3) + ' Hz   $E$ = ' +
      (PH.consts.HPLANCK * f / PH.consts.EV).toPrecision(3) + ' eV', 12, H - 12, { color: C.dim, size: 12 });
  });
  upd();
  A.onReady(function () {
    s.resize(); upd();
    s.canvas.addEventListener('click', function (e) {
      var r = s.canvas.getBoundingClientRect();
      var x0 = 40, x1 = s.W - 20;
      var frac = (e.clientX - r.left - x0) / (x1 - x0);
      lf = Math.max(4, Math.min(22, 4 + frac * 18));
      ctlF.set(lf); upd();
    });
  });
});
})();
