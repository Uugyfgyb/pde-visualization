/* =========================================================================
   app_selftest.js — runs the numerical suite in the browser, renders the
   verification table, and writes a machine-readable diagnostics blob into
   <pre id="diag"> so that tests/page_check.js can inspect the live page.
   ========================================================================= */
(function () {
'use strict';
var A = window.APP, PH = A.PH, D = A.DIAG;

function inkStats() {
  var out = {};
  Array.prototype.forEach.call(document.querySelectorAll('.cvwrap canvas'), function (cv, i) {
    try {
      var ctx = cv.getContext('2d');
      var w = cv.width, h = cv.height;
      if (!w || !h) { out['#' + i] = { err: 'zero-size' }; return; }
      var d = ctx.getImageData(0, 0, w, h).data;
      var ink = 0, tot = 0, colors = 0;
      for (var k = 0; k < d.length; k += 4 * 37) {
        tot++;
        var r = d[k], g = d[k + 1], b = d[k + 2];
        if (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b) > 14 || r + g + b > 90) ink++;
      }
      out['#' + i] = { w: w, h: h, inkFrac: +(ink / Math.max(1, tot)).toFixed(4) };
    } catch (e) { out['#' + i] = { err: String(e.message) }; }
  });
  return out;
}

function renderReport(res) {
  var host = document.getElementById('verify-table');
  if (!host) return;
  var groups = {}, order = [];
  res.checks.forEach(function (c) { if (!groups[c.group]) { groups[c.group] = []; order.push(c.group); } groups[c.group].push(c); });
  var html = '<p class="small">由浏览器<b>现场运行</b>的数值检验（与 <code>tests/check.js</code> 共用同一份 <code>physics.js</code>）。' +
    '共 <b>' + res.nTotal + '</b> 项，通过 <b class="pass">' + res.nPass + '</b> 项，耗时 ' + res.ms + ' ms。</p>';
  html += '<table class="data small"><tr><th>组</th><th>检验项</th><th>数值结果</th><th>参考值</th><th>相对误差</th><th>容差</th><th>判定</th></tr>';
  order.forEach(function (g) {
    groups[g].forEach(function (c, i) {
      html += '<tr>' + (i === 0 ? '<td rowspan="' + groups[g].length + '"><b>' + g + '</b></td>' : '') +
        '<td>' + c.name + (c.note ? '<br><span class="dim" style="font-size:11.5px">' + c.note + '</span>' : '') + '</td>' +
        '<td class="num">' + num(c.value) + '</td>' +
        '<td class="num">' + num(c.expected) + '</td>' +
        '<td class="num">' + c.rel.toExponential(2) + '</td>' +
        '<td class="num">' + c.tol.toExponential(1) + '</td>' +
        '<td class="' + (c.pass ? 'pass' : 'fail') + '">' + (c.pass ? '通过' : '未通过') + '</td></tr>';
    });
  });
  html += '</table>';
  host.innerHTML = html;
}
function num(v) {
  if (!isFinite(v)) return String(v);
  var a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(4);
  return v.toPrecision(7);
}

function runSuite() {
  try {
    var res = PH.runChecks();
    renderReport(res);
    D.suite = { nPass: res.nPass, nTotal: res.nTotal, ms: res.ms, failed: res.checks.filter(function (c) { return !c.pass; }).map(function (c) { return c.name; }) };
  } catch (e) { D.errors.push('suite: ' + e.message); }
}

function finish() {
  D.mjx = document.querySelectorAll('mjx-container').length;
  D.merror = document.querySelectorAll('merror').length;
  D.merrorText = Array.prototype.map.call(document.querySelectorAll('merror'), function (m) {
    var host = m.closest ? m.closest('.readout,.ctrls,.wfoot,.widget') : null;
    return { err: (m.textContent || '').slice(0, 60),
             where: host ? (host.textContent || '').replace(/s+/g, ' ').slice(0, 110) : '?' };
  });
  D.redUndef = document.querySelectorAll('[mathcolor="red"],[data-mjx-error]').length;
  D.redText = Array.prototype.map.call(document.querySelectorAll('[mathcolor="red"],[data-mjx-error]'), function (el) {
    var host = el.closest ? el.closest('p,td,li,div,figcaption') : null;
    return { sym: (el.textContent || '').slice(0, 30), ctx: host ? (host.textContent || '').replace(/s+/g, ' ').slice(0, 95) : '?' };
  });
  D.equations = document.querySelectorAll('mjx-container[display="true"]').length;
  D.canvases = inkStats();
  D.sections = document.querySelectorAll('h2[id]').length;
  D.verifyRows = document.querySelectorAll('#verify-table tr').length;
  D.verifyFailed = document.querySelectorAll('#verify-table td.fail').length;
  D.proseBig = document.querySelectorAll('h2,h3,p,li,td').length;
  /* layout map: lets the harness (and any reader) verify that every widget
     really got laid out and drew something */
  D.pageHeight = document.documentElement.scrollHeight;
  D.layout = Array.prototype.map.call(document.querySelectorAll('.widget'), function (w) {
    var r = w.getBoundingClientRect(), cv = w.querySelector('canvas');
    return { name: w.getAttribute('data-widget'), top: Math.round(r.top + window.scrollY), h: Math.round(r.height),
             cw: cv ? cv.width : 0, ch: cv ? cv.height : 0 };
  });
  D.sectionTops = Array.prototype.map.call(document.querySelectorAll('h2[id]'), function (h) {
    return { id: h.id, top: Math.round(h.getBoundingClientRect().top + window.scrollY) };
  });
  D.ready = true;
  var el = document.getElementById('diag');
  if (el) el.textContent = JSON.stringify(D);
}

var DONE = false;
function safeFinish() { if (DONE) return; DONE = true; runSuite(); finish(); }

function boot() {
  var mj = window.MathJax;
  /* the harness must always get a diagnostics blob, whatever MathJax does */
  setTimeout(safeFinish, 11000);
  var wait = (mj && mj.startup && mj.startup.promise) ? mj.startup.promise : Promise.resolve();
  wait.then(function () { return window.__TYPESET2 || null; })
    .then(function () { setTimeout(safeFinish, 1000); })
    ['catch'](function (e) {
      D.errors.push('mathjax: ' + (e && e.message ? e.message : e));
      setTimeout(safeFinish, 400);
    });
  var b = document.getElementById('rerun');
  if (b) b.addEventListener('click', runSuite);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
