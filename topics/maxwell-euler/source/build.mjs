/* build.mjs — assembles src/* into source/index.html and ../index.html with MathJax inlined.
   Run:  node build.mjs
   Also validates the content: balanced math delimiters, every data-widget has an
   implementation, every in-page link resolves to a real id.  */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const rd = (p) => readFileSync(join(root, p), 'utf8');
const R = (p) => join(root, p);

const BODY_FILES = [
  'src/00_head.html',
  'src/10_overview.html',
  'src/11_maxwell_eqs.html',
  'src/12_maxwell_displacement.html',
  'src/13_maxwell_waves.html',
  'src/14_maxwell_matter.html',
  'src/20_euler_eqs.html',
  'src/21_euler_vorticity.html',
  'src/22_acoustics.html',
  'src/23_nonlinear.html',
  'src/30_synthesis.html',
  'src/99_close.html',
];
const JS_FILES = ['src/app_core.js', 'src/app_maxwell.js', 'src/app_waves.js', 'src/app_euler.js', 'src/app_selftest.js'];

const css = rd('src/style.css');
const body = BODY_FILES.map(f => '<!-- ======== ' + f + ' ======== -->\n' + rd(f)).join('\n');
const js = JS_FILES.map(f => '/* ======== ' + f + ' ======== */\n' + rd(f)).join('\n');

/* ------------------------- validation ------------------------- */
const problems = [];
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
                     .replace(/<!--[\s\S]*?-->/g, '')
                     .replace(/<code[\s\S]*?<\/code>/gi, '').replace(/<pre[\s\S]*?<\/pre>/gi, '');
const clean = strip(body);

const nDisp = (clean.match(/\$\$/g) || []).length;
if (nDisp % 2) problems.push('unbalanced $$ display delimiters: ' + nDisp);
const nInline = (clean.replace(/\$\$/g, '').match(/\$/g) || []).length;
if (nInline % 2) problems.push('unbalanced $ inline delimiters: ' + nInline);

const usedWidgets = [...body.matchAll(/data-widget="([^"]+)"/g)].map(m => m[1]);
const implWidgets = [...js.matchAll(/defWidget\(\s*'([^']+)'/g)].map(m => m[1]);
for (const w of usedWidgets) if (!implWidgets.includes(w)) problems.push('widget "' + w + '" has no defWidget implementation');
for (const w of implWidgets) if (!usedWidgets.includes(w)) problems.push('defWidget("' + w + '") is never used in the page');
const dupW = usedWidgets.filter((w, i) => usedWidgets.indexOf(w) !== i);
if (dupW.length) problems.push('duplicate data-widget names: ' + [...new Set(dupW)].join(', '));

const ids = new Set([...body.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const l of [...body.matchAll(/href="#([^"]+)"/g)].map(m => m[1])) if (!ids.has(l)) problems.push('dead in-page link #' + l);

const eqTags = [...clean.matchAll(/\$\$([\s\S]*?)\$\$/g)].length;
const inlineTags = Math.floor(nInline / 2);

/* ------------------------- emit ------------------------- */
const CONFIG = [
  'window.MathJax = {',
  "  tex: { inlineMath: [['$','$']], displayMath: [['$$','$$']], processEscapes: true, tags: 'none',",
  "         macros: { vv: ['\\\\mathbf{#1}', 1], eps: '\\\\varepsilon', half: '\\\\tfrac{1}{2}' } },",
  "  svg: { fontCache: 'local', scale: 1.02, displayAlign: 'center', mtextInheritFont: true },",
  "  options: { enableMenu: true, skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },",
  '  startup: { typeset: true }',
  '};'
].join('\n');

const HEAD1 = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Maxwell 方程组与 Euler 方程组 · 可视化讲解（Strauss §13.1–13.2）</title>',
  '<meta name="description" content="Strauss 13.1 电磁学 / 13.2 流体与声学：从 Maxwell 与 Euler 方程组推导波动方程，并用可交互数值实验逐项验证。">',
  '<style>', css, '</style>',
  '<script>', CONFIG, '<\/script>'
].join('\n');

const HEAD2 = [
  '</head>',
  '<body>',
  '<div class="wrap">'
].join('\n');

const TAIL = [
  '</div>',
  '<script>', rd('physics.js'), '<\/script>',
  '<script>', js, '<\/script>',
  '</body>',
  '</html>'
].join('\n');

const localScript = '<script id="MathJax-script" src="mathjax/tex-svg.js" onerror="(function(){var s=document.createElement(\'script\');s.src=\'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js\';document.head.appendChild(s);})();"><\/script>';

const page = (mathScript) => [HEAD1, mathScript, HEAD2, body, TAIL].join('\n');

writeFileSync(R('index.html'), page(localScript));

const tex = rd('mathjax/tex-svg.js');
const nClose = (tex.match(/<\/script/gi) || []).length;
const safeTex = tex.replace(/<\/script/gi, '<\\/script');
writeFileSync(R('../index.html'), page('<script id="MathJax-script">' + safeTex + '<\/script>'));

const kb = (p) => (statSync(R(p)).size / 1024).toFixed(0) + ' KB';
console.log('body files : ' + BODY_FILES.length + '   js files: ' + JS_FILES.length + '   script-tag escapes in MathJax bundle: ' + nClose);
console.log('math       : ' + eqTags + ' display equations, ' + inlineTags + ' inline');
console.log('widgets    : ' + usedWidgets.length + ' [' + usedWidgets.join(', ') + ']');
console.log('index.html      ' + kb('index.html'));
console.log('../index.html     ' + kb('../index.html'));
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach(p => console.log('  ! ' + p)); process.exit(1); }
console.log('\nOK - content validated.');
