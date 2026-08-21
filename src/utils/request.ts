/**
 * 全站http配置
 *
 * axios参数说明
 * isSerialize是否开启form表单提交
 * isToken是否需要token
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import router from '/@/router/'
import { serialize } from '/@/utils/util'
import { getToken, getRefreshToken, removeToken, removeRefreshToken } from '/@/utils/auth'
import { isURL, validatenull } from '/@/utils/validate'
import { ElMessage } from 'element-plus'
import { tokenHeader, clientId, clientSecret, statusWhiteList, tenantId as defaultTenantId } from '/@/config'
import { getStore } from '/@/utils/store'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { Base64 } from 'js-base64'
import crypto from '/@/utils/encrypt'

import { useUserStore } from '/@/store/modules/user'
import { useSettingsStore } from '/@/store/modules/settings'

const REFRESH_GRANT_TYPE = 'refresh_token'
let isSessionExpired = false
let isRefreshing = false
let refreshTokenPromise: Promise<any> | null = null

/** 权限类 401 弹窗去重，避免刷新时多接口并行连弹「请求未授权」 */
let lastPermissionToastAt = 0
let lastPermissionToastMsg = ''
const PERMISSION_TOAST_GAP_MS = 4000

const shouldSilent = (config: AxiosRequestConfig) =>
  !!(config as any).silentError || !!(config as any).meta?.silentError

const notifyPermissionDenied = (message: string, config: AxiosRequestConfig) => {
  if (shouldSilent(config)) return
  const msg = message || '无访问权限'
  const now = Date.now()
  if (msg === lastPermissionToastMsg && now - lastPermissionToastAt < PERMISSION_TOAST_GAP_MS) {
    return
  }
  lastPermissionToastAt = now
  lastPermissionToastMsg = msg
  ElMessage({ message: msg, type: 'warning', grouping: true, duration: 3000 })
}

const isRefreshTokenRequest = (config: AxiosRequestConfig): boolean => {
  const url = config.url || ''
  const params = config.params || {}
  return url.includes('/oauth/token') && params.grant_type === REFRESH_GRANT_TYPE
}

const isLoginRequest = (config: AxiosRequestConfig): boolean => {
  const url = config.url || ''
  const grantType = (config.params || {})?.grant_type
  return url.includes('/oauth/token') && !!grantType && grantType !== REFRESH_GRANT_TYPE
}

/** 令牌失效类 401（含 BladeX「认证信息已过期」） */
const isTokenExpiredMessage = (message: string) =>
  /认证信息已过期|缺失令牌|令牌已失效|令牌已过期|令牌过期|登录过期|登录状态已失效|token.*(expir|invalid)|full authentication is required/i.test(
    String(message || '')
  )

/**
 * 权限不足类文案（含 @PreAuth「请求未授权」）
 * 注意：网关 AuthFilter 在 JWT 解析失败/过期时也会返回「请求未授权」（与 PreAuth 同文案），
 * 因此不能仅凭该文案就跳过刷新；应「先刷令牌，重试仍 401 再当权限不足」。
 */
const isPermissionDeniedMessage = (message: string) => {
  const msg = String(message || '')
  if (isTokenExpiredMessage(msg)) return false
  return /请求未授权|权限不足|无访问权限|access is denied|forbidden|没有访问权限/i.test(msg)
}

/** 网关对过期/无效 JWT 常用「请求未授权」，需优先尝试 refresh */
const isAmbiguousUnauthorized = (message: string) => /请求未授权/i.test(String(message || ''))

const applyToken = (config: AxiosRequestConfig): void => {
  const meta = (config as any).meta || {}
  if (meta.isToken === false) return
  const tokenVal = getToken()
  if (!tokenVal) return

  config.headers = config.headers || {}
  const headerKey = tokenHeader
  if ((config as any).cryptoToken === true) {
    config.headers[headerKey] = `crypto ${crypto.encryptAES(tokenVal, crypto.cryptoKey)}`
  } else {
    config.headers[headerKey] = `bearer ${tokenVal}`
  }
}

const redirectToLogin = async (tip?: string) => {
  if (isSessionExpired) return
  isSessionExpired = true
  ElMessage({
    message: tip || '认证信息已过期，请重新登录',
    type: 'error',
    grouping: true,
  })
  removeToken()
  removeRefreshToken()
  const userStore = useUserStore()
  await userStore.FedLogOut()
  if (router.currentRoute.value.path !== '/login') {
    await router.push({ path: '/login' })
  }
}

const service: AxiosInstance = axios.create({
  timeout: 10000,
  validateStatus: (status: number) => status >= 200 && status <= 500,
  withCredentials: true,
})

NProgress.configure({
  showSpinner: false,
})

service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const settingsStore = useSettingsStore()
    const { language } = settingsStore
    NProgress.start()
    config.headers = config.headers || {}
    const baseUrl = `${import.meta.env.VITE_APP_BASE_URL}`
    if (!isURL(config.url) && !(config.url || '').startsWith(baseUrl)) {
      config.url = baseUrl + config.url
    }
    config.headers['Blade-Requested-With'] = 'BladeHttpRequest'

    // BladeX 多租户：每个业务请求必须带 Tenant-Id
    if (!config.headers['Tenant-Id']) {
      const storeTenant = getStore({ name: 'tenantId' }) || ''
      let userTenant = ''
      try {
        userTenant = useUserStore()?.tenantId || ''
      } catch {
        /* pinia 未就绪 */
      }
      config.headers['Tenant-Id'] = storeTenant || userTenant || defaultTenantId || '000000'
    }
    config.headers['Accept-Language'] = language || 'zh'

    const authorization = (config as any).authorization === false
    if (!authorization) {
      config.headers.Authorization = `Basic ${Base64.encode(`${clientId}:${clientSecret}`)}`
    }

    if (isLoginRequest(config)) {
      isSessionExpired = false
    }
    applyToken(config)

    const cryptoData = (config as any).cryptoData === true
    if (cryptoData) {
      if (config.params) {
        const data = crypto.encryptAES(JSON.stringify(config.params), crypto.aesKey)
        config.params = { data }
      }
      if (config.data) {
        ;(config as any).text = true
        config.data = crypto.encryptAES(JSON.stringify(config.data), crypto.aesKey)
      }
    }
    if ((config as any).text === true) {
      config.headers['Content-Type'] = 'text/plain'
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }

    const meta = (config as any).meta || {}
    if (config.method === 'post' && meta.isSerialize === true) {
      config.data = serialize(config.data)
    }
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  async (res: AxiosResponse) => {
    NProgress.done()
    const userStore = useUserStore()
    const config = res.config as AxiosRequestConfig & { _retry?: boolean; cryptoData?: boolean }
    if (config.cryptoData === true) {
      res.data = JSON.parse(crypto.decryptAES(res.data, crypto.aesKey))
    }

    // BladeX 偶发返回字符串 code（"401"），必须 Number 后再判断
    const status = Number(res.data.error_code ?? res.data.code ?? res.status)
    const swList = (statusWhiteList || []).map(Number)
    const message = res.data.msg || res.data.error_description || '系统错误'
    if (swList.includes(status)) return Promise.reject(res)

    if (status === 401 && isLoginRequest(config)) {
      ElMessage({ message, type: 'error', grouping: true })
      return Promise.reject(new Error(message))
    }

    // 参数绑定等业务 400/500 不应误判为登录失效
    if (
      status === 400 &&
      /Name for argument of type|parameter name information not available|-parameters/i.test(message)
    ) {
      ElMessage({
        message: '后端接口参数绑定失败，请确认已使用 -parameters 编译并重启 blade-system',
        type: 'error',
        grouping: true,
      })
      return Promise.reject(new Error(message))
    }

    // 明确权限不足（非「请求未授权」）：有 token 时直接提示，不刷令牌、不踢登录
    // 「请求未授权」单独处理：网关 JWT 过期与 @PreAuth 同文案，须先 refresh 再区分
    if (
      status === 401 &&
      isPermissionDeniedMessage(message) &&
      !isAmbiguousUnauthorized(message) &&
      getToken() &&
      !isTokenExpiredMessage(message)
    ) {
      notifyPermissionDenied(message, config)
      return Promise.reject(new Error(message))
    }

    // 令牌失效 / 「请求未授权」(疑似 JWT 过期)：尝试 refresh_token
    if ((status === 401 || isTokenExpiredMessage(message)) && !config._retry) {
      if (!getToken() || validatenull(getRefreshToken() ?? '') || isRefreshTokenRequest(config)) {
        // 无 refresh 时：明确过期文案 → 回登录；「请求未授权」无 refresh → 按权限提示（避免误踢）
        if (isAmbiguousUnauthorized(message) && getToken()) {
          notifyPermissionDenied(message, config)
          return Promise.reject(new Error(message))
        }
        await redirectToLogin(isTokenExpiredMessage(message) ? message : undefined)
        return Promise.reject(new Error(message))
      }
      config._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        refreshTokenPromise = userStore
          .RefreshToken()
          .catch(async (err) => {
            await redirectToLogin('登录已过期，请重新登录')
            return Promise.reject(err)
          })
          .finally(() => {
            isRefreshing = false
            refreshTokenPromise = null
          })
      }

      await refreshTokenPromise
      applyToken(config)
      return service.request(config)
    }

    // 刷新后仍 401：令牌类回登录；「请求未授权」/权限类只提示，不踢登录
    if (status === 401 && config._retry) {
      if (isTokenExpiredMessage(message) || !getToken()) {
        await redirectToLogin(message)
        return Promise.reject(new Error(message))
      }
      notifyPermissionDenied(message || '无访问权限，请确认角色已授权对应菜单', config)
      return Promise.reject(new Error(message))
    }

    if (isRefreshTokenRequest(config) && status !== 200) {
      await redirectToLogin(isTokenExpiredMessage(message) ? message : undefined)
      return Promise.reject(new Error(message))
    }

    // OAuth2 业务错误码：刷新令牌失效等
    if (status === 2010 || (status > 2000 && isTokenExpiredMessage(message))) {
      await redirectToLogin(message)
      return Promise.reject(new Error(message))
    }

    if (status > 2000 && !validatenull(res.data.error_description)) {
      if (!shouldSilent(config)) {
        ElMessage({ message, type: 'error', grouping: true })
      }
      return Promise.reject(new Error(message))
    }

    if (status !== 200) {
      if (!shouldSilent(config)) {
        ElMessage({ message, type: 'error', grouping: true })
      }
      return Promise.reject(new Error(message))
    }
    return res
  },
  (error) => {
    NProgress.done()
    return Promise.reject(error)
  }
)

export default (config: AxiosRequestConfig) => service.request(config)
