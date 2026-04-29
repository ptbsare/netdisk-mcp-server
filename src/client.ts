import axios, { AxiosInstance } from 'axios';
import { Config } from './config.js';

export interface ShareInfo {
  type: 'quark' | '115';
  pwdId?: string;
  passcode?: string;
  shareCode?: string;
  receiveCode?: string;
}

export interface FileItem {
  name: string;
  size: number;
  fid?: string;
  fileId?: string;
  token?: string;
  dir?: string;
}

export class NetdiskClient {
  private quarkClient: AxiosInstance;
  private client115: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    this.quarkClient = axios.create({
      baseURL: 'https://drive-h.quark.cn',
      timeout: config.timeout,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'cookie': config.quarkCookie,
      },
    });

    this.client115 = axios.create({
      baseURL: 'https://webapi.115.com',
      timeout: config.timeout,
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'cookie': config.cookie115,
        'referer': 'https://115.com/',
      },
    });
  }

  parseShareLink(shareLink: string): ShareInfo {
    // Quark: https://pan.quark.cn/s/355379af69a8?pwd=BnxD#/list/share
    if (shareLink.includes('quark.cn')) {
      const match = shareLink.match(/\/s\/([a-zA-Z0-9]+)/);
      if (match) {
        let passcode = '';
        try {
          const url = new URL(shareLink.split('#')[0]);
          passcode = url.searchParams.get('pwd') || '';
        } catch {}
        return { type: 'quark', pwdId: match[1], passcode };
      }
    } else if (/^[a-zA-Z0-9]{12}$/.test(shareLink)) {
      return { type: 'quark', pwdId: shareLink };
    }

    // 115: https://115cdn.com/s/swfeyyj3zrk?password=eec5
    if (shareLink.includes('115.com') || shareLink.includes('115cdn.com')) {
      const match = shareLink.match(/\/s\/([a-zA-Z0-9]+)/);
      if (match) {
        let receiveCode = '';
        try {
          const url = new URL(shareLink.split('#')[0]);
          receiveCode = url.searchParams.get('password') || '';
        } catch {}
        return { type: '115', shareCode: match[1], receiveCode };
      }
    }

    throw new Error('Unsupported share link format');
  }

  // ══════════════════════════════════════════════════════
  // Quark API
  // ══════════════════════════════════════════════════════

  async getQuarkToken(pwdId: string, passcode = ''): Promise<string> {
    const { data } = await axios.post('https://drive-h.quark.cn/1/clouddrive/share/sharepage/token', {
      pwd_id: pwdId,
      passcode,
    });
    if (data?.data?.stoken) return data.data.stoken;
    throw new Error(`Failed to get Quark token: ${data?.message || 'unknown error'}`);
  }

  async getQuarkShareTree(pwdId: string, stoken: string, pdirFid = '0', dirName = '/', maxDepth = 5): Promise<FileItem[]> {
    if (maxDepth <= 0) return [];
    const { data } = await this.quarkClient.get('/1/clouddrive/share/sharepage/detail', {
      params: { pwd_id: pwdId, stoken, pdir_fid: pdirFid, _size: '1000', _fetch_total: '1' },
    });
    if (!data?.data?.list) return [];

    const files: FileItem[] = [];
    for (const item of data.data.list) {
      if (item.file_type === 1) {
        files.push({ name: item.file_name, size: item.size, fid: item.fid, token: item.share_fid_token, dir: dirName });
      } else if (item.file_type === 0) {
        const sub = await this.getQuarkShareTree(pwdId, stoken, item.fid, item.file_name, maxDepth - 1);
        files.push(...sub);
      }
    }
    return files;
  }

  async listQuark(dirPath = '/'): Promise<string[]> {
    const fid = await this.resolveQuarkPathToFID(dirPath);
    const { data } = await this.quarkClient.get('/1/clouddrive/file/sort', {
      params: { pr: 'ucpro', fr: 'pc', pdir_fid: fid, _page: '1', _size: '1000', _fetch_total: 'false', _fetch_sub_dirs: '1' },
    });
    if (!data?.data?.list) return [];
    return data.data.list.map((item: any, i: number) => {
      const type = item.file_type === 1 ? 'file' : 'dir';
      const size = item.size ? ` (${formatSize(item.size)})` : '';
      return `${i + 1}. [${type}] ${item.file_name}${size} (ID: ${item.fid})`;
    });
  }

  async resolveQuarkPathToFID(targetPath: string): Promise<string> {
    if (/^[a-f0-9]{32,}$/i.test(targetPath)) return targetPath;
    if (targetPath === '/' || targetPath === '') return '0';

    const parts = targetPath.split('/').filter(Boolean);
    let currentFID = '0';
    for (const name of parts) {
      const { data } = await this.quarkClient.get('/1/clouddrive/file/sort', {
        params: { pr: 'ucpro', fr: 'pc', pdir_fid: currentFID, _page: '1', _size: '1000', _fetch_total: 'false', _fetch_sub_dirs: '1' },
      });
      const folder = data?.data?.list?.find((item: any) => item.file_name === name && item.file_type === 0);
      if (folder) currentFID = folder.fid;
      else throw new Error(`Folder not found in Quark: "${name}" (path: ${targetPath})`);
    }
    return currentFID;
  }

  // ══════════════════════════════════════════════════════
  // 115 API
  // ══════════════════════════════════════════════════════

  async get115ShareInfo(shareCode: string, receiveCode: string) {
    const { data } = await axios.get('https://webapi.115.com/share/snap', {
      params: { share_code: shareCode, receive_code: receiveCode },
      headers: { referer: `https://115.com/s/${shareCode}` },
    });
    if (data?.state) return data.data;
    throw new Error(`Failed to get 115 share info: ${data?.error || 'unknown error'}`);
  }

  async get115ShareTree(shareCode: string, receiveCode: string, cid = '', dirName = '/', maxDepth = 5): Promise<FileItem[]> {
    if (maxDepth <= 0) return [];
    const { data } = await axios.get('https://webapi.115.com/share/snap', {
      params: { share_code: shareCode, receive_code: receiveCode, cid, limit: 1000, offset: 0, asc: '0', format: 'json' },
      headers: { referer: `https://115.com/s/${shareCode}` },
    });
    if (!data?.state || !data.data?.list) return [];

    const files: FileItem[] = [];
    for (const item of data.data.list) {
      if (item.s > 0) {
        files.push({ name: item.n, size: item.s, fileId: item.fid || item.cid, dir: dirName });
      } else if (item.s === 0 && item.fc === 0) {
        const sub = await this.get115ShareTree(shareCode, receiveCode, item.cid, item.n, maxDepth - 1);
        files.push(...sub);
      }
    }
    return files;
  }

  async list115(dirPath = '/'): Promise<string[]> {
    const cid = await this.resolve115PathToCID(dirPath);
    const { data } = await this.client115.get('/files', {
      params: { cid, aid: 1, o: 'user_ptime', asc: 0, offset: 0, limit: 1000, show_dir: 1, snap: 0, natsort: 1 },
    });
    if (!data?.state) {
      throw new Error(`115 API error: ${data?.error || 'login expired, please refresh cookie'}`);
    }
    if (!data?.data?.length) return [];
    return data.data.map((item: any, i: number) => {
      const type = (item.fc === 1 || item.fc === '1') ? 'file' : 'dir';
      const size = item.s ? ` (${formatSize(item.s)})` : '';
      return `${i + 1}. [${type}] ${item.name || item.n}${size} (ID: ${item.cid})`;
    });
  }

  async resolve115PathToCID(targetPath: string): Promise<string> {
    if (/^\d+$/.test(targetPath)) return targetPath;
    if (targetPath === '/' || targetPath === '') return '0';

    const parts = targetPath.split('/').filter(Boolean);
    let currentCID = '0';
    for (const name of parts) {
      const { data } = await this.client115.get('/files', {
        params: { cid: currentCID, aid: 1, o: 'user_ptime', asc: 0, offset: 0, limit: 1000, show_dir: 1, snap: 0, natsort: 1 },
      });
      if (!data?.state) {
        throw new Error(`115 API error: ${data?.error || 'login expired, please refresh cookie'}`);
      }
      const folder = data?.data?.find((item: any) =>
        item.n === name && (item.fc === 0 || item.fc === '0' || item.s === 0)
      );
      if (folder) currentCID = folder.cid;
      else throw new Error(`Folder not found in 115: "${name}" (path: ${targetPath})`);
    }
    return currentCID;
  }

  // ══════════════════════════════════════════════════════
  // View
  // ══════════════════════════════════════════════════════

  async viewShare(shareLink: string, filePattern = '*'): Promise<string[]> {
    const info = this.parseShareLink(shareLink);
    let files: FileItem[];

    if (info.type === 'quark') {
      const stoken = await this.getQuarkToken(info.pwdId!, info.passcode || '');
      files = await this.getQuarkShareTree(info.pwdId!, stoken);
    } else {
      const shareData = await this.get115ShareInfo(info.shareCode!, info.receiveCode || '');
      files = await this.get115ShareTree(info.shareCode!, info.receiveCode || '', shareData.list?.[0]?.cid || '');
    }

    const filtered = filterFiles(files, filePattern);
    if (filtered.length === 0) return ['No files found'];

    const totalSize = filtered.reduce((s, f) => s + f.size, 0);
    return [
      `Share type: ${info.type}, Total: ${filtered.length} files (${formatSize(totalSize)})`,
      ...filtered.map((f, i) => `${i + 1}. ${f.name} (${formatSize(f.size)}) [${f.dir}]`),
    ];
  }

  // ══════════════════════════════════════════════════════
  // Transfer
  // ══════════════════════════════════════════════════════

  async transfer(shareLink: string, targetPath: string, filePattern = '*'): Promise<string> {
    const info = this.parseShareLink(shareLink);

    if (info.type === 'quark') {
      return this.transferQuark(info.pwdId!, info.passcode || '', targetPath, filePattern);
    } else {
      return this.transfer115(info.shareCode!, info.receiveCode || '', targetPath, filePattern);
    }
  }

  async transferRecursive(shareLink: string, sourcePattern: string, targetPath: string): Promise<string> {
    const info = this.parseShareLink(shareLink);

    // Extract file pattern from source path, e.g. "/folder/*S01E02*.mp4" -> "*S01E02*.mp4"
    let filePattern = '*';
    if (sourcePattern !== '/' && sourcePattern !== '') {
      const match = sourcePattern.match(/\/([^/]+)$/);
      if (match && match[1] !== '*') {
        filePattern = match[1];
      }
    }

    if (info.type === 'quark') {
      return this.transferQuark(info.pwdId!, info.passcode || '', targetPath, filePattern);
    } else {
      return this.transfer115(info.shareCode!, info.receiveCode || '', targetPath, filePattern);
    }
  }

  private async transferQuark(pwdId: string, passcode: string, targetPath: string, filePattern: string): Promise<string> {
    const stoken = await this.getQuarkToken(pwdId, passcode);
    const allFiles = await this.getQuarkShareTree(pwdId, stoken);
    const filtered = filterFiles(allFiles, filePattern);
    if (filtered.length === 0) return 'No matching files found';

    const targetFolderId = await this.resolveQuarkPathToFID(targetPath);
    const { data } = await this.quarkClient.post(
      `/1/clouddrive/share/sharepage/save?pr=ucpro&fr=pc&uc_param_str=&__t=${Date.now()}`,
      {
        fid_list: filtered.map(f => f.fid),
        fid_token_list: filtered.map(f => f.token),
        to_pdir_fid: targetFolderId,
        pwd_id: pwdId,
        stoken,
        pdir_fid: '0',
        scene: 'link',
      },
      { headers: { referer: `https://pan.quark.cn/s/${pwdId}`, origin: 'https://pan.quark.cn' } }
    );

    if (data?.status === 200 && data?.code === 0) {
      const taskData = data.data?.task_resp?.data || data.data;
      const count = taskData.save_as_sum_num || filtered.length;
      const size = formatSize(taskData.min_save_file_size || filtered.reduce((s, f) => s + f.size, 0));
      return `Transfer success: ${count} files (${size}) saved to ${targetPath}`;
    }
    return `Transfer failed: ${data?.message || JSON.stringify(data)}`;
  }

  private async transfer115(shareCode: string, receiveCode: string, targetPath: string, filePattern: string): Promise<string> {
    const shareData = await this.get115ShareInfo(shareCode, receiveCode);
    const rootCid = shareData.list?.[0]?.cid || '';
    const allFiles = await this.get115ShareTree(shareCode, receiveCode, rootCid);
    const filtered = filterFiles(allFiles, filePattern);
    if (filtered.length === 0) return 'No matching files found';

    const targetFolderId = await this.resolve115PathToCID(targetPath);

    const param = new URLSearchParams({
      cid: targetFolderId,
      share_code: shareCode,
      receive_code: receiveCode,
      file_id: filtered.map(f => f.fileId).join(','),
    });

    const { data } = await this.client115.post('/share/receive', param.toString());
    if (data?.state) {
      const count = data.data?.recv_file_count || filtered.length;
      const size = formatSize(data.data?.receive_size || filtered.reduce((s, f) => s + f.size, 0));
      return `Transfer success: ${count} files (${size}) to ${targetPath}. Note: 115 transfers may have delay.`;
    }
    return `Transfer failed: ${data?.error || 'Unknown error'}`;
  }
}

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

export function filterFiles(files: FileItem[], pattern: string): FileItem[] {
  if (!pattern || pattern === '*' || pattern === '.*') return files;
  if (pattern.includes('.') && !pattern.includes('*') && !pattern.includes('?')) {
    return files.filter(f => f.name === pattern);
  }

  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  if (pattern.endsWith('.mp4')) regexPattern = '^.*\\.mp4$';
  else if (pattern.endsWith('.mkv')) regexPattern = '^.*\\.mkv$';
  else if (pattern.endsWith('.avi')) regexPattern = '^.*\\.avi$';

  const regex = new RegExp(regexPattern, 'i');
  return files.filter(f => regex.test(f.name));
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}
