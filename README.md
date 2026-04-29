# netdisk-mcp-server

MCP (Model Context Protocol) Server for cloud storage operations. Combines [Quark](https://pan.quark.cn/) / [115](https://115.com/) drive browsing with [PanSou](https://github.com/) multi-platform resource search.

## Features

| Tool | Description |
|------|-------------|
| `list` | List files and folders in Quark or 115 drive |
| `view` | View files in a share link with glob filtering (`*.mp4`, `S01E01*`, etc.) |
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

### Configure Environment Variables

```bash
# Required for list/view: Cloud drive cookies
export NETDISK_QUARK_COOKIE="your_quark_cookie"
export NETDISK_115_COOKIE="your_115_cookie"

# Required for search/health: PanSou API endpoint
export PANSOU_URL="https://your-pansou-instance.com"

# Optional
export NETDISK_TIMEOUT="30"        # Request timeout in seconds (default: 30)
export NETDISK_LOG_LEVEL="info"    # Log level (default: info)
```

Legacy `CLOUD_TRANSFER_*` prefixes are also accepted:

| Primary | Legacy Fallback |
|---------|----------------|
| `NETDISK_QUARK_COOKIE` | `CLOUD_TRANSFER_QUARK_COOKIE` |
| `NETDISK_115_COOKIE` | `CLOUD_TRANSFER_115_COOKIE` |
| `NETDISK_TIMEOUT` | `CLOUD_TRANSFER_TIMEOUT` |

### Getting Cookies

**Quark** - Visit https://pan.quark.cn/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

**115** - Visit https://115.com/, log in, open DevTools (F12) -> Network, copy the `Cookie` header.

## MCP Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "node",
      "args": ["/path/to/netdisk-mcp-server/dist/index.js"],
      "env": {
        "NETDISK_QUARK_COOKIE": "your_quark_cookie",
        "NETDISK_115_COOKIE": "your_115_cookie",
        "PANSOU_URL": "https://your-pansou-instance.com"
      }
    }
  }
}
```

### Development Mode (no build required)

```json
{
  "mcpServers": {
    "netdisk": {
      "command": "npx",
      "args": ["tsx", "/path/to/netdisk-mcp-server/src/index.ts"],
      "env": {
        "NETDISK_QUARK_COOKIE": "your_quark_cookie",
        "NETDISK_115_COOKIE": "your_115_cookie",
        "PANSOU_URL": "https://your-pansou-instance.com"
      }
    }
  }
}
```

## Tool Reference

### `list`

List directory contents of Quark or 115 drive.

```
list(cloud="quark", path="/movies")
list(cloud="115", path="/downloads")
```

### `view`

View files in a share link with optional glob filtering.

```
view(share_link="https://pan.quark.cn/s/3d33c104c3eb", file_pattern="*.mp4")
view(share_link="https://115cdn.com/s/xxx?password=yyy", file_pattern="S01E01*")
```

### `search`

Search for movies, TV shows and resources across 12+ cloud platforms.

```
search(query="肖申克的救赎")
search(query="权力的游戏", cloud_types=["quark", "magnet"])
search(query="电影", source="plugin", include=["合集"], exclude=["预告"])
```

Supported cloud types: `baidu`, `aliyun`, `quark`, `tianyi`, `uc`, `mobile`, `115`, `pikpak`, `xunlei`, `123`, `magnet`, `ed2k`

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
│   └── pansou.ts    # PanSou search API client
├── dist/            # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
