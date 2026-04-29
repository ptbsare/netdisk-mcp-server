#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { NetdiskClient } from './client.js';
import { PansouClient } from './pansou.js';

const config = loadConfig();
const client = new NetdiskClient(config);
const pansou = config.pansouUrl ? new PansouClient(config.pansouUrl) : null;

const server = new McpServer({
  name: 'netdisk-mcp-server',
  version: '2.0.0',
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
