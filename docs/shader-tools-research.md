# Shader 工具选型

核查日期：2026-09-20。依据官方仓库、许可证、组件源码和文档。本次为选型研究，未安装候选依赖或运行候选效果；体积、GPU 时间及功耗尚未实测。

## 结论

最终采用用户选定的 Grain Gradient、Dithering、Pixel Blast、Data Pixel Arc、CRT Terminal。实现与来源见 [框架背景](shaders.md)。下列候选比较作为调研资料，未选效果不进入产品。

## 候选比较

| 候选 | 可复用能力 | 限制与接入判断 |
| --- | --- | --- |
| [Paper Shaders](https://github.com/paper-design/shaders) | WebGL2、原生 JS 零依赖、React 包、可调预设和现成动画。当前为 Apache-2.0。 | 首选。鼠标交互取决于具体效果；可复用现有指针输入驱动参数。需适配限帧、30 秒隐藏释放、静态降级。 |
| [React Bits](https://github.com/DavidHDev/react-bits) | 可按需复制单个背景；Iridescence、Orb、Prism 使用 OGL，具备不同的鼠标交互。 | MIT + Commons Clause，有额外限制；不能简称 MIT 开源。各组件依赖、渲染成本和暂停行为不同，须逐个审查。 |
| [ShaderGradient](https://github.com/ruucm/shadergradient) | MIT，现成 3D 动态渐变，参数可配置；React、R3F、Three 等依赖。 | 更适合柔和的渐变雕塑；对当前清晰结构的诉求优先级较低。离线打包需审计并本地化环境贴图。 |
| [Vanta](https://github.com/tengbao/vanta) | MIT，Waves、Net、Halo 等背景，部分支持鼠标与触摸；依赖 Three 或 p5。 | 可快速试效果；本次核查的主分支可见最新提交为 2023-01-12，示例依赖较旧。长期采用前需评估维护成本。 |
| [Three + R3F/Drei](https://github.com/pmndrs/drei) | MIT；MeshDistortMaterial、MeshWobbleMaterial 等能省去部分材质实现。 | 适合实体雕塑和复杂场景，仍须设计灯光、构图和交互。接入工作大于单个现成背景。 |
| [LYGIA](https://github.com/patriciogonzalezvivo/lygia) | GLSL/WGSL 等语言的噪声、色彩和距离场函数库。 | 提供基础函数，不提供完整背景设计。Prosperity + Patron 双许可，有商业使用条件，不作为当前首选。 |

Paper 的 [changelog](https://github.com/paper-design/shaders/blob/main/CHANGELOG.md) 记录了版本更新、性能及兼容修复；README 明确要求固定版本，因为 0.0.x 仍可能包含破坏性变化。React Bits 的 [提交记录](https://github.com/DavidHDev/react-bits/commits/main) 包含近期新增背景与兼容修复。维护判断应结合发布、修复及所选组件代码，不能只看 stars。

## 优先试验

1. [Paper Color Panels](https://shaders.paper.design/color-panels)：现成旋转面板动画，`blur=0` 可保留清晰边缘。以低速、有限配色作为初始方案，将鼠标映射到 `angle1`、`angle2` 或位置参数。
2. [React Bits Orb](https://reactbits.dev/backgrounds/orb)：现成动画与悬停形变，保留明确主体。对照 [Iridescence](https://reactbits.dev/backgrounds/iridescence) 的流动和 `mouseReact`，由实际画面判断是否符合偏好。
3. [React Bits Prism](https://reactbits.dev/backgrounds/prism)：有 hover、惯性及旋转模式，适合作为几何主体候选。源码使用固定 100 步 raymarch，不能因使用 OGL 就认定轻量；hover 与独立旋转为不同模式，同时组合需要适配。

[Paper Waves](https://shaders.paper.design/waves) 是静态线条图案，适合清晰纹理参考；若需要呼吸，必须自行驱动 amplitude、shape 等参数，不能视作自带动画。

## 当前项目接入边界

- 保留 `AmbientBackground` 的生命周期和静态降级。只替换效果实现，不涉及书签、favicon 或自研玻璃。
- 按需加载候选，源码与资源本地打包。无外部素材的所选效果具备接入 MV3 的条件，但仍需生产扩展验证。
- Paper 自带隐藏页和离屏暂停，`speed=0` 可停止动画循环；默认像素上限约 829 万，不能直接沿用默认值替代本项目预算。`speed` 调慢不等于降低帧率。
- 鼠标参数用现有渲染时钟节流，避免每次 pointermove 都触发额外绘制或 React 更新。
- 切换实现时验证单 canvas、日夜配色、Retina、窄屏、减少动态效果、上下文丢失及隐藏恢复。静态图从最终效果重新生成。
- 每个候选独立测构建增量和 GPU 成本。包体小不代表 shader 计算便宜；源码推断不替代设备测试。

## 许可证依据

- [Paper Apache-2.0](https://github.com/paper-design/shaders/blob/main/LICENSE)：分发时保留适用的许可证和 NOTICE；修改源码时保留修改声明。核查所选版本的实际文件。
- [React Bits LICENSE.md](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)：允许作为应用、网站或产品的一部分使用，包括商业用途；禁止销售、再许可或再分发组件本身，包括组件集合和移植版本。它不是普通 MIT 许可。
- [Drei MIT](https://github.com/pmndrs/drei/blob/master/LICENSE)、[LYGIA 许可](https://github.com/patriciogonzalezvivo/lygia/blob/main/LICENSE.md)。

实现依据：[Paper ShaderMount](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shader-mount.ts)、[React Bits Prism](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Prism/Prism.tsx)、[Iridescence](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Iridescence/Iridescence.tsx)、[Orb](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Orb/Orb.tsx)。
