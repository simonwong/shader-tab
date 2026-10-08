# 框架背景

| 效果 | 来源 | 引擎 | 交互 |
| --- | --- | --- | --- |
| Grain Gradient | [Paper Shaders](https://shaders.paper.design/grain-gradient) 0.0.81 | ShaderMount / WebGL2 | 渐变偏移与轻微旋转 |
| Dithering | [Paper Shaders](https://shaders.paper.design/dithering) 0.0.81 | ShaderMount / WebGL2 | 点阵漩涡偏移 |
| Pixel Blast | [React Bits](https://reactbits.dev/backgrounds/pixel-blast) | Three.js 0.186.0 + postprocessing 6.39.5 | 移动液化、点击涟漪 |
| Predictive Arc | [ThreeUI](https://threeui.com/backgrounds/predictive-arc/data-pixel) | Canvas 2D / WebGL / Three.js | 7 种变体，弧线、点阵或光带轻微跟随鼠标 |
| Shader Gradient | [Shader Gradient](https://github.com/ruucm/shadergradient) | @shadergradient/react 2.4.20 + Fiber 9.7 | 连续动画，Plane / Sphere / Water 二级随机 |
| CRT | [ThreeUI](https://threeui.com/backgrounds/crt/terminal) | WebGL + 离屏文字画布 | 显像管反光跟随鼠标 |

Paper 直接使用 npm 包导出的 shader 与 ShaderMount。React Bits 和 ThreeUI 复用官方渲染核心，文件位于 `src/effects/vendor/`；不安装它们整套组件集合。适配层负责生命周期、分辨率、时钟和指针，保持官方视觉算法。

## 上游与修改

上游源码获取日期：2026-09-20；Predictive Arc 系列扩充于 2026-09-21。

- [React Bits PixelBlast.tsx](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/PixelBlast/PixelBlast.tsx)：提取触摸纹理、液化 Effect 与图形 shader，替换 React 包装为公共生命周期；触摸衰减按时间计算，统一限制帧率和像素数。
- [ThreeUI dataPixelArcRenderer.ts](https://github.com/MengTo/threeui/blob/main/src/shaders/data-pixel-arc/dataPixelArcRenderer.ts)：保留官方 Canvas 绘制，用公共时间与像素密度替换逐帧累加和内部密度选择，指针调节现有弧线参数。
- [ThreeUI CRT](https://github.com/MengTo/threeui/tree/main/src/shaders/crt)：保留 crtRenderer 与 crtShaders 的 Terminal 屏幕，其余 CRT 屏幕已移除；改用公共时间推进打字与扫描线、统一像素预算，并让原有反光位置跟随鼠标。

Paper Shaders 为 Apache-2.0；ThreeUI、Three.js 为 MIT；postprocessing 为 Zlib。React Bits 为 MIT + Commons Clause，附组件再分发限制，不能简称纯 MIT。许可证与 Paper NOTICE 随扩展放入 `licenses/`。

## 运行

所有脚本、文字纹理、噪声和设置缩略图都在扩展内，无 CDN 依赖。每次只加载选中后端；首次打开设置才加载设置组件。Three.js 共用分块约 737 KB；Pixel Blast 后端约 50 KB，Shader Gradient 与 Fiber 后端约 384 KB，独立于约 311 KB 的首屏分块。

背景保留原始配色与饱和度。日间亮度为原始输出的 94%，夜间为 80%；静态承接背景与动态画布使用同一亮度处理。Grain Gradient 减少颗粒并柔化边缘，Shader Gradient 保留官方预设的完整颗粒后处理。CRT 关闭亮度闪动、滚动亮带，并减弱扫描线与光晕。CRT 的纹理重绘使用真实经过时间，动画相位使用慢时钟，低速运动仍逐帧更新。运动以 12 秒为周期平滑加速、减速，平均每秒推进 0.12 秒动画时间；呼吸节奏不调制背景亮度。指针跟随幅度为归一化位移的 35%，Pixel Blast 的液化与点击涟漪减弱。

共享时钟：空闲目标 20 fps，鼠标交互上限 30 fps。Paper 的原生自动循环关闭；指针 uniform 有实际变化时另提交一次 uniform 更新。Pixel Blast 每帧包含场景与液化两个 GPU pass。Data Pixel Arc 在 Canvas 2D 绘制。各引擎成本不能仅用 draw 次数横向比较。

隐藏时立即暂停，30 秒后释放；减少动态效果时不创建渲染器。切换先用 CSS 配色承接，新画布就绪后淡入 900 ms；过期的加载结果立即销毁。缓冲区按 DPR、最长边 2560 与 400 万像素限制选择，保留少量取整余量。

## 静态与验证

`node scripts/capture-effects.mjs` 从真实渲染器生成日夜、横竖屏共 24 张截图。截图隐藏界面控件，不注入固定 shader 时间；CRT 等终端文字完整展开后截图。`scripts/build-effect-thumbnails.py` 生成 12 张 192 × 120 设置缩略图（共约 10.4 KB）和总览。截图仅作开发证据，不进入生产包；新标签页加载中、减少动态效果或渲染失败时只显示 HTML/CSS 配色。

`node scripts/review-effects.mjs` 检查真实动画与指针输入、点击涟漪、快速切换、单画布、六张设置卡、固定选择持久化、减少动态效果、窄屏与上下文丢失。`node scripts/measure-performance.mjs` 验证生产扩展的帧率和后台资源释放；结果位于 `artifacts/`。

## 变体随机

六类背景共 49 种参数组合，完整清单见 [变体范围](effect-variants.md)。先按勾选的类别抽取，再使用每类独立的持久洗牌袋抽取变体；类别概率不随变体数量增加。关闭类别随机只固定类别，仍会在新标签页中随机变体。当前页面切换主题、设置和后台恢复不重新抽取。来源链接显示变体名并链接对应官方页面。

`node scripts/review-variants.mjs` 在独立生产扩展配置中逐个检查 49 种变体的日夜渲染、单画布、类别内随机、窄屏设置与减少动态效果。

## Shader Gradient

直接使用 [官方包](https://github.com/ruucm/shadergradient) `@shadergradient/react` 2.4.20 的组件与内置预设。Plane 使用用户链接对应的 Halo；Sphere 使用 Pensive；Water 使用 Mint。保留各自颜色、相机、材质、几何和颗粒参数；不修改 shader 配色公式，也不重新缩放 Sphere。三组预设均使用 `lightType: 3d`，不请求环境贴图。

Fiber 根采用官方 Canvas 的 linear、flat、DPR 与兼容 shader chunks 配置。`animate: off` 配合共享呼吸时钟更新官方材质 `uTime`，`frameloop: never` 由公共帧循环显式推进。Plane、Sphere 使用官方完整颗粒后处理，Water 按 Mint 预设关闭颗粒。

默认每轮随机排列三种形态，轮内各一次，轮次交界也不相邻重复。队列按浏览器配置持久化，以 Web Locks 防止并发抽取覆盖。固定 Shader Gradient 类别仍按该队列抽取；所有背景类别统一随机变体。右下角来源链接注明当前形态。CSS 加载底色和减少动态效果降级随形态采用橙色、紫色或薄荷色，不使用备用图片。

`node scripts/review-shader-official.mjs` 验证三种形态的队列选择、慢速动画、真实像素随时间变化、窄屏和零运行错误，并保存本地渲染及官网预设截图。官网与本地截图用于视觉核对，动画相位并未同步。`node scripts/review-gradient-random.mjs` 在生产扩展中验证随机和固定模式各 12 次打开的三形态分布。
