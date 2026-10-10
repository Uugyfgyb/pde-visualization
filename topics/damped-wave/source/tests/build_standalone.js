/* build_standalone.js — 把本专题源码打包成 topics/damped-wave/index.html
 * 注意：String.replace 的字符串替换会把 $&、$' 等当成特殊模式，必须用函数形式返回。
 */
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(dir, p), "utf8");
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const b64 = (p) => fs.readFileSync(path.join(dir, p)).toString("base64");

let html = read("index.html");
const engine = read("engine.js");
const mj = read("mathjax/tex-svg.js");

// 1) engine.js 内联
const engTag = '<script src="engine.js"></script>';
if (html.indexOf(engTag) < 0) throw new Error("找不到 engine.js 标签");
html = html.replace(engTag, function () { return "<script>\n" + esc(engine) + "\n</script>"; });

// 2) MathJax 内联（只匹配那一个 script 标签，非贪婪到第一个 </script>）
const mjRe = /<script src="mathjax\/tex-svg\.js"[\s\S]*?<\/script>/;
if (!mjRe.test(html)) throw new Error("找不到 MathJax 标签");
html = html.replace(mjRe, function () { return "<script>\n" + esc(mj) + "\n</script>"; });

// 3) 两张图内联为 data URI
for (const f of ["figures/fig1_decay.png", "figures/fig2_stability.png"]) {
  const tag = 'src="' + f + '"';
  if (html.indexOf(tag) < 0) throw new Error("找不到图片引用 " + f);
  html = html.split(tag).join('src="data:image/png;base64,' + b64(f) + '"');
}

// 断言：内容完整
const checks = [
  ["engine (ModalSolver)", html.includes("class ModalSolver")],
  ["app (cv-string)", html.includes("cv-string")],
  ["proof (能量恒等式)", html.includes("能量恒等式")],
  ["mathjax lib", html.includes("__webpack_modules__")],
  ["figure data uri", html.includes("data:image/png;base64,")],
  ["script 标签数 = 4", (html.match(/<script/g) || []).length === 4],
];
let bad = 0;
for (const [k, v] of checks) { if (!v) { bad++; console.log("  [FAIL] " + k); } else console.log("  [ok] " + k); }
if (bad) throw new Error(bad + " 项断言失败");

// 单文件专题页提供返回仓库总目录的入口；源码页本身仍可独立打开。
const catalogNav = '<nav class="catalog-nav"><a href="../../index.html">← PDE 专题目录</a></nav>';
if (!html.includes('<div class="wrap">') || !html.includes('</style>')) {
  throw new Error("找不到专题页容器或样式结束标记");
}
html = html.replace('</style>', `
  .catalog-nav{margin:0 0 16px;font-size:13px}
  .catalog-nav a{display:inline-block;padding:5px 10px;border:1px solid var(--line);border-radius:7px;text-decoration:none}
  .catalog-nav a:hover{border-color:var(--acc)}
</style>`);
html = html.replace('<div class="wrap">', '<div class="wrap">\n' + catalogNav);

const out = path.join(dir, "..", "index.html");
fs.writeFileSync(out, html);
console.log("topics/damped-wave/index.html: " + (html.length / 1048576).toFixed(2) + " MB");
