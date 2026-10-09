/* build_standalone.js — 把 index.html + engine.js + mathjax/tex-svg.js + 两张图打包成单文件 standalone.html
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

fs.writeFileSync(path.join(dir, "standalone.html"), html);
console.log("standalone.html: " + (html.length / 1048576).toFixed(2) + " MB");
