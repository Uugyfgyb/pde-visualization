/* =========================================================================
   app_core.js — widget framework, canvas helpers, formatting, diagnostics.
   Every physics number displayed on the page comes from PHYS (physics.js),
   which is the same module the Node test suite exercises.
   ========================================================================= */
(function () {
'use strict';

var PH = window.PHYS;
var WIDGETS = {};
var READY = [];

/* ---------- diagnostics (read by tests/page_check.js via --dump-dom) --- */
var DIAG = window.__DIAG = { errors: [], widgets: [], canvases: {}, merror: 0, mjx: 0, ready: false, notes: [] };
window.addEventListener('error', function (e) {
  DIAG.errors.push(String(e.message) + ' @' + (e.filename || '?') + ':' + (e.lineno || 0));
});
window.addEventListener('unhandledrejection', function (e) { DIAG.errors.push('promise: ' + e.reason); });

/* ---------------------------- colors ---------------------------------- */
var C = {
  E: '#ffb454', E2: '#ffd9a0', B: '#4fc3f7', B2: '#b3e5fc', S: '#7ee787',
  rho: '#ff7b72', p: '#c792ea', u: '#56d4dd', T: '#ffd166',
  accent: '#7aa2f7', grid: '#1b2942', grid2: '#243553', text: '#dbe4f0', dim: '#93a6c0', dim2: '#5d7291'
};
function rgba(hex, a) {
  var h = hex.replace('#', '');
  var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

/* --------------------------- formatting ------------------------------- */
var SUP = { '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207b' };
function sup(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }
function sci(x, d) {
  if (!isFinite(x)) return '\u2014';
  if (x === 0) return '0';
  d = (d === undefined) ? 2 : d;
  var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
  if (Math.abs(m) >= 10) { m /= 10; e++; }
  if (Math.abs(m) < 1) { m *= 10; e--; }
  return m.toFixed(d) + '\u00d710' + sup(e);
}
function fx(x, d) { d = (d === undefined) ? 3 : d; if (!isFinite(x)) return '\u2014'; return (Math.abs(x) < 1e-4 && x !== 0) ? sci(x, d) : x.toFixed(d); }
function fg(x, d) { d = (d === undefined) ? 4 : d; if (!isFinite(x)) return '\u2014'; if (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e5)) return sci(x, 2); return x.toPrecision(d); }
var SI_PRE = [[1e24, 'Y'], [1e21, 'Z'], [1e18, 'E'], [1e15, 'P'], [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, '\u00b5'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'], [1e-18, 'a']];
function siPrefix(x, unit, d) {
  if (!isFinite(x) || x === 0) return '0 ' + (unit || '');
  var a = Math.abs(x);
  for (var i = 0; i < SI_PRE.length; i++) if (a >= SI_PRE[i][0]) return (x / SI_PRE[i][0]).toPrecision(d || 3) + ' ' + SI_PRE[i][1] + (unit || '');
  return sci(x, 2) + ' ' + (unit || '');
}
function deg(x) { return x / Math.PI * 180; }
function rad(x) { return x * Math.PI / 180; }

/* ------------------------- widget registry ---------------------------- */
function defWidget(name, setup) { WIDGETS[name] = setup; }
function onReady(fn) { READY.push(fn); }

/* --------------------------- controls --------------------------------- */
function mkControls(root) {
  var host = root.querySelector('.ctrls');
  var api = { host: host };
  api.slider = function (o) {
    var d = document.createElement('label'); d.className = 'ctrl';
    var lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = plain(o.label);
    var inp = document.createElement('input'); inp.type = 'range';
    inp.min = o.min; inp.max = o.max; inp.step = o.step === undefined ? 0.01 : o.step; inp.value = o.value;
    if (o.cls) inp.className = o.cls;
    var val = document.createElement('span'); val.className = 'val';
    var shown = function () { return o.fmt ? o.fmt(parseFloat(inp.value)) : String(parseFloat(inp.value)); };
    val.textContent = shown();
    inp.addEventListener('input', function () { val.textContent = shown(); o.oninput(parseFloat(inp.value)); });
    d.appendChild(lab); d.appendChild(inp); d.appendChild(val); host.appendChild(d);
    return { el: inp, value: function () { return parseFloat(inp.value); }, set: function (v) { inp.value = v; val.textContent = shown(); }, label: val };
  };
  api.seg = function (o) {
    var d = document.createElement('div'); d.className = 'ctrl';
    if (o.label) { var lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = plain(o.label); d.appendChild(lab); }
    var box = document.createElement('div'); box.className = 'seg';
    var btns = [];
    o.options.forEach(function (op) {
      var b = document.createElement('button'); b.textContent = plain(op.label); if (op.title) b.title = op.title;
      b.className = (op.value === o.value) ? 'on' : '';
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.className = ''; }); b.className = 'on';
        o.onchange(op.value);
      });
      btns.push(b); box.appendChild(b);
    });
    d.appendChild(box); host.appendChild(d);
    return { set: function (v) { btns.forEach(function (b, i) { b.className = (o.options[i].value === v) ? 'on' : ''; }); } };
  };
  api.button = function (o) {
    var b = document.createElement('button'); b.className = 'btn' + (o.cls ? ' ' + o.cls : ''); b.innerHTML = o.label;
    b.addEventListener('click', o.onclick);
    var w = document.createElement('div'); w.className = 'ctrl'; w.appendChild(b); host.appendChild(w);
    return b;
  };
  api.note = function (html) {
    var s = document.createElement('span'); s.className = 'ctrl'; s.style.color = 'var(--dim2)'; s.textContent = plain(html);
    host.appendChild(s); return s;
  };
  return api;
}

/* ---------------------------- readouts -------------------------------- */
function mkReadout(root) {
  var host = root.querySelector('.readout'); var map = {};
  var api = {};
  api.add = function (key, label, cls) {
    var w = document.createElement('span'); w.className = 'kv';
    var k = document.createElement('span'); k.className = 'k'; k.textContent = plain(label);
    var v = document.createElement('span'); v.className = 'v' + (cls ? ' ' + cls : ''); v.textContent = '\u2026';
    w.appendChild(k); w.appendChild(v); host.appendChild(w); map[key] = v; return v;
  };
  api.set = function (key, txt, cls) {
    var v = map[key]; if (!v) return;
    v.textContent = txt;
    if (cls !== undefined) v.className = 'v' + (cls ? ' ' + cls : '');
  };
  api.host = host;
  return api;
}

/* ------------------------ canvas surface ------------------------------ */
function surface(root) {
  var cvwrap = root.querySelector('.cvwrap');
  var canvas = cvwrap.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var o = { canvas: canvas, ctx: ctx, W: 10, H: 10, dpr: 1, visible: true, raf: null, want: false };

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cvwrap.clientWidth, h = cvwrap.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.W = w; o.H = h; o.dpr = dpr;
    if (o.onresize) o.onresize();
    if (o.render) o.render(0, 0);
  }
  o.resize = resize;

  var frame = null;
  o.animate = function (step) {
    var last = null;
    frame = function (ts) {
      if (!o.visible) { o.raf = null; return; }
      if (last === null) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      step(dt, ts / 1000); o.stepCount = (o.stepCount || 0) + 1;
      o.raf = requestAnimationFrame(frame);
    };
    o.want = true;
    if (o.visible && o.raf === null) o.raf = requestAnimationFrame(frame);
  };
  o.pause = function () { o.want = false; if (o.raf !== null) { cancelAnimationFrame(o.raf); o.raf = null; } };
  o.resume = function () { o.want = true; if (o.visible && o.raf === null && frame) o.raf = requestAnimationFrame(frame); };

  if (window.ResizeObserver) new ResizeObserver(resize).observe(cvwrap);
  window.addEventListener('resize', resize);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      o.visible = es[0].isIntersecting;
      if (o.visible && o.want && o.raf === null && frame) o.raf = requestAnimationFrame(frame);
    }, { threshold: 0.01 }).observe(cvwrap);
  }
  o.onDraw = function (fn) { o.render = fn; };
  o.redraw = function () { if (o.render) o.render(0, 0); };
  o.clear = function (bg) {
    ctx.clearRect(0, 0, o.W, o.H);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, o.W, o.H); }
  };
  resize();
  return o;
}

/* --------------------------- drawing ---------------------------------- */
function arrow(ctx, x0, y0, x1, y1, o) {
  o = o || {};
  var w = o.width || 1.4, col = o.color || C.text;
  var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 0.4) return;
  var hs = Math.min(o.head || 7, L * 0.5);
  var ux = dx / L, uy = dy / L;
  var bx = x1 - ux * hs, by = y1 - uy * hs;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(bx, by); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx - uy * hs * 0.42, by + ux * hs * 0.42);
  ctx.lineTo(bx + uy * hs * 0.42, by - ux * hs * 0.42);
  ctx.closePath(); ctx.fill();
}
function line(ctx, x0, y0, x1, y1, col, w, dash) {
  ctx.save(); ctx.strokeStyle = col || C.grid; ctx.lineWidth = w || 1;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
}
function curve(ctx, pts, col, w, dash, fill) {
  if (pts.length < 2) return;
  ctx.save(); ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (fill) { ctx.lineTo(pts[pts.length - 1][0], fill.y); ctx.lineTo(pts[0][0], fill.y); ctx.closePath(); ctx.fillStyle = fill.color; ctx.fill(); }
  else { ctx.strokeStyle = col; ctx.lineWidth = w || 1.6; if (dash) ctx.setLineDash(dash); ctx.stroke(); }
  ctx.restore();
}
/* Canvas fillText cannot typeset TeX.  Labels are written with the same
   $...$ notation as the prose, so they are converted to Unicode here:
   greek letters, operators, simple sub/superscripts, \frac and \sqrt. */
var GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ', delta: 'δ', Delta: 'Δ',
  eps: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', Theta: 'Θ', kappa: 'κ',
  lambda: 'λ', Lambda: 'Λ', mu: 'μ', nu: 'ν', xi: 'ξ', Xi: 'Ξ', pi: 'π', Pi: 'Π',
  rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', varphi: 'φ', Phi: 'Φ',
  chi: 'χ', psi: 'ψ', Psi: 'Ψ', omega: 'ω', Omega: 'Ω', vv: '', mathbf: '', hat: '', bar: '' };
var OPS = { partial: '∂', nabla: '∇', cdot: '·', times: '×', to: '→', rightarrow: '→',
  Rightarrow: '⇒', neq: '≠', pm: '±', mp: '∓', sqrt: '√', infty: '∞', approx: '≈',
  leq: '≤', geq: '≥', ldots: '…', cdots: '⋯', quad: ' ', qquad: '  ', left: '', right: '',
  langle: '⟨', rangle: '⟩', epsilon: 'ε', circ: '∘',
  oint: '∮', iint: '∬', int: '∫', sum: 'Σ', prod: '∏', angle: '∠', perp: '⊥', parallel: '∥',
  equiv: '≡', propto: '∝', simeq: '≃', ll: '≪', gg: '≫', aa: 'å', therefore: '∴', in: '∈', subset: '⊂' };
var SUBM = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
  '7': '₇', '8': '₈', '9': '₉', x: 'ₓ', t: 'ₜ', n: 'ₙ', r: 'ᵣ', s: 'ₛ',
  p: 'ₚ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', m: 'ₘ', e: 'ₑ', h: 'ₕ', o: 'ₒ', u: 'ᵤ', v: 'ᵥ' };
var SUPM = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶',
  '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', p: 'ᵖ', n: 'ⁿ', '*': '*', '′': '′' };
function mapRun(s, map) {
  var out = '', ok = true;
  for (var i = 0; i < s.length; i++) { var m = map[s[i]]; if (m === undefined) { ok = false; out += s[i]; } else out += m; }
  return ok ? out : null;
}
function plain(s) {
  if (s.indexOf('$') < 0 && s.indexOf('\\') < 0) return s;
  s = String(s);
  s = s.replace(/\\[,.!;: ]/g, '');                                          /* thin spaces */
  s = s.replace(/\\(?:hat|widehat)\{([^{}]*)\}/g, '$1\u0302');
  s = s.replace(/\\(?:bar|overline)\{([^{}]*)\}/g, '$1\u0304');
  s = s.replace(/\\(?:vec|vv)\{([^{}]*)\}/g, '$1\u20d7');
  s = s.replace(/\\(?:dot|ddot|tilde|mathcal|mathbb|mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\(?:d?frac|tfrac)\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '\u221a($1)');
  s = s.replace(/\\([A-Za-z]+)/g, function (m, name) {
    if (GREEK[name] !== undefined) return GREEK[name];
    if (OPS[name] !== undefined) return OPS[name];
    return name;                                        /* \max -> max, \sin -> sin */
  });
  s = s.replace(/\$/g, '');
  s = s.replace(/_\{([^{}]*)\}|_(\w)/g, function (m, a, b) { var c = (a !== undefined ? a : b); return mapRun(c, SUBM) || ('_' + c); });
  s = s.replace(/\^\{([^{}]*)\}|\^(\w)/g, function (m, a, b) { var c = (a !== undefined ? a : b); return mapRun(c, SUPM) || ('^' + c); });
  return s.replace(/[{}]/g, '').replace(/\s{2,}/g, ' ');
}
function text(ctx, s, x, y, o) {
  o = o || {};
  s = plain(s);
  ctx.save();
  ctx.fillStyle = o.color || C.dim; ctx.font = (o.font || (o.size || 11.5) + 'px "Segoe UI","Microsoft YaHei",sans-serif');
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'alphabetic';
  if (o.bg) { var m = ctx.measureText(s); var w = m.width + 8, h = (o.size || 11.5) + 6;
    var x0 = o.align === 'center' ? x - w / 2 : (o.align === 'right' ? x - w : x);
    var y0 = o.baseline === 'middle' ? y - h / 2 : (o.baseline === 'top' ? y : y - h + 4);
    ctx.fillStyle = o.bg; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = o.color || C.dim; }
  ctx.fillText(s, x, y); ctx.restore();
}
function dot(ctx, x, y, r, col, ring) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
  ctx.fillStyle = col; ctx.fill();
  if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 1.5; ctx.stroke(); }
}
/* linear map helper: data -> screen */
function mapper(d0, d1, s0, s1) { return function (v) { return s0 + (v - d0) / (d1 - d0) * (s1 - s0); }; }
function gridPlot(ctx, box, o) {
  o = o || {};
  ctx.save();
  if (o.bg !== false) { ctx.fillStyle = 'rgba(8,14,24,.55)'; ctx.fillRect(box.x, box.y, box.w, box.h); }
  ctx.strokeStyle = o.frame || C.grid2; ctx.lineWidth = 1; ctx.strokeRect(box.x, box.y, box.w, box.h);
  var nx = o.nx === undefined ? 6 : o.nx, ny = o.ny === undefined ? 4 : o.ny, i;
  ctx.strokeStyle = o.grid || C.grid; ctx.lineWidth = 1;
  for (i = 1; i < nx; i++) line(ctx, box.x + box.w * i / nx, box.y, box.x + box.w * i / nx, box.y + box.h, o.grid || C.grid, 1);
  for (i = 1; i < ny; i++) line(ctx, box.x, box.y + box.h * i / ny, box.x + box.w, box.y + box.h * i / ny, o.grid || C.grid, 1);
  ctx.restore();
}

/* ------------------------ live value slots ---------------------------- */
var LIVE = {};
function defLive(key, fn) { LIVE[key] = fn; }
function fillLive() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-live]'), function (el) {
    var k = el.getAttribute('data-live');
    if (LIVE[k]) { try { el.textContent = LIVE[k](); } catch (e) { DIAG.errors.push('live ' + k + ': ' + e.message); } }
  });
}

/* ------------------------------ boot ---------------------------------- */
function boot() {
  if (!PH) { DIAG.errors.push('PHYS missing'); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-widget]'), function (el) {
    var name = el.getAttribute('data-widget');
    var fn = WIDGETS[name];
    DIAG.widgets.push(name);
    if (!fn) { DIAG.errors.push('no widget: ' + name); return; }
    try { fn(el); } catch (e) { DIAG.errors.push('widget ' + name + ': ' + e.message); }
  });
  fillLive();
  for (var i = 0; i < READY.length; i++) { try { READY[i](); } catch (e) { DIAG.errors.push('ready: ' + e.message); } }

  /* Widget labels are inserted after the page has been typeset once, so a
     second pass is needed for them.  tests/page_check.js waits for it. */
  window.__TYPESET2 = (window.MathJax && MathJax.startup && MathJax.startup.promise)
    ? MathJax.startup.promise : Promise.resolve();
  DIAG.typeset2 = 'labels are rendered locally (see plain())';

  /* table of contents highlight */
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.toc a'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function hl() {
    var best = -1, bestY = 1e9;
    targets.forEach(function (t, i) { if (!t) return; var r = t.getBoundingClientRect(); if (r.top - 90 <= 0 && Math.abs(r.top - 90) < bestY) { bestY = Math.abs(r.top - 90); best = i; } });
    if (best >= 0) { links.forEach(function (a) { a.classList.remove('on'); }); links[best].classList.add('on'); }
  }
  window.addEventListener('scroll', hl, { passive: true });
  hl();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

/* ------------------------------ export -------------------------------- */
window.APP = {
  defWidget: defWidget, onReady: onReady, defLive: defLive, PH: PH,
  C: C, rgba: rgba, sup: sup, sci: sci, fx: fx, fg: fg, siPrefix: siPrefix, deg: deg, rad: rad,
  mkControls: mkControls, mkReadout: mkReadout, surface: surface,
  arrow: arrow, line: line, curve: curve, text: text, dot: dot, mapper: mapper, gridPlot: gridPlot, plain: plain,
  DIAG: DIAG, WIDGETS: WIDGETS
};
})();
