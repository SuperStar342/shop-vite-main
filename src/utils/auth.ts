import Cookies from 'js-cookie'

const TokenKey = 'saber3-access-token'
const RefreshTokenKey = 'saber3-refresh-token'
const TokenExpireAtKey = 'saber3-token-expire-at'

/** access cookie：与后端 access_token_validity(默认 24h) 对齐，略留余量 */
const ACCESS_COOKIE_DAYS = 1
/** refresh cookie：与后端 refresh_token_validity(默认 30 天) 对齐 */
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

/** 记录 access_token 过期时间戳（ms） */
export function setTokenExpireAt(expiresInSeconds?: number | string | null) {
  const sec = Number(expiresInSeconds)
  if (!Number.isFinite(sec) || sec <= 0) {
    Cookies.remove(TokenExpireAtKey)
    return
  }
  const at = Date.now() + sec * 1000
  Cookies.set(TokenExpireAtKey, String(at), { expires: ACCESS_COOKIE_DAYS })
}

export function getTokenExpireAt(): number {
  const raw = Cookies.get(TokenExpireAtKey)
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/** 是否临近过期（默认提前 30 分钟刷新） */
export function isTokenNearExpiry(skewMs = 30 * 60 * 1000): boolean {
  const at = getTokenExpireAt()
  // 有 token 但无过期记录（冷启动/旧会话）时仍尝试续期，避免操作中途被踢
  if (!at) return !!getToken()
  return Date.now() >= at - skewMs
}
