/**
 * BladeX 响应 → shop-vite 页面约定格式适配
 * 兼容两种 request 返回：AxiosResponse 或已解包的 BladeX body（参考 shop-vite-main (5)）
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

/** BladeX / Axios 信封 */
export const getEnvelope = (res: any) => {
  if (!res || typeof res !== 'object') return res
  if (res.data != null && (res.config != null || res.status != null || res.headers != null)) {
    return res.data
  }
  return res
}

/** 取出 BladeX 业务 data */
export const unwrap = (res: any) => {
  const envelope = getEnvelope(res)
  if (envelope == null) return envelope
  if (
    typeof envelope === 'object' &&
    !Array.isArray(envelope) &&
    'data' in envelope &&
    ('code' in envelope || 'success' in envelope)
  ) {
    return envelope.data
  }
  return envelope
}

/** 分页 records → list */
export const adaptPage = (res: any, mapRow?: (row: any) => any): ShopPageResult => {
  const envelope = getEnvelope(res) || {}
  const page = unwrap(res) || {}
  const records = Array.isArray(page)
    ? page
    : page.records || page.list || (Array.isArray(page.data) ? page.data : [])
  const list = mapRow ? records.map(mapRow) : records
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || '操作成功',
    data: {
      list,
      total: Number(page.total ?? list.length),
    },
  }
}

/** 树/列表数组 */
export const adaptList = (res: any, mapRow?: (row: any) => any) => {
  const envelope = getEnvelope(res) || {}
  const raw = unwrap(res)
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  const list = mapRow ? arr.map(mapRow) : arr
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

/** 成功消息包装（删除/保存） */
export const adaptMsg = (res: any, fallback = '操作成功') => {
  const envelope = getEnvelope(res) || {}
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || fallback,
    data: unwrap(res),
  }
}

/** shop-vite pageNo/pageSize → BladeX current/size */
export const toBladePage = (params: any = {}) => {
  const { pageNo, pageSize, ...rest } = params
  return {
    ...rest,
    current: pageNo || params.current || 1,
    size: pageSize || params.size || 20,
  }
}

/**
 * 解析 OSS 上传返回的 BladeFile（AxiosResponse / R 信封 / 裸对象均兼容）
 * 正确路径：res.data.data.link
 */
export const unwrapBladeFile = (res: any) => {
  const file = unwrap(res) || {}
  const envelope = getEnvelope(res) || {}
  if (envelope?.success === false || (envelope?.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope?.msg || '上传失败')
  }
  const link =
    file?.link ||
    file?.url ||
    file?.domainUrl ||
    file?.domain ||
    ''
  return {
    link: link ? String(link) : '',
    name: file?.name || '',
    originalName: file?.originalName || '',
    domain: file?.domain || '',
    attachId: file?.attachId,
    raw: file,
  }
}

