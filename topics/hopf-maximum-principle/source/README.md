# 可编辑源码与构建

`index.html` 是根据用户提供的 `hopf-maximum-principle.html` 整理的源码页。它只引用本目录的 `vendor/`，可以在本地打开；仓库专题入口 `../index.html` 则把所有脚本、样式和 20 个 WOFF2 字体内嵌成单文件。

在此目录运行 `node build.js` 可重新生成 `../index.html`。构建脚本会检查依赖是否完整、是否留下本地资源引用，以及定理与交互代码是否存在。

依赖版本：Three.js r128；KaTeX 0.16.9（含 auto-render）。它们的许可证分别保存在 `vendor/THREE-LICENSE.txt` 和 `vendor/KATEX-LICENSE.txt`。这些资源来自源页指定的 CDN 版本；字体仅保留现代浏览器使用的 WOFF2 格式。

页面中的两张曲线由解析式 $v(r)=e^{-\alpha r^2}-e^{-\alpha R^2}$ 和 $\Delta v(r)=2\alpha e^{-\alpha r^2}(2\alpha r^2-n)$ 实时绘制。检查可直接核对临界条件 $\alpha>n/(2\rho^2)=6$、边界值 $v(R)=0$ 和外法向导数 $\partial_\nu v(R)=-2\alpha R e^{-\alpha R^2}<0$。本专题没有数值 PDE 求解器。
