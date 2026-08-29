/**
 * 登录态保活：操作期间自动续期 token；无操作超过 idleLogoutTime 再退出。
 */
import router from '/@/router/'
import { idleLogoutTime, tokenTime } from '/@/config'
import { getRefreshToken, getToken, isTokenNearExpiry } from '/@/utils/auth'
import { refreshSessionIfNeeded } from '/@/utils/sessionRefresh'
import { useUserStore } from '/@/store/modules/user'
import { ElMessage } from 'element-plus'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'] as const
/** 比 access(1h) 更短，保证临近过期窗口内至少检查数次 */
const CHECK_INTERVAL_MS = 2 * 60 * 1000
const ACTIVITY_THROTTLE_MS = 1000

let timer: ReturnType<typeof setInterval> | null = null
let lastActivityAt = Date.now()
let lastActivityWriteAt = 0
let listenersBound = false

const onUserActivity = () => {
  const now = Date.now()
  if (now - lastActivityWriteAt < ACTIVITY_THROTTLE_MS) return
  lastActivityWriteAt = now
  lastActivityAt = now
}

const resolveIntervalMs = () => {
  const n = Number(tokenTime)
  if (Number.isFinite(n) && n >= 60_000) return n
  return 30 * 60 * 1000
}

const resolveIdleMs = () => {
  const n = Number(idleLogoutTime)
  if (Number.isFinite(n) && n >= 60_000) return n
  return 8 * 60 * 60 * 1000
}

export const touchUserActivity = () => {
  lastActivityAt = Date.now()
  lastActivityWriteAt = lastActivityAt
}

const onVisibilityChange = () => {
  if (typeof document === 'undefined') return
  if (document.visibilityState !== 'visible') return
  touchUserActivity()
  if (getToken() && isTokenNearExpiry()) {
    refreshSessionIfNeeded().catch(() => undefined)
  }
}

const bindActivityListeners = () => {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }))
  document.addEventListener('visibilitychange', onVisibilityChange)
}

const unbindActivityListeners = () => {
  if (!listenersBound || typeof window === 'undefined') return
  listenersBound = false
  ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onUserActivity))
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

const tick = async () => {
  if (!getToken()) {
    stopTokenKeepAlive()
    return
  }

  const idleMs = Date.now() - lastActivityAt
  const maxIdle = resolveIdleMs()

  if (idleMs >= maxIdle) {
    stopTokenKeepAlive()
    ElMessage({
      message: `超过 ${Math.round(maxIdle / 3600000)} 小时未操作，已自动退出登录`,
      type: 'warning',
      grouping: true,
    })
    const userStore = useUserStore()
    await userStore.FedLogOut()
    if (router.currentRoute.value.path !== '/login') {
      await router.push({ path: '/login' })
    }
    return
  }

  // 未到空闲退出阈值且临近过期 → 续期（与 axios 共用 singleflight，避免并发互踢）
  if (isTokenNearExpiry()) {
    await refreshSessionIfNeeded()
  }
}

/** 登录后启动保活；重复调用会先停止旧定时器 */
export const startTokenKeepAlive = () => {
  if (!getToken() || !getRefreshToken()) return
  stopTokenKeepAlive()
  touchUserActivity()
  bindActivityListeners()
  const interval = Math.min(resolveIntervalMs(), CHECK_INTERVAL_MS)
  timer = setInterval(() => {
    tick()
  }, interval)
  tick()
}

export const stopTokenKeepAlive = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  unbindActivityListeners()
}
