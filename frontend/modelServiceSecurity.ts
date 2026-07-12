import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ALWAYS_BLOCKED_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.azure.internal',
]);

export function normalizeModelServiceUrl(value?: string): string {
  if (!value?.trim()) {
    throw new Error('请先在“模型服务”中配置 API Base URL。');
  }

  const normalized = value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|models)$/i, '');
  const url = new URL(normalized);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('模型服务地址只支持 HTTP 或 HTTPS。');
  }
  if (url.username || url.password) {
    throw new Error('模型服务地址不能包含用户名或密码。');
  }
  if (url.hash) {
    throw new Error('模型服务地址不能包含 URL 片段。');
  }
  if (ALWAYS_BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('该模型服务地址属于受保护的系统地址。');
  }

  return url.toString().replace(/\/$/, '');
}

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::' || normalized === '::1') return true;
  if (/^(fc|fd)/.test(normalized)) return true;
  if (/^fe[89ab]/.test(normalized)) return true;

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

export async function validateModelServiceUrl(
  value?: string,
  allowPrivateHosts = process.env.ALLOW_PRIVATE_MODEL_HOSTS === 'true',
): Promise<string> {
  const normalized = normalizeModelServiceUrl(value);
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    if (!allowPrivateHosts) throw new Error('当前环境不允许访问本机模型服务地址。');
    return normalized;
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname) && !allowPrivateHosts) {
      throw new Error('当前环境不允许访问私有网络模型服务地址。');
    }
    return normalized;
  }

  if (allowPrivateHosts) return normalized;

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some(item => isPrivateAddress(item.address))) {
    throw new Error('模型服务域名解析到了不允许访问的私有网络地址。');
  }
  return normalized;
}
