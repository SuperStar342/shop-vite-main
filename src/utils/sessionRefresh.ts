/**
 * 全站唯一的 access_token 续期入口（singleflight）。
 * 避免保活定时器与 axios 拦截器并发 refresh，导致 refresh_token 轮换后旧请求误踢登录。
 */
import { getRefreshToken, getToken, getTokenExpireAt, isTokenNearExpiry } from '/@/utils/auth'
import { validatenull } from '/@/utils/validate'
import { useUserStore } from '/@/store/modules/user'

let inflight: Promise<boolean> | null = null

const stillHasFreshSession = () => {
  if (!getToken() || validatenull(getRefreshToken() ?? '')) return false
  const at = getTokenExpireAt()
  if (at > Date.now() + 60_000) return true
  return !isTokenNearExpiry(60_000)
}

/**
 * @param force 为 true 时忽略临近过期判断，强制走一次 refresh
 * @returns 续期后是否仍有可用登录态
 */
export const refreshSessionIfNeeded = async (force = false): Promise<boolean> => {
  if (!getToken() || validatenull(getRefreshToken() ?? '')) return false

  if (!force) {
    const at = getTokenExpireAt()
    const expired = at > 0 && Date.now() >= at
    if (!expired && !isTokenNearExpiry()) return true
  }

  if (inflight) return inflight

  const run = (async () => {
    try {
      const userStore = useUserStore()
      await userStore.RefreshToken()
      return !!getToken() && !validatenull(getRefreshToken() ?? '')
    } catch {
      // 并发场景：另一路已续期成功，本路失败不应视为会话失效
      return stillHasFreshSession()
    }
  })()

  inflight = run.finally(() => {
    if (inflight === run) inflight = null
  })

  return inflight
}
