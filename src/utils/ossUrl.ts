/**
 * MinIO / OSS 外链在浏览器侧常因跨域、桶权限、直连 9000 失败。
 * 开发环境通过 Vite `/oss-minio` 代理到 MinIO，保证 <img> 可预览。
 */

const MINIO_HOST_RE = /^https?:\/\/(127\.0\.0\.1|localhost)(:9000)?\//i

/** 将 MinIO 绝对地址转为同源代理路径，便于预览 */
export function toOssPreviewUrl(url?: string | null): string {
  if (!url) return ''
  const raw = String(url).trim()
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  if (raw.startsWith('/oss-minio/')) return raw
  if (MINIO_HOST_RE.test(raw)) {
    return raw.replace(MINIO_HOST_RE, '/oss-minio/')
  }
  // path-style: http://host:9000/bladex/...
  try {
    const u = new URL(raw)
    if ((u.port === '9000' || u.hostname.includes('minio')) && u.pathname) {
      return `/oss-minio${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return raw
}
