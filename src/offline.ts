import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Config } from './config.js';
import { NetdiskClient } from './client.js';

const RSS2CLOUD_BIN = '/root/.openclaw/workspace-scout/skills/cloud-transfer-cli/scripts/rss2cloud';

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

    if (!fs.existsSync(RSS2CLOUD_BIN)) {
      throw new Error(`rss2cloud binary not found at ${RSS2CLOUD_BIN}`);
    }

    // Ensure binary is executable
    try {
      fs.accessSync(RSS2CLOUD_BIN, fs.constants.X_OK);
    } catch {
      fs.chmodSync(RSS2CLOUD_BIN, '755');
    }

    const targetFolderId = await this.client.resolve115PathToCID(targetPath);

    // Create temp cookie file (rss2cloud expects .cookies in cwd)
    const workDir = path.dirname(RSS2CLOUD_BIN);
    const cookieFile = path.join(workDir, '.cookies');
    const magnetFile = path.join(workDir, `magnets-${Date.now()}.txt`);

    try {
      // Write cookie file
      fs.writeFileSync(cookieFile, this.config.cookie115);

      // Write magnet links to temp file
      fs.writeFileSync(magnetFile, magnetLinks.join('\n'));

      const cmd = `${RSS2CLOUD_BIN} magnet --text "${magnetFile}" --cid ${targetFolderId}`;
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
      // Clean up temp files
      try { fs.unlinkSync(magnetFile); } catch {}
      try { fs.unlinkSync(cookieFile); } catch {}
    }
  }
}
