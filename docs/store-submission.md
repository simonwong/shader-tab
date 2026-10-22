# Shader Tab 商店提交资料

版本：0.7.0。支持邮箱：support@moonunder.app。

## 单一用途

用动态艺术背景和本地书签导航替换 Chrome 新标签页，帮助用户快速打开常用网站。

## 简短描述

安静的动态背景，新标签页中的常用收藏与书签导航。

## 功能说明

15 类本地渲染背景共 42 种变体，支持日夜主题、指针交互、静 / 柔 / 活三档动效与新标签页随机变体；可在页面角落固定、隐藏或切换背景。查看 Chrome 书签文件夹、搜索并收藏常用书签、调整展示排序；常用书签可平铺在底栏或收在星标里，首次安装可从书签栏一键导入。系统开启减少动态效果时显示静态背景；页面隐藏时停止绘制。

## 权限理由

| 权限         | 用途                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| bookmarks    | 在新标签页读取、搜索和展示书签树，监听原书签变化，支持名称、添加时间和 Chrome 提供的最近打开时间排序。不修改原书签。 |
| storage      | 将收藏 ID、顺序、界面偏好和随机队列保存在当前浏览器的本地扩展存储中。                                                |
| favicon      | 从 Chrome 已有缓存读取展开书签的图标，不调用第三方图标服务。                                                         |
| 新标签页替换 | 通过 chrome_url_overrides 将上述功能显示在新标签页。                                                                 |

没有 host_permissions、内容脚本、远程执行代码或后台服务。JavaScript、shader、字体和图标均随包提供。

## 数据披露依据

扩展在本地处理书签名称、网址、目录和 Chrome 提供的时间字段，以及收藏、偏好和图标缓存。无服务器上传、广告、分析统计或跨设备同步。不读取网页正文、Cookie、密码或完整浏览历史。主动联系支持时，邮箱及邮件内容由邮件服务处理，仅用于回复请求。

后台填写应按提交时字段定义反映以上行为。不能将“无服务器上传”写成“不处理任何用户数据”；隐私政策须保留本地书签处理说明。

## 隐私政策网址与素材

`public/privacy.html`、`public/legal.css`、`public/licenses.html` 及构建后的 `licenses/`、`icon/` 可作为静态网站托管。政策页面无需登录，不包含追踪脚本。商店字段填写托管后的完整 HTTPS 隐私政策 URL；`chrome-extension://` 地址不能作为公开网址。

政策页面随官网托管在 https://shadertab.moonunder.app/ 。商店图标、截图和宣传文案需与 0.7.0 实际功能一致，不使用蓝屏或暗示其他品牌授权的素材。

0.4.1 已在 Chrome 网上应用店发布；审核与发布状态以开发者后台为准。

## 商店描述

全球通用的英文详细描述，0.7.0 起使用：

```text
Shader Tab replaces Chrome's new tab page with an animated background and quick access to your bookmarks. The controls appear when you move the pointer near the bottom of the page and fade out when you stop.

Backgrounds
• 15 background families with 42 variants, including Grain Gradient, Shader Gradient, Dithering, Fluted Glass, Pixel Field, Predictive Arc, Mesh Gradient, Warp and Water.
• Keep one family and get a different variant on each new tab, or shuffle across families.
• Pin a background you like, hide variants you don't want, or switch to the next one from the corner of the page. Hidden variants can be restored in Settings.
• Light, dark or system theme. Motion can be set to Still, Soft or Lively; backgrounds follow the pointer except in Still.

Bookmarks
• Browse and search your Chrome bookmark folders.
• Sort by Chrome's order, name, date added or recently opened.
• Keep up to 10 favorites one click away and drag to reorder them.
• Show favorites as icons right in the dock, or keep them behind the star. On first run, you can start with the links on your bookmarks bar.
• Site icons come from Chrome's own favicon cache. No third-party icon service is used.
• Show or hide the favorites and bookmarks buttons, and choose how long the controls stay visible.

Performance
• Rendering stops when the tab is hidden. The frame rate drops on battery power or when the window is not focused.
• If your system is set to reduce motion, a still background is shown.

Languages: English, Simplified Chinese, Traditional Chinese, Japanese, Korean, French, German and Spanish.

Privacy
Shader Tab needs no account and shows no ads. It has no analytics or tracking and works offline. Bookmarks are read locally and are never modified or uploaded. Favorites and preferences are stored only in the current Chrome profile and are not synced. Uninstalling the extension removes these settings; your Chrome bookmarks are not affected.

Website: https://shadertab.moonunder.app/
Support: support@moonunder.app
```

简体中文详细描述，用词与中文界面一致：

```text
Shader Tab 把 Chrome 的新标签页换成动态背景，并提供书签的快速入口。鼠标移到页面底部附近时按钮出现，停下后自动隐去。

背景
• 15 类背景共 42 种变体，包括 Grain Gradient、Shader Gradient、Dithering、Fluted Glass、Pixel Field、Predictive Arc、Mesh Gradient、Warp、Water 等。
• 可以固定一类背景，每次打开新标签页换一种变体；也可以开启随机轮播，在各类之间轮换。
• 在页面右下角可以固定喜欢的背景、不再显示某种变体，或换一个背景。隐藏的变体可在设置中全部恢复。
• 外观支持白天、黑夜和跟随系统。动效分静、柔、活三档；除“静”外，背景会随鼠标变化。

书签
• 浏览和搜索 Chrome 书签文件夹。
• 可按 Chrome 原顺序、名称、添加时间或最近打开排列。
• 最多 10 个常用书签，一键打开，可拖动调整顺序。
• 常用书签可平铺在底栏，也可收在星标里。首次安装时可直接从书签栏添加。
• 网站图标来自 Chrome 本地的图标缓存，不使用第三方图标服务。
• 可以分别隐藏常用书签和全部书签按钮，并设置按钮在鼠标静止多久后隐藏。

性能
• 标签页不可见时停止绘制；使用电池或窗口未聚焦时降低帧率。
• 系统开启“减少动态效果”时显示静态背景。

语言：简体中文、繁体中文、英文、日文、韩文、法文、德文、西班牙文。

隐私
Shader Tab 无需账号，没有广告、统计或跟踪，可离线使用。书签只在本地读取，不会被修改或上传。常用书签和偏好只保存在当前 Chrome 用户资料中，不同步。卸载扩展会清除这些设置，Chrome 书签本身不受影响。

官网：https://shadertab.moonunder.app/
支持：support@moonunder.app
```

## 截图与宣传图

0.6.0 素材在 `artifacts/store-assets/0.6.0/`，均为 RGB PNG、无透明通道，界面为英文，各语言共用：

| 文件                                                               | 用途         | 内容                                       |
| ------------------------------------------------------------------ | ------------ | ------------------------------------------ |
| `screenshots/shader-tab-0.6.0-01-favorites-1280x800.png`           | 截图 1       | Grain Gradient 日间，收藏栏展开            |
| `screenshots/shader-tab-0.6.0-02-bookmarks-1280x800.png`           | 截图 2       | Fluted Glass 日间，书签菜单展开            |
| `screenshots/shader-tab-0.6.0-03-settings-1280x800.png`            | 截图 3       | Grain Gradient 夜间，设置面板              |
| `screenshots/shader-tab-0.6.0-04-background-controls-1280x800.png` | 截图 4       | Dithering 日间，右下角固定、切换、隐藏按钮 |
| `screenshots/shader-tab-0.6.0-05-night-1280x800.png`               | 截图 5       | Predictive Arc 夜间，收藏栏展开            |
| `shader-tab-marquee-1400x560.png`                                  | 顶部宣传图块 | 品牌图形与字标，右侧为截图 2               |
| `shader-tab-promo-440x280.png`                                     | 小型宣传图块 | 品牌图形与字标                             |

截图来自 0.6.0 生产构建：独立临时 Chrome 以英文界面加载 `.output/chrome-mv3`，预置一组英文示例书签和 7 个收藏，按 1280×800、2 倍像素截取后缩小。网站图标来自 Chrome 本地缓存，截图前先访问过这些网站。宣传图背景是扩展实际渲染的 Grain Gradient 日间画面（大图为 Blob 水平翻转，小图为 Corners），叠加 `brand/shader-tab-icon-master.png` 和 Space Grotesk 字标。截图脚本、合成页面和 2 倍母版在同目录 `source/`。

之前的小型宣传图 `artifacts/store-assets/shader-tab-promo-440x280-v1.png` 由内置 image_gen 生成，保留作对照。
