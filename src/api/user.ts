import request from '/@/utils/request'
import { captchaMode, captchaType } from '/@/config'
import func from '/@/utils/func'

export const loginByUsername = (tenantId, deptId, roleId, username, password, type, key, code) =>
  request({
    url: '/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': tenantId,
      'Dept-Id': func.toStr(deptId),
      'Role-Id': func.toStr(roleId),
      'Captcha-Key': key,
      'Captcha-Code': code,
    },
    params: {
      tenantId,
      username,
      password,
      grant_type: captchaMode ? (captchaType === 'behavior' ? 'behavior' : 'captcha') : 'password',
      scope: 'all',
      type,
    },
    // 登录接口不带业务 Bearer，避免脏 token 干扰 OAuth
    meta: { isToken: false },
  })

// export const loginBySocial = (tenantId, source, code, state) =>
//   request({
//     url: '/blade-auth/oauth/token',
//     method: 'post',
//     headers: {
//       'Tenant-Id': tenantId,
//     },
//     params: {
//       tenantId,
//       source,
//       code,
//       state,
//       grant_type: 'social',
//       scope: 'all',
//     },
//   });

// export const loginBySso = (state, code) =>
//   request({
//     url: '/blade-auth/oauth/token',
//     method: 'post',
//     headers: {
//       'Tenant-Id': state,
//     },
//     params: {
//       tenantId: state,
//       code,
//       grant_type: 'authorization_code',
//       scope: 'all',
//       redirect_uri: website.oauth2.redirectUri,
//     },
//   });

// export const loginByPhone = (tenantId, phone, id, value) =>
//   request({
//     url: '/blade-auth/oauth/token',
//     method: 'post',
//     headers: {
//       'Tenant-Id': tenantId,
//     },
//     params: {
//       tenantId,
//       phone,
//       id,
//       value,
//       grant_type: 'sms_code',
//       scope: 'all',
//     },
//   });

export const refreshToken = (refresh_token, tenantId, deptId, roleId) =>
  request({
    url: '/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': tenantId,
      'Dept-Id': func.toStr(deptId),
      'Role-Id': func.toStr(roleId),
    },
    params: {
      tenantId,
      refresh_token,
      grant_type: 'refresh_token',
      scope: 'all',
    },
    meta: { isToken: false },
  })

export const registerUser = (tenantId, name, account, password, phone, email) =>
  request({
    url: '/blade-auth/oauth/token',
    method: 'post',
    headers: {
      'Tenant-Id': tenantId,
    },
    params: {
      name,
      username: account,
      account,
      password,
      phone,
      email,
      grant_type: 'register',
      scope: 'all',
    },
  })

export const registerGuest = (form, oauthId) =>
  request({
    url: '/blade-system/user/register-guest',
    method: 'post',
    params: {
      tenantId: form.tenantId,
      name: form.name,
      account: form.account,
      password: form.password,
      oauthId,
    },
  })

export const getButtons = () =>
  request({
    url: '/blade-system/menu/buttons',
    method: 'get',
    silentError: true,
    meta: { silentError: true },
  })

export const getCaptcha = () =>
  request({
    url: '/blade-auth/oauth/captcha',
    method: 'get',
    authorization: false,
    meta: { isToken: false },
    // 题面为 base64 大图，避免默认 10s 超时导致「验证码无法加载」
    timeout: 30000,
  })

export const getBehavior = () =>
  request({
    url: '/blade-auth/oauth/behavior',
    method: 'get',
    authorization: false,
    meta: { isToken: false },
    timeout: 30000,
  })

export const checkBehavior = (key: string, answer: string) =>
  request({
    url: '/blade-auth/oauth/behavior/check',
    method: 'post',
    authorization: false,
    meta: { isToken: false },
    timeout: 30000,
    params: {
      key,
      answer,
    },
  })

export const logout = () =>
  request({
    url: '/blade-auth/oauth/logout',
    method: 'get',
    authorization: false,
  })

export const getUserInfo = async () => {
  // 优先系统用户详情（与 shop-vite-main (5) 一致），失败再回退 OAuth user-info
  try {
    const res: any = await request({
      url: '/blade-system/user/info',
      method: 'get',
      silentError: true,
      meta: { silentError: true },
    })
    return res
  } catch {
    return request({
      url: '/blade-auth/oauth/user-info',
      method: 'get',
      silentError: true,
      meta: { silentError: true },
    })
  }
}

/** 个人中心：更新当前用户基本信息 */
export const updateUserInfo = (data: Record<string, any>) =>
  request({
    url: '/blade-system/user/update-info',
    method: 'post',
    data,
  })

export const sendLogs = (list) =>
  request({
    url: '/blade-auth/oauth/logout',
    method: 'post',
    data: list,
  })

export const clearCache = () =>
  request({
    url: '/blade-auth/oauth/clear-cache',
    method: 'get',
    authorization: false,
  })

export const sendSms = (tenantId, phone) =>
  request({
    url: '/blade-auth/oauth/sms/send-validate',
    method: 'post',
    params: {
      tenantId,
      phone,
    },
  })

export const lock = () => {
  return request({
    url: '/lock',
    method: 'get',
  })
}
