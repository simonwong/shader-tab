<div align="center">
  <img src="public/icon/128.png" width="80" height="80" alt="Shader Tab 图标" />
  <h1>Shader Tab</h1>
  <p><strong>打开新标签，留一点空白。</strong></p>
  <p>缓慢流动的背景，轻盈的玻璃控件，伸手就到的常用网站。</p>
  <p>
    <a href="https://shadertab.simonwong.cn/">官网与实时预览</a> ·
    <a href="README.md">English</a> ·
    <a href="docs/development.md">开发指南</a> ·
    <a href="https://github.com/simonwong/shader-tab/issues">问题反馈</a>
  </p>
  <p><strong>6 类背景 · 53 种变体 · 8 种语言</strong></p>
</div>

![Shader Tab：桃色与淡紫色颗粒渐变，底部显示玻璃书签控件](docs/images/grain-gradient.png)

Shader Tab 用动态背景和本地书签导航替换 Chrome 新标签页。移动鼠标，控件轻轻浮现；停下来，画面回归安静。

## 每次打开，从容一点

- **像呼吸一样的动效。** 缓慢起伏的动画、明暗主题与轻柔的鼠标交互。
- **每次都有一点新意。** 自选参与随机的背景类别，各类变体每轮不重复；当前标签页保持原来的画面。
- **书签就在手边。** 按 Chrome 文件夹浏览、搜索书签，收藏最多 10 个常用网站，拖动调整顺序。图标读取 Chrome 已有缓存。
- **自己决定显示什么。** 收藏和系统书签入口可独立隐藏，支持书签排序与控件隐藏延迟设置。
- **按需使用资源。** 渲染器按需加载，标签页隐藏后停绘，30 秒后释放 GPU 上下文；系统减少动态效果时使用静态背景。
- **八种界面语言。** 简体中文、繁體中文、English、日本語、한국어、Français、Deutsch、Español，支持跟随浏览器或手动选择。

## 换一种心情

<table>
  <tr>
    <td width="50%"><img src="docs/images/pixel-blast.png" alt="Pixel Blast 淡紫色像素背景" /></td>
    <td width="50%"><img src="docs/images/crt.png" alt="CRT 荧光终端装饰背景" /></td>
  </tr>
  <tr>
    <td align="center">Pixel Blast</td>
    <td align="center">CRT Terminal</td>
  </tr>
</table>

| 背景 | 画面特点 | 使用框架 |
| --- | --- | --- |
| Grain Gradient | 柔和色彩与细腻颗粒 | Paper Shaders |
| Dithering | 网点渐变与复古纹理 | Paper Shaders |
| Pixel Blast | 像素交互与点击涟漪 | React Bits / Three.js |
| Predictive Arc | 弧线、粒子、丝带与场景变体 | ThreeUI |
| CRT | 荧光与装饰屏幕 | ThreeUI |
| Shader Gradient | Plane、Sphere、Water 三种形态 | Shader Gradient |

以上为实际扩展截图。前往[官网体验动态背景](https://shadertab.simonwong.cn/#effects)，或查看[完整变体清单](docs/effect-variants.md)。

## 安装与使用

[**从 Chrome 网上应用店安装**](https://chromewebstore.google.com/detail/shader-tab/behmbnoomagbbcdpmgpmabdaeajifhej)

安装后打开新标签页，移动鼠标显示控件：左下角是设置，底部中央是收藏与书签目录，右下角可访问当前背景的参考来源。

| 快捷键 | 功能 |
| --- | --- |
| `Tab` | 唤醒并浏览控件 |
| `Escape` | 关闭当前弹层 |
| `⌘ ,` / `Ctrl ,` | 打开设置 |

## 数据留在浏览器里

扩展无需账户，不含广告和分析统计。Chrome 原始书签只读，收藏与偏好使用 `chrome.storage.local` 保存；扩展不跨设备同步，也不上传书签数据。

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 读取书签树，监听变化并同步展示 |
| `storage` | 本地保存收藏、偏好和随机队列 |
| `favicon` | 读取当前展示书签的缓存图标 |

无网站访问权限、内容脚本或远程执行代码。脚本、shader 和字体均随扩展打包。

**卸载会清除扩展自身的收藏和设置，但不会删除 Chrome 书签。** 更新已解压的开发版本时，保留同一路径、覆盖文件后刷新扩展，不要先卸载。

[隐私政策](https://shadertab.simonwong.cn/privacy) · [第三方许可](https://shadertab.simonwong.cn/licenses)

## 本地开发

需要 **Node.js 22.12+** 和 **pnpm 10**。

```sh
git clone https://github.com/simonwong/shader-tab.git
cd shader-tab
pnpm install
pnpm dev
```

生产构建与检查：

```sh
pnpm check
pnpm zip
```

在 `chrome://extensions` 开启开发者模式，选择「加载已解压的扩展程序」，加载 `.output/chrome-mv3`。ZIP 生成在 `.output/`。

基于 **WXT、React、TypeScript、Three.js、Radix UI 和 Hugeicons**。调试扩展、部署官网及验证命令见[开发指南](docs/development.md)。

## 项目文档

| 文档 | 内容 |
| --- | --- |
| [开发指南](docs/development.md) | 本地环境、构建产物、官网与验证 |
| [架构](docs/architecture.md) | 数据边界、存储与渲染生命周期 |
| [背景实现](docs/shaders.md) | Shader 接入与来源 |
| [变体清单](docs/effect-variants.md) | 53 种组合与随机规则 |
| [性能记录](docs/performance.md) | 渲染预算与实测结果 |

## 致谢与许可

背景使用 [Paper Shaders](https://github.com/paper-design/shaders)、[React Bits](https://github.com/DavidHDev/react-bits)、[ThreeUI](https://github.com/MengTo/threeui) 和 [Shader Gradient](https://github.com/ruucm/shadergradient)；图标使用 [Hugeicons](https://github.com/hugeicons/hugeicons)，字体使用 Space Grotesk。

第三方代码和素材保留各自许可。React Bits 代码包含附加限制，不能将本仓库所有文件一概视为 MIT 授权。详见[许可核对](docs/shader-license-review.md)和[许可原文](public/licenses/)。

问题与建议请[提交 Issue](https://github.com/simonwong/shader-tab/issues)。私人支持联系 [support@simonwong.cn](mailto:support@simonwong.cn)。
