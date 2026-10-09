# 受摩擦阻尼的弦：能量递减 ⇒ 唯一性 + 稳定性

> 题目：有界弦 $0<x<l$ 端点固定，受摩擦力作用，振动满足
> $u_{tt}=a^{2}u_{xx}-cu_{t}$（$c>0$）。证明其能量是减小的，并由此证明初边值问题
> $$u_{tt}=a^{2}u_{xx}-cu_{t}+f(x,t),\quad u(0,t)=u(l,t)=0,\quad u(x,0)=\varphi(x),\ u_t(x,0)=\psi(x)$$
> 解的唯一性，以及分别关于初值条件和非齐次项 $f$ 的稳定性。

本目录给出：**可交互可视化 + 完整数学证明 + 两种独立算法的数值验证**。

## 一、交付物

| 文件 | 说明 |
| --- | --- |
| index.html | 主交付物。交互实验台（弦振动动画、时空图、能量/耗散/稳定性面板）+ 完整中文数学证明（LaTeX 排版与数值验证表） |
| standalone.html | 同上，但把 engine.js、MathJax、两张图全部内联，**单文件 2.8 MB，可直接拷贝/发送**（无需其它文件） |
| engine.js | 数值内核：① 模态解析解（特征函数展开 + 每模态解析传播子，本质精确）② 显式有限差分（leapfrog + 中心阻尼，二阶格式）。UMD 写法，浏览器与 Node 都能加载 |
| tests/check.js | 18 项数值检查（node tests/check.js），结果写入 tests/report.json |
| make_figures.py | Python **独立重写**的模态解 + 作图，生成 figures/fig1_decay.png、figures/fig2_stability.png 与 figures/evidence.json |
| tests/build_standalone.js | 生成单文件版（带完整性断言） |
| mathjax/tex-svg.js | 离线数学排版库（缺失时页面自动回落到 CDN） |

## 二、怎么用

- **看可视化与证明**：双击 index.html 即可（推荐 Chrome/Edge；纯本地文件，无需服务器、无需联网）。
- **操作**：拖动 摩擦 c / 波速 a / 长度 l / 模态数 N / 外源幅度 滑块实时改变参数并重算；暂停、播放、重置；能量图可切换线性/对数坐标；稳定性面板可在“初值扰动 / f 扰动”之间切换。
- **深链接**（直接跳到想看的状态；参数 c/a/l/N/f 也可写在网址里）：
  - index.html?fast=8&run=0  —— 快进到 t=8 并暂停
  - index.html?fast=12&stab=f&log=1 —— 稳定性面板切到 f 扰动、能量用对数坐标
  - index.html?c=0&fast=5 —— 无摩擦：能量严格守恒（dE/dt 在 1e-14 量级）
  - index.html?c=2&l=2&a=0.4 —— 强阻尼：注意此时 $\gamma=cl/(2\pi a)=1.59>1$，注记 6 的指数界不再适用（页面会自动隐藏该曲线）
- **复现数值验证**（在 PowerShell 中，工作目录为本文件夹）：

      node tests/check.js                                   # 18 项检查，全部 PASS
      python -m pip install -r requirements.txt             # 仅重新生成静态图时需要
      python make_figures.py                                # 重新生成两张图与 evidence.json
      node tests/build_standalone.js                        # 重新打包单文件版

## 三、数学结论（证明见 index.html 第二章）

记能量 $E(t)=\frac12\int_0^l\big(u_t^{2}+a^{2}u_x^{2}\big)\,dx$。以 $u_t$ 乘方程并分部积分（边界项因 $u_t(0,t)=u_t(l,t)=0$ 消失）得核心恒等式

$$\frac{dE}{dt}=-c\int_0^l u_t^{2}\,dx+\int_0^l f u_t\,dx .$$

1. **定理 1（能量递减）** $f\equiv0$ 时 $\dot E=-c\int u_t^{2}\le 0$，故 $E(t)\le E(0)$；且当 $(\varphi,\psi)\not\equiv 0$ 时对一切 $t>0$ 有 $E(t)<E(0)$（否则 $u_t\equiv0\Rightarrow\varphi\equiv0$，矛盾）。
2. **定理 2（唯一性）** 两个解之差 $w$ 满足齐次方程、零初值零边界，$0\le E_w(t)\le E_w(0)=0$，故 $w\equiv0$。
3. **定理 3（对初值稳定）** 由 $E_w(t)\le E_w(0)$ 与 Poincaré 不等式 $\|w\|^{2}\le\frac{l^{2}}{\pi^{2}}\|w_x\|^{2}$ 得
   $\|w(\cdot,t)\|^{2}\le\frac{l^{2}}{\pi^{2}a^{2}}\big(\|\delta\psi\|^{2}+a^{2}\|\delta\varphi'\|^{2}\big)$，
   $\|w_t(\cdot,t)\|^{2}\le\|\delta\psi\|^{2}+a^{2}\|\delta\varphi'\|^{2}$，界与 $t$ 无关。
4. **定理 4（对 $f$ 稳定）** 用 $ab\le\frac c2a^{2}+\frac1{2c}b^{2}$ 得 $\dot E_w\le\frac{1}{2c}\|F\|^{2}$，于是
   $E_w(t)\le\frac{1}{2c}\int_0^t\|f_1-f_2\|^{2}ds$，进而 $\|w(\cdot,t)\|^{2}\le\frac{l^{2}}{\pi^{2}a^{2}c}\int_0^t\|F\|^{2}ds$。
5. **注记（指数衰减）** 取 $H=E+\frac c2G$（$G=\int uu_t$）。由 $\|u\|\le\frac l\pi\|u_x\|$ 与 $2\|u_t\|\,a\|u_x\|\le 2E$ 得 $|G|\le\frac{l}{\pi a}E$，于是当 $\gamma=\frac{cl}{2\pi a}<1$（即 $cl<2\pi a$）时
   $E(t)\le\frac{1+\gamma}{1-\gamma}E(0)e^{-\kappa t}$，$\kappa=\frac{c(1-\gamma)}{1+\gamma}$；与模态图像（模态能量 $\sim e^{-ct}$）一致。

## 四、数值验证摘要

node tests/check.js（18/18 通过）：

| 检查 | 结果 |
| --- | --- |
| $c=0$ 能量守恒 | 模态解漂移 7.3e−14；leapfrog 离散能量漂移 1.7e−14 |
| $\dot E=-c\int u_t^{2}$（数值微分核对） | 最大相对偏差 4.1e−7 |
| $E(0)-c\int\!\!\int u_t^{2}=E(t)$ | 相对残差 5.3e−9 |
| $E(t)$ 单调不增、非平凡时严格下降 | 通过 |
| Poincaré $\|u\|^{2}\le\frac{l^{2}}{\pi^{2}}\|u_x\|^{2}$ | 最大比值 0.852 |
| 有限差分 vs 模态精确解 | 观测阶 2.05 / 2.01 / 2.00 |
| 含阻尼 + 源项时两格式一致 | 观测阶 1.99 / 2.00 / 2.00 |
| 初值扰动 $E_w\le E_w(0)$ | max 比值 0.99998 |
| 初值扰动 $\|w\|^{2}$ 与定理 3 的界之比 | max 0.049 |
| $f$ 扰动 $E_w\le\frac1{2c}\int\|F\|^{2}$ | max 比值 0.058 |
| Lyapunov 界 | max 比值 0.917（$\gamma=0.0637,\ \kappa=0.3521$） |
| 观测能量衰减率 | $\ln(E_0/E(t))/t\approx0.4006\approx c$ |
| 唯一性（网格加密） | 100→800 网格差 4.9e−3→1.8e−3，收敛到同一解 |

make_figures.py（Python 独立实现）得到同样结论：恒等式残差 1.1e−9、衰减率 −0.4009、二阶收敛阶 2.07/2.02/2.01、各稳定性比值 ≤ 1。

## 五、独立复核

本项目由另一个独立代理做过一次"对抗式"复核（报告：[tests/verify_subagent/REPORT.md](tests/verify_subagent/REPORT.md)）。它用**第三种方法**（正弦 Galerkin + RK4、P1 有限元 + RK4）重算，并与本项目的模态解交叉校验（各泛函一致到 $3\times10^{-12}$）：

- 能量恒等式、定理 1–4、注记 6 **逐式重推全部正确**；定理 3 的常数 $l^{2}/(\pi^{2}a^{2})$ 经实测（单模态取等号）确认已是最优。
- 它独立发现并推动了两个改进：① 注记 6 中 $|G|$ 的估计可以更锐（$\frac{l}{\pi a}E$ 而非 $\frac{2l}{\pi a}E$），故 $\gamma$ 应为 $\frac{cl}{2\pi a}$ —— 已采纳；② make_figures.py 的累积量 Asrc 漏乘 $l/2$（导致图 2(b) 的上界被放大 2 倍）—— 已修正，修正后 $\max E_w/\text{上界}=0.0578$，与 check.js、有限元三方一致。
- 它同时核对了可复现性：check.js 重跑 18/18 且与 report.json 逐位一致。

## 六、说明与已知限制

- **求解器**：模态解对每个模态用解析传播子推进，除源项的单步 Simpson 求积外没有时间离散误差；它同时充当有限差分的参考解。两者独立实现、互相验证。
- **页面上的 dE/dt 曲线**是能量历史在 ±20 ms 窗口上的平滑中心差分（右端项取同窗口平均，二者严格对齐）；未平滑的逐点中心差分会被仍活跃的高频模态放大，因此**积分形式** $E(0)-c\int\!\!\int u_t^{2}+\int\!\!\int f u_t=E(t)$ 的残差（$10^{-7}$ 量级）才是更锐利的核对——两者页面上都给出。
- 有限差分解在页面上按时间线性插值到与模态解同一时刻，故两者最大差 $\sim O(\Delta x^{2})$（$J=200$ 时约 $4\times10^{-3}$，主要来自拨弦初值的拐点）。
- 古典解假设（$u\in C^{2}$）下上述证明成立；若只假定弱解，需改用能量不等式 + 稠密性论证（结论不变）。
