# 性能

## 运行预算

- 六种框架效果按需加载，首屏先显示 CSS 配色。每次只有一个可见画布。
- 公共时钟空闲目标 20 fps，交互上限 30 fps；隐藏立即停绘，30 秒后释放资源，返回重建。
- 缓冲区最长边 2560、总像素不超过 400 万、DPR 上限 2。Paper 显式接收所选像素密度，避免尺寸观察器与浏览器 DPR 不一致时落到低分辨率。
- Paper 自动时钟关闭，用 setFrame 推进；指针 uniform 改变时另提交一次更新。Pixel Field 每帧一个 draw，无离屏纹理。Arc 使用 Canvas 2D，CRT 使用 WebGL 与离屏文字纹理。
- 切换时释放旧后端，用 CSS 配色承接，新画布淡入 900 ms；不同时渲染两个背景。过期异步结果释放资源。
- 玻璃仅覆盖导航、收藏条、设置与来源胶囊；材质纹理按尺寸缓存。设置和拖拽代码首次打开才加载。首屏 JS 预算 340 KB。

## 本机实测

2026-09-21，macOS / Chrome for Testing，生产扩展 0.3.2，1440 × 900、DPR 2。使用 mkdtemp 创建的全新 Chrome 配置，网络设为离线。测试脚本注入 rAF、WebGL drawArrays/drawElements 和可见 Canvas 2D 完整背景填充计数。

| 效果 | 白天 2 秒 draw / rAF | 黑夜 2 秒 draw / rAF | 超过 50 ms 的长任务 |
| --- | ---: | ---: | ---: |
| grain-gradient | 37 / 37 | 35 / 35 | [] |
| dithering | 37 / 37 | 36 / 36 | [] |
| pixel-blast（旧 Pixel Blast） | 72 / 36 | 72 / 36 | [] |
| data-pixel-arc | 32 / 32 | 33 / 33 | [] |
| crt-terminal | 36 / 36 | 37 / 37 | [] |
| shader-gradient | 76 / 38 | 70 / 35 | [] |

日间 CRT 的 10 秒稳定采样：190 次绘制、190 次 rAF，缓冲区 2529 × 1581。展开书签菜单的 5 秒采样：115 次绘制、0 个长任务、一个可见画布。

后台两次采样绘制计数保持相同，后一次画布已释放；返回恢复渲染，设置可打开。脚本错误为零。原始记录：`artifacts/performance/latest.json`。

上表为 2026-09-21 的记录，当时 Pixel Blast 仍为两个 GPU pass；2026-10-08 换成单 pass 的 Pixel Field 后，draw 数与 rAF 一致。Shader Gradient 的两个 GPU pass 使 draw 数约为 rAF 的两倍，不能与单 pass 或 Canvas 2D 的 draw 直接比较。计数反映调度和部分主线程工作，不代表 GPU 时间、功耗或电池续航。尚未做低性能设备和长期功耗测试。

## 体积与重现

首屏约 306.85 KB 原始 JS；Paper 约 58 KB、Pixel Field 约 7 KB（2026-10-08）、Arc 约 2 KB、CRT 约 22 KB、Shader Gradient 与 Fiber 约 384 KB，Three.js 共用分块约 737 KB。ZIP 525.33 KB。新增体积来自官方组件和 Fiber，背景仍不加载备用图片。12 个缩略图引用中，Shader Gradient 日夜共用一张，构建输出 11 张。Shader Gradient 像素密度上限为所选预设的 1。

```sh
pnpm check
node scripts/measure-performance.mjs
node scripts/review-favicons.mjs
```

需要本地 agent-browser 与 Chrome。两个脚本均只使用新建的临时 Chrome 配置和测试书签；结束关闭浏览器并删除本次临时目录，不清空用户扩展存储。

背景模拟时钟以 12 秒周期在原速度的 24%–40% 之间连续变化，帧率预算保持不变。设置回归中 3.00 秒墙钟推进了 0.82 秒 Shader Gradient 时间。`artifacts/settings-review/checks.json` 保存实际采样及布局、树形书签和显示开关检查。生产扩展另验证两个显示开关的 Chrome 存储读回、刷新持久化及入口恢复。
