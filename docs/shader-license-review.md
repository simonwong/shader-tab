# Shader 与商店发布许可核对

核对日期：2026-09-21；2026-10-08 更新 Pixel Blast 替换和发布状态。范围：Shader Tab 0.4.1 使用的 shader 框架、复制的绘制代码、现有许可证文件及 Chrome 商店相关政策。0.4.1 已在 [Chrome 网上应用店](https://chromewebstore.google.com/detail/shader-tab/behmbnoomagbbcdpmgpmabdaeajifhej)发布。本记录是许可证文本与实现核对，不是律师意见。

## 结论

按核对到的条款，当前作为完整新标签页应用使用这些效果，具有发布及商业使用的许可基础，不要求将整个扩展开源。代码许可不等于商标授权，也不能代替商店隐私披露。

| 实际使用                                                    | 版本或来源                               | 许可证     | 主要要求                                                                       |
| ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Paper Grain Gradient / Dithering                            | @paper-design/shaders 0.0.81             | Apache-2.0 | 随包保留 LICENSE、NOTICE 与适用署名；修改原文件时标明修改；不授予品牌商标权    |
| Shader Gradient Plane / Sphere / Water                      | @shadergradient/react 2.4.20             | MIT        | 保留版权与许可声明；允许成品商业使用                                           |
| ThreeUI Predictive Arc 系列 / CRT                           | 存入 src/effects/vendor 的上游代码       | MIT        | 保留 Meng To 的版权与完整许可文本；修改后仍保留声明                            |
| Three.js / React Three Fiber / camera-controls / GLSL noise | 当前依赖和本地许可证                     | MIT        | 保留各自版权与许可声明                                                         |
| Space Grotesk                                               | @fontsource-variable/space-grotesk 5.3.0 | OFL-1.1    | 可随应用分发；保留字体许可；字体本身不能单独售卖，修改字体需遵守保留字体名条件 |

当前产品提供书签导航、收藏与背景显示，不提供组件下载、代码导出或素材包。若将产品改为 shader 组件库、付费代码导出器或移植素材合集，应重新核对各上游许可。

## Pixel Blast 替换（2026-10-08）

React Bits 的 PixelBlast 使用 MIT + Commons Clause 自定义许可，禁止分发移植后的组件；本仓库公开，移植版不适合继续保留。2026-10-08 起，效果 `pixel-blast` 改为本项目原创实现，显示名为 Pixel Field：单个 WebGL 片元着色器绘制像素网格，噪声场经 8×8 Bayer 有序抖动决定每格亮灭，指针移动与点击产生扩散涟漪。实现按设计说明从零编写，未参考或改写 React Bits 源码。原移植代码（`src/effects/vendor/pixel-blast.ts` 及其适配层）、React Bits 许可声明 `public/licenses/react-bits.txt` 与仅供其使用的 postprocessing 依赖及其许可声明均已删除。效果 id 与 `square`、`circle`、`triangle`、`diamond` 变体 id 保持不变，用户偏好无需迁移。

## 当前安装包的状态

- Lucide 已替换为 `@hugeicons/react` 1.1.10 和 `@hugeicons/core-free-icons` 4.3.4，使用 MIT 免费图标。没有 Pro 图标。
- 构建从实际渲染的打包模块识别运行时依赖，生成 `licenses/dependencies.txt` 完整版权和许可文本，以及含版本与文本 SHA-256 的 `dependencies.json`。缺少许可文本时构建失败。
- Shader Gradient 的发布包另含预打包代码，补充声明覆盖 query-string、strict-uri-encode、decode-uri-component、split-on-first、filter-obj、three-stdlib；Fiber 内嵌的 React reconciler 也保留 Meta 许可。源码未声明的内嵌版本不冒充已确认版本，补充文件标明许可文本来源版本。
- 主要 shader、camera-controls、GLSL noise、字体的完整许可及 Paper NOTICE 随包提供。许可页从设置底部进入；来源链接用于署名导航，不替代完整许可文本。
- CRT 仅启用 Terminal 装饰效果。没有蓝屏故障、STOP、内存转储或重启提示；终端文案标明生成艺术、不执行命令。
- 当前共 49 种变体；旧随机队列中的已移除变体会自动丢弃。

## Chrome 商店

- JavaScript、shader、字体及图标本地打包，没有远程执行代码。
- 本地隐私政策披露书签、favicon 缓存、收藏与偏好的处理、存储、删除及支持邮件用途。联系邮箱为 `support@simonwong.cn`。权限保持 bookmarks、storage、favicon。
- `docs/store-submission.md` 提供单一用途、权限说明和实际数据处理说明。商店隐私政策字段使用公开托管的 https://shadertab.simonwong.cn/privacy.html；扩展内链接不能充当该网址。
- 0.4.1 已通过审核并在 Chrome 网上应用店发布。后续版本改动权限、数据处理或第三方代码时，需同步更新后台披露和本记录。

## 一手来源

- [Paper Apache-2.0](https://github.com/paper-design/shaders/blob/main/LICENSE) 与 [NOTICE](https://github.com/paper-design/shaders/blob/main/NOTICE)
- [Shader Gradient 许可证声明](https://github.com/ruucm/shadergradient#license)
- [ThreeUI MIT](https://github.com/MengTo/threeui/blob/main/LICENSE)
- [Three.js MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
- [Hugeicons 免费包 MIT](https://github.com/hugeicons/hugeicons#license)
- [Chrome MV3 代码要求](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Chrome 本地处理数据的披露要求](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome 仿冒与知识产权政策](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property)
