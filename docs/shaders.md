# 框架背景

| 效果                                                                                                  | 来源                                                                 | 引擎                    | 交互                                                                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| Grain Gradient                                                                                        | [Paper Shaders](https://shaders.paper.design/grain-gradient) 0.0.81  | ShaderMount / WebGL2    | 渐变偏移与轻微旋转                                                                   |
| Shader Gradient                                                                                       | [ShaderGradient](https://shadergradient.co/) 着色器移植              | 自建 WebGL1 宿主        | 无指针交互；噪声褶皱随呼吸时钟起伏                                                   |
| Dithering                                                                                             | [Paper Shaders](https://shaders.paper.design/dithering) 0.0.81       | ShaderMount / WebGL2    | 点阵漩涡偏移                                                                         |
| Fluted Glass                                                                                          | [Paper Shaders](https://shaders.paper.design/fluted-glass) 0.0.81    | 自建 WebGL2 宿主        | 无指针交互；棱纹网格随呼吸时钟往复滑动                                               |
| Pixel Field                                                                                           | 本项目原创                                                           | 单 pass WebGL2 / WebGL1 | 指针拨动像素，移动与点击产生涟漪                                                     |
| Predictive Arc                                                                                        | [ThreeUI](https://threeui.com/backgrounds/predictive-arc/data-pixel) | WebGL 片元着色器        | 7 种变体，弧线、点阵或光带轻微跟随鼠标                                               |
| Mesh Gradient、Warp、Simplex Noise、Perlin Noise、Neuro Noise、Dot Orbit、Smoke Ring、God Rays、Water | [Paper Shaders](https://shaders.paper.design/) 0.0.81                | ShaderMount / WebGL2    | 偏移与轻微旋转，幅度按类别为 Dithering 的 0.3–1 倍；Dot Orbit 与 God Rays 不跟随指针 |

Paper 直接使用 npm 包导出的 shader；Grain Gradient、Dithering 和 9 个新增 Paper 类别通过 ShaderMount 渲染，Fluted Glass 使用自建宿主。Shader Gradient 的着色器移植到 `src/effects/drivers/shader-gradient.ts`，不加载 three.js 或 React Three Fiber。ThreeUI 复用官方渲染核心，文件位于 `src/effects/vendor/`；不安装它们整套组件集合。适配层负责生命周期、分辨率、时钟和指针，保持官方视觉算法。

## Pixel Field

2026-10-08 起替换原 React Bits Pixel Blast 移植版，为本项目从零编写的实现（`src/effects/drivers/pixel-blast.ts`，效果与变体 id 保持不变）。全屏三角形上的单个片元着色器把屏幕划为 8 CSS px 的格子；域扭曲梯度噪声给出每格密度，8×8 Bayer 有序抖动阈值决定亮灭，密集处连成实色，稀疏处散成单点。格子形状按变体为方形、圆形、三角形或菱形，边缘按 1 设备像素抗锯齿。指针移动产生弱涟漪，点击产生强涟漪；波峰点亮并外推格子，波后短暂清空。日夜亮度系数 0.94 / 0.8 写在输出颜色中。

## Shader Gradient

2026-10-14 起由原来的 `@shadergradient/react` + React Three Fiber + three.js 实现换成原生 WebGL1 移植（`src/effects/drivers/shader-gradient.ts`），后端分块由约 1.1 MB 降到约 7.6 KB。顶点和片元着色器移植自 ShaderGradient 的 plane 与 waterPlane 材质（MIT）：细分平面的顶点按 3D Perlin 噪声沿法线位移，片元按位置混合三种颜色。原版的 "3d" 光照只有一盏强度为 brightness·π 的环境光，材质 metalness 为 0.2 且无环境贴图，所以受光颜色等于底色 × brightness × 0.8，没有方向性明暗；这里在 CPU 上算出同样的系数，相机按 three.js 的 Spherical 和 PerspectiveCamera 计算，颜色按 0–1 sRGB 值直接使用，不做色调映射。

三个变体是在 ShaderGradient 自定义器中设计的低饱和配置：

- Dusk：plane，淡紫、桃色与长春花蓝，沿用默认 Halo 的构图。
- Ocean：waterPlane，低机位看缓慢移动的沙丘轮廓，日间雾蓝、夜间深蓝；轮廓变化的像素比 plane 的色带多，所以噪声时钟更慢。
- Sage：plane，灰绿配色，Halo 构图的镜像对角。

噪声起始时间为 0.5：整数时间让所有顶点落在噪声格点平面上，褶皱最平。片元输出叠加 ±0.5/255 的静态抖动（按像素位置计算，不随时间变化），消除低对比渐变的 8 位色带。渲染密度上限为 1；宽屏会放大视角，保证画面四角始终被网格覆盖。每帧一次 draw。

## Paper 新增类别

2026-10-22 新增 9 个类别，全部经 `src/effects/drivers/paper.ts` 的 `PAPER_SHADERS` 表渲染：每个类别一条，给出 fragment shader、uniforms、时钟倍率（Paper 毫秒 / 呼吸秒）、指针幅度，以及是否需要 Paper 的噪声纹理。参数在候选页（`design/shader-candidates/`，不入库）上调定，配色在 `presets.ts` 的 `PAPER_PALETTES`，每个变体一套日夜配色。

- Warp、Simplex Noise、Perlin Noise、Neuro Noise、Dot Orbit 是铺满画面的图案，`u_fit` 设为 0；其余沿用默认的 cover。
- Perlin Noise 的基频为 10，同样作用在时间上，所以 `u_scale` 为 12，时钟放慢到 500。
- Water 官方叠加在图片上，这里传一个透明像素作 `u_image`，只保留水面光纹。
- Warp、Dot Orbit、Smoke Ring、God Rays 需要噪声纹理；驱动在第一帧前解码纹理和图片。
- Mesh Gradient 与 Perlin Noise 是大面积软渐变，渲染密度上限为 1。

## Fluted Glass

Paper 的 fluted-glass 是静态图像滤镜，没有时钟，需要一张输入图。输入图是 Paper 文档自带的示例照片（paper-design/shaders 的 `docs/public/images/image-filters/0018.webp`，Apache-2.0），以 `src/assets/fluted-glass/paper-flowers.webp`（1500 × 1124，56 KB）随包分发，作为独立资源加载。照片只在 2D canvas 上处理一次：夜间乘以偏冷的暗色，Abstract 的 shader 模糊改为 12 px canvas 模糊烘焙进照片（原预设每像素最多读取 101 次纹理）；处理后上传为纹理，之后不再上传。

滤镜本身没有时钟，运动来自棱纹网格：`u_shift = slide · sin(呼吸时钟秒数)`，照片保持不动。Default 与 Abstract 的 slide 为 0.5 个棱纹宽度，Waves 为 0.1，因为波形棱纹会让整张照片弯曲，小幅滑动已改变大部分画面。`u_colorBack` 设为按主题着色后的天空色，靠近屏幕边缘的棱纹折射到照片外时显示天空色而不是黑色。

ShaderMount 只接受已加载的 `<img>` 纹理，并自带帧循环，所以驱动（`src/effects/drivers/fluted-glass.ts`）在自己的 WebGL2 上下文中运行 Paper 的片元着色器，配一个最小顶点着色器计算 `fit: cover` 的图像 UV。三个变体使用 Paper Default、Abstract、Waves 预设的参数；Abstract 的 shader 模糊按上文改为烘焙进照片，滑动幅度 `slide` 是本项目新增的参数。

## 上游与修改

上游源码获取日期：2026-09-20；Predictive Arc 系列扩充于 2026-09-21。

- [ThreeUI dataPixelArcRenderer.ts](https://github.com/MengTo/threeui/blob/main/src/shaders/data-pixel-arc/dataPixelArcRenderer.ts)：绘制由 Canvas 2D 改写为片元着色器（逐格逻辑保持一致），用公共时间与像素密度替换逐帧累加和内部密度选择，指针调节现有弧线参数。
- [ShaderGradient](https://github.com/ruucm/shadergradient)（2026-10-14 移植）：plane 与 waterPlane 的顶点、片元着色器改写为 WebGL1 GLSL，three.js 的网格、相机与光照计算改在 CPU 上完成；片元输出乘以日夜亮度系数，并加静态抖动。
- [Paper Fluted Glass](https://github.com/paper-design/shaders)：片元着色器与示例照片原样使用，照片的夜间着色和 Abstract 模糊在 2D canvas 上预先处理。

Paper Shaders（含 Fluted Glass 示例照片）为 Apache-2.0；ShaderGradient、ThreeUI 为 MIT。许可证与 Paper NOTICE 随扩展放入 `licenses/`。

## 运行

所有脚本、噪声和设置缩略图都在扩展内，无 CDN 依赖。每次只加载选中后端；首次打开设置才加载设置组件。背景不依赖 three.js；Paper 后端约 57 KB，Fluted Glass 约 14 KB 外加 56 KB 照片，Shader Gradient 约 7.6 KB，Pixel Field 约 6.5 KB。

背景保留原始配色与饱和度。日间亮度为原始输出的 94%，夜间为 80%；静态承接背景与动态画布使用同一亮度处理。Grain Gradient 减少颗粒并柔化边缘。运动以 12 秒为周期平滑加速、减速，平均每秒推进 0.12 秒动画时间；呼吸节奏不调制背景亮度。指针跟随幅度为归一化位移的 35%。

共享时钟：空闲目标 20 fps，鼠标交互上限 30 fps。Paper 的原生自动循环关闭；指针 uniform 有实际变化时另提交一次 uniform 更新。Pixel Field 每帧一个 draw，涟漪存于 10 个槽位的 uniform 环形缓冲，没有离屏纹理。Shader Gradient 与 Fluted Glass 每帧一个 draw，纹理只上传一次。各引擎成本不能仅用 draw 次数横向比较。

隐藏时立即暂停，10 秒后释放；减少动态效果时不创建渲染器。切换先用 CSS 配色承接，新画布就绪后淡入（首次 350 ms，切换 600 ms）；过期的加载结果立即销毁。缓冲区按 DPR、最长边 2560 与 400 万像素限制选择，保留少量取整余量。

## 静态与验证

`node scripts/capture-effects.mjs` 从真实渲染器生成日夜、横竖屏共 60 张截图。截图隐藏界面控件，不注入固定 shader 时间。`scripts/build-effect-thumbnails.py` 生成 30 张 192 × 120 设置缩略图（共约 22 KB）和总览。截图仅作开发证据，不进入生产包；新标签页加载中、减少动态效果或渲染失败时只显示 HTML/CSS 配色。

`node scripts/review-effects.mjs` 检查真实动画与指针输入、点击涟漪、快速切换、单画布、15 张设置卡、固定选择持久化、减少动态效果、窄屏与上下文丢失。Shader Gradient 检查噪声时间和 draw 次数推进；Fluted Glass 没有 Paper 时钟，脚本检查 draw 次数增加、`u_shift` 变化且照片只上传一次。`node scripts/review-motion.mjs` 测量每个变体静止、指针移动、点击时一秒内变化像素的比例，上限分别为 2.5%、1.5%、1.5%。2026-10-14 日间实测 28 种变体均在上限内；静止时 Shader Gradient 的 dusk、ocean、sage 分别为 0.6%、1.2%、0.5%，Fluted Glass 的 default、abstract、waves 分别为 1.7%、1.7%、1.5%，Orb 为 0.1%。同日夜间复测 Fluted Glass 三种变体，静止均不超过 0.2%。`node scripts/measure-performance.mjs` 验证生产扩展的帧率和后台资源释放；结果位于 `artifacts/`。

## 变体随机

15 类背景共 42 种变体，完整清单见 [变体范围](effect-variants.md)。先按勾选的类别抽取，再使用每类独立的持久洗牌袋抽取变体；类别按可见变体数的平方根加权，变体多的类别出现得稍多。关闭类别随机只固定类别，仍会在新标签页中随机变体。当前页面切换主题、设置和后台恢复不重新抽取。来源链接显示变体名并链接对应官方页面。

`node scripts/review-variants.mjs` 在独立生产扩展配置中逐个检查全部变体的日夜渲染、单画布、类别内随机、窄屏设置与减少动态效果。
