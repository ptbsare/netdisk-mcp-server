---
name: netdisk-mcp-server
description: Netdisk MCP Server — 夸克网盘和115网盘的文件浏览、转存、离线下载，以及PanSou多平台资源搜索。当用户需要查看网盘文件、转存分享链接、搜索影视资源、添加离线下载任务时使用此技能。
homepage: https://github.com/ptbsare/netdisk-mcp-server
metadata:
  {
    "openclaw":
      {
        "emoji": "☁️",
        "requires": { "anyBins": ["mcporter", "npx"], "env": ["NETDISK_QUARK_COOKIE", "NETDISK_115_COOKIE"] },
        "primaryEnv": "NETDISK_115_COOKIE",
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "@ptbsare/netdisk-mcp-server",
              "bins": ["netdisk-mcp-server"],
              "label": "Install @ptbsare/netdisk-mcp-server (node)",
            },
          ],
      },
  }
---

# Netdisk MCP Server

夸克网盘和115网盘的 MCP 操作服务器。支持文件浏览、CP-Like 转存、115 离线下载和 PanSou 多平台资源搜索。

## 什么时候使用？

**适用场景：**
- 浏览夸克/115 网盘目录内容
- 查看分享链接中的文件列表
- 从分享链接转存文件到自己的网盘（支持通配符过滤）
- 搜索电影、电视剧的网盘分享链接和磁力链接
- 添加 115 离线下载任务（磁力链接）

**不适用场景：**
- 文件在线播放
- 网盘账号管理
- 上传本地文件到网盘

## 前置要求

需要配置环境变量：
- `NETDISK_QUARK_COOKIE` — 夸克网盘 Cookie（用于夸克相关操作）
- `NETDISK_115_COOKIE` — 115 网盘 Cookie（用于 115 相关操作和离线下载）
- `PANSOU_URL` — PanSou API 地址（用于资源搜索，可选）

获取 Cookie 方法：登录对应网盘网站，打开浏览器开发者工具（F12）→ Network，复制任意请求的 `Cookie` 头。

## Usage

所有工具通过 `mcporter call netdisk.<tool>` 调用。

### 1. 浏览网盘目录

```shell
# 列出夸克根目录
mcporter call 'netdisk.list(cloud: "quark", path: "/")'

# 列出 115 网盘目录
mcporter call 'netdisk.list(cloud: "115", path: "/媒体库")'
```

### 2. 查看分享链接内容

```shell
# 查看夸克分享链接
mcporter call 'netdisk.view(share_link: "https://pan.quark.cn/s/bdbdca12824c")'

# 查看夸克分享链接（带提取码）
mcporter call 'netdisk.view(share_link: "https://pan.quark.cn/s/355379af69a8?pwd=BnxD")'

# 查看 115 分享链接，只看 mp4 文件
mcporter call 'netdisk.view(share_link: "https://115cdn.com/s/swfeyyj3zrk?password=eec5", file_pattern: "*.mp4")'
```

### 3. CP-Like 转存文件到自己的网盘

`source_pattern` 的最后一段支持通配符，类似 `cp` 命令。

```shell
# 转存分享中的所有文件到夸克 /3670 目录
mcporter call 'netdisk.transfer(share_link: "https://pan.quark.cn/s/bdbdca12824c", source_pattern: "/", target_path: "/3670")'

# 只转存 115 分享中的 mkv 文件到 /媒体库
mcporter call 'netdisk.transfer(share_link: "https://115cdn.com/s/swfry4r3zrk?password=t58d", source_pattern: "/Season 1/*.mkv", target_path: "/媒体库")'
```

### 4. 搜索资源

```shell
# 搜索夸克网盘资源
mcporter call 'netdisk.search(query: "肖申克的救赎", cloud_types: ["quark"])'

# 搜索磁力链接
mcporter call 'netdisk.search(query: "流浪地球", cloud_types: ["magnet"])'

# 高级搜索：包含/排除关键词
mcporter call 'netdisk.search(query: "电视剧", include: ["合集"], exclude: ["预告"])'
```

### 5. 115 离线下载

```shell
# 提交磁力链接到 115 离线下载
mcporter call 'netdisk.offline_download(magnet_links: ["magnet:?xt=urn:btih:xxx"], target_path: "/媒体库/云下载电影")'
```

### 6. 健康检查

```shell
# 检查 PanSou API 状态
mcporter call 'netdisk.health()'
```

## 典型工作流

```
搜索 → 查看 → 转存 / 离线下载

1. search("流浪地球", cloud_types=["quark"])       → 找到分享链接
2. view(share_link="...", file_pattern="*.mp4")    → 查看有哪些文件
3. transfer(share_link="...", source_pattern="/", target_path="/3670") → 转存

1. search("电影", cloud_types=["magnet"])           → 找到磁力链接
2. offline_download(magnet_links=["..."], target_path="/媒体库/云下载电影") → 离线下载
```

## Config

当提示 MCP 服务器不存在时，执行以下命令添加配置：

```shell
mcporter config add netdisk \
  --stdio "npx -y @ptbsare/netdisk-mcp-server" \
  --env "NETDISK_QUARK_COOKIE=${NETDISK_QUARK_COOKIE}" \
  --env "NETDISK_115_COOKIE=${NETDISK_115_COOKIE}" \
  --env "PANSOU_URL=${PANSOU_URL}"
```

## 通配符模式

| 模式 | 说明 |
|------|------|
| `*` | 所有文件 |
| `*.mp4` | 所有 MP4 文件 |
| `*.mkv` | 所有 MKV 文件 |
| `S01E01*` | 以 "S01E01" 开头的文件 |
| `*2160p*` | 包含 "2160p" 的文件 |

## About `mcporter`

- When command `mcporter` does not exist, use `npx -y mcporter` instead.
- https://github.com/steipete/mcporter
