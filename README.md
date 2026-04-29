[中文文档](./README.zh-CN.md) | English

# netdisk-mcp-server

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

## Quick Start

### Run directly (recommended)

```bash
npx @ptbsare/netdisk-mcp-server
```

### Install globally

```bash
npm install -g @ptbsare/netdisk-mcp-server
netdisk-mcp-server
```

### From source

```bash
git clone https://github.com/ptbsare/netdisk-mcp-server.git
cd netdisk-mcp-server
npm install
npm run build
npm start
```

### Environment Variables

```bash
# Required for list/view/transfer: Cloud drive cookies
export NETDISK_QUARK_COOKIE="your_quark_cookie"
export NETDISK_115_COOKIE="your_115_cookie"

# Required for search/health: PanSou API endpoint
export PANSOU_URL="http://your-pansou-instance"

# Optional
export NETDISK_TIMEOUT="30"        # Request timeout in seconds (default: 30)
```

Legacy `CLOUD_TRANSFER_*` prefixes are also accepted.

### Getting Cookies

**Quark** - Visit https://pan.quark.cn/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

**115** - Visit https://115.com/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

## MCP Configuration

### Claude Desktop / Claude Code

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

## Tool Reference

### `list`

List directory contents. Path is resolved internally (no need for folder IDs).

```
list(cloud="quark", path="/movies")
list(cloud="115", path="/媒体库")
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

CP-like transfer from a share link to your drive. The `source_pattern` uses path wildcards.

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

`source_pattern` rules:
- `/` — all files in the share
- `/Season 1` — all files in "Season 1" folder
- `/Season 1/*.mp4` — only .mp4 files in "Season 1"
- `/Season 1/S01E01*` — files starting with "S01E01" in "Season 1"

Note: 115 transfers may have a delay before files appear in the target folder.

### `offline_download`

Add magnet link offline download tasks to 115 cloud drive (server-side download). The rss2cloud binary is automatically downloaded from [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) on first use.

```
offline_download(
  magnet_links=["magnet:?xt=urn:btih:xxx", "magnet:?xt=urn:btih:yyy"],
  target_path="/媒体库/云下载电影"
)
```

### `search`

Search for resources across 12+ cloud platforms.

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "magnet"])
search(query="电视剧", source="plugin", include=["合集"], exclude=["预告"])
```

Supported cloud types: `quark`, `115`, `baidu`, `aliyun`, `tianyi`, `uc`, `mobile`, `pikpak`, `xunlei`, `123`, `magnet`, `ed2k`

### `health`

Check PanSou API status and list available plugins.

```
health()
```

## Typical Workflow

```
1. search("流浪地球", cloud_types=["quark"])       → find share links
2. view(share_link="...", file_pattern="*.mp4")    → see available files
3. transfer(share_link="...", source_pattern="/", target_path="/3670") → transfer

1. search("电影", cloud_types=["magnet"])           → find magnet links
2. offline_download(magnet_links=["..."], target_path="/media/downloads") → offline download
```

## File Pattern Examples

| Pattern | Description |
|---------|-------------|
| `*` | All files |
| `*.mp4` | All MP4 files |
| `*.mkv` | All MKV files |
| `S01E01*` | Files starting with "S01E01" |
| `*2160p*` | Files containing "2160p" |

## Project Structure

```
netdisk-mcp-server/
├── src/
│   ├── index.ts     # MCP server entry point, tool definitions
│   ├── client.ts    # Quark & 115 drive API client
│   ├── config.ts    # Environment variable config
│   ├── pansou.ts    # PanSou search API client
│   └── offline.ts   # 115 offline download via rss2cloud
├── bin/             # Auto-downloaded rss2cloud binary (gitignored)
├── dist/            # Compiled output
├── package.json
├── tsconfig.json
├── LICENSE          # GPLv3
├── README.md        # English (this file)
└── README.zh-CN.md  # 中文文档
```

## Acknowledgments

- [rss2cloud](https://github.com/zhifengle/rss2cloud) by [zhifengle](https://github.com/zhifengle) — 115 offline download engine. The binary is auto-downloaded from [GitHub Releases](https://github.com/zhifengle/rss2cloud/releases) on first use.

## License

[GPL-3.0-only](./LICENSE)

GitHub: https://github.com/ptbsare/netdisk-mcp-server
