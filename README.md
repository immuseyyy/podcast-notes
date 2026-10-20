# 播客速记

一个纯静态、零后端的播客笔记 PWA。订阅播客、边听边打点记笔记、导出 Markdown 到 Obsidian，所有数据只存在本地浏览器。

## 功能

- **订阅**：搜节目名（iTunes）、粘贴 RSS 地址、小宇宙单集链接导入
- **笔记**：播放时打点记录时间点，笔记按播客 → 单集分组
- **我的**：播放历史、收藏的单集、设置（代理、下载方式、云端同步、备份）
- **导出**：一键导出 Obsidian 兼容的 Markdown；JSON 备份/恢复换手机迁移
- **下载**：浏览器直接下载，或发送到 1DM/ADM 等外部下载器
- **云端同步**（可选）：通过自建 Cloudflare Worker + KV，多设备同步订阅、笔记、收藏、历史

## 架构

```
GitHub Pages（托管 index.html，纯静态）
    ├── 本地 localStorage：订阅、笔记、历史、收藏、设置
    ├── RSS 抓取：自建 Cloudflare Worker（主力）→ allorigins（备用）
    │   └── 直连优先：RSS 源带 CORS 头时直接抓，不走代理
    ├── GitHub Actions（可选）：每日预抓 RSS → data/feeds.json，每日代理健康检查
    └── 云端同步（可选）：Worker + KV，token 鉴权
```

单文件 `index.html` 即 App 本体，无构建步骤，无第三方 SDK。

## 自己用（最快）

1. Fork 或下载本仓库
2. 开 GitHub Pages：Settings → Pages → Deploy from a branch → `main` / `/ (root)`
3. 手机浏览器打开 `https://<用户名>.github.io/podcast-notes/` 即可使用
4. （可选）"添加到主屏幕"获得 App 般体验

## 进阶：自建代理与同步

默认用公共代理抓 RSS，速度和稳定性一般。建议部署自己的 Cloudflare Worker：

1. Cloudflare 注册（免费）→ Workers → Create → Hello World 模板
2. 把 `cloudflare-worker.js` 内容粘贴进去 → Deploy
3. App → 我的 → 设置 → 填入 Worker 地址模板：`https://xxx.workers.dev/?url={url}`
4. 需要多设备同步：在 Worker 的 KV 和环境变量里配好后，App 设置里填入同步口令

详见 `cloudflare-worker.js` 头部注释。

## 隐私

- 订阅、笔记、播放历史、收藏只存在浏览器本地（localStorage），不上传到任何服务器
- 开启云端同步后，数据存于你自己的 Cloudflare KV，需口令才能读写
- 本仓库只含 App 代码、代理名单和公开 RSS 预抓数据，不含任何个人数据

## 仓库内容

| 文件 | 说明 |
|---|---|
| `index.html` | App 本体（单文件） |
| `cloudflare-worker.js` | CORS 中转 + 云端同步的 Worker 脚本 |
| `proxies.json` | 公共代理名单（备用） |
| `data/subscriptions.json` | 预抓的订阅源清单（给 Actions 用） |
| `data/feeds.json` | Actions 每日预抓生成的订阅数据 |
| `.github/workflows/` | 每日 RSS 预抓、代理健康检查 |

## 说明

- 桌面端 Chrome / 移动端 Chrome、Edge、Firefox、Safari 均可使用
- 语音输入依赖浏览器 Web Speech API（需连接 Google 服务器），国内网络不可用，已移除；请用输入法自带语音输入
