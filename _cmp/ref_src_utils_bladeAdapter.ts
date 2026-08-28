/**
 * BladeX 响应 → shop-vite 页面约定格式适配
 * BladeX: { code, success, data: { records, total } | [] | object, msg }
 * shop-vite 页面: { data: { list, total }, msg }
 */

export type ShopPageResult<T = any> = {
  code: number
  success?: boolean
  msg?: string
  data: {
    list: T[]
    total: number
  }
}

/** 取出 BladeX 业务 data */
export const unwrap = (res: any) => res?.data ?? res

/** 分页 records → list */
export const adaptPage = (res: any, mapRow?: (row: any) => any): ShopPageResult => {
  const page = unwrap(res) || {}
  const records = Array.isArray(page) ? page : page.records || page.list || page.data || []
  const list = mapRow ? records.map(mapRow) : records
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: {
      list,
      total: Number(page.total ?? list.length),
    },
  }
}

/** 树/列表数组 */
export const adaptList = (res: any, mapRow?: (row: any) => any) => {
  const raw = unwrap(res)
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  const list = mapRow ? arr.map(mapRow) : arr
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

/** 成功消息包装（删除/保存） */
export const adaptMsg = (res: any, fallback = '操作成功') => ({
  code: res?.code ?? 200,
  success: res?.success ?? true,
  msg: res?.msg || fallback,
  data: unwrap(res),
})

/** shop-vite pageNo/pageSize → BladeX current/size */
export const toBladePage = (params: any = {}) => {
  const { pageNo, pageSize, ...rest } = params
  return {
    ...rest,
    current: pageNo || params.current || 1,
    size: pageSize || params.size || 20,
  }
}
