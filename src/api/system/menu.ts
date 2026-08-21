import request from '/@/utils/request'
import { adaptList, adaptMsg, unwrap } from '/@/utils/bladeAdapter'

/**
 * 菜单管理 / 路由 → BladeX /blade-system/menu
 * 兼容 views：getList({ name, code })、remove({ ids })、update(row)
 */

const normalizeIds = (ids: any) => {
  if (ids == null) return ''
  if (typeof ids === 'object' && !Array.isArray(ids) && ids.ids != null) return String(ids.ids)
  if (Array.isArray(ids)) return ids.join(',')
  return String(ids)
}

export const getList = async (currentOrParams?: any, size?: any, params?: any) => {
  let query: Record<string, any> = {}
  if (currentOrParams != null && typeof currentOrParams === 'object' && !Array.isArray(currentOrParams)) {
    query = { ...currentOrParams }
  } else {
    query = { ...(params || {}), current: currentOrParams, size }
  }
  Object.keys(query).forEach((k) => {
    if (query[k] === '' || query[k] === undefined) delete query[k]
  })
  const res: any = await request({
    url: '/blade-system/menu/list',
    method: 'get',
    params: query,
  })
  return adaptList(res)
}

export const remove = async (ids: any) => {
  const res: any = await request({
    url: '/blade-system/menu/remove',
    method: 'post',
    params: { ids: normalizeIds(ids) },
  })
  return adaptMsg(res, '删除成功')
}

export const add = async (row: any) => {
  const res: any = await request({
    url: '/blade-system/menu/submit',
    method: 'post',
    data: row,
  })
  return adaptMsg(res, '保存成功')
}

export const update = async (row: any) => {
  const payload = { ...row }
  if (payload.parentId === undefined || payload.parentId === '' || payload.parentId === null) {
    payload.parentId = 0
  }
  const res: any = await request({
    url: '/blade-system/menu/submit',
    method: 'post',
    data: payload,
  })
  return adaptMsg(res, '保存成功')
}

export const getMenu = async (id: any) => {
  const res: any = await request({
    url: '/blade-system/menu/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}

export const getLazyMenuList = (parentId: any, params?: any) =>
  request({
    url: '/blade-system/menu/lazy-menu-list',
    method: 'get',
    params: { ...params, parentId },
  })

export const getTopMenu = () =>
  request({
    url: '/blade-system/menu/top-menu',
    method: 'get',
    silentError: true,
    meta: { silentError: true },
  })

export const getRoutes = (topMenuId?: any) => {
  const params: Record<string, any> = {}
  if (topMenuId !== undefined && topMenuId !== null && topMenuId !== '') {
    params.topMenuId = topMenuId
  }
  return request({
    url: '/blade-system/menu/routes',
    method: 'get',
    params,
    // 刷新进页会调；无菜单权限时勿弹「请求未授权」
    silentError: true,
    meta: { silentError: true },
  })
}
