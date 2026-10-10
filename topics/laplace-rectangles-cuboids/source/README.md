# 源码与验证

`../index.html` 本身是可编辑的单文件 HTML，内含 CSS、二维 Canvas 绘图、三维场景和交互逻辑。运行 `node verify.cjs` 检查模块脚本语法、矩形四条边与长方体六个面的边值、四阶差分拉普拉斯残差、标签配对和控件 ID。

`make_preview.py` 用与页面相同的矩形解析式生成静态目录预览图 `../preview.png`。它需要 Pillow；运行命令为 `python make_preview.py`。预览图只表示默认参数的解析解，不是浏览器截图。

页面从 CDN 加载 Three.js 0.160.0、OrbitControls 和 MathJax 3，所以首次打开和完整使用需要网络。它与仓库中可离线使用的专题不同，已在根目录卡片与 README 标明。

默认参数：`a=2`、`b=1.4`、`c=1.5`、`q=0.35`、`z/c=0.55`。所有长度和函数值均为无量纲教学量。
