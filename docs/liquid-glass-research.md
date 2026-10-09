# 玻璃材质

## 液态玻璃

底部书签栏、左下角设置按钮与右下角来源胶囊使用液态玻璃：`backdrop-filter: blur(3px) saturate(1.4) url(#…)`。先做轻度模糊，再由 SVG `feDisplacementMap` 按位移图把边缘附近的背景向内偏移，形成折射。偏移量为圆角半径的 75%，最多 16 px：底栏和设置按钮 16 px，来源胶囊约 10 px。只有 Chrome 支持在 `backdrop-filter` 中引用 SVG 滤镜；扩展只发布 Chrome 版，不支持时（`CSS.supports` 为假）保留磨砂玻璃。

位移图、高光图和侧边暗线图由 [`liquid-glass-maps.ts`](../src/components/liquid-glass-maps.ts) 在 CPU 上按圆角矩形的距离场生成，计算方式移植自 [Glass-HQ/liquid-glass](https://github.com/Glass-HQ/liquid-glass)（MIT）的 WGSL 材质图：

- 边缘曲线为四分之一圆，从轮廓处完全偏移到斜面深度（圆角半径的 80%）处归零。
- 高光只出现在上下边，侧边加约 1 px 暗线。参考实现把暗线画在轮廓外侧，这里的图只覆盖控件本身，所以向内移 1 px。

[`LiquidGlassPanel`](../src/components/LiquidGlassPanel.tsx) 用 `ResizeObserver` 测量尺寸，尺寸稳定 150 ms 后才重新生成材质图（来源胶囊悬停展开时沿用旧图拉伸），按宽、高、圆角和像素密度（最高 2）缓存，图片解码后才启用滤镜，避免 Chrome 首帧画出空白。滤镜使用 `objectBoundingBox` 单位，与设备像素比无关。高光和暗线画在 `::before` 上，夜间不透明度为 82%。底色为磨砂控件底色的 60%（Dithering 背景保留完整底色，以免浅色调图标对比不足），去掉边框和内阴影，保留外阴影。系统请求减少透明度时仍用实色背景。

库本身没有引入：它要求所有玻璃控件放进 `GlassScene`，背景放进 `GlassContent`，SVG 滤镜作用在整屏内容层上，并依赖 WebGPU 生成材质图。

### 性能

2026-10-09，开发预览，无头 Chrome，1440 × 900、DPR 2，底栏常显，当时只有底栏使用液态玻璃。同一页面内切换液态与磨砂各录 3 次 5 秒 trace，比较 GPU 进程与渲染进程各线程合并后的忙碌时间（中位数，ms / 5 s）：

| 背景            | CompositorGpuThread 液态 / 磨砂 | VizCompositorThread 液态 / 磨砂 |
| --------------- | ------------------------------: | ------------------------------: |
| Grain Gradient  |                   304.5 / 313.0 |                   143.1 / 151.0 |
| Shader Gradient |                   433.4 / 494.3 |                   202.7 / 222.7 |
| Dithering       |                   160.3 / 165.8 |                   176.6 / 195.4 |

液态版没有增加开销，模糊半径从 16 px 降到 3 px 可能抵消了位移滤镜的成本。trace 只反映各线程的 CPU 时间，不是 GPU 执行时间，也没有在低性能设备上测过。

## 磨砂玻璃

收藏浮层、书签菜单和设置面板使用 CSS `backdrop-filter` 磨砂，各自设定模糊参数；边框、内阴影和柔和渐变提供边缘高光。不支持 SVG 背景滤镜时，底栏、设置按钮和来源胶囊也回到磨砂：`blur(16px) saturate(1.3)`。

控件淡出时保持相同材质，700 ms 淡出结束后隐藏；键盘聚焦会立即恢复可见性。系统请求减少透明度时改用实色背景。
