[English](./README.md) | 中文

# netdisk-mcp-server

[![npm](https://img.shields.io/npm/v/@ptbsare/netdisk-mcp-server)](https://www.npmjs.com/package/@ptbsare/netdisk-mcp-server)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)

基于 MCP (Model Context Protocol) 的网盘操作服务器。集成 [夸克网盘](https://pan.quark.cn/) / [115网盘](https://115.com/) 文件浏览、转存、离线下载，以及 [PanSou](https://github.com/) 多平台资源搜索。

## 功能

| 工具 | 说明 |
|------|------|
| `list` | 列出夸克/115 网盘目录内容 |
| `view` | 查看分享链接中的文件列表，支持通配符过滤 |
| `transfer` | CP-Like 转存：从分享链接转存到你的网盘，支持路径通配符 |
| `offline_download` | 115 离线下载：提交磁力链接离线任务（自动安装 rss2cloud） |
| `search` | 多平台资源搜索：通过 PanSou 搜索 12+ 平台的分享链接和磁力链接 |
| `health` | 检查 PanSou 搜索 API 状态和可用插件 |

## 快速开始

> **推荐使用 `npx` 直接运行——无需安装。**

### MCP 配置（Claude Desktop / Claude Code）

在你的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "npx",
      "args": ["-y", "@ptbsare/netdisk-mcp-server"],
      "env": {
        "NETDISK_QUARK_COOKIE": "你的夸克Cookie",
        "NETDISK_115_COOKIE": "你的115Cookie",
        "PANSOU_URL": "http://你的PanSou实例地址"
      }
    }
  }
}
```

`npx -y` 会在每次启动时自动下载并运行最新版本，无需手动安装。

### 其他运行方式

```bash
# 全局安装后运行
npm install -g @ptbsare/netdisk-mcp-server
netdisk-mcp-server

# 从源码运行
git clone https://github.com/ptbsare/netdisk-mcp-server.git
cd netdisk-mcp-server && npm install && npm start
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `NETDISK_QUARK_COOKIE` | 夸克功能 | 夸克网盘 Cookie |
| `NETDISK_115_COOKIE` | 115 功能 | 115 网盘 Cookie |
| `PANSOU_URL` | 搜索功能 | PanSou API 端点地址 |
| `NETDISK_TIMEOUT` | 否 | 请求超时秒数（默认 30） |

也兼容 `CLOUD_TRANSFER_*` 前缀的环境变量名。

### 获取 Cookie

**夸克网盘** — 访问 https://pan.quark.cn/，登录后打开开发者工具（F12）→ Network，复制任意请求的 `Cookie` 头。

**115网盘** — 访问 https://115.com/，登录后打开开发者工具（F12）→ Network，复制任意请求的 `Cookie` 头。

## 工具说明

### `list` — 列出网盘目录

路径由内部自动解析，无需关心文件夹 ID。

```
list(cloud="quark", path="/")           → 列出夸克根目录
list(cloud="115",   path="/媒体库")     → 列出 115 的媒体库
```

### `view` — 查看分享链接

查看分享链接中的文件列表，支持通配符过滤。

```
view(share_link="https://pan.quark.cn/s/xxx", file_pattern="*.mp4")
view(share_link="https://115cdn.com/s/xxx?password=yyy", file_pattern="S01E01*")
```

支持的链接格式：
- 夸克：`https://pan.quark.cn/s/<id>`（可带 `?pwd=<提取码>`）
- 115：`https://115.com/s/<code>` 或 `https://115cdn.com/s/<code>`（可带 `?password=<提取码>`）

### `transfer` — CP-Like 转存

从分享链接转存文件到你的网盘。`source_pattern` 使用路径通配符。

```
transfer(share_link="...", source_pattern="/",                 target_path="/3670")
transfer(share_link="...", source_pattern="/Season 1/*.mp4",   target_path="/媒体库")
transfer(share_link="...", source_pattern="/Season 1/S01E01*", target_path="/媒体库")
```

`source_pattern` 规则：
- `/` — 分享中的所有文件
- `/Season 1` — "Season 1" 文件夹中的所有文件
- `/Season 1/*.mp4` — "Season 1" 中仅 .mp4 文件
- `/Season 1/S01E01*` — "Season 1" 中以 "S01E01" 开头的文件

注意：115 转存可能有延迟，文件需要一段时间才会出现在目标文件夹中。

### `offline_download` — 115 离线下载

提交磁力链接到 115 进行离线下载（服务端下载，不消耗本地带宽）。首次使用时会自动从 [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) 下载 rss2cloud 二进制。

```
offline_download(
  magnet_links=["magnet:?xt=urn:btih:xxx"],
  target_path="/媒体库/云下载电影"
)
```

### `search` — 多平台资源搜索

搜索 12+ 平台的资源，返回按网盘类型分组的分享链接和磁力链接。

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "magnet"])
search(query="电视剧", include=["合集"], exclude=["预告"])
```

支持的网盘类型：`quark`, `115`, `baidu`, `aliyun`, `tianyi`, `uc`, `mobile`, `pikpak`, `xunlei`, `123`, `magnet`, `ed2k`

### `health` — 检查 PanSou API

```
health()
```

## 典型工作流

```
1. search("流浪地球", cloud_types=["quark"])                          → 找到分享链接
2. view(share_link="https://...", file_pattern="*.mp4")               → 查看有哪些文件
3. transfer(share_link="...", source_pattern="/", target_path="/3670")→ 转存到你的网盘

1. search("电影", cloud_types=["magnet"])                              → 找到磁力链接
2. offline_download(magnet_links=["magnet:?xt=..."], target_path="/media") → 离线下载
```

## 致谢

- [rss2cloud](https://github.com/zhifengle/rss2cloud) by [zhifengle](https://github.com/zhifengle) — 115 离线下载引擎。二进制在首次使用时从 [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) 自动下载。

## 许可证

[GPL-3.0-only](./LICENSE) — 详见 [LICENSE](./LICENSE) 全文。

GitHub: https://github.com/ptbsare/netdisk-mcp-server
