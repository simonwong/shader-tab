# 背景原生变体

核对日期：2026-10-22。以下范围接入随机选择。先按用户勾选的背景类别抽取，再从该类别的独立洗牌袋抽取变体；同一轮不重复，跨轮避免紧邻重复。关闭类别随机仍会在每次打开新标签页时抽取该类别的变体；所有类别统一随机变体。类别按可见变体数的平方根加权；右下角胶囊可隐藏单个变体或固定单个变体，见 `architecture.md` 的“随机”一节。

| 背景                | 官方变体                                                                                                                                  | 随机范围                                                      | 接入方式                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Grain Gradient      | `wave`、`dots`、`truchet`、`corners`、`ripple`、`blob`、`sphere`，共 7 种                                                                 | 4 种，排除 `wave`、`dots`、`truchet`                          | 切换已有 shader 的形态参数                                                                                    |
| Shader Gradient     | 官方自定义器提供 `plane`、`sphere`、`waterPlane` 三种几何和多个预设                                                                       | 3 种：`dusk`、`ocean`、`sage`                                 | 在自定义器中设计的配置；plane 与 waterPlane 着色器移植为原生 WebGL，见 [背景实现](shaders.md#shader-gradient) |
| Dithering           | `simplex`、`warp`、`dots`、`wave`、`ripple`、`swirl`、`sphere`，共 7 种；点阵算法为 `random`、`2x2`、`4x4`、`8x8`                         | 7 种：6 种形状用 `8x8`，排除 `dots`；另加 `sphere:4x4`（Orb） | 每种形状一个变体；徽标只显示形状名，`sphere:4x4` 显示 Orb                                                     |
| Fluted Glass        | 官方页面提供多个预设，含 Default、Abstract、Waves                                                                                         | 3 种：`default`、`abstract`、`waves`                          | 使用对应预设的参数和 Paper 的示例照片，见 [背景实现](shaders.md#fluted-glass)                                 |
| Pixel Field         | `square`、`circle`、`triangle`、`diamond`，共 4 种                                                                                        | 全部 4 种                                                     | 自研 shader 的格子形状参数                                                                                    |
| Predictive Arc 系列 | `predictive`、`data-pixel`、`signal-particles`、`override-grid`；合集另含 `ribbon-field`、`void-field`、`halftone-flow`、`amber-halftone` | 7 种，排除 `halftone-flow`                                    | 官方绘制核心按需加载，接入统一时钟、尺寸预算和销毁                                                            |
| Mesh Gradient       | 官方为单一 shader，配色与扭曲参数自定                                                                                                     | 3 种：`tide`、`orchard`、`mist`                               | 每个变体一套日夜配色                                                                                          |
| Warp                | `checks`、`stripes`、`edge` 三种形状                                                                                                      | 3 种：`marble`、`silk`、`check`                               | 每个变体一种形状、一套扭曲参数和一套日夜配色                                                                  |
| Simplex Noise       | 单一 shader，按 `stepsPerColor` 分层                                                                                                      | 1 种：`contour`                                               | 3 层硬边色带，像等高线图                                                                                      |
| Perlin Noise        | 单一 shader，八度与持续度可调                                                                                                             | 1 种：`fog`                                                   | 双色软边，u_scale 12，时钟放慢到 500                                                                          |
| Neuro Noise         | 单一 shader，三色加亮度、对比度                                                                                                           | 2 种：`filament`、`nebula`                                    | 两组缩放与对比度                                                                                              |
| Dot Orbit           | 单一 shader                                                                                                                               | 1 种：`drift`                                                 | 三色点，不跟随指针                                                                                            |
| Smoke Ring          | 单一 shader                                                                                                                               | 1 种：`halo`                                                  | 圆环居中，中间留空                                                                                            |
| God Rays            | 单一 shader                                                                                                                               | 1 种：`dawn`                                                  | 光源在画面上方                                                                                                |
| Water               | 官方叠加在图片上                                                                                                                          | 1 种：`pool`                                                  | 传入透明像素作底图，只保留水面光纹                                                                            |

合计 42 种变体：Grain Gradient 4、Shader Gradient 3、Dithering 7、Fluted Glass 3、Pixel Field 4、Predictive Arc 7、Mesh Gradient 3、Warp 3、Simplex Noise 1、Perlin Noise 1、Neuro Noise 2、Dot Orbit 1、Smoke Ring 1、God Rays 1、Water 1。Dithering 的形状变体只用 8×8 Bayer 点阵：`random` 在画面漂移时闪烁，`2x2`、`4x4` 颗粒过粗。唯一例外是 `sphere:4x4`（Orb），对应 Paper Dithering 的 Default 预设：4×4 Bayer 点阵、缩放 0.42 的较小球体、像素尺寸 2。它是唯一使用自有配色的 Dithering 变体，夜间为黑底上的 `#00b2ff` 蓝色，日间为浅色 `#e4ebf0` 底上的 `#0a84c0`。Dithering 的 id 仍为 `形状:点阵` 格式（如 `swirl:8x8`），已保存的洗牌袋可继续使用。

变体在当前页面内保持不变，切换主题、展开设置和后台恢复不重新抽取。跨标签页通过 Web Locks 串行取号；每个背景有独立存储，互不消耗轮次。旧队列中的已移除变体自动丢弃。CRT 已移除，已保存的 `crt-terminal` 类别偏好改为 Predictive Arc。Shader Gradient 换成原生 WebGL 实现后，旧的 `plane`、`sphere`、`waterPlane` 形态从洗牌袋丢弃，类别偏好保留。

0.6.0 之后新增 9 个 Paper 类别（Mesh Gradient 到 Water）。每次保存随机池时同时写入 `preference:v1:removedEffects`，记下池里没有的类别。读取时，最早的 6 个类别不在池里就视为用户移出；新类别既不在池里也不在移出清单里时补进随机池。所以 0.6.0 的旧随机池、改过随机池的用户、更新后仍开着的旧版本标签页写入的池都会拿到新类别，用户移出过的新类别不会被加回。

Predictive Arc 新增渲染器使用 ThreeUI 的官方 GLSL 与 Canvas 绘制核心，提取到本地模块，不加载原站 iframe、HTML 页面或 CDN 脚本。适配调度、分辨率、资源销毁及鼠标缓动；Amber 使用官方密度修正并覆盖宽屏。Ribbon Field 日间使用浅色底与青蓝色点带，夜间保留官方暗色；Void Field 保留官方暗色画面，其余支持日夜配色。全部通过统一呼吸时钟驱动，没有额外动画循环。

设置显示 15 个背景类别，不新增高清备用图；首次加载和降级使用对应颜色的 HTML/CSS。右下角来源链接标明当前变体。

官方来源：

- [Paper Grain Gradient 源码](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/grain-gradient.ts)
- [Paper Dithering 源码](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/dithering.ts)
- [Paper Fluted Glass](https://shaders.paper.design/fluted-glass)
- Paper [Mesh Gradient](https://shaders.paper.design/mesh-gradient)、[Warp](https://shaders.paper.design/warp)、[Simplex Noise](https://shaders.paper.design/simplex-noise)、[Perlin Noise](https://shaders.paper.design/perlin-noise)、[Neuro Noise](https://shaders.paper.design/neuro-noise)、[Dot Orbit](https://shaders.paper.design/dot-orbit)、[Smoke Ring](https://shaders.paper.design/smoke-ring)、[God Rays](https://shaders.paper.design/god-rays)、[Water](https://shaders.paper.design/water)
- [ShaderGradient](https://shadergradient.co/)
- [ThreeUI Predictive Arc 组件](https://github.com/MengTo/threeui/blob/main/src/shaders/predictive-arc/PredictiveArcCanvas.tsx)
- [ThreeUI Predictive Arc 合集](https://github.com/MengTo/threeui/blob/main/src/shaders/predictive-arc/PredictiveArcCollection.tsx)
