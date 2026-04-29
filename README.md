[中文文档](./README.zh-CN.md) | English

# netdisk-mcp-server

[![npm](https://img.shields.io/npm/v/@ptbsare/netdisk-mcp-server)](https://www.npmjs.com/package/@ptbsare/netdisk-mcp-server)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)

MCP (Model Context Protocol) Server for cloud storage operations. Combines [Quark](https://pan.quark.cn/) / [115](https://115.com/) drive browsing, file transfer, offline download, and [PanSou](https://github.com/) multi-platform resource search.

## Features

| Tool | Description |
|------|-------------|
| `list` | List files and folders in Quark or 115 drive |
| `view` | View files in a share link with glob filtering (`*.mp4`, `S01E01*`, etc.) |
| `transfer` | CP-like transfer from share link to your drive with path wildcard support |
| `offline_download` | Add 115 offline download tasks via magnet links (auto-installs rss2cloud) |
| `search` | Search movies/TV shows across 12+ cloud platforms via PanSou API |
| `health` | Check PanSou API health and available plugins |

## Getting Started

> **Recommended: use `npx` — no installation required.**

### MCP Configuration (Claude Desktop / Claude Code)

Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "npx",
      "args": ["-y", "@ptbsare/netdisk-mcp-server"],
      "env": {
        "NETDISK_QUARK_COOKIE": "your_quark_cookie",
        "NETDISK_115_COOKIE": "your_115_cookie",
        "PANSOU_URL": "http://your-pansou-instance"
      }
    }
  }
}
```

`npx -y` automatically downloads and runs the latest version on every start — no manual install needed.

### Other ways to run

```bash
# Install globally
npm install -g @ptbsare/netdisk-mcp-server
netdisk-mcp-server

# From source
git clone https://github.com/ptbsare/netdisk-mcp-server.git
cd netdisk-mcp-server && npm install && npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETDISK_QUARK_COOKIE` | For Quark | Quark cloud drive cookie |
| `NETDISK_115_COOKIE` | For 115 | 115 cloud drive cookie |
| `PANSOU_URL` | For search | PanSou API endpoint URL |
| `NETDISK_TIMEOUT` | No | Request timeout in seconds (default: 30) |

Legacy `CLOUD_TRANSFER_*` prefixes are also accepted.

### Getting Cookies

**Quark** — Visit https://pan.quark.cn/, log in, open DevTools (F12) → Network, copy the `Cookie` header from any request.

**115** — Visit https://115.com/, log in, open DevTools (F12) → Network, copy the `Cookie` header from any request.

## Tool Reference

### `list`

List directory contents. Paths are resolved internally — no need for folder IDs.

```
list(cloud="quark", path="/movies")
list(cloud="115",   path="/媒体库")
```

### `view`

View files in a share link with optional glob filtering.

```
view(share_link="https://pan.quark.cn/s/xxx", file_pattern="*.mp4")
view(share_link="https://115cdn.com/s/xxx?password=yyy", file_pattern="S01E01*")
```

Supported link formats:
- Quark: `https://pan.quark.cn/s/<id>` (optionally with `?pwd=<code>`)
- 115: `https://115.com/s/<code>` or `https://115cdn.com/s/<code>` (optionally with `?password=<code>`)

### `transfer`

CP-like transfer from a share link to your drive. The `source_pattern` supports path wildcards.

```
transfer(share_link="...", source_pattern="/",                 target_path="/3670")
transfer(share_link="...", source_pattern="/Season 1/*.mp4",   target_path="/媒体库")
transfer(share_link="...", source_pattern="/Season 1/S01E01*", target_path="/媒体库")
```

`source_pattern` rules:
- `/` — all files in the share
- `/Season 1` — all files in "Season 1" folder
- `/Season 1/*.mp4` — only .mp4 files in "Season 1"
- `/Season 1/S01E01*` — files starting with "S01E01" in "Season 1"

Note: 115 transfers may have a delay before files appear in the target folder.

### `offline_download`

Add magnet link offline download tasks to 115 cloud drive (server-side, no local bandwidth needed). The [rss2cloud](https://github.com/zhifengle/rss2cloud) binary is automatically downloaded on first use.

```
offline_download(
  magnet_links=["magnet:?xt=urn:btih:xxx"],
  target_path="/媒体库/云下载电影"
)
```

### `search`

Search for resources across 12+ cloud platforms via PanSou API.

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "magnet"])
search(query="电视剧", include=["合集"], exclude=["预告"])
```

Supported cloud types: `quark`, `115`, `baidu`, `aliyun`, `tianyi`, `uc`, `mobile`, `pikpak`, `xunlei`, `123`, `magnet`, `ed2k`

### `health`

Check connectivity and validity of all configured services in one call:
- **Quark cookie** — attempts a lightweight API call to verify the cookie works
- **115 cookie** — attempts a lightweight API call to verify the cookie works
- **PanSou API** — checks /api/health and lists available search plugins

Each check runs independently — partial failures are reported, not fatal.

```
health()
```

Example output:
```
=== Health Check ===

✅ Quark: Quark cookie is valid
✅ 115: 115 cookie is valid
✅ PanSou: status ok
   Plugins (43): ddys, erxiao, jutoushe, labi, ...
```

## Typical Workflow

```
1. search("流浪地球", cloud_types=["quark"])                          → find share links
2. view(share_link="https://...", file_pattern="*.mp4")               → preview files
3. transfer(share_link="...", source_pattern="/", target_path="/3670")→ transfer to your drive

1. search("电影", cloud_types=["magnet"])                              → find magnet links
2. offline_download(magnet_links=["magnet:?xt=..."], target_path="/media") → offline download
```

## Acknowledgments

- [rss2cloud](https://github.com/zhifengle/rss2cloud) by [zhifengle](https://github.com/zhifengle) — 115 offline download engine. Auto-downloaded from [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) on first use.

## License

[GPL-3.0-only](./LICENSE) — See [LICENSE](./LICENSE) for full text.

GitHub: https://github.com/ptbsare/netdisk-mcp-server
