# 性能

## 运行预算

- 六种框架效果按需加载，首屏先显示 CSS 配色（首屏缓存记住上次的背景色）。稳定状态只有一个可见画布，切换淡入期间最多两个。
- 帧率由 `rate-policy.ts` 决定：默认 20 fps，指针绘制类背景移动时 30 fps，电池 15，失焦超过 15 秒或设置打开 10，2 分钟无输入 5，10 分钟无输入停在当前帧。绘制只发生在 rAF 回调内。隐藏立即停绘，10 秒后释放资源，返回重建。细节见[架构](architecture.md#帧率策略)。
- 缓冲区最长边 2560、总像素不超过 400 万、DPR 上限 2；Grain Gradient 密度上限 1.25，使用电池时所有背景上限 1。Paper 显式接收所选像素密度，避免尺寸观察器与浏览器 DPR 不一致时落到低分辨率。
- Paper 自动时钟关闭，用 setFrame 推进；指针 uniform 改变时另提交一次更新。Pixel Field 每帧一个 draw，无离屏纹理。Arc 使用 Canvas 2D，CRT 使用 WebGL 与离屏文字纹理。
- 切换时新场景在旧场景上淡入（首次 350 ms，切换 600 ms），淡入期间旧画面冻结、不再绘制，结束后释放。过期异步结果释放资源。
- 玻璃仅覆盖导航、收藏条、设置与来源胶囊；材质纹理按尺寸缓存。设置和拖拽代码首次打开才加载，书签菜单空闲时预取。首屏 JS 预算 265 KB。

## 第二阶段基础设施对比（2026-10-08）

对比 `artifacts/performance/phase2-baseline-5fc04f8.json`（提交 5fc04f8）与 `phase2-infra.json`（提交 ca7d41c，内容与 d451249 相同）。两次均由 `scripts/measure-performance.mjs` 采集：生产扩展，1440 × 900、DPR 2，离线，冷启动 5 次，空闲、书签菜单、设置与后台采样使用日间 CRT。两次之间加入了纯 rAF 帧循环、帧率策略、淡入切换与上下文丢失恢复、Grain 密度上限，并把 Pixel Blast 换成 Pixel Field；首屏缓存和 Base UI 在 ca7d41c 之后，不在对比范围内。

| 指标                                   |                                             基线 5fc04f8 |                                    基础设施 ca7d41c |
| -------------------------------------- | -------------------------------------------------------: | --------------------------------------------------: |
| 冷启动到背景就绪（中位数）             |                                                  48.7 ms |                                             25.3 ms |
| 首次内容绘制（中位数）                 |                                                  1000 ms |                                              964 ms |
| 冷启动长任务                           |                                                        0 |                                                   0 |
| 单个效果 2 秒 draw / rAF               | 约 35–37 / 同数；Pixel Blast、Shader Gradient 约 72 / 36 | 40 / 120；Pixel Field、Shader Gradient 80 / 120–121 |
| 空闲 10 秒 draw / rAF                  |                                                191 / 191 |                                           200 / 600 |
| 展开书签菜单 5 秒 draw / rAF           |                                                118 / 118 |                                           100 / 300 |
| 设置打开 5 秒 draw / rAF               |                                                100 / 100 |                                            50 / 149 |
| 隐藏后画布释放（1.5 / 12 / 32 秒采样） |                                          32 秒采样时释放 |                                     12 秒采样时释放 |
| Grain 缓冲区                           |                                              2529 × 1580 |                                         1800 × 1125 |
| 运行错误                               |                                                        0 |                                                   0 |

- 基线用定时器调度，draw 数等于 rAF 数，实际约 18 fps。基础设施版本的 rAF 回调按显示器频率（约 60 Hz）触发，只在帧槽到达时绘制，绘制稳定在 20 fps。rAF 数变多不代表绘制变多；空回调只比较时间戳。
- 设置打开时降到 10 fps，绘制减半；展开书签菜单不再提高帧率。
- 隐藏释放时间从 30 秒改为 10 秒。隐藏期间两版均不再绘制。
- Pixel Field 与 Shader Gradient 每帧计到 2 次 draw，绘制帧率同为 20 fps。Pixel Field 源码每帧只调用一次 `drawArrays`，计数翻倍的原因尚未查明。
- Grain Gradient 的像素约减半（密度 1.25）；Shader Gradient 两次均为 1440 × 900。
- 计数不代表 GPU 时间、功耗或电池续航。

## 0.3.2 实测（历史）

2026-09-21，macOS / Chrome for Testing，生产扩展 0.3.2，1440 × 900、DPR 2。使用 mkdtemp 创建的全新 Chrome 配置，网络设为离线。测试脚本注入 rAF、WebGL drawArrays/drawElements 和可见 Canvas 2D 完整背景填充计数。

| 效果                          | 白天 2 秒 draw / rAF | 黑夜 2 秒 draw / rAF | 超过 50 ms 的长任务 |
| ----------------------------- | -------------------: | -------------------: | ------------------: |
| grain-gradient                |              37 / 37 |              35 / 35 |                  [] |
| dithering                     |              37 / 37 |              36 / 36 |                  [] |
| pixel-blast（旧 Pixel Blast） |              72 / 36 |              72 / 36 |                  [] |
| data-pixel-arc                |              32 / 32 |              33 / 33 |                  [] |
| crt-terminal                  |              36 / 36 |              37 / 37 |                  [] |
| shader-gradient               |              76 / 38 |              70 / 35 |                  [] |

日间 CRT 的 10 秒稳定采样：190 次绘制、190 次 rAF，缓冲区 2529 × 1581。展开书签菜单的 5 秒采样：115 次绘制、0 个长任务、一个可见画布。

后台两次采样绘制计数保持相同，后一次画布已释放；返回恢复渲染，设置可打开。脚本错误为零。原始记录：`artifacts/performance/latest.json`。

上表为 2026-09-21 的记录，当时 Pixel Blast 仍为两个 GPU pass；2026-10-08 换成 Pixel Field 后，第二阶段测量中每帧仍计到 2 次 draw（见上节）。Shader Gradient 的两个 GPU pass 使 draw 数约为 rAF 的两倍，不能与单 pass 或 Canvas 2D 的 draw 直接比较。计数反映调度和部分主线程工作，不代表 GPU 时间、功耗或电池续航。尚未做低性能设备和长期功耗测试。

## 体积与重现

首屏约 306.85 KB 原始 JS；Paper 约 58 KB、Pixel Field 约 7 KB（2026-10-08）、Arc 约 2 KB、CRT 约 22 KB、Shader Gradient 与 Fiber 约 384 KB，Three.js 共用分块约 737 KB。ZIP 525.33 KB。新增体积来自官方组件和 Fiber，背景仍不加载备用图片。12 个缩略图引用中，Shader Gradient 日夜共用一张，构建输出 11 张。Shader Gradient 像素密度上限为所选预设的 1。

```sh
pnpm check
pnpm perf:measure [name]
node scripts/review-favicons.mjs
```

需要本地 agent-browser 与 Chrome。两个脚本均只使用新建的临时 Chrome 配置和测试书签；结束关闭浏览器并删除本次临时目录，不清空用户扩展存储。

背景模拟时钟以 12 秒周期在原速度的 24%–40% 之间连续变化，帧率预算保持不变。设置回归中 3.00 秒墙钟推进了 0.82 秒 Shader Gradient 时间。`artifacts/settings-review/checks.json` 保存实际采样及布局、树形书签和显示开关检查。生产扩展另验证两个显示开关的 Chrome 存储读回、刷新持久化及入口恢复。
