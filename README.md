# netdisk-mcp-server

MCP (Model Context Protocol) Server for cloud storage operations. Combines [Quark](https://pan.quark.cn/) / [115](https://115.com/) drive browsing, file transfer, offline download, and [PanSou](https://github.com/) multi-platform resource search.

## Features

| Tool | Description |
|------|-------------|
| `list` | List files and folders in Quark or 115 drive |
| `view` | View files in a share link with glob filtering (`*.mp4`, `S01E01*`, etc.) |
| `transfer` | CP-like transfer from share link to your drive with path wildcard support |
| `offline_download` | Add 115 offline download tasks via magnet links (uses rss2cloud) |
| `search` | Search movies/TV shows across 12+ cloud platforms via PanSou API |
| `health` | Check PanSou API health and available plugins |

## Quick Start

### Install

```bash
git clone https://github.com/your-username/netdisk-mcp-server.git
cd netdisk-mcp-server
npm install
npm run build
```

### Environment Variables

```bash
# Required for list/view/transfer: Cloud drive cookies
export NETDISK_QUARK_COOKIE="your_quark_cookie"
export NETDISK_115_COOKIE="your_115_cookie"

# Required for search/health: PanSou API endpoint
export PANSOU_URL="http://192.168.195.122"

# Optional
export NETDISK_TIMEOUT="30"        # Request timeout in seconds (default: 30)
```

Legacy `CLOUD_TRANSFER_*` prefixes are also accepted.

### Getting Cookies

**Quark** - Visit https://pan.quark.cn/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

**115** - Visit https://115.com/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

## MCP Configuration

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "node",
      "args": ["/path/to/netdisk-mcp-server/dist/index.js"],
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

### `offline_download`

Add magnet link offline download tasks to 115 cloud drive (server-side download).

```
offline_download(
  magnet_links=["magnet:?xt=urn:btih:xxx", "magnet:?xt=urn:btih:yyy"],
  target_path="/媒体库"
)
```

### `search`

Search for resources across 12+ cloud platforms.

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "magnet"])
search(query="电影", source="plugin", include=["合集"], exclude=["预告"])
```

### `health`

Check PanSou API status and list available plugins.

```
health()
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
├── dist/            # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
