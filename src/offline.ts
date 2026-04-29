import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { Config } from './config.js';
import { NetdiskClient } from './client.js';

const RSS2CLOUD_VERSION = 'v0.2.3';
const RSS2CLOUD_BIN_DIR = '/root/netdisk-mcp-server/bin';
const RSS2CLOUD_BIN = path.join(RSS2CLOUD_BIN_DIR, 'rss2cloud');

function getDownloadURL(): { url: string; ext: string } {
  const base = `https://github.com/zhifengle/rss2cloud/releases/download/${RSS2CLOUD_VERSION}`;
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'linux' && arch === 'x64') {
    return { url: `${base}/rss2cloud-${RSS2CLOUD_VERSION}-linux-amd64-musl.tar.gz`, ext: 'tar.gz' };
  }
  if (platform === 'darwin' && arch === 'arm64') {
    return { url: `${base}/rss2cloud-${RSS2CLOUD_VERSION}-darwin-arm64.tar.gz`, ext: 'tar.gz' };
  }
  if (platform === 'win32' && arch === 'x64') {
    return { url: `${base}/rss2cloud-${RSS2CLOUD_VERSION}-windows-amd64.zip`, ext: 'zip' };
  }
  throw new Error(`No rss2cloud binary for ${platform}/${arch}. Supported: linux-x64, darwin-arm64, win32-x64`);
}

function downloadToBuffer(url: string, maxRedirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    https.get(url, { headers: { 'User-Agent': 'netdisk-mcp-server' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        return downloadToBuffer(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function ensureRss2cloud(): Promise<void> {
  if (fs.existsSync(RSS2CLOUD_BIN)) {
    try { fs.accessSync(RSS2CLOUD_BIN, fs.constants.X_OK); } catch {
      fs.chmodSync(RSS2CLOUD_BIN, '755');
    }
    console.error(`[netdisk] rss2cloud found at ${RSS2CLOUD_BIN}`);
    return;
  }

  fs.mkdirSync(RSS2CLOUD_BIN_DIR, { recursive: true });

  const { url, ext } = getDownloadURL();
  const tmpFile = path.join(RSS2CLOUD_BIN_DIR, `rss2cloud-${RSS2CLOUD_VERSION}.${ext}`);

  console.error(`[netdisk] rss2cloud not found, downloading ${RSS2CLOUD_VERSION}...`);
  console.error(`[netdisk] Download: ${url}`);

  const data = await downloadToBuffer(url);
  fs.writeFileSync(tmpFile, data);
  console.error(`[netdisk] Downloaded ${(data.byteLength / 1024 / 1024).toFixed(1)} MB, extracting...`);

  if (ext === 'zip') {
    execSync(`powershell -Command "Expand-Archive -Path '${tmpFile}' -DestinationPath '${RSS2CLOUD_BIN_DIR}' -Force"`, { timeout: 15000 });
  } else {
    execSync(`tar -xzf "${tmpFile}" -C "${RSS2CLOUD_BIN_DIR}"`, { timeout: 15000 });
  }

  // tarball may nest binary in a subdirectory
  if (!fs.existsSync(RSS2CLOUD_BIN)) {
    const found = execSync(
      `find "${RSS2CLOUD_BIN_DIR}" -maxdepth 3 -name rss2cloud -type f ! -name "*.tar.gz" ! -name "*.zip" 2>/dev/null | head -1`,
      { encoding: 'utf8' }
    ).trim();
    if (found) fs.copyFileSync(found, RSS2CLOUD_BIN);
  }

  if (fs.existsSync(RSS2CLOUD_BIN)) {
    fs.chmodSync(RSS2CLOUD_BIN, '755');
  }
  try { fs.unlinkSync(tmpFile); } catch {}

  console.error(`[netdisk] rss2cloud ${RSS2CLOUD_VERSION} installed → ${RSS2CLOUD_BIN}`);
}

export class OfflineDownloader {
  private client: NetdiskClient;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = new NetdiskClient(config);
  }

  async download(magnetLinks: string[], targetPath: string): Promise<string> {
    if (!this.config.cookie115) {
      throw new Error('115 cookie is required for offline download. Set NETDISK_115_COOKIE.');
    }

    await ensureRss2cloud();

    const targetFolderId = await this.client.resolve115PathToCID(targetPath);

    const workDir = path.dirname(RSS2CLOUD_BIN);
    const cookieFile = path.join(workDir, '.cookies');
    const magnetFile = path.join(workDir, `magnets-${Date.now()}.txt`);

    try {
      fs.writeFileSync(cookieFile, this.config.cookie115);
      fs.writeFileSync(magnetFile, magnetLinks.join('\n'));

      const cmd = `${RSS2CLOUD_BIN} magnet --text ${magnetFile} --cid ${targetFolderId}`;
      console.error(`[netdisk] Running: ${cmd}`);

      const result = execSync(cmd, {
        cwd: workDir,
        encoding: 'utf8',
        timeout: 30000,
      });

      const lines = [
        'Offline download task added successfully',
        `Tasks: ${magnetLinks.length}`,
        `Target: ${targetPath} (CID: ${targetFolderId})`,
        '',
        'Links:',
        ...magnetLinks.map((l, i) => `  ${i + 1}. ${l.length > 80 ? l.substring(0, 80) + '...' : l}`),
        '',
        'Check progress in 115 cloud drive "云下载" page.',
      ];

      if (result.trim()) {
        lines.push('', `rss2cloud output: ${result.trim()}`);
      }

      return lines.join('\n');
    } finally {
      try { fs.unlinkSync(magnetFile); } catch {}
      try { fs.unlinkSync(cookieFile); } catch {}
    }
  }
}
