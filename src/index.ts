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
  [
    'List files and folders in your Quark or 115 cloud drive.',
    'Returns numbered entries with [dir]/[file] type, name, size and ID.',
    '',
    'Examples:',
    '  list(cloud="quark", path="/")           → list Quark root',
    '  list(cloud="115",   path="/媒体库")     → list 115 媒体库 folder',
    '',
    'The path is resolved internally — you never need to know folder IDs.',
  ].join('\n'),
  {
    cloud: z.enum(['quark', '115']).describe('"quark" for 夸克网盘, "115" for 115网盘'),
    path: z.string().default('/').describe(
      'Directory path. Use "/" for root. Sub-folders like "/3670" or "/媒体库/电视剧".'
    ),
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
  [
    'View the file listing of a Quark or 115 share link.',
    'Returns file name, size, and the folder each file lives in.',
    '',
    'Supported link formats:',
    '  Quark: https://pan.quark.cn/s/<id>   (optionally with ?pwd=<code>)',
    '  115:   https://115.com/s/<code>       (optionally with ?password=<code>)',
    '  115:   https://115cdn.com/s/<code>    (optionally with ?password=<code>)',
    '',
    'file_pattern uses glob-style matching:',
    '  *              all files (default)',
    '  *.mp4          all MP4 files',
    '  *.mkv          all MKV files',
    '  S01E01*        files starting with "S01E01"',
    '  *2160p*        files containing "2160p"',
    '  exact.mp4      match exact filename',
  ].join('\n'),
  {
    share_link: z.string().describe('Full share link URL from Quark or 115'),
    file_pattern: z.string().default('*').describe(
      'Glob pattern to filter by filename. Use "*" for all, "*.mp4" for videos, "S01E01*" for a specific episode, etc.'
    ),
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

// ── Tool: transfer ──
server.tool(
  'transfer',
  [
    'Transfer files from a Quark or 115 share link into your own cloud drive.',
    'Uses CP-like path patterns: the last segment of source_pattern can contain wildcards.',
    '',
    'source_pattern rules:',
    '  /                        → all files in root of the share',
    '  /Season 1                → all files in "Season 1" folder',
    '  /Season 1/*.mp4          → only .mp4 files in "Season 1"',
    '  /Season 1/S01E01*        → files starting with "S01E01" in "Season 1"',
    '  /folder/subfolder/*.mkv  → .mkv files in a nested folder',
    '',
    'target_path is a path in YOUR drive (not the share). Examples: "/3670", "/媒体库/电视剧"',
    '',
    'Workflow: search → view → transfer',
    '  1. search("流浪地球", cloud_types=["quark"]) to find share links',
    '  2. view(share_link, "*.mp4") to see what files are available',
    '  3. transfer(share_link, "/Season 1/*.mp4", "/3670") to save them',
    '',
    'Note: 115 transfers may have a delay before files appear in the target folder.',
  ].join('\n'),
  {
    share_link: z.string().describe('Full share link URL from Quark or 115'),
    source_pattern: z.string().describe(
      'Path pattern inside the share. "/" = all files. The last segment supports wildcards: "/Season 1/*.mp4"'
    ),
    target_path: z.string().describe(
      'Destination path in YOUR cloud drive, e.g. "/3670", "/媒体库/电视剧". Path is resolved internally.'
    ),
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
  [
    'Add magnet link download tasks to 115 cloud drive.',
    '115 will download the files server-side — no local bandwidth needed.',
    '',
    'After adding the task, check progress in the 115 app "云下载" page.',
    'Downloaded files appear in the target_path directory.',
    '',
    'Typical workflow:',
    '  1. search("电影名", cloud_types=["magnet"]) to find magnet links',
    '  2. offline_download(magnet_links=[...], target_path="/媒体库/云下载电影")',
    '',
    'Note: 115 has offline download quota limits. Check 115 app for current limits.',
  ].join('\n'),
  {
    magnet_links: z.array(z.string()).describe(
      'Array of magnet links, e.g. ["magnet:?xt=urn:btih:abc123...", ...]'
    ),
    target_path: z.string().default('/').describe(
      'Target directory path in your 115 drive, e.g. "/媒体库/云下载电影"'
    ),
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
  [
    'Search for movies, TV shows and resources across 12+ cloud storage platforms.',
    'Returns share links (and optionally magnet links) grouped by cloud type.',
    '',
    'Results include: title, share URL, password (if any), date, and source.',
    '',
    'cloud_types filter:',
    '  quark    夸克网盘    baidu    百度网盘    aliyun   阿里云盘',
    '  115      115网盘     pikpak   PikPak      xunlei   迅雷网盘',
    '  tianyi   天翼云盘    uc       UC网盘      123      123网盘',
    '  magnet   磁力链接    ed2k     eD2K链接    mobile   移动云盘',
    '',
    'Examples:',
    '  search(query="肖申克的救赎")',
    '  search(query="权力的游戏", cloud_types=["quark", "115"])',
    '  search(query="电影", cloud_types=["magnet"])',
    '  search(query="电视剧", include=["合集"], exclude=["预告", "花絮"])',
  ].join('\n'),
  {
    query: z.string().describe('Search keyword — movie name, TV show name, or resource title'),
    cloud_types: z.array(z.string()).optional().describe(
      'Filter results to specific cloud platforms, e.g. ["quark", "magnet"]. Omit to search all.'
    ),
    source: z.enum(['all', 'tg', 'plugin']).default('all').describe(
      '"all" = all sources, "tg" = Telegram channels only, "plugin" = search plugins only'
    ),
    include: z.array(z.string()).optional().describe(
      'Only show results whose title contains ALL of these keywords, e.g. ["合集", "全集"]'
    ),
    exclude: z.array(z.string()).optional().describe(
      'Hide results whose title contains any of these keywords, e.g. ["预告", "花絮"]'
    ),
    refresh: z.boolean().default(false).describe('Set true to bypass cache and fetch fresh results'),
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
  [
    'Check connectivity and validity of all configured services:',
    '  - Quark cookie: attempts a lightweight API call to list Quark root',
    '  - 115 cookie: attempts a lightweight API call to list 115 root',
    '  - PanSou API: checks /api/health and lists available search plugins',
    '',
    'Use this to diagnose which services are working and which need attention.',
    'Each check runs independently — partial failures are reported, not fatal.',
  ].join('\n'),
  {},
  async () => {
    const lines: string[] = ['=== Health Check ===', ''];

    // Check Quark
    if (config.quarkCookie) {
      const quark = await client.checkQuarkCookie();
      lines.push(quark.ok ? `✅ Quark: ${quark.message}` : `❌ Quark: ${quark.message}`);
    } else {
      lines.push('⏭️  Quark: not configured (NETDISK_QUARK_COOKIE not set)');
    }

    // Check 115
    if (config.cookie115) {
      const c115 = await client.check115Cookie();
      lines.push(c115.ok ? `✅ 115: ${c115.message}` : `❌ 115: ${c115.message}`);
    } else {
      lines.push('⏭️  115: not configured (NETDISK_115_COOKIE not set)');
    }

    // Check PanSou
    if (pansou) {
      try {
        const data = await pansou.health();
        lines.push(`✅ PanSou: status ${data.status}`);
        if (data.plugins?.length) {
          lines.push(`   Plugins (${data.plugins.length}): ${data.plugins.join(', ')}`);
        }
      } catch (err: any) {
        lines.push(`❌ PanSou: ${err.message}`);
      }
    } else {
      lines.push('⏭️  PanSou: not configured (PANSOU_URL not set)');
    }

    const hasError = lines.some(l => l.startsWith('❌'));
    return { content: [{ type: 'text', text: lines.join('\n') }], isError: hasError };
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
