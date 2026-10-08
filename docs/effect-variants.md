# 背景原生变体

核对日期：2026-10-08。以下范围接入随机选择。先按用户勾选的背景类别抽取，再从该类别的独立洗牌袋抽取变体；同一轮不重复，多变体类别跨轮避免紧邻重复；CRT 仅有 Terminal。关闭类别随机仍会在每次打开新标签页时抽取该类别的变体；所有类别统一随机变体。

| 背景 | 官方变体 | 随机范围 | 接入方式 |
| --- | --- | --- | --- |
| Grain Gradient | `wave`、`dots`、`truchet`、`corners`、`ripple`、`blob`、`sphere`，共 7 种 | 全部 7 种 | 切换已有 shader 的形态参数 |
| Dithering | `simplex`、`warp`、`dots`、`wave`、`ripple`、`swirl`、`sphere`，共 7 种；点阵算法为 `random`、`2x2`、`4x4`、`8x8` | 27 种组合，排除 `ripple:4x4` | 参数组合；保留其他 Ripple 点阵算法 |
| Pixel Field | `square`、`circle`、`triangle`、`diamond`，共 4 种 | 全部 4 种 | 自研 shader 的格子形状参数 |
| CRT | `terminal`、`cinematic`、`retro-game`，共 3 种 | 仅 `terminal` | 使用已有屏幕绘制与材质；日间使用琥珀滤镜 |
| Predictive Arc 系列 | `predictive`、`data-pixel`、`signal-particles`、`override-grid`；合集另含 `ribbon-field`、`void-field`、`halftone-flow`、`amber-halftone` | 7 种，排除 `halftone-flow` | 官方绘制核心按需加载，接入统一时钟、尺寸预算和销毁 |

合计 49 种组合，包含 Shader Gradient 的 3 种形态。变体在当前页面内保持不变，切换主题、展开设置和后台恢复不重新抽取。跨标签页通过 Web Locks 串行取号；每个背景有独立存储，互不消耗轮次。旧队列中的已移除变体自动丢弃。

Predictive Arc 新增渲染器使用 ThreeUI 的官方 GLSL 与 Canvas 绘制核心，提取到本地模块，不加载原站 iframe、HTML 页面或 CDN 脚本。适配调度、分辨率、资源销毁及鼠标缓动；Amber 使用官方密度修正并覆盖宽屏。Ribbon Field 日间使用浅色底与青蓝色点带，夜间保留官方暗色；Void Field 保留官方暗色画面，其余支持日夜配色。全部通过统一呼吸时钟驱动，没有额外动画循环。

设置仍显示六个背景类别，不新增高清备用图；首次加载和降级使用对应颜色的 HTML/CSS。右下角来源链接标明当前变体。

官方来源：

- [Paper Grain Gradient 源码](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/grain-gradient.ts)
- [Paper Dithering 源码](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/dithering.ts)
- [ThreeUI CRT 源码](https://github.com/MengTo/threeui/blob/main/src/shaders/crt/crtRenderer.ts)
- [ThreeUI Predictive Arc 组件](https://github.com/MengTo/threeui/blob/main/src/shaders/predictive-arc/PredictiveArcCanvas.tsx)
- [ThreeUI Predictive Arc 合集](https://github.com/MengTo/threeui/blob/main/src/shaders/predictive-arc/PredictiveArcCollection.tsx)
