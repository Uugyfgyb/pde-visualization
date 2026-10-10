// Build the offline, single-file topic page from this editable source.
// Run with: node build.js (from this directory or elsewhere).
const fs = require('fs');
const path = require('path');

const here = __dirname;
const read = name => fs.readFileSync(path.join(here, name), 'utf8');
let html = read('index.html');
let css = read('vendor/katex.min.css');

const fonts = [...new Set([...css.matchAll(/url\(fonts\/([A-Za-z0-9_-]+\.woff2)\)/g)].map(m => m[1]))];
if (fonts.length !== 20) throw new Error(`Expected 20 KaTeX fonts; found ${fonts.length}`);
for (const font of fonts) {
  const data = fs.readFileSync(path.join(here, 'vendor/fonts', font)).toString('base64');
  css = css.replaceAll(`url(fonts/${font})`, `url(data:font/woff2;base64,${data})`);
}

function replaceOne(before, after) {
  const count = html.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one occurrence, got ${count}: ${before}`);
  html = html.replace(before, () => after);
}

replaceOne('<link rel="stylesheet" href="vendor/katex.min.css">', `<style>\n${css}\n</style>`);
for (const name of ['three.min.js', 'katex.min.js', 'auto-render.min.js']) {
  const js = read(`vendor/${name}`).replace(/<\/script/gi, '<\\/script');
  replaceOne(`<script src="vendor/${name}"></script>`, `<script>\n${js}\n</script>`);
}

const unresolved = html.match(/\b(?:src|href)="vendor\/|url\(fonts\//i);
if (unresolved) {
  throw new Error(`Output still refers to a local vendor file near: ${html.slice(unresolved.index - 40, unresolved.index + 70)}`);
}
if (!html.includes('C^2(B_R(y))') || !html.includes('function init3D()')) {
  throw new Error('Required theorem or interaction is missing');
}

const output = path.join(here, '..', 'index.html');
fs.writeFileSync(output, html);
console.log(`Built ${output} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB; ${fonts.length} embedded fonts)`);
