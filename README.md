# PDE Visualization

交互式偏微分方程可视化专题库。与 [NMR-Graph](https://github.com/Uugyfgyb/NMR-Graph) 一样，根目录的 [专题目录](index.html)负责分类和导航；每个专题放在 `topics/<slug>/` 下。专题的 `index.html` 是可独立下载、离线打开的单文件网页，`source/` 保存可编辑源码与验证材料。

## 专题

| 分类 | 专题 | 方程与内容 | 入口 |
| --- | --- | --- | --- |
| 双曲型 · 波动与振动 | 受摩擦阻尼的弦 | `u_tt = a²u_xx − cu_t + f`；弦振动、能量递减、唯一性与稳定性 | [打开交互页](topics/damped-wave/index.html) · [说明](topics/damped-wave/README.md) |
| 椭圆型 · 势场与平衡 | 调和函数：从边界到内部 | `Δu=0`；Poisson 公式、平均值性质、强最大值原理、Green 恒等式与能量 | [打开交互页](topics/harmonic-functions/index.html) · [说明](topics/harmonic-functions/README.md) |
| 椭圆型 · 势场与平衡 | Hopf 最大值原理 | `Δu ≥ 0`；边界点引理、障碍函数与外法向导数 | [打开交互页](topics/hopf-maximum-principle/index.html) · [说明](topics/hopf-maximum-principle/README.md) |

目前收录 3 个专题。后续可按**双曲型（波动与振动）**、**抛物型（热传导与扩散）**、**椭圆型（势场与平衡）**、**非线性与耦合方程**继续扩展；分类表示专题的主要教学主题，必要时可在说明中标出跨类性质。

## 仓库结构

```text
pde-visualization/
├── index.html                         # 全部专题的分类入口
├── README.md                          # 专题索引与新增规则
└── topics/
    ├── damped-wave/
    │   ├── index.html                 # 可离线打开的单文件交互页
    │   ├── preview.png                # 专题预览图
    │   ├── README.md                  # 专题范围与使用说明
    │   └── source/                    # 可编辑网页、数值内核、图像和验证脚本
    ├── harmonic-functions/
    │   ├── index.html                 # 带符号与图形注解的离线动态教材
    │   ├── preview.png
    │   ├── README.md
    │   └── source/                    # 网页源码、构建与数学／浏览器验证
    └── hopf-maximum-principle/
        ├── index.html                 # 内嵌脚本与字体的离线单文件页
        ├── preview.png                # 专题示意预览图
        ├── README.md                  # 定理、交互参数与适用范围
        └── source/                    # 可编辑网页、构建脚本与依赖许可证
```

## 今后新增专题

1. 在 `topics/` 下建立简短、稳定、全小写的目录，例如 `topics/heat-equation/`。
2. 将可独立打开的单文件网页放在该目录的 `index.html`；源码、图片和数据放在本专题的 `source/`，避免依赖其他专题的文件。
3. 在专题 `README.md` 写明方程、区域、初边值条件、交互参数、数值方法、适用范围和验证方式。区分精确结论、数值近似与教学示意。
4. 在根目录 `index.html` 的相应分类加入专题卡片，同时更新上面的专题表和数量。
5. 教学网页提供数学符号的中文注解、公式读法与成立条件；交互图解释点线颜色、坐标轴和单位，并随参数更新当前状态说明。关键说明直接可见，区分教学示意、数值近似与严格证明。

阻尼波动方程专题已通过 18 项数值检查。重跑与重建命令见其 [源码说明](topics/damped-wave/source/README.md)。
调和函数专题已通过 12 项独立数学检查与离线浏览器检查，见其 [源码说明](topics/harmonic-functions/source/README.md)。
