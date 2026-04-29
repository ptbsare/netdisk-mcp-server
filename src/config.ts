export interface Config {
  quarkCookie: string;
  cookie115: string;
  timeout: number;
  logLevel: string;
  pansouUrl: string;
}

export function loadConfig(): Config {
  const quarkCookie = process.env.NETDISK_QUARK_COOKIE || process.env.CLOUD_TRANSFER_QUARK_COOKIE || '';
  const cookie115 = process.env.NETDISK_115_COOKIE || process.env.CLOUD_TRANSFER_115_COOKIE || '';
  const timeout = parseInt(process.env.NETDISK_TIMEOUT || process.env.CLOUD_TRANSFER_TIMEOUT || '30', 10) * 1000;
  const logLevel = process.env.NETDISK_LOG_LEVEL || process.env.CLOUD_TRANSFER_LOG_LEVEL || 'info';
  const pansouUrl = (process.env.PANSOU_URL || '').replace(/\/+$/, '');

  return { quarkCookie, cookie115, timeout, logLevel, pansouUrl };
}
