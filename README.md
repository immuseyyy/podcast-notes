# 播客速记 · 独立版仓库

纯静态、零后台的播客速记 PWA。所有文件都在这个仓库里，不依赖任何第三方服务商的后台。

## 仓库内容

| 文件 | 说明 |
|---|---|
| `index.html` | App 本体（单文件，附件 zip 里已包含导出的成品，直接用） |
| `proxies.json` | 公共代理名单，App 启动时拉取并自动测速选用 |
| `cloudflare-worker.js` | 你自己的 CORS 中转 Worker 脚本（主力代理） |
| `data/subscriptions.json` | 订阅源清单（给定时预抓用的） |
| `data/feeds.json` | 定时预抓生成的订阅数据（由 Action 自动生成，不用手写） |
| `.github/workflows/health-check.yml` | 每天自动检测代理可用性，失效自动剔除 |
| `.github/workflows/fetch-feeds.yml` | 每天自动抓取订阅源，生成 `data/feeds.json` |

**隐私说明**：你的订阅、笔记、设置只存在手机浏览器本地（localStorage），永远不进这个仓库。仓库里只有代理名单和公开 RSS 数据，公开/私有仓库都无妨。

## 一次性搭建（约 20 分钟）

### 1. 建仓库并上传文件
1. GitHub → New repository，取名如 `podcast-notes`，Public/Private 均可
2. 把本 zip 解压后的**全部文件**上传到仓库根目录（含 `.github` 隐藏目录）
   - `index.html` 即 App 本体，放在根目录

### 2. 开 GitHub Pages（托管 App）
1. 仓库 Settings → Pages → Build and deployment
2. Source 选 `Deploy from a branch`，Branch 选 `main`，目录选 `/ (root)`，Save
3. 等 1–2 分钟，得到地址：`https://<你的用户名>.github.io/podcast-notes/`
4. 手机浏览器打开这个地址，就是你的独立版 App（建议 Firefox）

### 3. 部署 Cloudflare Worker（你自己的主力代理，约 10 分钟）
1. 注册 [cloudflare.com](https://cloudflare.com)（免费）
2. 左侧 Workers → Create → 选 `Hello World` 模板 → Create Worker
3. 把本仓库 `cloudflare-worker.js` 的**全部内容**粘贴进去，替换原有代码 → Deploy
4. 复制 Worker 地址（如 `https://xxx.workers.dev`）
5. 打开 App → 设置 → 自建代理地址，填入：`https://xxx.workers.dev/?url={url}`（`{url}` 占位符保留不要动）
6. 免费额度每天 10 万次请求，个人用绰绰有余

### 4. 完整 PWA 安装（可选）
App 设置里可以下载 `sw.js` 和 `manifest.json`，放到仓库根目录并提交，
之后从 Pages 地址"添加到主屏幕"，即为完整 PWA（离线可用）。

### 5. 加订阅源（给定时预抓用）
编辑 `data/subscriptions.json`，格式：
```json
[
  {"id": "shangye", "name": "商业就是这样", "feedUrl": "https://www.ximalaya.com/album/46587439.xml"}
]
```
提交后去 Actions 页面手动点一次 `Run workflow`（或等第二天自动跑），
`data/feeds.json` 就会生成。之后 App 启动直接读自家文件，不走代理。

## 日常运转（全自动）

- 每天 11:00（北京时间）：健康检查自动跑，失效代理自动剔除并提交
- 每天 11:30（北京时间）：RSS 预抓自动跑，`data/feeds.json` 自动更新
- App 内：小宇宙单集粘贴导入、搜节目名订阅走「Worker → 公共代理」自动故障转移

## 换手机迁移数据

App 设置 → 备份：导出全部数据 JSON → 新手机 App 设置 → 恢复：导入。
（另有 Obsidian 兼容的 Markdown 一键导出，单独备份笔记。）

## 说明

- 本独立版与闪退问题无关：已证实闪退是"点卡片跳转"动作触发的 Chromium 原生崩溃，
  与页面内容/后台无关。在手机上请继续用 Firefox 打开。
- 公共代理（allorigins）只是备胎，平时流量只走你自己的 Worker。
