import { adaptMsg, adaptPage, getEnvelope, toBladePage, unwrap, unwrapBladeFile } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 租户管理 → BladeX /blade-system/tenant
 * 新增/编辑统一走 POST /tenant/submit（无独立 /update）
 */

const STATUS_MAP: Record<string, number> = { 已启用: 1, 启用: 1, 已停用: 0, 停用: 0 }
const STATUS_LABEL: Record<number, string> = { 1: '已启用', 0: '已停用' }

const toStatus = (v: any) => {
  if (v === '' || v === undefined || v === null) return 1
  if (typeof v === 'number') return v
  if (/^\d+$/.test(String(v))) return Number(v)
  return STATUS_MAP[String(v)] ?? 1
}

/** 过期时间统一为 BladeX DateUtil.PATTERN_DATETIME */
const toExpireTime = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 23:59:59`
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) return s
  return s
}

const mapTenantRow = (t: any) => {
  const statusNum = toStatus(t.status)
  const linkman = t.linkman || t.linkMan || t.contactName || t.contact || ''
  return {
    ...t,
    id: t.id != null ? String(t.id) : '',
    tenantId: t.tenantId || t.tenantCode || t.code || '',
    tenantCode: t.tenantId || t.tenantCode || t.code || '',
    tenantName: t.tenantName || t.name || '',
    linkman,
    linkMan: linkman,
    contactNumber: t.contactNumber || t.contactPhone || t.phone || '',
    address: t.address || '',
    domainUrl: t.domainUrl || t.tenantDomain || t.domain || '',
    backgroundUrl: t.backgroundUrl || '',
    accountNumber: t.accountNumber,
    expireTime: t.expireTime || t.endTime || '',
    status: statusNum,
    statusLabel: t.statusName || STATUS_LABEL[statusNum] || '',
    datetime: t.updateTime || t.createTime || '',
  }
}

export async function getList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    tenantName: params?.tenantName || params?.name,
    // BladeX 用 tenantId 作为租户编码查询条件
    tenantId: params?.tenantId || params?.tenantCode || params?.code,
  }
  try {
    const res: any = await request({
      url: '/api/blade-system/tenant/page',
      method: 'get',
      params: pageParams,
      silentError: true,
    })
    const envelope = getEnvelope(res) || {}
    if (envelope?.success === false) {
      throw new Error(envelope?.msg || '加载租户列表失败')
    }
    return adaptPage(res, mapTenantRow)
  } catch (e: any) {
    const msg = String(e?.message || e?.msg || '加载租户列表失败')
    if (/请求未授权|权限不足|无访问权限|access is denied|forbidden/i.test(msg)) {
      throw new Error('无租户管理权限：需菜单码 tenant，或 administrator 角色。请勾选「租户管理」后重新登录，并重启 blade-system')
    }
    throw new Error(msg)
  }
}

export async function doEdit(data: any) {
  const isUpdate = !!(data.id || data.Id)
  const payload: Record<string, any> = {
    id: data.id || undefined,
    tenantId: data.tenantId || data.tenantCode || undefined,
    tenantName: data.tenantName || data.name || undefined,
    // BladeX 实体字段为 linkman（全小写）
    linkman: data.linkman || data.linkMan || data.contactName || undefined,
    contactNumber: data.contactNumber || data.contactPhone || data.phone || undefined,
    address: data.address || undefined,
    domainUrl: data.domainUrl || data.tenantDomain || data.domain || undefined,
    backgroundUrl: data.backgroundUrl ?? undefined,
    expireTime: toExpireTime(data.expireTime || data.endTime),
    accountNumber: data.accountNumber !== '' && data.accountNumber != null ? Number(data.accountNumber) : undefined,
    status: toStatus(data.status),
  }

  if (!payload.tenantName) {
    throw new Error('租户名称不能为空')
  }
  // 新增时 tenantId 由后端自动生成，不必传；编辑时保留原 tenantId
  if (isUpdate && !payload.tenantId) {
    throw new Error('租户编码不能为空')
  }

  Object.keys(payload).forEach((k) => {
    const v = payload[k]
    if (v === undefined || v === '') delete payload[k]
  })

  // 允许清空背景图：显式传空串
  if (data.backgroundUrl === '') {
    payload.backgroundUrl = ''
  }

  const res: any = await request({
    url: '/api/blade-system/tenant/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少租户ID')
  }
  const res: any = await request({
    url: '/api/blade-system/tenant/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

export async function getTenantDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/tenant/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}

/**
 * 上传系统背景到 MinIO（blade-resource OSS）
 * 返回可落库的外链 URL（BladeFile.link）
 */
export async function uploadTenantBackground(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  let res: any
  try {
    res = await request({
      url: '/api/blade-resource/oss/endpoint/put-file',
      method: 'post',
      data: formData,
      timeout: 60000,
    })
  } catch (e: any) {
    const tip = e?.msg || e?.message || e?.error_description || (typeof e === 'string' ? e : '') || '背景图上传失败'
    throw new Error(
      String(tip).includes('MinIO') || String(tip).includes('OSS') || String(tip).includes('上传')
        ? tip
        : `背景图上传失败：${tip}。请确认 blade-resource 已启动，且 MinIO 可连`
    )
  }
  try {
    const fileInfo = unwrapBladeFile(res)
    if (!fileInfo.link) {
      throw new Error('背景图上传失败，未返回文件地址')
    }
    return {
      url: fileInfo.link,
      name: fileInfo.name || file.name,
      originalName: fileInfo.originalName || file.name,
    }
  } catch (e: any) {
    throw new Error(e?.message || '背景图上传失败')
  }
}
