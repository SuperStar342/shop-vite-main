import Cookies from 'js-cookie'

const TokenKey = 'saber3-access-token'
const RefreshTokenKey = 'saber3-refresh-token'
const TokenExpireAtKey = 'saber3-token-expire-at'

/** saber3 默认 access_token_validity = 3600s */
export const DEFAULT_ACCESS_EXPIRES_IN = 3600

/** access cookie：略长于常见 access 有效期，续期时会重写 */
const ACCESS_COOKIE_DAYS = 1
/** refresh cookie：与后端 refresh_token_validity(默认 7 天) 对齐 */
const REFRESH_COOKIE_DAYS = 30

export function getToken() {
  return Cookies.get(TokenKey)
}

export function setToken(token: string) {
  return Cookies.set(TokenKey, token, { expires: ACCESS_COOKIE_DAYS })
}

export function getRefreshToken() {
  return Cookies.get(RefreshTokenKey)
}

export function setRefreshToken(token: string) {
  return Cookies.set(RefreshTokenKey, token, { expires: REFRESH_COOKIE_DAYS })
}

export function removeToken() {
  return Cookies.remove(TokenKey)
}

export function removeRefreshToken() {
  Cookies.remove(RefreshTokenKey)
  Cookies.remove(TokenExpireAtKey)
}

/** 从 JWT payload 读取 exp（毫秒）；非 JWT 或解析失败返回 0 */
export function peekJwtExpireAt(token?: string | null): number {
  const t = token || getToken()
  if (!t || !t.includes('.')) return 0
  try {
    const part = t.split('.')[1]
    if (!part) return 0
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    const exp = Number(payload?.exp)
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : 0
  } catch {
    return 0
  }
}

/** 记录 access_token 过期时间戳（ms） */
export function setTokenExpireAt(expiresInSeconds?: number | string | null) {
  const sec = Number(expiresInSeconds)
  if (!Number.isFinite(sec) || sec <= 0) {
    const jwtAt = peekJwtExpireAt()
    if (jwtAt > 0) {
      Cookies.set(TokenExpireAtKey, String(jwtAt), { expires: ACCESS_COOKIE_DAYS })
      return
    }
    Cookies.remove(TokenExpireAtKey)
    return
  }
  const at = Date.now() + sec * 1000
  Cookies.set(TokenExpireAtKey, String(at), { expires: ACCESS_COOKIE_DAYS })
}

export function getTokenExpireAt(): number {
  const raw = Cookies.get(TokenExpireAtKey)
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  // 旧会话无 expire-at 时回退 JWT exp，避免误判为「始终临近过期」导致疯狂 refresh
  return peekJwtExpireAt()
}

/** 是否临近过期（默认提前 10 分钟刷新；适配 saber3 1 小时 access） */
export function isTokenNearExpiry(skewMs = 10 * 60 * 1000): boolean {
  const at = getTokenExpireAt()
  if (!at) return !!getToken()
  return Date.now() >= at - skewMs
}
