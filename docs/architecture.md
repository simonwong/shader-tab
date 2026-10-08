# 架构

## 技术栈

- WXT / Vite / Manifest V3 负责新标签入口、热更新、打包和 manifest。
- React / TypeScript 负责组件和交互状态。
- Base UI（`@base-ui/react` 1.8.0）提供设置对话框与书签菜单的定位、键盘导航、弹层和模态焦点管理，替代原 Radix 组件；视觉由本项目 CSS 实现。
- dnd-kit 支持指针与键盘收藏排序。
- Paper Shaders、ThreeUI 与 Shader Gradient 官方渲染核心及自研 Pixel Field 着色器负责六种背景，CSS 自定义属性负责日夜玻璃材质。
- Hugeicons 官方免费包统一操作图标；Space Grotesk 字体随扩展本地打包。

背景依赖按渲染器动态导入。Three.js 由 Shader Gradient 与 Amber Halftone 使用；Pixel Field 为原生 WebGL，无额外依赖。

## 数据

`Platform` 隔离 Chrome API 与开发预览。界面通过 `useLiveQuery` 订阅读取结果。事件按 60 ms 合并，同一资源最多一个在途读取；隐藏标签只标记失效，返回前台后读取最新数据。请求序号与取消标记阻止过期异步结果覆盖新数据。

收藏以 `favorites:v2` 保存有序 ID 数组，首次读取可兼容 `favorite:v1:<id> = true`。所有收藏变更在同源 `navigator.locks` 排他锁内读取最新存储与书签树，再验证上限和保存。相同浏览器配置中的多个标签页共享此锁，避免丢失更新或同时超过 10 个上限。

设置按 `preference:v1:<field>` 分键保存，独立字段的跨标签修改互不覆盖。同一字段以最后写入为准。读取时迁移旧效果 ID 到新效果，再过滤未知效果、重复项和无效选项，随机池不能变成空集合。

书签 ID 仅用于当前浏览器配置，数据存于 `chrome.storage.local`。源书签始终由 Chrome 管理，扩展没有写入书签的业务接口。

### 首屏缓存

`chrome.storage` 是异步接口，直接等待会先画出默认主题、浏览器语言和默认背景。`src/entrypoints/newtab/boot.ts` 把最近一次解析出的外观、语言、实际语言包、日夜两套静态背景色及其明暗基调镜像到 localStorage 键 `shader-tab:boot:v1`。入口模块在 React 渲染前同步读取并应用（CSP 禁止内联脚本），语言包与平台初始化并行加载。缓存只影响首帧；设置读取完成后以存储为准并回写缓存。localStorage 不可用或内容损坏时忽略缓存。

## 背景

`presets.ts` 定义六种效果与配色，`drivers/` 连接框架，`vendor/` 保留官方渲染核心及来源说明。`ambient.ts` 管理单个场景的帧循环、12 秒呼吸时钟、指针与尺寸；React 层处理主题、效果、系统动态效果偏好和静态降级。

### 变体清单

`src/effects/variants.ts` 的 `EFFECT_VARIANTS` 是全部变体的唯一清单，当前 49 种。每项记录稳定 id、来源徽标名称与链接、日夜静态背景、明暗基调、可选像素密度上限和按需加载的渲染器。洗牌存储、渲染器分派、来源徽标、CSS 降级和 `scripts/` 下的验证脚本（经 `variantIdsByEffect`）都从这里读取；新增或移除变体只改这一处。

### 切换与淡入

`AmbientBackground.tsx` 的 `createStage` 管理画布层。首帧先显示 CSS 底色；新场景加载时旧场景继续绘制，就绪后在上层淡入（首次 350 ms，切换 600 ms），淡入期间旧画面冻结，结束后释放，因此同时最多两个 WebGL 上下文。新场景加载失败时保留旧场景。取消标记保证过期的异步加载不会覆盖新选择。

标签页隐藏时立即停绘，10 秒（`HIDDEN_RELEASE_MS`）后释放画布，返回时重建；隐藏期间预取渲染器分块。可见状态下上下文丢失时，2 秒后重建一次，再次丢失则改用静态背景。减少动态效果、后端不可用或渲染器失败时使用 HTML/CSS 渐变或底色，不请求图片。

### 帧率策略

`src/effects/rate-policy.ts` 的 `planRate` 根据页面状态计算帧率，取各条件下的最低值：

| 状态                                       | fps             |
| ------------------------------------------ | --------------- |
| 默认                                       | 20              |
| 指针在会直接绘制指针的背景上移动（1 秒内） | 30              |
| 使用电池                                   | 15              |
| 窗口失焦超过 15 秒                         | 10              |
| 设置对话框打开                             | 10              |
| 2 分钟无输入                               | 5               |
| 10 分钟无输入                              | 0（保持当前帧） |

新标签页打开时焦点在地址栏，15 秒宽限期保证打开后的前几秒按默认帧率绘制。使用电池时像素密度另限为 1。`frame-loop.ts` 只在 rAF 回调内绘制，帧槽按固定间隔推进以保持相位；等待超过 60 ms 时先用定时器休眠，接近帧槽再切回 rAF。Paper 自带时钟设为零，用公共时钟推进。

像素密度上限 2，缓冲区最长边上限 2560、总像素不超过 400 万（`drivers/surface.ts`）。Grain Gradient 另限密度 1.25。

### 随机

每次打开新标签页选择一次效果与变体；主题切换、菜单和设置交互不会重抽。每个效果有独立洗牌袋，存于 `effect-variant:shuffle:v1:<effect>`，同一轮不重复，轮次交界不紧邻重复；袋子通过 Web Locks 串行化，避免多个标签页竞争。Shader Gradient 旧的 `shader-gradient:shuffle:v1` 队列读取时并入新袋子；旧 `shaderGradientShape` 设置不再读取。背景类别、主题与两个入口显示开关保存于本地。旧 ID 在读取时迁移，不修改收藏和其他设置。

指针仅更新目标坐标，公共渲染循环平滑跟随。移入控件、窗口失焦或隐藏后目标归位；Pixel Field 的涟漪按时间自然衰减。触屏支持 Pixel Field 点击涟漪，不跟随触摸移动。释放渲染器时移除全部输入监听。

## 材质与加载

居中导航、常用书签条与左下角设置按钮使用自研圆角法线、折射截面和方向高光，小面积表面使用 SVG 单次位移。位移图和高光图最长边 768、缓存上限 12，不逐帧生成图像或捕获 DOM。详见 `liquid-glass-research.md`。

设置与 dnd-kit 独立为懒加载分块，首次打开才加载。加载时可取消；分块不可用时可关闭提示或刷新恢复。书签菜单（含 Base UI Menu）也是独立分块：`Dock.tsx` 在空闲时（最迟 4 秒）通过 `import('./BookmarkMenu')` 预取，指针移入或聚焦底栏时立即加载。书签菜单每次显示 80 项，书签树每个展开分支每批显示 40 项，防止大量书签产生无界首屏 DOM。`check-build.mjs` 约束首屏 JS 小于 265 KB，并检查设置仍使用动态导入。

## 权限与生产包

只申请 `bookmarks`、`storage`、`favicon`。无 host permissions、内容脚本、生产后台进程、远程 JS 或远程字体。书签网址仅在点击链接时导航。图标使用当前扩展的 `_favicon` URL，读取 Chrome 本地缓存；不调用第三方图标服务。请求允许 Chrome 在本地按站点回退，但不保证未访问路径命中。缺图时使用 Chrome 默认图标，加载失败时显示首字母。

开发网页才允许加载示例适配器。生产包缺少 Chrome 扩展环境时显示错误。设计稿和 QA 截图不参与扩展构建。

## 官方资料

- [WXT 新标签入口](https://wxt.dev/guide/essentials/entrypoints.html)
- [Chrome bookmarks](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome favicon](https://developer.chrome.com/docs/extensions/how-to/ui/favicons)
- [Paper Shaders](https://github.com/paper-design/shaders)
- [ThreeUI](https://github.com/MengTo/threeui)

`bookmark-tree.ts` 从原始 Chrome 树生成候选目录，过滤非 HTTP/HTTPS 链接并保留匹配项的完整祖先路径。折叠的子目录不挂载内容，搜索用 deferred value 更新。`showFavorites`、`showBookmarks` 默认均为 true，独立存储；入口隐藏不改变收藏或 Chrome 书签。

Shader Gradient 使用官方 `@shadergradient/react` 2.4.20 与 Fiber 9.7.0。Fiber 采用 `frameloop: never`，官方动画时钟关闭，公共呼吸时钟更新材质 `uTime` 并调用 `advance`；隐藏时没有独立动画循环。React 19.2.8 满足 Fiber 的版本范围。
