# Shader Tab

<img src="brand/shader-tab-logo-uppercase.png" alt="SHADER TAB" width="280" />

一个安静的 Chrome 新标签页。空闲时只显示背景；移动鼠标后，底部控件浮现。

## 使用

- 常用书签与全部书签按钮位于底部中央；悬浮星标展开常用书签。左下角独立设置按钮打开设置。
- 右下角来源品牌名放在小玻璃胶囊中，随鼠标移动显示，链接到当前背景的官方页面，文字使用 Paper Shaders、React Bits、ThreeUI 或 Shader Gradient；空闲时随控件隐藏。
- 悬浮或点击九宫格，浏览 Chrome 书签文件夹与级联菜单。
- 设置中按 Chrome 书签文件夹逐级展开，或搜索并保留目录层级，再添加到常用，最多 10 个。拖动手柄排序；也可聚焦手柄后按空格、方向键、空格完成排序。
- 背景包含 Grain Gradient、Dithering、Pixel Blast、Data Pixel Arc、CRT Terminal、Shader Gradient，使用 Paper Shaders、React Bits、ThreeUI 与 Shader Gradient 官方渲染核心。鼠标移动可拨动背景；Pixel Blast 支持点击空白处产生涟漪。勾选随机池，或关闭随机轮播选择固定效果。
- 随机轮播在每次打开新标签页时选取一种背景，不在阅读过程中自动切换。抽到 Shader Gradient 后，默认在 Plane、Sphere、Water 中不重复抽取，三种抽完一轮再重排；同页切主题或打开设置不重抽。
- 设置可独立控制常用书签与系统书签入口是否显示，两者都隐藏时仍可打开设置。
- 背景卡片只在点击时改变选择，不再悬浮预览。
- 设置支持简体中文、繁体中文、英文、日文、韩文、法文、德文、西班牙文；默认跟随浏览器界面语言，未匹配时回退英文。可手动切换，立即生效并保存在本地，已打开的标签页同步更新。界面、错误提示与隐私/许可说明均已翻译；书签名称和许可证原文保持原样。语言包按需加载，不新增依赖。
- 外观支持跟随系统、白天、黑夜；鼠标静止后 1、2 或 5 秒隐藏按钮。
- `Tab` 唤醒并浏览控件，`Escape` 关闭当前弹层，`⌘+,`（Windows/Linux 为 `Ctrl+,`）打开设置。

## 开发

需要 Node.js 22.12+、pnpm 10。

```sh
pnpm install
pnpm dev
```

预览：`http://localhost:4317/src/entrypoints/newtab/index.html`。若端口变化，以终端打印的地址为准，保留页面路径。

普通网页仅使用示例数据，页面标题和设置底部标明开发预览；收藏、排序和设置保存到独立的 localStorage 命名空间。真实 Chrome 书签只在扩展环境读取。

调试真实扩展：在 `chrome://extensions` 开启开发者模式，加载 `.output/chrome-mv3-dev`，保持开发服务运行，再打开新标签页。WXT 不会自动启动或修改日常浏览器配置。

## 构建与安装

```sh
pnpm check
pnpm zip
```

在 `chrome://extensions` 中选择「加载已解压的扩展程序」，加载 `.output/chrome-mv3`。ZIP 位于 `.output/shader-tab-0.4.1-chrome.zip`。

`pnpm check` 包含类型检查、78 项回归测试、生产构建和 manifest 校验。生产包不包含示例数据、远程脚本或远程字体，权限只有 `bookmarks`、`storage` 和 `favicon`。

## 数据与效果

书签源由 Chrome 管理，扩展只读取与监听。收藏保存为有序书签 ID 列表，使用 Web Locks 串行化跨标签页修改，原子检查 10 个上限。书签重命名和移动保持收藏；删除后从界面隐藏，下一次编辑收藏时清除失效引用。收藏与设置使用当前浏览器配置的本地存储，不跨设备同步。

页面展示 HTTP/HTTPS 网页书签，过滤脚本、文件及 Chrome 内部链接。图标通过 Chrome `_favicon` 读取当前配置的缓存，未命中时显示 Chrome 默认图标；同站回退取决于 Chrome 的缓存记录。仅加载已展开条目，不扫描整库、不另行抓取站点或调用第三方图标服务。读取失败及普通网页预览使用首字母。展开收藏时立即读取缓存图标，并检查同步命中的加载状态。

设置支持系统书签按 Chrome 原顺序、名称正序、名称倒序、添加时间新到旧、添加时间旧到新、最近打开排序。自定义排序在各层目录内生效，文件夹优先；没有日期的条目排在后面。只影响插件展示，不修改 Chrome 书签顺序或收藏顺序。

6 类背景共 53 种变体组合；每类独立洗牌，抽完一轮再重排。同页切换主题保持变体；所有背景类别统一随机选择变体。背景使用官方绘制核心及配色，详见 [背景设计](docs/shaders.md)。背景运动按 12 秒周期缓缓变速，平均速度约为原来的 32%；空闲目标 20 fps，交互期间上限 30 fps，最长边不超过 2560 像素、总像素不超过 400 万、像素密度上限 2；隐藏页面立即停绘，30 秒后释放 GPU 上下文，返回时按需重建，切换时显示对应 CSS 配色，渲染器就绪后用 900 ms 淡入；过期异步加载被销毁。系统开启减少动态效果、WebGL 不可用或上下文丢失时使用 HTML/CSS 渐变或底色。

底栏、设置按钮与来源胶囊采用 3 px 轻度背景模糊、薄半透明底色和柔和边缘高光；收藏浮层与大面板使用磨砂材质。控件淡出期间保持模糊，完全隐藏后停止显示。详见 [玻璃实现](docs/liquid-glass-research.md) 与 [性能记录](docs/performance.md)。

## 结构

```text
src/entrypoints/newtab/   新标签页与交互状态
src/platform/            Chrome / 开发预览适配与实时订阅
src/features/bookmarks/  书签树、协议过滤与菜单投影
src/features/favorites/  收藏顺序、上限与迁移
src/features/navigation/ 悬浮菜单与空闲隐藏
src/features/settings/   收藏编辑与外观设置
src/features/preferences/设置解析与系统主题
src/i18n/                语言识别、按需字典与 React 上下文
src/components/          玻璃材质与本地图标
src/effects/             框架适配器、官方渲染核心、配色与生命周期
src/styles/              设计稿日夜参数与响应式样式
docs/                    设计映射、架构与验证记录
```

启动开发服务后，安装有 `agent-browser` 的环境可运行 `node scripts/capture-effects.mjs`，在独立浏览器会话中生成 6 种背景的日夜、横竖屏共 24 张截图及 `artifacts/effects/index.html` 图集。截图不进入扩展包。

更新已安装版本：把新版 ZIP 的完整内容覆盖到原安装目录，保留同一路径；在 `chrome://extensions` 的 Shader Tab 卡片点刷新，再打开新标签页。不要先移除扩展：卸载会清除扩展本地收藏与设置。首次加入 favicon 权限时按 Chrome 提示确认。

`node scripts/review-favicons.mjs` 使用本地测试站点验证离线图标缓存、缺图默认图标和 Retina 渲染，测试结束后关闭独立浏览器并删除本次临时配置目录。

`node scripts/measure-performance.mjs` 使用独立 Chrome 扩展会话检查空闲帧率、展开书签菜单、后台 GPU 释放和设置恢复，结果写入 `artifacts/performance/latest.json`。

框架版本、来源、适配范围和许可证见 [背景实现](docs/shaders.md)。CRT 日间采用琥珀色，夜间采用绿色，均保留暗色显像管底色。

完整随机范围与来源见 [变体清单](docs/effect-variants.md)。

设置底部可打开本地隐私政策和第三方许可。构建按实际打包模块生成依赖许可清单，预打包代码另附补充声明；详见 [许可核对](docs/shader-license-review.md) 和 [商店提交资料](docs/store-submission.md)。

品牌图形采用橙紫像素融化方案。favicon 与扩展图标不含文字，尺寸为 16、32、48、128 px；完整 `SHADER TAB` Logo 与原图保存在 `brand/`，不进入扩展安装包。

`pnpm locales` 生成 Chrome 商店展示用 manifest 语言目录和静态多语言政策页，构建时自动执行。扩展管理页的名称和描述遵循 Chrome 界面语言；设置中的手动选项仅控制扩展界面和政策链接。`node scripts/review-locales.mjs` 在独立临时 Chrome 配置中检查八语切换、持久化、布局与离线政策页。

若扩展列表同时出现两个版本且 ID 不同，它们是两个独立安装，收藏与设置互不共享。保留数据时，先停用另一版，将完整新版文件覆盖到要保留数据的那一版原目录，再点击该卡片的刷新按钮；不要把每次解压产生的新目录作为另一个扩展加载。显示名大小写不决定扩展 ID。

## 官网

官网包含中英文首页、实时背景预览，以及八种语言的隐私政策和第三方许可。构建不包含扩展安装包，也不读取浏览器书签。

```sh
pnpm site:build
pnpm site:preview
```

发布目录为 `.output/site`。将其上传到 Cloudflare Workers 静态资源，绑定 `shadertab.simonwong.cn`。有适当权限的部署凭据时，也可执行 `pnpm site:deploy`。部署配置位于 `website/wrangler.jsonc`。

在 `website/config.mjs` 中配置正式 Chrome 网上应用店条目 `STORE_URL`。留空时显示「即将上线」；不会提供测试版或 ZIP 下载。
