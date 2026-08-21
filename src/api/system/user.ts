import request from '/@/utils/request'
import {
  captchaMode,
  captchaType,
  clientId,
  clientSecret,
  tenantId as defaultTenantId,
} from '/@/config'
import { encryptedData } from '/@/utils/encrypt'
import { getRefreshToken, getTenantId } from '/@/utils/token'

interface FormType {
  password: string
  password2?: string
  phone: string
  phoneCode: string
  username: string
  verificationCode: string
  tenantId?: string
  deptId?: string
  roleId?: string
  key?: string
  code?: string
  type?: string
}

const basicAuth = () => `Basic ${btoa(`${clientId}:${clientSecret}`)}`

const toStr = (val: unknown) => (val === undefined || val === null ? '' : String(val))

/** 对齐 Saber：按 captchaMode / captchaType 决定 grant_type */
const resolveGrantType = () => {
  if (!captchaMode) return 'password'
  return captchaType === 'behavior' ? 'behavior' : 'captcha'
}

/**
 * BladeX OAuth2 登录（对齐 Saber3 loginByUsername）
 */
export const login = async (data: any) => {
  const tenantId = data.tenantId || defaultTenantId || '000000'
  const password = await encryptedData(data.password)

  return request({
    url: '/api/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': tenantId,
      'Dept-Id': toStr(data.deptId),
      'Role-Id': toStr(data.roleId),
      Authorization: basicAuth(),
      'Captcha-Key': data.key || '',
      'Captcha-Code': data.code || data.verificationCode || '',
    },
    params: {
      tenantId,
      username: data.username,
      password,
      grant_type: resolveGrantType(),
      scope: 'all',
      type: data.type || 'account',
    },
    meta: { isToken: false },
  })
}

/**
 * 刷新令牌（对齐 Saber refreshToken）
 */
export const refreshTokenApi = (deptId?: string, roleId?: string) => {
  const tenantId = getTenantId() || defaultTenantId || '000000'
  return request({
    url: '/api/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': tenantId,
      'Dept-Id': toStr(deptId),
      'Role-Id': toStr(roleId),
      Authorization: basicAuth(),
    },
    params: {
      tenantId,
      refresh_token: getRefreshToken(),
      grant_type: 'refresh_token',
      scope: 'all',
    },
    meta: { isToken: false },
  })
}

/**
 * 图形验证码（对齐 Saber getCaptcha）
 */
export const getCaptcha = () => {
  return request({
    url: '/api/blade-auth/oauth/captcha',
    method: 'get',
    meta: { isToken: false },
    authorization: false,
  })
}

/**
 * 获取当前用户信息（系统服务）
 */
export const getUserInfo = () => {
  return request({
    url: '/api/blade-system/user/info',
    method: 'get',
    silentError: true,
    meta: { silentError: true },
  })
}

/**
 * OAuth2 用户信息（含角色别名等）
 */
export const getOauthUserInfo = () => {
  return request({
    url: '/api/blade-auth/oauth/user-info',
    method: 'get',
  })
}

/**
 * 按钮/权限码
 */
export const getButtons = () => {
  return request({
    url: '/api/blade-system/menu/buttons',
    method: 'get',
    silentError: true,
  })
}

export const logout = () => {
  return request({
    url: '/api/blade-auth/oauth/logout',
    method: 'get',
  })
}

/**
 * 修改当前用户基本信息（个人中心）
 */
export const updateUserInfo = (data: Record<string, any>) => {
  return request({
    url: '/api/blade-system/user/update-info',
    method: 'post',
    data,
  })
}

export const register = async (data: FormType) => {
  const password = await encryptedData(data.password)
  return request({
    url: '/api/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': defaultTenantId || '000000',
      Authorization: basicAuth(),
    },
    params: {
      tenantId: defaultTenantId || '000000',
      name: data.username,
      username: data.username,
      account: data.username,
      password,
      phone: data.phone,
      grant_type: 'register',
      scope: 'all',
    },
    meta: { isToken: false },
  })
}

export const password = (data: FormType) => {
  return request({
    url: '/api/blade-system/user/update-password',
    method: 'post',
    params: {
      oldPassword: data.password,
      newPassword: data.password2,
      newPassword1: data.password2,
    },
  })
}

export const lock = () => {
  return request({
    url: '/api/blade-auth/oauth/logout',
    method: 'get',
  })
}
