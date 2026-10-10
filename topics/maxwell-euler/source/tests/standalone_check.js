/* tests/standalone_check.js — structural verification of the single-file build.
   --dump-dom cannot handle a 2.3 MB inline bundle, so instead of a browser we
   check the artefact itself: every script block must be closed, the physics
   kernel and all widget implementations must be present, and the inlined
   MathJax payload must not contain a sequence that would end the script early.
   Usage: node tests/standalone_check.js                                   */
'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const problems = [];

const opens = (html.match(/<script\b/g) || []).length;
const closes = (html.match(/<\/script>/g) || []).length;
if (opens !== closes) problems.push('script tags unbalanced: ' + opens + ' open / ' + closes + ' closed');

const need = [
  ['MathJax config', 'window.MathJax'],
  ['MathJax bundle', 'MathJax'],
  ['physics kernel', 'root.PHYS = api'],
  ['gauss quadrature', 'gaussFluxPointCharge'],
  ['Yee solver', 'FDTD.prototype.step'],
  ['HLL flux', 'function hllFlux'],
  ['point vortices', 'PointVortices.prototype.stepRK4'],
  ['self-test suite', 'function runChecks'],
  ['widget framework', 'defWidget'],
  ['app script', 'window.APP'],
  ['verification table host', 'id="verify-table"'],
  ['diagnostics host', 'id="diag"']
];
for (const [what, s] of need) if (html.indexOf(s) < 0) problems.push('missing ' + what + ' (' + s + ')');

const widgets = [...html.matchAll(/data-widget="([^"]+)"/g)].map(m => m[1]);
if (widgets.length !== 17) problems.push('expected 17 widgets, found ' + widgets.length);

/* inside the inlined bundle, "</script" must never appear raw */
const body = html.slice(html.indexOf('<script id="MathJax-script">'));
const payload = body.slice(0, body.indexOf('</script>'));
if (/<\/script/i.test(payload)) problems.push('inlined MathJax payload contains a raw </script sequence');

const kb = (fs.statSync(file).size / 1024).toFixed(0);
console.log('../index.html ' + kb + ' KB; script blocks ' + opens + '; widgets ' + widgets.length);
console.log(problems.length ? problems.map(p => '  ! ' + p).join('\n') : '  all structural checks passed');
process.exit(problems.length ? 1 : 0);
