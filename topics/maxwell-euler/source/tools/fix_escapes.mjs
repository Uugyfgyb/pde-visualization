/* tools/fix_escapes.mjs
   The widget sources are written with String.raw so that LaTeX like \hat{E}
   survives into the file verbatim -- but then the *JavaScript parser* eats the
   backslash of an unknown escape (\h -> h).  Labels therefore have to be
   written with a doubled backslash inside JS string literals (the HTML content
   files are unaffected: there the LaTeX really is literal text).
   This tool doubles exactly those backslashes that precede a known LaTeX
   command or one of , . ! ; : (space), and leaves real JS escapes (\u00b7,
   \n, \\, \') alone.                                                   */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['src/app_maxwell.js', 'src/app_waves.js', 'src/app_euler.js'];

const NAMES = [
  'partial','nabla','cdot','times','to','rightarrow','Rightarrow','neq','pm','mp','sqrt','infty','approx',
  'leq','geq','ldots','cdots','quad','qquad','left','right','langle','rangle','epsilon','varepsilon','circ',
  'oint','iint','int','sum','prod','angle','perp','parallel','equiv','propto','simeq','ll','gg','in','subset',
  'frac','tfrac','dfrac','hat','widehat','bar','overline','vec','vv','dot','ddot','tilde','mathcal','mathbb',
  'mathrm','text','mathbf','mathit','operatorname','max','min','log','ln','exp','sin','cos','tan','arcsin',
  'alpha','beta','gamma','Gamma','delta','Delta','zeta','eta','theta','Theta','kappa','lambda','Lambda','mu',
  'nu','xi','Xi','pi','Pi','rho','sigma','Sigma','tau','phi','varphi','Phi','chi','psi','Psi','omega','Omega','eps'
];
const RE = new RegExp('(?<!\\\\)\\\\(?=(?:' + NAMES.join('|') + ')\\b)', 'g');
const RE2 = /(?<!\\)\\(?=[,.!;: ])/g;

let total = 0;
for (const f of FILES) {
  const p = join(root, f);
  const before = readFileSync(p, 'utf8');
  let n = 0;
  const after = before.replace(RE, () => { n++; return '\\\\'; }).replace(RE2, () => { n++; return '\\\\'; });
  writeFileSync(p, after);
  console.log(f.padEnd(22) + ' doubled ' + n + ' backslashes');
  total += n;
}
console.log('total ' + total);
