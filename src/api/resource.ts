import { adaptMsg, adaptPage, getEnvelope, toBladePage, unwrap, unwrapBladeFile } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/** 资源列表：把 PreAuth/服务未启动等失败转成可读错误（勿 silent 吞掉） */
async function requestResourcePage(url: string, params: Record<string, any>, tip: string) {
  try {
    const res: any = await request({
      url,
      method: 'get',
      params,
      silentError: true,
    })
    const envelope = getEnvelope(res) || {}
    if (envelope?.success === false) {
      throw new Error(envelope?.msg || tip)
    }
    return adaptPage(res)
  } catch (e: any) {
    const msg = String(e?.message || e?.msg || tip)
    if (/请求未授权|权限不足|无访问权限|access is denied|forbidden/i.test(msg)) {
      throw new Error(
        '无资源管理权限：后端按菜单码 oss/attach/sms 鉴权（或需 admin 角色）。请勾选对应菜单后重新登录，并重启 blade-resource'
      )
    }
    if (/Network Error|timeout|ECONNREFUSED|Failed to fetch/i.test(msg)) {
      throw new Error('无法连接 blade-resource（默认 8010），请确认资源服务已启动')
    }
    throw new Error(msg || tip)
  }
}

/**
 * 资源管理 → BladeX /blade-resource
 * - 对象存储: /oss
 * - 附件管理: /attach
 * - 短信配置: /sms
 */

/**
 * 对象存储 API
 */
const OSS_CATEGORY_MAP: Record<number, string> = {
  1: '阿里云OSS',
  2: '腾讯云COS',
  3: '七牛云',
  4: '华为云OBS',
  5: 'MinIO',
  6: '本地存储',
  7: '亚马逊S3',
}

const STATUS_ENABLED = 2
const STATUS_DISABLED = 1

const mapOssRow = (row: any) => ({
  ...row,
  id: row.id != null ? String(row.id) : '',
  category: row.category != null ? Number(row.category) : 0,
  categoryLabel: OSS_CATEGORY_MAP[Number(row.category)] || '',
  status: row.status != null ? Number(row.status) : STATUS_DISABLED,
  statusLabel: Number(row.status) === STATUS_ENABLED ? '已启用' : '已停用',
  datetime: row.updateTime || row.createTime || '',
})

export async function getOssList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    ossCode: params?.ossCode,
    category: params?.category,
  }
  const page = await requestResourcePage('/api/blade-resource/oss/page', pageParams, '加载对象存储失败')
  return {
    ...page,
    data: {
      list: (page.data.list || []).map(mapOssRow),
      total: page.data.total,
    },
  }
}

export async function getOssDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/oss/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}

export async function doOssSubmit(data: any) {
  const isUpdate = !!(data.id || data.Id)
  // 含 * 的是详情脱敏值，绝不能回写
  const cleanKey = (v: any) => {
    if (v == null || v === '') return undefined
    if (String(v).includes('*')) return undefined
    return v
  }
  const payload: Record<string, any> = {
    id: data.id || undefined,
    category: data.category != null ? Number(data.category) : undefined,
    ossCode: data.ossCode || undefined,
    endpoint: data.endpoint || undefined,
    transformEndpoint: data.transformEndpoint || undefined,
    accessKey: cleanKey(data.accessKey),
    secretKey: cleanKey(data.secretKey),
    bucketName: data.bucketName || undefined,
    appId: data.appId || undefined,
    region: data.region || undefined,
    remark: data.remark || undefined,
    status: data.status != null ? Number(data.status) : STATUS_DISABLED,
  }

  Object.keys(payload).forEach((k) => {
    const v = payload[k]
    if (v === undefined || v === '') delete payload[k]
  })
  // 更新时若未改密钥，后端会保留原值；此处仅避免把空串写进去
  if (isUpdate && !payload.accessKey) delete payload.accessKey
  if (isUpdate && !payload.secretKey) delete payload.secretKey

  const res: any = await request({
    url: '/api/blade-resource/oss/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

export async function doOssDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少ID')
  }
  const res: any = await request({
    url: '/api/blade-resource/oss/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

export async function doOssEnable(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/oss/enable',
    method: 'post',
    params: { id },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '启用失败')
  }
  return adaptMsg(res, '启用成功')
}

export async function doOssDisable(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/oss/update',
    method: 'post',
    data: { id, status: STATUS_DISABLED },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '停用失败')
  }
  return adaptMsg(res, '停用成功')
}

/**
 * 附件管理 API
 */
const mapAttachRow = (row: any) => ({
  ...row,
  id: row.id != null ? String(row.id) : '',
  attachSize: row.attachSize != null ? Number(row.attachSize) : 0,
  sizeLabel: formatFileSize(row.attachSize),
  datetime: row.updateTime || row.createTime || '',
})

function formatFileSize(bytes: any): string {
  if (bytes == null || bytes === '') return '-'
  const b = Number(bytes)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export async function getAttachList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    name: params?.name,
    originalName: params?.originalName,
    extension: params?.extension,
  }
  const page = await requestResourcePage('/api/blade-resource/attach/page', pageParams, '加载附件列表失败')
  return {
    ...page,
    data: {
      list: (page.data.list || []).map(mapAttachRow),
      total: page.data.total,
    },
  }
}

export async function getAttachDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/attach/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}

export async function doAttachSubmit(data: any) {
  const isUpdate = !!(data.id || data.Id)
  const payload: Record<string, any> = {
    id: data.id || undefined,
    link: data.link || undefined,
    domainUrl: data.domainUrl || undefined,
    name: data.name || undefined,
    originalName: data.originalName || undefined,
    extension: data.extension || undefined,
    attachSize: data.attachSize != null ? Number(data.attachSize) : undefined,
  }

  Object.keys(payload).forEach((k) => {
    const v = payload[k]
    if (v === undefined || v === '') delete payload[k]
  })

  const res: any = await request({
    url: '/api/blade-resource/attach/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

export async function doAttachDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少ID')
  }
  const res: any = await request({
    url: '/api/blade-resource/attach/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

/**
 * 上传附件（写入 OSS + blade_attach）
 */
export async function uploadAttachFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  let res: any
  try {
    res = await request({
      url: '/api/blade-resource/oss/endpoint/put-file-attach',
      method: 'post',
      data: formData,
      timeout: 120000,
    })
  } catch (e: any) {
    const tip = e?.msg || e?.message || e?.error_description || (typeof e === 'string' ? e : '') || '附件上传失败'
    const text = String(tip)
    if (/附件上传失败|MinIO|OSS|上传失败|对象存储/i.test(text)) {
      throw new Error(text)
    }
    if (/请求未完成|请联系管理员|Internal Server Error|500/i.test(text)) {
      throw new Error(
        '附件上传失败：当前启用的 OSS 连接异常（类型/地址/密钥/桶可能不对）。请到「对象存储」核对存储类型后重新启用，并确认 blade-resource 与存储服务可连'
      )
    }
    throw new Error(`附件上传失败：${text}。请确认 blade-resource 已启动，且对象存储可连`)
  }
  if (res?.success === false) {
    throw new Error(res?.msg || '附件上传失败')
  }
  try {
    const fileInfo = unwrapBladeFile(res)
    if (!fileInfo.link) {
      throw new Error(res?.msg || '附件上传失败，未返回文件地址')
    }
    return {
      ...(fileInfo.raw || {}),
      link: fileInfo.link,
      url: fileInfo.link,
      name: fileInfo.name,
      originalName: fileInfo.originalName,
      attachId: fileInfo.attachId,
    }
  } catch (e: any) {
    throw new Error(e?.message || '附件上传失败')
  }
}

/**
 * 短信配置 API
 */
const SMS_CATEGORY_MAP: Record<number, string> = {
  1: '阿里云短信',
  2: '腾讯云短信',
  3: '七牛云短信',
  4: '云片短信',
}

const mapSmsRow = (row: any) => ({
  ...row,
  id: row.id != null ? String(row.id) : '',
  category: row.category != null ? Number(row.category) : 0,
  categoryLabel: SMS_CATEGORY_MAP[Number(row.category)] || '',
  status: row.status != null ? Number(row.status) : STATUS_DISABLED,
  statusLabel: Number(row.status) === STATUS_ENABLED ? '已启用' : '已停用',
  datetime: row.updateTime || row.createTime || '',
})

export async function getSmsList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    smsCode: params?.smsCode,
    category: params?.category,
  }
  const page = await requestResourcePage('/api/blade-resource/sms/page', pageParams, '加载短信配置失败')
  return {
    ...page,
    data: {
      list: (page.data.list || []).map(mapSmsRow),
      total: page.data.total,
    },
  }
}

export async function getSmsDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/sms/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}

export async function doSmsSubmit(data: any) {
  const isUpdate = !!(data.id || data.Id)
  const payload: Record<string, any> = {
    id: data.id || undefined,
    smsCode: data.smsCode || undefined,
    templateId: data.templateId || undefined,
    category: data.category != null ? Number(data.category) : undefined,
    accessKey: data.accessKey || undefined,
    secretKey: data.secretKey || undefined,
    regionId: data.regionId || undefined,
    appId: data.appId || undefined,
    signName: data.signName || undefined,
    remark: data.remark || undefined,
    status: data.status != null ? Number(data.status) : STATUS_DISABLED,
  }

  Object.keys(payload).forEach((k) => {
    const v = payload[k]
    if (v === undefined || v === '') delete payload[k]
  })

  const res: any = await request({
    url: '/api/blade-resource/sms/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

export async function doSmsDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少ID')
  }
  const res: any = await request({
    url: '/api/blade-resource/sms/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

export async function doSmsEnable(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/sms/enable',
    method: 'post',
    params: { id },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '启用失败')
  }
  return adaptMsg(res, '启用成功')
}

export async function doSmsDisable(id: string | number) {
  const res: any = await request({
    url: '/api/blade-resource/sms/update',
    method: 'post',
    data: { id, status: STATUS_DISABLED },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '停用失败')
  }
  return adaptMsg(res, '停用成功')
}
