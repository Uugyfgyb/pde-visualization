# 调和函数动态教材源码

`textbook.html` 包含可编辑 HTML、CSS、SVG／Canvas 绘图和 JavaScript，公式用原生 HTML 与 Unicode 排版，不请求在线字体或脚本。`../index.html` 是由源码生成的离线专题入口；构建只调整两条仓库导航的相对路径。

```sh
python build.py
node tests/math.cjs
```

## 数学约定

Poisson 核为 `Pρ(ψ)=(1−ρ²)/(1−2ρcosψ+ρ²)`，真正的角度权重密度是 `Pρ/(2π)`。内部角 `θ` 固定，边界积分角 `φ` 变化，`ρ=r/a<1`；交互取 `a=1`。正核及归一化给出加权平均，但最大值原理的严格证明还使用连续性和区域连通性。

圆周平均除以 `2πR`，圆盘平均除以 `πR²`；球面平均除以 `4πR²`。二维边界与内部积分分别使用 `ds`、`dA`，三维分别使用 `dS`、`dV`。偏导数、积分记号、积分元、区域边界、集合和向量运算在教材中均有中文注解。

能量采用 `E[q]=½∬|∇q|²dA`。对于单位圆盘中的 `qλ=x+λ(1−x²−y²)`，梯度为 `(1−2λx,−2λy)`，奇对称交叉项积分为零，故 `E[qλ]=π/2+πλ²`。这不是任意比较函数的通用数值公式；通用结论是固定边界值时调和解使 Dirichlet 能量最小。

## 浏览器检查与预览图

要求 Node.js、Playwright 和 Chromium。可在临时环境中安装依赖：

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

如果使用已安装的 Google Chrome，通过环境变量 `CHROME_EXECUTABLE` 指定可执行文件；如果 Playwright 在外部公共依赖目录，通过 `PLAYWRIGHT_MODULE` 指定模块的绝对路径。测试不会访问网络，生成 `../preview.png`，并将浏览器验收结果写入 `tests/browser-results.json`。

`tests/math.cjs` 使用独立求积验证页面涉及的数学式。浏览器测试检查静态注解数量、可点击注解、五组即时说明、具体读数和移动屏幕尺寸；展开全部推导后也检查文档横向溢出。有限精度的数值检查不代替理论证明。

## 参考

教材参考 Walter A. Strauss，*Partial Differential Equations: An Introduction*，第二版，6.3 与 7.1；网页末尾保留了教材与大学课程讲义链接。所有中文讲解、图形和交互代码为本专题的重新编写。
