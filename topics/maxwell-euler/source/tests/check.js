/* tests/check.js — runs the SAME numerical suite the page displays.
   Usage:  node tests/check.js [--json]
   Writes tests/report.json and exits non-zero if any check fails.  */
'use strict';
const path = require('path');
const fs = require('fs');
const PHYS = require(path.join(__dirname, '..', 'physics.js'));

const t0 = Date.now();
const res = PHYS.runChecks();
const wall = Date.now() - t0;

const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
const num = (v) => {
  if (!isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(4);
  return v.toPrecision(7);
};

if (!process.argv.includes('--json')) {
  let group = '';
  for (const c of res.checks) {
    if (c.group !== group) { group = c.group; console.log('\n== ' + group + ' =='); }
    console.log(
      (c.pass ? ' PASS ' : ' FAIL ') + pad(c.name, 46) +
      ' got ' + padl(num(c.value), 14) +
      '  want ' + padl(num(c.expected), 14) +
      '  rel ' + padl(c.rel.toExponential(2), 9) +
      '  tol ' + c.tol.toExponential(1) +
      (c.unit ? '  [' + c.unit + ']' : '') +
      (c.note ? '   # ' + c.note : '')
    );
  }
}

const failed = res.checks.filter(c => !c.pass);
console.log('\n' + res.nPass + '/' + res.nTotal + ' checks passed in ' + wall + ' ms');
if (failed.length) {
  console.log('\nFAILED:');
  for (const f of failed) console.log('  - ' + f.name + '  got ' + num(f.value) + ' want ' + num(f.expected) + ' (rel ' + f.rel.toExponential(3) + ' > tol ' + f.tol + ')');
}

const report = {
  generatedAt: new Date().toISOString(),
  wallMs: wall,
  nPass: res.nPass, nTotal: res.nTotal,
  allPass: failed.length === 0,
  node: process.version,
  checks: res.checks
};
fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 2));
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
