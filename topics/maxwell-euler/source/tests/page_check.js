/* tests/page_check.js — renders the page in headless Edge/Chrome and
   inspects the LIVE DOM: MathJax errors, widget count, canvas ink, JS errors.
   Usage: node tests/page_check.js [file]                                  */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
const browser = BROWSERS.find(p => fs.existsSync(p));
if (!browser) { console.error('no browser found'); process.exit(2); }

const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
const url = 'file:///' + file.replace(/\\/g, '/').replace(/^\//, '');
const budget = process.argv[3] || '30000';

/* A fresh --user-data-dir per launch: otherwise a second headless Chrome
   attaches to the still-shutting-down first instance and silently drops the
   --screenshot / --dump-dom request. */
function freshProfile() {
  const d = path.join(__dirname, '.chrome-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const COMMON = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files'];

/* --dump-dom cannot handle the 2.3 MB single-file build; use
   tests/standalone_check.js for that artefact instead. */
const sizeMB = fs.statSync(file).size / 1048576;
if (sizeMB > 1.2) {
  console.log(file + ' is ' + sizeMB.toFixed(1) + ' MB - use tests/standalone_check.js for the single-file build');
  process.exit(0);
}

let dom = '';
try {
  dom = execFileSync(browser, COMMON.concat([
    '--user-data-dir=' + freshProfile(), '--virtual-time-budget=' + budget,
    '--window-size=1500,1000', '--dump-dom', url
  ]), { maxBuffer: 1024 * 1024 * 200, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.error('browser failed: ' + e.message);
  process.exit(2);
}

const out = { file: path.basename(file), bytes: dom.length };
out.mjx = (dom.match(/<mjx-container/g) || []).length;
out.merror = (dom.match(/<merror/g) || []).length;
out.widgets = (dom.match(/data-widget="/g) || []).length;
out.errEls = (dom.match(/class="[^"]*\bmerror\b/g) || []).length;

const m = dom.match(/<pre id="diag"[^>]*>([\s\S]*?)<\/pre>/);
if (m) {
  try { out.diag = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); }
  catch (e) { out.diagParseError = e.message; out.diagRaw = m[1].slice(0, 600); }
} else { out.diag = null; }

const problems = [];
if (!out.diag) problems.push('no diagnostics blob found (script did not finish?)');
else {
  if (!out.diag.ready) problems.push('diagnostics not marked ready');
  if (out.diag.errors && out.diag.errors.length) out.diag.errors.forEach(e => problems.push('page JS: ' + e));
  if (out.diag.merror) problems.push('MathJax produced ' + out.diag.merror + ' <merror> (bad TeX)');
  if (!out.diag.mjx) problems.push('MathJax rendered 0 equations (typesetting aborted?)');
  if (out.diag.widgets.length !== out.widgets) problems.push('widget count mismatch: ' + out.diag.widgets.length + ' vs ' + out.widgets);
  if (out.diag.suite && out.diag.suite.nPass !== out.diag.suite.nTotal) problems.push('in-page suite failed: ' + JSON.stringify(out.diag.suite.failed));
  if ((out.diag.verifyRows || 0) < 45) problems.push('verification table incomplete: ' + out.diag.verifyRows + ' rows');
  if (out.diag.verifyFailed) problems.push(out.diag.verifyFailed + ' verification rows show FAIL');
  if ((out.diag.sections || 0) < 20) problems.push('only ' + out.diag.sections + ' sections rendered');
  const cv = out.diag.canvases || {};
  Object.keys(cv).forEach(k => {
    if (cv[k].err) problems.push('canvas ' + k + ': ' + cv[k].err);
    else if (cv[k].inkFrac < 0.004) problems.push('canvas ' + k + ' looks blank (ink ' + cv[k].inkFrac + ')');
  });
}
out.problems = problems;
fs.writeFileSync(path.join(__dirname, 'page_report.json'), JSON.stringify(out, null, 1));
const d = out.diag || {};
console.log('page height ' + (d.pageHeight || '?') + ' px; mjx ' + out.mjx + '; merror ' + out.merror + '; widgets ' + out.widgets);
if (d.suite) console.log('in-page suite ' + d.suite.nPass + '/' + d.suite.nTotal);
console.log('verification table rows ' + (d.verifyRows || 0) + ' (failed cells: ' + (d.verifyFailed || 0) + '); prose blocks ' + (d.proseBig || 0) + '; sections ' + (d.sections || 0));
if (d.redUndef) { console.log('undefined-macro renderings (red): ' + d.redUndef); (d.redText || []).forEach(r => console.log('   "' + r.sym + '"  in: ' + r.ctx)); }
if (d.merrorText && d.merrorText.length) d.merrorText.forEach(m => console.log('  MERROR "' + m.err + '"  in: ' + m.where));
if (d.layout) d.layout.forEach(w => console.log('  ' + w.name.padEnd(16) + ' top=' + String(w.top).padStart(6) + '  h=' + String(w.h).padStart(4) + '  canvas=' + w.cw + 'x' + w.ch));
console.log(JSON.stringify(out.problems));
console.log(problems.length ? '\nPAGE CHECK: ' + problems.length + ' problem(s)' : '\nPAGE CHECK: OK');
process.exit(problems.length ? 1 : 0);
