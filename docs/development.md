# 开发指南

[English overview](../README.md) · [中文介绍](../README.zh-CN.md)

## 环境与启动

需要 Node.js 22.12+、pnpm 10；准确版本和依赖见 [package.json](../package.json)。

```sh
pnpm install
pnpm dev
```

浏览器预览地址为 `http://localhost:4317/src/entrypoints/newtab/index.html`。端口以终端输出为准，保留页面路径。

普通网页使用示例数据，页面标题和设置底部标明开发预览；收藏、排序和设置保存到独立的 localStorage 命名空间。真实 Chrome 书签只在扩展环境读取。

调试真实扩展：在 `chrome://extensions` 开启开发者模式，加载 `.output/chrome-mv3-dev`，保持开发服务运行，再打开新标签页。WXT 不会自动启动或修改日常浏览器配置。自动化验证使用独立测试配置和示例书签，避免暴露个人书签。

### 依赖版本

- 影响渲染结果或首屏的依赖在 package.json 中写确切版本：`react`、`react-dom`、`three`、`@react-three/fiber`、`@shadergradient/react`、`@paper-design/shaders`、`@base-ui/react`。升级时单独提交，并重跑 `pnpm review:variants` 和 `pnpm perf:measure`。
- Hugeicons 两个包写确切版本，图标形状不随更新变化；`@types/three` 与 `three` 同版本。开发工具 `oxlint`、`oxfmt` 也写确切版本，避免规则或格式随小版本变化。
- 其余依赖使用 `^` 范围。实际安装版本以 `pnpm-lock.yaml` 为准，CI 用 `pnpm install --frozen-lockfile`。
- 新增或升级依赖时选择发布至少两周的版本。

## 命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动扩展开发服务 |
| `pnpm typecheck` | WXT 类型生成与 TypeScript 检查 |
| `pnpm test` | 运行单元和回归测试 |
| `pnpm build` | 构建生产扩展 |
| `pnpm lint` | oxlint 检查（配置见 `.oxlintrc.json`） |
| `pnpm format` / `pnpm format:check` | oxfmt 格式化 / 只检查格式（配置见 `.oxfmtrc.json`） |
| `pnpm check` | lint、格式检查、类型检查、测试、生产构建和产物校验 |
| `pnpm zip` | 生成商店上传 ZIP |
| `pnpm locales` | 生成 manifest 语言目录与多语言政策页 |
| `pnpm site:build` | 构建扩展许可文件及官网 |
| `pnpm site:preview` | 本机预览已构建的官网 |
| `pnpm site:deploy` | 使用 Wrangler 发布官网 |

生产目录为 `.output/chrome-mv3`，ZIP 为 `.output/shader-tab-<version>-chrome.zip`。开发截图、设计素材和官网不进入扩展包。

构建校验检查 manifest、权限、生产环境隔离、首屏 JS 预算、动态加载的设置与渲染器，以及实际打包依赖的许可声明。测试范围和运行环境限制见[验证记录](verification.md)与[性能记录](performance.md)。

## 更新本地安装

把完整新版产物覆盖到原安装目录，在 `chrome://extensions` 的对应卡片点击刷新，再打开新标签页。不要先卸载：卸载会删除本地收藏与偏好。

不同路径的未打包安装可能产生不同扩展 ID；两个安装的存储互不共享。显示名大小写不决定扩展 ID。若已有多个安装，先确认哪一个保存了需要的收藏，再停用其余安装。增加权限时按 Chrome 提示确认。

## 数据与交互

- 收藏以书签 ID 保存有序数组，使用 Web Locks 串行化跨标签页更新，最多 10 个。原书签重命名或移动不影响收藏；删除的书签从界面隐藏，下一次编辑收藏时清除失效引用。
- 页面只展示 HTTP/HTTPS 网页书签。收藏和设置使用本地扩展存储，不跨设备同步。
- 书签排序支持 Chrome 原顺序、名称正序/倒序、添加时间新到旧/旧到新及最近打开。各层目录内文件夹优先，不改变 Chrome 原始顺序。
- favicon 通过扩展 `_favicon` 接口读取当前 Chrome 配置的缓存，仅为展开条目加载。同站回退取决于缓存记录；缺图或读取失败时显示浏览器默认图标或首字母。
- 随机背景每次打开新标签页选择一次，各类别独立洗牌；同页主题切换、菜单和设置交互不会重抽。
- 支持键盘收藏排序：聚焦拖动手柄，按空格拾起、方向键移动、空格放下。
- 语言包按需加载。Chrome 管理页使用浏览器界面语言；扩展内手动语言控制界面和政策链接，不翻译书签名称或许可原文。

更多实现细节见[架构](architecture.md)、[背景实现](shaders.md)、[变体清单](effect-variants.md)和[玻璃材质](liquid-glass-research.md)。

## 官网

官网包含中英文首页、六类实时背景预览、常见问题，以及八种语言的隐私政策和第三方许可。公开页面不能读取 Chrome 书签。

```sh
pnpm site:build
pnpm site:preview
```

输出目录 `.output/site`，本地预览端口 4321。Cloudflare Workers 静态托管配置见 [website/wrangler.jsonc](../website/wrangler.jsonc)，正式域名为 `shadertab.simonwong.cn`。目录首页采用 `auto-trailing-slash` 路由。

部署需有适当权限的 Cloudflare 凭据。不要提交 OAuth 凭据或 API token。

```sh
pnpm site:deploy
```

正式 Chrome 网上应用店条目在 [website/config.mjs](../website/config.mjs) 的 `STORE_URL` 中配置。为空时显示「即将上线」，官网不提供测试版或 ZIP 下载。

## 专项验证

`scripts/` 下的 review、capture、measure 和 diagnose 脚本通过 [agent-browser](https://agent-browser.dev) CLI 驱动独立的 Chrome，不在 `pnpm check` 和 CI 中运行。首次使用先全局安装 CLI 并下载浏览器：

```sh
npm install -g agent-browser   # 或 brew install agent-browser
agent-browser install
```

公共逻辑在 `scripts/lib/`：`browser.mjs` 提供按会话隔离的 `run`、`evaluate`、`waitFor`、`sleep`、`screenshot` 和 `close`，临时 Chrome 配置建在 `os.tmpdir()` 下，路径按仓库根目录解析；`variants.mjs` 从 `src/effects/variants.ts` 读取变体清单。截图和报告写入被 Git 忽略的 `artifacts/`。

加载 `.output/chrome-mv3` 的脚本需要先 `pnpm build`；标注「开发服务」的脚本需要 `pnpm dev` 在 4317 端口运行。

| 命令 | 前提 | 覆盖范围 |
| --- | --- | --- |
| `pnpm capture:effects [id…]` | 开发服务 | 六类背景日夜、横竖屏截图 |
| `pnpm review:effects` | 开发服务 | 动画、指针交互、快速切换、静态回退、上下文丢失 |
| `pnpm review:variants [id…]` | 自动构建 | 每个变体的日夜渲染、单类随机、窄屏设置 |
| `pnpm review:locales` | 自动构建 | 八语切换、持久化、布局与离线政策页 |
| `pnpm perf:measure [name]` | 自动构建 | 冷启动、各背景绘制次数、空闲帧率、后台 GPU 释放；结果写入 `artifacts/performance/<name>.json` |
| `node scripts/review-favicons.mjs` | 构建产物 | 离线图标缓存、缺图与 Retina 渲染 |
| `node scripts/diagnose-favicon-api.mjs` | 无 | `_favicon` 接口在有无 `favicon` 权限时的行为 |

其余 `review-*.mjs`（导航、设置、书签排序、玻璃模糊、品牌图标、发布页、Shader Gradient、升级）用法相同，直接用 `node` 运行。

## 目录

```text
src/entrypoints/newtab/    新标签页与交互入口
src/platform/             Chrome API 与开发预览适配
src/features/             书签、收藏、设置与偏好
src/i18n/                 语言识别、字典与 React 上下文
src/components/           玻璃材质与通用控件
src/effects/              渲染器适配、上游绘制核心与生命周期
src/styles/               主题、材质与响应式样式
public/                   扩展图标、政策与许可原文
website/                  独立官网
scripts/                  构建、许可生成与验证工具
brand/                    不进入扩展包的品牌母版
docs/                     架构与验证记录
```

## 发布资料

[商店填写资料](store-submission.md)和[发布检查](release-readiness.md)记录对应版本的准备情况；商店是否已提交、审核或发布，以开发者后台为准。[许可核对](shader-license-review.md)说明各上游项目的许可边界，构建另生成实际打包模块的版权与许可清单。
