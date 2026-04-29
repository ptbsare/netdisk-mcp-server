[English](./README.md) | 中文

# netdisk-mcp-server

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

### 直接使用（推荐）

```bash
npx @ptbsare/netdisk-mcp-server
```

### 本地安装

```bash
npm install -g @ptbsare/netdisk-mcp-server
netdisk-mcp-server
```

### 环境变量

```bash
# 列出/查看/转存功能所需的网盘 Cookie
export NETDISK_QUARK_COOKIE="你的夸克Cookie"
export NETDISK_115_COOKIE="你的115Cookie"

# 搜索/健康检查功能所需的 PanSou API 地址
export PANSOU_URL="http://你的PanSou实例地址"

# 可选
export NETDISK_TIMEOUT="30"        # 请求超时秒数（默认 30）
```

也兼容 `CLOUD_TRANSFER_*` 前缀的环境变量名。

### 获取 Cookie

**夸克网盘** — 访问 https://pan.quark.cn/，登录后打开开发者工具（F12）→ Network，复制任意请求的 `Cookie` 头。

**115网盘** — 访问 https://115.com/，登录后打开开发者工具（F12）→ Network，复制任意请求的 `Cookie` 头。

## MCP 配置

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "npx",
      "args": ["-y", "@ptbsare/netdisk-mcp-server"],
      "env": {
        "NETDISK_QUARK_COOKIE": "你的夸克Cookie",
        "NETDISK_115_COOKIE": "你的115Cookie",
        "PANSOU_URL": "http://你的PanSou实例"
      }
    }
  }
}
```

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
transfer(
  share_link="https://pan.quark.cn/s/bdbdca12824c",
  source_pattern="/",
  target_path="/3670"
)

transfer(
  share_link="https://115cdn.com/s/swfeyyj3zrk?password=eec5",
  source_pattern="/Season 1/*.mp4",
  target_path="/媒体库"
)
```

`source_pattern` 规则：
- `/` — 分享中的所有文件
- `/Season 1` — "Season 1" 文件夹中的所有文件
- `/Season 1/*.mp4` — "Season 1" 中仅 .mp4 文件
- `/Season 1/S01E01*` — "Season 1" 中以 "S01E01" 开头的文件
- `/folder/subfolder/*.mkv` — 嵌套文件夹中的 .mkv 文件

注意：115 转存可能有延迟，文件需要一段时间才会出现在目标文件夹中。

### `offline_download` — 115 离线下载

提交磁力链接到 115 进行离线下载（服务端下载，不消耗本地带宽）。首次使用时会自动从 [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) 下载 rss2cloud 二进制。

```
offline_download(
  magnet_links=["magnet:?xt=urn:btih:abc123..."],
  target_path="/媒体库/云下载电影"
)
```

添加任务后在 115 App 的"云下载"页面查看进度。

### `search` — 多平台资源搜索

搜索 12+ 平台的资源，返回按网盘类型分组的分享链接和磁力链接。

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "115"])
search(query="流浪地球", cloud_types=["magnet"])
search(query="电视剧", include=["合集"], exclude=["预告", "花絮"])
```

支持的网盘类型：`quark`, `115`, `baidu`, `aliyun`, `tianyi`, `uc`, `mobile`, `pikpak`, `xunlei`, `123`, `magnet`, `ed2k`

### `health` — 检查 PanSou API

```
health()
```

## 通配符模式

| 模式 | 说明 |
|------|------|
| `*` | 所有文件 |
| `*.mp4` | 所有 MP4 文件 |
| `*.mkv` | 所有 MKV 文件 |
| `S01E01*` | 以 "S01E01" 开头的文件 |
| `*2160p*` | 包含 "2160p" 的文件 |

## 典型工作流

```
1. search("流浪地球", cloud_types=["quark"])     → 找到分享链接
2. view(share_link="...", file_pattern="*.mp4")   → 查看有哪些文件
3. transfer(share_link="...", source_pattern="/", target_path="/3670") → 转存

1. search("电影", cloud_types=["magnet"])         → 找到磁力链接
2. offline_download(magnet_links=["..."], target_path="/媒体库/云下载电影") → 离线下载
```

## 项目结构

```
netdisk-mcp-server/
├── src/
│   ├── index.ts     # MCP 服务器入口、工具定义
│   ├── client.ts    # 夸克/115 网盘 API 客户端
│   ├── config.ts    # 环境变量配置
│   ├── pansou.ts    # PanSou 搜索 API 客户端
│   └── offline.ts   # 115 离线下载（自动安装 rss2cloud）
├── bin/             # 自动下载的 rss2cloud 二进制（已 gitignore）
├── dist/            # 编译输出
├── package.json
├── tsconfig.json
├── LICENSE          # GPLv3
├── README.md        # 英文文档
└── README.zh-CN.md  # 中文文档（本文件）
```

## 致谢

- [rss2cloud](https://github.com/zhifengle/rss2cloud) by [zhifengle](https://github.com/zhifengle) — 115 离线下载引擎。二进制在首次使用时从 [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) 自动下载。

## 许可证

[GPL-3.0-only](./LICENSE)

GitHub: https://github.com/ptbsare/netdisk-mcp-server
