# Favicon 请求失败排查

核对日期：2026-09-21。

扩展使用 Chrome 的本地 `_favicon` 接口，只加载展开条目的图标。没有网站抓取或第三方图标服务。

## 已确认的接口行为

- 官方示例要求 Manifest V3、`favicon` 权限，以及 `chrome.runtime.getURL('/_favicon/')` 上的 `pageUrl` 和 `size` 参数。
- Chromium 的 `GetFaviconForExtensionRequest` 在权限缺失、Manifest 版本不符合要求或查询解析失败时返回空数据；扩展协议加载器将空数据转成 `net::ERR_FAILED`。
- 缓存未命中由 `OnFaviconAvailable` 返回 Chrome 默认图标；它与请求校验失败不同。
- Chrome 153.0.8010.48 源码支持 `fallbackToHost=1`。历史版本的实现可能忽略这个参数，因此同站回退不能作为跨版本保证。
- 扩展自己的页面不需要将 `_favicon/*` 暴露为 web accessible resources；官方示例中的该配置针对 content script。

## 独立验证

`node scripts/diagnose-favicon-api.mjs` 创建两个临时扩展与独立浏览器配置，不读取日常浏览器。Chrome for Testing 152 的结果：

| favicon 权限 | 查询 | 图片结果 |
| --- | --- | --- |
| 有 | pageUrl + size | 32 px 默认图标 |
| 有 | pageUrl + size + fallbackToHost | 32 px 默认图标 |
| 有 | 缺 pageUrl | 加载失败 |
| 无 | 上述三种查询 | 全部加载失败 |

测试 URL 使用保留的 `.invalid` 域名，没有提前填充缓存。结果见 `artifacts/favicon-review/api-diagnosis.json`。此测试证明权限与请求解析是可区分的故障条件，不能单凭它判定用户配置的根因。

## 用户环境证据边界

用户提供的多个不同网站请求均报 `net::ERR_FAILED`，查询包含合法的 pageUrl、size=32、fallbackToHost=1。用户随后提供的 `chrome.permissions.getAll()` 结果仅含 `bookmarks`、`storage`、`newTabPageOverride`，缺少 `favicon`。manifest 读回进一步确认运行实例版本为 `0.1.0`，只声明 `bookmarks`、`storage`，未声明 `favicon`。根因为 Chrome 注册的安装版本仍是旧清单。当前本地 0.3.7 构建声明 `bookmarks`、`storage`、`favicon`。应将完整新包覆盖原安装目录并在扩展管理页重新加载；仅刷新新标签页或只替换 JS/CSS 无法更新注册清单。保留原安装路径和扩展 ID，避免因卸载重装丢失扩展本地收藏设置。

## 一手来源

- [Chrome 官方 favicon 文档](https://developer.chrome.com/docs/extensions/how-to/ui/favicons)
- [Chrome 153 favicon 校验与缓存读取](https://github.com/chromium/chromium/blob/153.0.8010.48/chrome/browser/extensions/favicon/favicon_util.cc)
- [Chromium 扩展协议加载器](https://github.com/chromium/chromium/blob/main/extensions/browser/extension_protocols.cc)
- [Chrome 权限查询接口](https://developer.chrome.com/docs/extensions/reference/api/permissions#method-getAll)
