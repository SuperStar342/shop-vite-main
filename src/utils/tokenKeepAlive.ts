/**
 * 登录态保活：操作期间自动续期 token；无操作超过 idleLogoutTime 再退出。
 */
import router from '/@/router/'
import { idleLogoutTime, tokenTime } from '/@/config'
import { getRefreshToken, getToken, isTokenNearExpiry } from '/@/utils/auth'
import { useUserStore } from '/@/store/modules/user'
import { ElMessage } from 'element-plus'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
const CHECK_INTERVAL_MS = 5 * 60 * 1000

let timer: ReturnType<typeof setInterval> | null = null
let lastActivityAt = Date.now()
let refreshing = false
let listenersBound = false

const onUserActivity = () => {
  lastActivityAt = Date.now()
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
}

const bindActivityListeners = () => {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }))
}

const unbindActivityListeners = () => {
  if (!listenersBound || typeof window === 'undefined') return
  listenersBound = false
  ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onUserActivity))
}

const refreshSession = async () => {
  if (refreshing || !getToken() || !getRefreshToken()) return
  if (router.currentRoute.value.path === '/login') return
  if (!isTokenNearExpiry()) return

  refreshing = true
  try {
    const userStore = useUserStore()
    await userStore.RefreshToken()
  } catch {
    /* 失败时由 request 拦截器统一跳转登录 */
  } finally {
    refreshing = false
  }
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

  // 近 30 分钟内有操作且 token 临近过期时续期
  if (idleMs < 30 * 60 * 1000 && isTokenNearExpiry()) {
    await refreshSession()
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
