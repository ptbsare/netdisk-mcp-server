#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { NetdiskClient } from './client.js';
import { PansouClient } from './pansou.js';
import { OfflineDownloader } from './offline.js';

const config = loadConfig();
const client = new NetdiskClient(config);
const pansou = config.pansouUrl ? new PansouClient(config.pansouUrl) : null;
const downloader = new OfflineDownloader(config);

const server = new McpServer({
  name: 'netdisk-mcp-server',
  version: '3.0.0',
});

// ── Tool: list ──
server.tool(
  'list',
  'List files and folders in a cloud drive directory. Supports Quark and 115.',
  {
    cloud: z.enum(['quark', '115']).describe('Cloud drive type'),
    path: z.string().default('/').describe('Directory path to list, e.g. "/" or "/movies"'),
  },
  async ({ cloud, path }) => {
    try {
      const lines = cloud === 'quark'
        ? await client.listQuark(path)
        : await client.list115(path);

      if (lines.length === 0) return { content: [{ type: 'text', text: 'Directory is empty or not found' }] };

      return {
        content: [{ type: 'text', text: `Listing ${cloud} drive: ${path}\n\n${lines.join('\n')}` }],
      };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Tool: view ──
server.tool(
  'view',
  'View files in a share link from Quark or 115 cloud drive. Supports glob patterns like *.mp4',
  {
    share_link: z.string().describe('Full share link URL'),
    file_pattern: z.string().default('*').describe('Glob pattern to filter files, e.g. "*.mp4", "S01E01*"'),
  },
  async ({ share_link, file_pattern }) => {
    try {
      const lines = await client.viewShare(share_link, file_pattern);
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Tool: transfer (CP-like) ──
server.tool(
  'transfer',
  'Transfer files from a share link to a target directory using CP-like path patterns. Supports wildcards in the last path segment, e.g. "/folder/*S01E02*.mp4". Works for both Quark and 115 shares.',
  {
    share_link: z.string().describe('Full share link URL'),
    source_pattern: z.string().describe('Source path pattern from the share. Use "/" for all files, "/folder/*" for all in folder, "/folder/*.mp4" for mp4 in folder'),
    target_path: z.string().describe('Target directory path in your drive, e.g. "/3670", "/媒体库"'),
  },
  async ({ share_link, source_pattern, target_path }) => {
    try {
      const result = await client.transferRecursive(share_link, source_pattern, target_path);
      return { content: [{ type: 'text', text: result }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Tool: offline_download ──
server.tool(
  'offline_download',
  'Add offline download task to 115 cloud drive using magnet links. Downloads are processed server-side by 115.',
  {
    magnet_links: z.array(z.string()).describe('Array of magnet link URLs'),
    target_path: z.string().default('/').describe('Target directory path in 115 drive, e.g. "/downloads"'),
  },
  async ({ magnet_links, target_path }) => {
    try {
      const result = await downloader.download(magnet_links, target_path);
      return { content: [{ type: 'text', text: result }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Tool: search ──
server.tool(
  'search',
  'Search for movies, TV shows and other resources across 12+ cloud storage platforms via PanSou API. Returns share links and magnet links.',
  {
    query: z.string().describe('Search query (movie/TV show name)'),
    cloud_types: z.array(z.string()).optional().describe('Filter by cloud types: baidu,aliyun,quark,tianyi,uc,mobile,115,pikpak,xunlei,123,magnet,ed2k'),
    source: z.enum(['all', 'tg', 'plugin']).default('all').describe('Data source: all, tg, plugin'),
    include: z.array(z.string()).optional().describe('Keywords that must be present in results'),
    exclude: z.array(z.string()).optional().describe('Keywords to exclude from results'),
    refresh: z.boolean().default(false).describe('Force refresh, bypass cache'),
  },
  async ({ query, cloud_types, source, include, exclude, refresh }) => {
    if (!pansou) {
      return { content: [{ type: 'text', text: 'Error: PANSOU_URL environment variable is not set' }], isError: true };
    }
    try {
      const result = await pansou.search({ query, cloudTypes: cloud_types, source, include, exclude, refresh });

      if (result.total === 0) {
        return { content: [{ type: 'text', text: `No results found for "${query}"` }] };
      }

      const lines: string[] = [`Found ${result.total} results for "${query}":`, ''];

      for (const [type, items] of Object.entries(result.merged_by_type)) {
        lines.push(`=== ${type} (${items.length}) ===`);
        for (const item of items) {
          lines.push(`  ${item.note}`);
          lines.push(`    Link: ${item.url}`);
          if (item.password) lines.push(`    Password: ${item.password}`);
          lines.push(`    Date: ${item.datetime?.split('T')[0] || 'N/A'} | Source: ${item.source}`);
        }
        lines.push('');
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Tool: health ──
server.tool(
  'health',
  'Check PanSou API health status and list available plugins.',
  {},
  async () => {
    if (!pansou) {
      return { content: [{ type: 'text', text: 'Error: PANSOU_URL environment variable is not set' }], isError: true };
    }
    try {
      const data = await pansou.health();
      const lines = [`Status: ${data.status}`, ''];
      if (data.plugins?.length) {
        lines.push(`Available plugins (${data.plugins.length}):`);
        for (const p of data.plugins) {
          lines.push(`  - ${p}`);
        }
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── Start ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('netdisk-mcp-server started');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
