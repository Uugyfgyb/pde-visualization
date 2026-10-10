/* =====================================================================
   physics.js — Numerical & analytical core for
   "Maxwell (Strauss 13.1) and Euler (Strauss 13.2) — visual lecture"
   Pure computation: no DOM, no canvas.  Loaded by index.html and by
   tests/check.js (Node), so the page and the test harness run the SAME
   code.  Every formula used in the page's figures comes from here.
   ===================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PHYS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------------------------------------------------------
     1. Constants — CODATA 2018 (SI)
     --------------------------------------------------------------- */
  var C0    = 299792458;            // m/s   (exact, defines the metre)
  var EPS0  = 8.8541878128e-12;     // F/m
  var MU0   = 1.25663706212e-6;     // N/A^2
  var QE    = 1.602176634e-19;      // C
  var HPLANCK = 6.62607015e-34;     // J s
  var KB    = 1.380649e-23;         // J/K
  var RGAS  = 8.314462618;          // J/(mol K)
  var EV    = 1.602176634e-19;      // J per eV

  function cFromConstants() { return 1 / Math.sqrt(EPS0 * MU0); }
  function eta0() { return Math.sqrt(MU0 / EPS0); }        // 376.73 ohm

  /* ---------------------------------------------------------------
     2. Small numeric helpers
     --------------------------------------------------------------- */
  function linspace(a, b, n) {
    var out = new Float64Array(n);
    if (n === 1) { out[0] = a; return out; }
    for (var i = 0; i < n; i++) out[i] = a + (b - a) * i / (n - 1);
    return out;
  }
  function maxOf(a) { var m = -Infinity; for (var i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }
  function minOf(a) { var m = Infinity;  for (var i = 0; i < a.length; i++) if (a[i] < m) m = a[i]; return m; }
  function maxAbs(a) { var m = 0; for (var i = 0; i < a.length; i++) { var v = Math.abs(a[i]); if (v > m) m = v; } return m; }
  function argmaxAbs(a, i0, i1) {
    var m = -1, k = -1;
    for (var i = i0; i < i1; i++) { var v = Math.abs(a[i]); if (v > m) { m = v; k = i; } }
    return k;
  }
  function meanRange(a, i0, i1) { var s = 0, n = 0; for (var i = i0; i < i1; i++) { s += a[i]; n++; } return n ? s / n : NaN; }
  function trapz(y, x) {
    var s = 0;
    for (var i = 1; i < y.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
    return s;
  }
  /* Parabolic sub-sample peak location of |a| near integer index k. */
  function refinePeak(a, k) {
    if (k <= 0 || k >= a.length - 1) return k;
    var y0 = Math.abs(a[k - 1]), y1 = Math.abs(a[k]), y2 = Math.abs(a[k + 1]);
    var den = (y0 - 2 * y1 + y2);
    if (Math.abs(den) < 1e-300) return k;
    var d = 0.5 * (y0 - y2) / den;
    if (!isFinite(d) || Math.abs(d) > 1) return k;
    return k + d;
  }
  var DEG = Math.PI / 180;

  /* ---------------------------------------------------------------
     3. Electromagnetism — §13.1
     --------------------------------------------------------------- */

  /* Fresnel, normal incidence, lossless dielectric, mu_r = 1.
     r = (n1-n2)/(n1+n2) is the E-field amplitude ratio;
     R = r^2, T = 1 - R = 4 n1 n2/(n1+n2)^2 (normal-incidence transmittance). */
  function fresnelNormal(n1, n2) {
    var r = (n1 - n2) / (n1 + n2);
    var t = 2 * n1 / (n1 + n2);
    return { r: r, t: t, R: r * r, T: 1 - r * r };
  }
  /* Fresnel at oblique incidence (s = TE, p = TM), lossless, mu_r = 1.
     thetaT from Snell;  r_s = (n1 cos i - n2 cos t)/(n1 cos i + n2 cos t),
     r_p = (n2 cos i - n1 cos t)/(n2 cos i + n1 cos t).
     Powers: R = |r|^2, T = (n2 cos t)/(n1 cos i) |t|^2, and R + T = 1. */
  function fresnelAngle(n1, n2, thi) {
    var ci = Math.cos(thi), si = Math.sin(thi);
    var st = n1 * si / n2;
    if (Math.abs(st) >= 1) {                      // total internal reflection
      return { tir: true, thetaT: NaN, Rs: 1, Rp: 1, Ts: 0, Tp: 0, rs: 1, rp: 1 };
    }
    var ct = Math.sqrt(Math.max(0, 1 - st * st));
    var rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
    var rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
    var ts = 2 * n1 * ci / (n1 * ci + n2 * ct);
    var tp = 2 * n1 * ci / (n2 * ci + n1 * ct);
    var fac = (n2 * ct) / (n1 * ci);
    return { tir: false, thetaT: Math.asin(st), rs: rs, rp: rp, ts: ts, tp: tp,
             Rs: rs * rs, Rp: rp * rp, Ts: fac * ts * ts, Tp: fac * tp * tp };
  }
  function brewsterAngle(n1, n2) { return Math.atan(n2 / n1); }

  /* Acoustic (pressure) reflection at a normal interface, impedance Z = rho c. */
  function acousticNormal(Z1, Z2) {
    var rp = (Z2 - Z1) / (Z2 + Z1);
    var tp = 2 * Z2 / (Z2 + Z1);
    return { rp: rp, tp: tp, R: rp * rp, T: 1 - rp * rp };
  }
  function snellCritical(n1, n2) { return n1 > n2 ? Math.asin(n2 / n1) : NaN; }
  function brewster(n1, n2) { return Math.atan(n2 / n1); }

  /* Plane wave propagating along +z, linearly polarised along x:
        E = A cos(k z - w t) xhat ,  B = (A/c) cos(k z - w t) yhat
     Returns every quantity the page displays, computed from scratch. */
  function planeWave(z, t, A, k, w) {
    var ph = k * z - w * t, cc = Math.cos(ph);
    var Ex = A * cc, By = A / C0 * cc;
    var uE = 0.5 * EPS0 * Ex * Ex;                 // electric energy density
    var uB = 0.5 * By * By / MU0;                  // magnetic energy density
    var S = Ex * By / MU0;                         // Poynting z-component
    return { Ex: Ex, By: By, uE: uE, uB: uB, u: uE + uB, S: S,
             ratioSoverU: S / (uE + uB) };
  }

  /* Flux of E through a closed super-ellipsoid surface
        |x/a|^p + |y/a|^p + |z/a|^p = 1   (p=2 sphere, p->inf cube)
     enclosing a point charge Q at the origin, by midpoint-rule quadrature.
     Exact value: Q/eps0.  Purely numerical — no special-casing. */
  function superEllipsoidPoint(th, ph, a, p) {
    var st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
    var dx = st * cp, dy = st * sp, dz = ct;
    var den = Math.pow(Math.abs(dx), p) + Math.pow(Math.abs(dy), p) + Math.pow(Math.abs(dz), p);
    var r = a / Math.pow(den, 1 / p);
    return [r * dx, r * dy, r * dz];
  }
  function gaussFluxPointCharge(Q, a, p, nTh, nPh) {
    nTh = nTh || 48; nPh = nPh || 96;
    var dth = Math.PI / nTh, dph = 2 * Math.PI / nPh;
    var flux = 0, k = Q / (4 * Math.PI * EPS0);
    for (var i = 0; i < nTh; i++) {
      var th0 = (i + 0.5) * dth, th1 = (i + 1.5) * dth;
      for (var j = 0; j < nPh; j++) {
        var ph0 = (j + 0.5) * dph, ph1 = (j + 1.5) * dph;
        var P0 = superEllipsoidPoint(th0, ph0, a, p), P1 = superEllipsoidPoint(th1, ph0, a, p),
            P2 = superEllipsoidPoint(th1, ph1, a, p), P3 = superEllipsoidPoint(th0, ph1, a, p);
        var d1 = [P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]];
        var d2 = [P3[0] - P1[0], P3[1] - P1[1], P3[2] - P1[2]];
        var ar = [0.5 * (d1[1] * d2[2] - d1[2] * d2[1]),
                  0.5 * (d1[2] * d2[0] - d1[0] * d2[2]),
                  0.5 * (d1[0] * d2[1] - d1[1] * d2[0])];
        var cx = 0.25 * (P0[0] + P1[0] + P2[0] + P3[0]),
            cy = 0.25 * (P0[1] + P1[1] + P2[1] + P3[1]),
            cz = 0.25 * (P0[2] + P1[2] + P2[2] + P3[2]);
        var r2 = cx * cx + cy * cy + cz * cz, r = Math.sqrt(r2), r3 = r2 * r;
        var Ex = k * cx / r3, Ey = k * cy / r3, Ez = k * cz / r3;
        flux += Ex * ar[0] + Ey * ar[1] + Ez * ar[2];
      }
    }
    return flux;
  }
  /* B field of a magnetic dipole m (vector) at position r (vector). */
  function dipoleB(mx, my, mz, x, y, z) {
    var r2 = x * x + y * y + z * z, r = Math.sqrt(r2), r3 = r2 * r, r5 = r3 * r2;
    var mdotr = mx * x + my * y + mz * z;
    var k = MU0 / (4 * Math.PI);
    return [k * (3 * mdotr * x / r5 - mx / r3),
            k * (3 * mdotr * y / r5 - my / r3),
            k * (3 * mdotr * z / r5 - mz / r3)];
  }
  /* Flux of B through a sphere of radius a centred at (cx,cy,cz). */
  function dipoleFluxSphere(mx, my, mz, cx, cy, cz, a, nTh, nPh) {
    nTh = nTh || 40; nPh = nPh || 80;
    var dth = Math.PI / nTh, dph = 2 * Math.PI / nPh, flux = 0;
    var pt = function (th, ph) {
      return [cx + a * Math.sin(th) * Math.cos(ph), cy + a * Math.sin(th) * Math.sin(ph), cz + a * Math.cos(th)];
    };
    for (var i = 0; i < nTh; i++) {
      var th0 = (i + 0.5) * dth, th1 = (i + 1.5) * dth;
      for (var j = 0; j < nPh; j++) {
        var ph0 = (j + 0.5) * dph, ph1 = (j + 1.5) * dph;
        var P0 = pt(th0, ph0), P1 = pt(th1, ph0), P2 = pt(th1, ph1), P3 = pt(th0, ph1);
        var d1 = [P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]];
        var d2 = [P3[0] - P1[0], P3[1] - P1[1], P3[2] - P1[2]];
        var ar = [0.5 * (d1[1] * d2[2] - d1[2] * d2[1]),
                  0.5 * (d1[2] * d2[0] - d1[0] * d2[2]),
                  0.5 * (d1[0] * d2[1] - d1[1] * d2[0])];
        var c = [0.25 * (P0[0] + P1[0] + P2[0] + P3[0]), 0.25 * (P0[1] + P1[1] + P2[1] + P3[1]), 0.25 * (P0[2] + P1[2] + P2[2] + P3[2])];
        var B = dipoleB(mx, my, mz, c[0], c[1], c[2]);
        flux += B[0] * ar[0] + B[1] * ar[1] + B[2] * ar[2];
      }
    }
    return flux;
  }
  /* Flux of B through the same super-ellipsoid family (for the "no monopole" test) */
  function dipoleFluxSuperellipsoid(mx, my, mz, a, p, nTh, nPh) {
    nTh = nTh || 40; nPh = nPh || 80;
    var dth = Math.PI / nTh, dph = 2 * Math.PI / nPh, flux = 0;
    for (var i = 0; i < nTh; i++) {
      var th0 = (i + 0.5) * dth, th1 = (i + 1.5) * dth;
      for (var j = 0; j < nPh; j++) {
        var ph0 = (j + 0.5) * dph, ph1 = (j + 1.5) * dph;
        var P0 = superEllipsoidPoint(th0, ph0, a, p), P1 = superEllipsoidPoint(th1, ph0, a, p),
            P2 = superEllipsoidPoint(th1, ph1, a, p), P3 = superEllipsoidPoint(th0, ph1, a, p);
        var d1 = [P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]];
        var d2 = [P3[0] - P1[0], P3[1] - P1[1], P3[2] - P1[2]];
        var ar = [0.5 * (d1[1] * d2[2] - d1[2] * d2[1]),
                  0.5 * (d1[2] * d2[0] - d1[0] * d2[2]),
                  0.5 * (d1[0] * d2[1] - d1[1] * d2[0])];
        var c = [0.25 * (P0[0] + P1[0] + P2[0] + P3[0]), 0.25 * (P0[1] + P1[1] + P2[1] + P3[1]), 0.25 * (P0[2] + P1[2] + P2[2] + P3[2])];
        var B = dipoleB(mx, my, mz, c[0], c[1], c[2]);
        flux += B[0] * ar[0] + B[1] * ar[1] + B[2] * ar[2];
      }
    }
    return flux;
  }

  /* Faraday: circular loop radius a in a uniform B(t) = Bz(t) zhat.
     EMF = -dPhi/dt = -pi a^2 dBz/dt.  Induced azimuthal E: E_phi = -(r/2) dBz/dt. */
  function faradayLoop(a, Bz, dBzdt) {
    var Phi = Math.PI * a * a * Bz;
    return { Phi: Phi, emf: -Math.PI * a * a * dBzdt };
  }

  /* ---------------------------------------------------------------
     4. 1-D FDTD (Yee) solver for Maxwell:  Ey, Hz, propagation along x
           dHz/dt = -(1/mu) dEy/dx ,  dEy/dt = -(1/eps) dHz/dx
        Yee staggering; Mur 1st-order absorbing ends; soft current source.
     --------------------------------------------------------------- */
  function FDTD(o) {
    this.n = o.n;
    this.dx = o.dx;
    this.epsr = o.epsr || null;         // Float64Array(n), default 1
    this.mur  = o.mur  || null;
    var i, nMin = 1;
    if (this.epsr) for (i = 0; i < this.n; i++) { var nn = Math.sqrt(this.epsr[i] * (this.mur ? this.mur[i] : 1)); if (nn < nMin) nMin = nn; }
    this.cmax = C0 / nMin;                            // fastest local speed
    this.cfl = (o.cfl === undefined) ? 0.5 : o.cfl;
    this.dt = this.cfl * this.dx / this.cmax;
    this.Ey = new Float64Array(this.n);
    this.Hz = new Float64Array(this.n);
    this.iSrc = o.iSrc;
    this.source = o.source;                            // function(t) added to Ey[iSrc]
    this.t = 0;
    this.abc = o.abc !== false;
    this.S = this.cmax * this.dt / this.dx;            // Courant number at the ends
    this.eps = new Float64Array(this.n); this.mu = new Float64Array(this.n);
    for (i = 0; i < this.n; i++) {
      this.eps[i] = EPS0 * (this.epsr ? this.epsr[i] : 1);
      this.mu[i]  = MU0  * (this.mur  ? this.mur[i]  : 1);
    }
  }
  FDTD.prototype.step = function () {
    var n = this.n, Ey = this.Ey, Hz = this.Hz, dt = this.dt, dx = this.dx;
    var i, cH, cE;
    for (i = 0; i < n - 1; i++) {                      // H half step
      cH = dt / (this.mu[i] * dx);
      Hz[i] += cH * (Ey[i] - Ey[i + 1]);
    }
    // Mur 1st-order ABC needs the time-n values of the two outermost
    // interior nodes, which the E-update below overwrites: save them first.
    var e0n = Ey[0], e1n = Ey[1], eNn = Ey[n - 1], eNm1n = Ey[n - 2];
    for (i = 1; i < n; i++) {                          // E full step
      cE = dt / (this.eps[i] * dx);
      Ey[i] += cE * (Hz[i - 1] - Hz[i]);
    }
    if (this.abc) {                                    // Mur 1st order
      var k = (this.S - 1) / (this.S + 1);
      Ey[0]     = e1n   + k * (Ey[1]     - e0n);
      Ey[n - 1] = eNm1n + k * (Ey[n - 2] - eNn);
    }
    this.t += dt;
    if (this.source) Ey[this.iSrc] += this.source(this.t);
  };
  FDTD.prototype.run = function (nsteps, onStep) {
    for (var s = 0; s < nsteps; s++) { this.step(); if (onStep) onStep(this, s); }
    return this.t;
  };
  FDTD.prototype.probe = function (i) { return this.Ey[i]; };

  /* Full reflection/transmission experiment, vacuum run used as the
     incident reference.  Returns measured vs Fresnel-predicted values. */
  function fdtdReflectionExperiment(o) {
    o = o || {};
    var n = o.n || 1200, cfl = o.cfl || 0.5, epsr = o.epsr || 4, L = 1;
    var dx = L / n, n1 = 1, n2 = Math.sqrt(epsr);
    var iSrc = Math.round(0.10 * n), iA = Math.round(0.30 * n), iB = Math.round(0.90 * n);
    var slabLo = Math.round((o.slabLo === undefined ? 0.50 : o.slabLo) * n);
    var slabHi = Math.round((o.slabHi === undefined ? 0.70 : o.slabHi) * n);
    // tauCells sets the pulse width in CELLS; the default keeps ~20 cells per
    // pulse so that the Yee scheme's numerical dispersion stays below 0.1 %.
    var tau = (o.tauCells || (n / 60)) * dx / C0, t0 = 5 * tau;
    var src = function (t) { var s = (t - t0) / tau; return Math.exp(-s * s); };
    var dt = cfl * dx / C0;
    var nsteps = Math.round((o.tEndFac || 3.0) * L / C0 / dt);

    function run(withSlab) {
      var eps = new Float64Array(n); eps.fill(1);
      if (withSlab) for (var i = slabLo; i < slabHi; i++) eps[i] = epsr;
      var f = new FDTD({ n: n, dx: dx, epsr: eps, cfl: cfl, iSrc: iSrc, source: src });
      var A = new Float64Array(nsteps), B = new Float64Array(nsteps);
      for (var s = 0; s < nsteps; s++) { f.step(); A[s] = f.Ey[iA]; B[s] = f.Ey[iB]; }
      return { A: A, B: B, dt: dt };
    }
    var vac = run(false), slb = run(true);
    var iInc = argmaxAbs(vac.A, 0, nsteps), ampInc = Math.abs(vac.A[iInc]);
    var diff = new Float64Array(nsteps);
    for (var s = 0; s < nsteps; s++) diff[s] = slb.A[s] - vac.A[s];
    var iRef = argmaxAbs(diff, 0, nsteps), ampRef = Math.abs(diff[iRef]);
    var iTr = argmaxAbs(slb.B, 0, nsteps), ampTr = Math.abs(slb.B[iTr]);
    var ampIncAtB = Math.abs(vac.B[argmaxAbs(vac.B, 0, nsteps)]);
    var fr = fresnelNormal(n1, n2);
    // numerical pulse speed from the vacuum run (peak travel between A and B)
    var kA = refinePeak(vac.A, iInc), kB = refinePeak(vac.B, argmaxAbs(vac.B, 0, nsteps));
    var speed = ((iB - iA) * dx) / ((kB - kA) * dt);
    // Careful with what is measured: the reflected pulse gives the AMPLITUDE
    // coefficient |r|; the first transmitted pulse through a slab gives
    // |t12*t21| = 4 n1 n2/(n1+n2)^2, which happens to equal the power
    // transmittance T = 1-R.  Both are compared against Fresnel below.
    var rAmp = ampRef / ampInc, tAmp = ampTr / ampIncAtB;
    return { r_amp: rAmp, t_amp: tAmp, r_amp_th: Math.abs(fr.r), t_amp_th: fr.T,
             R_num: rAmp * rAmp, R_th: fr.R, T_num: tAmp, T_th: fr.T, n1: n1, n2: n2,
             speed_num: speed, speed_relErr: speed / C0 - 1,
             ampInc: ampInc, ampRef: ampRef, ampTr: ampTr, ampIncAtB: ampIncAtB,
             dt: dt, dx: dx, nsteps: nsteps, iA: iA, iB: iB, iSrc: iSrc, slabLo: slabLo, slabHi: slabHi };
  }

  /* ---------------------------------------------------------------
     5. Acoustics / gas dynamics — §13.2
     --------------------------------------------------------------- */
  var GASES = {
    air:    { name: 'Air (dry, 20 C)',  gamma: 1.4,   M: 0.0289644 },
    nitrogen:{ name: 'N2',              gamma: 1.4,   M: 0.0280134 },
    oxygen: { name: 'O2',               gamma: 1.395, M: 0.0319988 },
    helium: { name: 'He',               gamma: 1.667, M: 0.0040026 },
    argon:  { name: 'Ar',               gamma: 1.667, M: 0.039948  },
    co2:    { name: 'CO2',              gamma: 1.289, M: 0.0440095 },
    methane:{ name: 'CH4',              gamma: 1.305, M: 0.0160425 }
  };
  /* c = sqrt(gamma p0/rho0) = sqrt(gamma R T / M)  (ideal gas) */
  function soundSpeed(gamma, T, Mmolar) { return Math.sqrt(gamma * RGAS * T / Mmolar); }
  /* Standard empirical fit for dry air: c ~ 331.3 + 0.606 T[C] m/s */
  function soundSpeedAirEmpirical(Tcelsius) { return 331.3 * Math.sqrt(1 + Tcelsius / 273.15); }
  function acousticImpedance(rho0, c) { return rho0 * c; }

  /* Linearised (acoustic) system:  p_tt = c^2 Lap p,  u = -(1/rho0) grad(phi), phi_tt = c^2 Lap phi */

  /* ---- 1-D ideal-gas Euler equations, finite volume, HLL flux ---- */
  function Euler1D(o) {
    this.n = o.n; this.xmin = o.xmin; this.xmax = o.xmax;
    this.gamma = o.gamma || 1.4;
    this.dx = (this.xmax - this.xmin) / this.n;
    this.x = new Float64Array(this.n);
    for (var i = 0; i < this.n; i++) this.x[i] = this.xmin + (i + 0.5) * this.dx;
    this.rho = new Float64Array(this.n);
    this.mom = new Float64Array(this.n);
    this.Ene = new Float64Array(this.n);
    this.t = 0;
  }
  Euler1D.prototype.setRegion = function (pred, rho, u, p) {
    for (var i = 0; i < this.n; i++) if (pred(this.x[i])) this.setCell(i, rho, u, p);
  };
  Euler1D.prototype.setCell = function (i, rho, u, p) {
    this.rho[i] = rho; this.mom[i] = rho * u;
    this.Ene[i] = p / (this.gamma - 1) + 0.5 * rho * u * u;
  };
  Euler1D.prototype.primitive = function () {
    var g = this.gamma, n = this.n;
    var rho = this.rho, mom = this.mom, E = this.Ene;
    var u = new Float64Array(n), p = new Float64Array(n), c = new Float64Array(n), T = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      u[i] = mom[i] / rho[i];
      p[i] = (g - 1) * (E[i] - 0.5 * mom[i] * mom[i] / rho[i]);
      c[i] = Math.sqrt(g * p[i] / rho[i]);
      T[i] = p[i] / rho[i];
    }
    return { rho: rho, u: u, p: p, c: c, T: T };
  };
  Euler1D.prototype.maxSpeed = function () {
    var pr = this.primitive(), m = 0;
    for (var i = 0; i < this.n; i++) { var s = Math.abs(pr.u[i]) + pr.c[i]; if (s > m) m = s; }
    return m;
  };
  function hllFlux(rL, mL, EL, rR, mR, ER, g) {
    var uL = mL / rL, uR = mR / rR;
    var pL = (g - 1) * (EL - 0.5 * mL * mL / rL), pR = (g - 1) * (ER - 0.5 * mR * mR / rR);
    var cL = Math.sqrt(g * pL / rL), cR = Math.sqrt(g * pR / rR);
    var HL = (EL + pL) / rL, HR = (ER + pR) / rR;
    var sqL = Math.sqrt(rL), sqR = Math.sqrt(rR);
    var uT = (sqL * uL + sqR * uR) / (sqL + sqR);
    var HT = (sqL * HL + sqR * HR) / (sqL + sqR);
    var cT = Math.sqrt(Math.max(0, (g - 1) * (HT - 0.5 * uT * uT)));
    var SL = Math.min(uL - cL, uT - cT), SR = Math.max(uR + cR, uT + cT);
    var FL1 = mL, FL2 = mL * uL + pL, FL3 = uL * (EL + pL);
    var FR1 = mR, FR2 = mR * uR + pR, FR3 = uR * (ER + pR);
    if (SL >= 0) return [FL1, FL2, FL3];
    if (SR <= 0) return [FR1, FR2, FR3];
    var inv = 1 / (SR - SL);
    return [ (SR * FL1 - SL * FR1 + SL * SR * (rR - rL)) * inv,
             (SR * FL2 - SL * FR2 + SL * SR * (mR - mL)) * inv,
             (SR * FL3 - SL * FR3 + SL * SR * (ER - EL)) * inv ];
  }
  Euler1D.prototype.stepCFL = function (cfl) {
    var n = this.n, g = this.gamma, dx = this.dx;
    var dt = cfl * dx / this.maxSpeed();
    var rho = this.rho, mom = this.mom, E = this.Ene;
    var F1 = new Float64Array(n + 1), F2 = new Float64Array(n + 1), F3 = new Float64Array(n + 1);
    var i;
    F1[0] = mom[0]; F2[0] = mom[0] * mom[0] / rho[0] + (g - 1) * (E[0] - 0.5 * mom[0] * mom[0] / rho[0]); F3[0] = (mom[0] / rho[0]) * (E[0] + (g - 1) * (E[0] - 0.5 * mom[0] * mom[0] / rho[0]));
    for (i = 1; i < n; i++) {
      var f = hllFlux(rho[i - 1], mom[i - 1], E[i - 1], rho[i], mom[i], E[i], g);
      F1[i] = f[0]; F2[i] = f[1]; F3[i] = f[2];
    }
    F1[n] = mom[n - 1]; F2[n] = mom[n - 1] * mom[n - 1] / rho[n - 1] + (g - 1) * (E[n - 1] - 0.5 * mom[n - 1] * mom[n - 1] / rho[n - 1]); F3[n] = (mom[n - 1] / rho[n - 1]) * (E[n - 1] + (g - 1) * (E[n - 1] - 0.5 * mom[n - 1] * mom[n - 1] / rho[n - 1]));
    var lam = dt / dx;
    for (i = 0; i < n; i++) {
      rho[i] -= lam * (F1[i + 1] - F1[i]);
      mom[i] -= lam * (F2[i + 1] - F2[i]);
      E[i]   -= lam * (F3[i + 1] - F3[i]);
    }
    this.t += dt;
    return dt;
  };
  Euler1D.prototype.run = function (tEnd, cfl) {
    var steps = 0;
    while (this.t < tEnd && steps < 200000) { var dt = this.stepCFL(cfl); if (this.t + dt > tEnd) break; steps++; }
    return steps;
  };
  Euler1D.prototype.totalMass = function () { var s = 0; for (var i = 0; i < this.n; i++) s += this.rho[i] * this.dx; return s; };
  Euler1D.prototype.totalMomentum = function () { var s = 0; for (var i = 0; i < this.n; i++) s += this.mom[i] * this.dx; return s; };
  Euler1D.prototype.totalEnergy = function () { var s = 0; for (var i = 0; i < this.n; i++) s += this.Ene[i] * this.dx; return s; };
  Euler1D.prototype.minDensity = function () { return minOf(this.rho); };
  Euler1D.prototype.minPressure = function () { var pr = this.primitive(); return minOf(pr.p); };

  /* Sod shock tube: (rho,u,p) = (1,0,1) | (0.125,0,0.1), gamma=1.4, t=0.2.
     Reference values (Toro, "Riemann Solvers and Numerical Methods", Table 4.1). */
  var SOD_REF = { pStar: 0.30313, uStar: 0.92745, rhoStarL: 0.42632, rhoStarR: 0.26557,
                  shockPos: 0.85044, shockSpeed: 1.75220, contactPos: 0.68550,
                  headPos: 0.26340, tailPos: 0.48590 };
  function sodProblem(n, tEnd, cfl, gamma) {
    gamma = gamma || 1.4;
    var s = new Euler1D({ n: n, xmin: 0, xmax: 1, gamma: gamma });
    s.setRegion(function (x) { return x < 0.5; }, 1.0, 0.0, 1.0);
    s.setRegion(function (x) { return x >= 0.5; }, 0.125, 0.0, 0.1);
    s.run(tEnd === undefined ? 0.2 : tEnd, cfl === undefined ? 0.9 : cfl);
    return s;
  }
  /* Measure the waves that actually came out, and compare with theory. */
  function analyzeSod(s) {
    var pr = s.primitive(), n = s.n, x = s.x, rho = pr.rho, u = pr.u, p = pr.p;
    var iL0 = Math.round(0.55 * n), iL1 = Math.round(0.65 * n);
    var iR0 = Math.round(0.72 * n), iR1 = Math.round(0.82 * n);
    var rhoSL = meanRange(rho, iL0, iL1), uSL = meanRange(u, iL0, iL1), pSL = meanRange(p, iL0, iL1);
    var rhoSR = meanRange(rho, iR0, iR1), uSR = meanRange(u, iR0, iR1), pSR = meanRange(p, iR0, iR1);
    // shock position: crossing of rho through the mean of the two plateaus, scanning from the right
    var mid = 0.5 * (rhoSR + 0.125), iShock = -1;
    for (var i = n - 2; i > Math.round(0.6 * n); i--) {
      if (rho[i] > mid && rho[i + 1] <= mid) { iShock = i + (rho[i] - mid) / (rho[i] - rho[i + 1]); break; }
    }
    var xShock = iShock >= 0 ? x[Math.min(n - 1, Math.round(iShock))] : NaN;
    var t = s.t;
    return { rhoStarL: rhoSL, uStarL: uSL, pStarL: pSL, rhoStarR: rhoSR, uStarR: uSR, pStarR: pSR,
             shockPos: xShock, shockSpeed: (xShock - 0.5) / t, t: t,
             errP: Math.abs(pSL - SOD_REF.pStar) / SOD_REF.pStar,
             errU: Math.abs(uSL - SOD_REF.uStar) / SOD_REF.uStar,
             errRhoL: Math.abs(rhoSL - SOD_REF.rhoStarL) / SOD_REF.rhoStarL,
             errRhoR: Math.abs(rhoSR - SOD_REF.rhoStarR) / SOD_REF.rhoStarR,
             errShockSpeed: Math.abs((xShock - 0.5) / t - SOD_REF.shockSpeed) / SOD_REF.shockSpeed };
  }
  /* Rankine-Hugoniot check from the measured post-shock state: for a shock
     moving into gas at rest, S = rho2 u2/(rho2 - rho1). */
  function shockSpeedRH(rho1, rho2, u2) { return rho2 * u2 / (rho2 - rho1); }

  /* ---- Nonlinear simple wave: exact breaking time -------------------
     Right-going simple wave in a polytropic gas:  u is constant on the
     straight characteristics  x = x0 + (c0 + (gamma+1)/2 * u0(x0)) t.
     Shock forms when characteristics first cross.                        */
  function simpleWaveBreakingTime(A, k, gamma, c0) { return 2 / ((gamma + 1) * A * k); }
  function characteristicX(x0, t, u0fun, gamma, c0) { return x0 + (c0 + 0.5 * (gamma + 1) * u0fun(x0)) * t; }
  /* Implicit (multivalued admitted) solution u(x,t) of the simple wave */
  function simpleWaveU(x, t, u0fun, gamma, c0, x0lo, x0hi) {
    var f = function (x0) { return characteristicX(x0, t, u0fun, gamma, c0) - x; };
    var a = x0lo, b = x0hi, fa = f(a), fb = f(b);
    if (fa * fb > 0) return NaN;
    for (var it = 0; it < 80; it++) { var m = 0.5 * (a + b), fm = f(m); if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } }
    return u0fun(0.5 * (a + b));
  }

  /* ---- 2-D point vortices: exact solutions of 2-D incompressible Euler
          dx_i/dt = sum_j  Gamma_j/(2 pi) * (-(y_i-y_j), (x_i-x_j))/r_ij^2 */
  function PointVortices(x, y, G) {
    this.x = x.slice(); this.y = y.slice(); this.G = G.slice(); this.t = 0;
    this.n = G.length;
  }
  PointVortices.prototype.velocities = function () {
    var n = this.n, u = new Float64Array(n), v = new Float64Array(n);
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if (i === j) continue;
      var dx = this.x[i] - this.x[j], dy = this.y[i] - this.y[j];
      var r2 = dx * dx + dy * dy;
      if (r2 < 1e-12) continue;
      u[i] += -this.G[j] / (2 * Math.PI) * dy / r2;
      v[i] +=  this.G[j] / (2 * Math.PI) * dx / r2;
    }
    return { u: u, v: v };
  };
  PointVortices.prototype.stepRK4 = function (dt) {
    var n = this.n;
    var acc = function (x, y, out) {
      var u = new Float64Array(n), v = new Float64Array(n);
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var dx = x[i] - x[j], dy = y[i] - y[j], r2 = dx * dx + dy * dy;
        if (r2 < 1e-12) continue;
        u[i] += -this.G[j] / (2 * Math.PI) * dy / r2;
        v[i] +=  this.G[j] / (2 * Math.PI) * dx / r2;
      }
      out[0] = u; out[1] = v;
    }.bind(this);
    var o1 = [null, null], o2 = [null, null], o3 = [null, null], o4 = [null, null];
    var x1 = this.x, y1 = this.y;
    acc(x1, y1, o1);
    var x2 = new Float64Array(n), y2 = new Float64Array(n), i;
    for (i = 0; i < n; i++) { x2[i] = x1[i] + 0.5 * dt * o1[0][i]; y2[i] = y1[i] + 0.5 * dt * o1[1][i]; }
    acc(x2, y2, o2);
    var x3 = new Float64Array(n), y3 = new Float64Array(n);
    for (i = 0; i < n; i++) { x3[i] = x1[i] + 0.5 * dt * o2[0][i]; y3[i] = y1[i] + 0.5 * dt * o2[1][i]; }
    acc(x3, y3, o3);
    var x4 = new Float64Array(n), y4 = new Float64Array(n);
    for (i = 0; i < n; i++) { x4[i] = x1[i] + dt * o3[0][i]; y4[i] = y1[i] + dt * o3[1][i]; }
    acc(x4, y4, o4);
    for (i = 0; i < n; i++) {
      this.x[i] += dt / 6 * (o1[0][i] + 2 * o2[0][i] + 2 * o3[0][i] + o4[0][i]);
      this.y[i] += dt / 6 * (o1[1][i] + 2 * o2[1][i] + 2 * o3[1][i] + o4[1][i]);
    }
    this.t += dt;
    return this;
  };
  /* Exact conserved Hamiltonian of the point-vortex system */
  PointVortices.prototype.hamiltonian = function () {
    var H = 0;
    for (var i = 0; i < this.n; i++) for (var j = i + 1; j < this.n; j++) {
      var dx = this.x[i] - this.x[j], dy = this.y[i] - this.y[j];
      H += -this.G[i] * this.G[j] / (2 * Math.PI) * 0.5 * Math.log(dx * dx + dy * dy);
    }
    return H;
  };

  /* Mach cone: half angle mu with sin(mu) = 1/M  (M>1). */
  function machAngle(M) { return M > 1 ? Math.asin(1 / M) : NaN; }
  /* Doppler factor for a source moving at M along +x, emission angle theta */
  function dopplerFactor(M, cosTheta) { return 1 / (1 - M * cosTheta); }

  /* ---------------------------------------------------------------
     6. Self-test suite — runs identically in Node and in the browser
     --------------------------------------------------------------- */
  function runChecks() {
    var out = [];
    var add = function (name, group, value, expected, tol, unit, note) {
      var rel = (expected === 0) ? Math.abs(value) : Math.abs(value - expected) / Math.abs(expected);
      out.push({ name: name, group: group, value: value, expected: expected, tol: tol,
                 rel: rel, pass: (rel <= tol), unit: unit || '', note: note || '' });
    };
    var t0 = Date.now();

    /* --- constants --- */
    add('c = 1/sqrt(eps0 mu0)', 'constants', cFromConstants(), C0, 1e-9, 'm/s', 'CODATA-2018 vs the defined value of c');
    add('eta0 = sqrt(mu0/eps0)', 'constants', eta0(), 376.730313668, 1e-9, 'ohm');

    /* --- Gauss law: flux of a point charge through closed surfaces --- */
    var Q = 1e-9;
    var f1 = gaussFluxPointCharge(Q, 1.0, 2, 48, 96);
    add('flux through sphere, r=1', 'Gauss', f1, Q / EPS0, 2e-3, 'V m', 'numerical quadrature');
    var f2 = gaussFluxPointCharge(Q, 2.5, 2, 48, 96);
    add('flux through sphere, r=2.5', 'Gauss', f2, Q / EPS0, 2e-3, 'V m', 'same flux at larger radius');
    var f3 = gaussFluxPointCharge(Q, 1.0, 6, 48, 96);
    add('flux through cube-ish surface', 'Gauss', f3, Q / EPS0, 1e-2, 'V m', '|x|^6+|y|^6+|z|^6=1: shape independent');

    /* --- no magnetic monopoles --- */
    var m = [0, 0, 1e-3];
    var fb1 = dipoleFluxSuperellipsoid(m[0], m[1], m[2], 0.5, 2, 40, 80);
    add('dipole flux, surface around origin', 'divB', fb1 / (MU0 * 1e-3 / (4 * Math.PI)), 0, 1e-6, '', 'normalised by mu0 m/4pi');
    var fb2 = dipoleFluxSphere(m[0], m[1], m[2], 2.0, 0.5, 0, 0.7, 40, 80);
    add('dipole flux, offset surface (no source inside)', 'divB', fb2 / (MU0 * 1e-3 / (4 * Math.PI)), 0, 1e-4, '');

    /* --- Faraday --- */
    var a = 0.05, Bz = 0.2, dB = 3.0;
    var fr1 = faradayLoop(a, Bz, dB);
    add('Faraday EMF = -pi a^2 dB/dt', 'Faraday', fr1.emf, -Math.PI * a * a * dB, 1e-12, 'V');

    /* --- Fresnel --- */
    var frn = fresnelNormal(1, 2);
    add('R + T = 1 (n=2)', 'Fresnel', frn.R + frn.T, 1, 1e-12, '', 'energy conservation');
    add('R (n=2)', 'Fresnel', frn.R, 1 / 9, 1e-12, '', '((1-2)/(1+2))^2');
    // oblique incidence: energy conservation for both polarisations
    var worstS = 0, worstP = 0;
    for (var ia = 0; ia <= 88; ia += 2) {
      var fa = fresnelAngle(1.0, 1.5, ia * DEG);
      worstS = Math.max(worstS, Math.abs(fa.Rs + fa.Ts - 1));
      worstP = Math.max(worstP, Math.abs(fa.Rp + fa.Tp - 1));
    }
    add('oblique Fresnel: R_s + T_s = 1 (0..88 deg)', 'Fresnel', worstS, 0, 1e-12, '', 'TE energy conservation');
    add('oblique Fresnel: R_p + T_p = 1 (0..88 deg)', 'Fresnel', worstP, 0, 1e-12, '', 'TM energy conservation');
    var fa0 = fresnelAngle(1.0, 1.5, 0);   // theta -> 0 must reproduce the normal-incidence result
    add('oblique -> normal limit (TE)', 'Fresnel', Math.abs(fa0.Rs - fresnelNormal(1, 1.5).R), 0, 1e-15, '', 'theta_i -> 0');
    add('oblique -> normal limit (TM)', 'Fresnel', Math.abs(fa0.Rp - fresnelNormal(1, 1.5).R), 0, 1e-15, '');
    var thB = brewsterAngle(1, 1.5);
    add('Brewster angle: R_p = 0', 'Fresnel', fresnelAngle(1, 1.5, thB).Rp, 0, 1e-12, '', 'tan(theta_B) = n2/n1');
    add('Brewster angle value (air->glass)', 'Fresnel', thB / DEG, 56.309932, 1e-6, 'deg');
    var tirT = fresnelAngle(1.5, 1.0, 50 * DEG);
    add('total internal reflection beyond theta_c', 'Fresnel', tirT.Rs, 1, 0, '', 'theta_c = ' + (snellCritical(1.5, 1) / DEG).toFixed(2) + ' deg');
    var fan = acousticNormal(415, 830);
    add('acoustic R = optics R at Z2/Z1 = 2', 'Fresnel', fan.R, fresnelNormal(1, 2).R, 1e-12, '', 'same formula in Z');

    /* --- plane wave energy --- */
    var pw = planeWave(0.37, 1.1, 3.0, 2.0, 2.0 * C0);
    add('u_E = u_B pointwise', 'energy', pw.uE, pw.uB, 1e-12, 'J/m^3', 'equipartition for a plane wave');
    add('|S| = c u', 'energy', Math.abs(pw.S) / pw.u, C0, 1e-12, 'm/s');

    /* --- FDTD --- */
    var ex = fdtdReflectionExperiment({ n: 1200, epsr: 4, cfl: 0.5 });
    add('FDTD pulse speed / c', 'FDTD', ex.speed_num / C0, 1, 3e-3, '', 'Yee numerical dispersion below 0.1 %');
    add('FDTD reflected amplitude |r|', 'FDTD', ex.r_amp, ex.r_amp_th, 0.05, '', 'Fresnel |(n1-n2)/(n1+n2)| = 1/3');
    add('FDTD transmitted amplitude', 'FDTD', ex.t_amp, ex.t_amp_th, 0.05, '', '|t12 t21| = 4 n1 n2/(n1+n2)^2 = 8/9');
    add('FDTD reflectance R = |r|^2', 'FDTD', ex.R_num, ex.R_th, 0.08, '', 'energy reflectance 1/9');
    var exA = fdtdReflectionExperiment({ n: 600, epsr: 4, cfl: 0.5 });
    add('FDTD dispersion error is 2nd order', 'FDTD', Math.abs(exA.speed_relErr) / Math.abs(ex.speed_relErr), 4, 1.7, '', 'e(600)/e(1200), fixed physical pulse width');
    // CFL violation must blow up
    var bu = new FDTD({ n: 400, dx: 1 / 400, cfl: 1.2, iSrc: 40, source: function (t) { return Math.exp(-Math.pow((t - 1e-9) / 3e-10, 2)); } });
    bu.run(600);
    add('CFL: S=1.2 diverges (|E|>1e6)', 'FDTD', maxAbs(bu.Ey) > 1e6 ? 1 : 0, 1, 0, '', 'Yee scheme needs S<=1');
    var st = new FDTD({ n: 400, dx: 1 / 400, cfl: 1.0, iSrc: 40, source: function (t) { return Math.exp(-Math.pow((t - 1e-9) / 3e-10, 2)); } });
    st.run(600);
    add('CFL: S=1.0 stays bounded', 'FDTD', maxAbs(st.Ey) < 1e3 ? 1 : 0, 1, 0, '', 'marginal stability');

    /* --- acoustics --- */
    var cAir = soundSpeed(1.4, 293.15, 0.0289644);
    add('c_air(20 C)', 'acoustics', cAir, 343.2, 2e-3, 'm/s', 'sqrt(gamma R T/M)');
    add('c_air vs empirical fit', 'acoustics', cAir, soundSpeedAirEmpirical(20), 5e-3, 'm/s', '331.3+0.606 T');
    var cHe = soundSpeed(1.667, 293.15, 0.0040026);
    add('c_He / c_air', 'acoustics', cHe / cAir, Math.sqrt((1.667 / 1.4) * (0.0289644 / 0.0040026)), 1e-12, '', 'why helium makes your voice high');

    /* --- Sod shock tube --- */
    var sod = sodProblem(400, 0.2, 0.9, 1.4);
    var an = analyzeSod(sod);
    add('Sod p*', 'Euler/HLL', an.pStarL, SOD_REF.pStar, 0.05, '', 'Toro Table 4.1');
    add('Sod u*', 'Euler/HLL', an.uStarL, SOD_REF.uStar, 0.05, '');
    add('Sod rho* (left of contact)', 'Euler/HLL', an.rhoStarL, SOD_REF.rhoStarL, 0.05, '');
    add('Sod rho* (right of contact)', 'Euler/HLL', an.rhoStarR, SOD_REF.rhoStarR, 0.05, '');
    add('Sod shock speed', 'Euler/HLL', an.shockSpeed, SOD_REF.shockSpeed, 0.03, '', 'measured front vs Riemann solution');
    add('Sod positivity (rho>0, p>0)', 'Euler/HLL', (sod.minDensity() > 0 && sod.minPressure() > 0) ? 1 : 0, 1, 0, '', 'HLL is positivity preserving');
    var m0 = 1.0 * 0.5 + 0.125 * 0.5, E0 = (1.0 / 0.4) * 0.5 + (0.1 / 0.4) * 0.5;
    add('Sod mass conservation', 'Euler/HLL', sod.totalMass(), m0, 1e-12, '', 'finite-volume conservation');
    add('Sod energy conservation', 'Euler/HLL', sod.totalEnergy(), E0, 1e-12, '');
    // Momentum is NOT conserved here: the two ends push with different pressures,
    // so dP/dt = p_L - p_R = 1 - 0.1 and P(t) = 0.9 t exactly.
    add('Sod momentum balance P = (p_L-p_R) t', 'Euler/HLL', sod.totalMomentum(), 0.9 * sod.t, 1e-12, '', 'exact budget from the boundary fluxes');
    // Rankine-Hugoniot consistency from the measured states
    add('Shock speed from R-H jump conditions', 'Euler/HLL',
        shockSpeedRH(0.125, an.rhoStarR, an.uStarR), an.shockSpeed, 0.05, '', 'measured states fed back into the jump conditions');
    // grid convergence
    var e1 = analyzeSod(sodProblem(200, 0.2, 0.9, 1.4)).errRhoR;
    var e2 = analyzeSod(sodProblem(400, 0.2, 0.9, 1.4)).errRhoR;
    var e3 = analyzeSod(sodProblem(800, 0.2, 0.9, 1.4)).errRhoR;
    add('Sod error decreases under refinement', 'Euler/HLL', (e3 < e2 && e2 < e1) ? 1 : 0, 1, 0, '', 'e(200)=' + e1.toExponential(2) + ' e(400)=' + e2.toExponential(2) + ' e(800)=' + e3.toExponential(2));

    /* --- nonlinear steepening --- */
    var gamma = 1.4, c0 = 1, A = 0.05, k = 2 * Math.PI;
    var tb = simpleWaveBreakingTime(A, k, gamma, c0);
    var u0 = function (x) { return A * Math.sin(k * x); };
    // check numerically: earliest time any two neighbouring characteristics cross
    var tmin = Infinity, N = 4000;
    for (var i = 0; i < N; i++) {
      var xa = -1 + 2 * i / N, xb = -1 + 2 * (i + 1) / N;
      var la = c0 + 0.5 * (gamma + 1) * u0(xa), lb = c0 + 0.5 * (gamma + 1) * u0(xb);
      var tcross = (xb - xa) / (la - lb);
      if (tcross > 0 && tcross < tmin) tmin = tcross;
    }
    add('simple-wave breaking time', 'steepening', tb, tmin, 2e-3, '', 'analytic 2/((gamma+1) A k) vs first crossing of characteristics');

    /* --- point vortices --- */
    var dv = 0.6;                                   // separation
    var pv = new PointVortices([-dv / 2, dv / 2], [0, 0], [1, -1]);
    var H0 = pv.hamiltonian();
    var dtv = 0.002; for (var s2 = 0; s2 < 500; s2++) pv.stepRK4(dtv);
    add('vortex pair: Hamiltonian drift', 'vortices', (pv.hamiltonian() - H0) / Math.abs(H0), 0, 1e-8, '', 'RK4 conserves the exact invariant');
    add('vortex pair translation speed', 'vortices', Math.abs(pv.y[0]) / pv.t, 1 / (2 * Math.PI * dv), 1e-4, 'm/s', 'Gamma/(2 pi d), d = 0.6');
    add('vortex pair: separation preserved', 'vortices', Math.hypot(pv.x[0] - pv.x[1], pv.y[0] - pv.y[1]), dv, 1e-9, '', 'rigid translation');
    var same = new PointVortices([-0.5, 0.5], [0, 0], [1, 1]);
    var d0 = 1.0; for (var s3 = 0; s3 < 300; s3++) same.stepRK4(0.002);
    var d1 = Math.hypot(same.x[0] - same.x[1], same.y[0] - same.y[1]);
    add('co-rotating pair: separation preserved', 'vortices', d1, d0, 1e-9, '', 'exact invariant of 2-D Euler');

    /* --- Mach --- */
    add('Mach angle M=2', 'Mach', machAngle(2) / DEG, 30, 1e-12, 'deg');

    var ms = Date.now() - t0;
    return { checks: out, ms: ms, nPass: out.filter(function (c) { return c.pass; }).length, nTotal: out.length };
  }

  return {
    consts: { C0: C0, EPS0: EPS0, MU0: MU0, QE: QE, HPLANCK: HPLANCK, KB: KB, RGAS: RGAS, EV: EV },
    cFromConstants: cFromConstants, eta0: eta0, GASES: GASES, SOD_REF: SOD_REF,
    linspace: linspace, maxOf: maxOf, minOf: minOf, maxAbs: maxAbs, argmaxAbs: argmaxAbs,
    meanRange: meanRange, trapz: trapz, refinePeak: refinePeak, DEG: DEG,
    fresnelNormal: fresnelNormal, fresnelAngle: fresnelAngle, brewster: brewster, brewsterAngle: brewsterAngle,
    acousticNormal: acousticNormal, snellCritical: snellCritical,
    planeWave: planeWave, gaussFluxPointCharge: gaussFluxPointCharge, superEllipsoidPoint: superEllipsoidPoint,
    dipoleB: dipoleB, dipoleFluxSphere: dipoleFluxSphere, dipoleFluxSuperellipsoid: dipoleFluxSuperellipsoid,
    faradayLoop: faradayLoop, FDTD: FDTD, fdtdReflectionExperiment: fdtdReflectionExperiment,
    soundSpeed: soundSpeed, soundSpeedAirEmpirical: soundSpeedAirEmpirical, acousticImpedance: acousticImpedance,
    Euler1D: Euler1D, hllFlux: hllFlux, sodProblem: sodProblem, analyzeSod: analyzeSod, shockSpeedRH: shockSpeedRH,
    simpleWaveBreakingTime: simpleWaveBreakingTime, characteristicX: characteristicX, simpleWaveU: simpleWaveU,
    PointVortices: PointVortices, machAngle: machAngle, dopplerFactor: dopplerFactor,
    runChecks: runChecks
  };
});
