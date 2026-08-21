import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 数据权限 / 接口权限 → BladeX
 * - GET  /blade-system/data-scope/list|detail
 * - POST /blade-system/data-scope/submit|remove
 * - GET  /blade-system/api-scope/list|detail
 * - POST /blade-system/api-scope/submit|remove
 */

const mapDataScopeRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  menuId: row?.menuId != null ? String(row.menuId) : '',
  resourceCode: row?.resourceCode || '',
  scopeName: row?.scopeName || '',
  scopeField: row?.scopeField || '*',
  scopeClass: row?.scopeClass || '',
  scopeColumn: row?.scopeColumn || '',
  scopeType: row?.scopeType != null ? Number(row.scopeType) : undefined,
  scopeTypeName: row?.scopeTypeName || '',
  scopeValue: row?.scopeValue || '',
  remark: row?.remark || '',
})

const mapApiScopeRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  menuId: row?.menuId != null ? String(row.menuId) : '',
  resourceCode: row?.resourceCode || '',
  scopeName: row?.scopeName || '',
  scopePath: row?.scopePath || '',
  scopeType: row?.scopeType != null ? Number(row.scopeType) : undefined,
  scopeTypeName: row?.scopeTypeName || '',
  remark: row?.remark || '',
})

const SCOPE_TYPE_FALLBACK: Record<'data_scope_type' | 'api_scope_type', { label: string; value: number }[]> = {
  data_scope_type: [
    { label: '全部可见', value: 1 },
    { label: '本人可见', value: 2 },
    { label: '所在机构可见', value: 3 },
    { label: '所在机构及子级可见', value: 4 },
    { label: '自定义', value: 5 },
  ],
  api_scope_type: [
    { label: '系统接口', value: 1 },
    { label: '业务接口', value: 2 },
  ],
}

/** 字典项：data_scope_type / api_scope_type（须 unwrap，过滤父级 dictKey=-1） */
export async function getScopeTypeDict(code: 'data_scope_type' | 'api_scope_type') {
  try {
    const res: any = await request({
      url: '/api/blade-system/dict/dictionary',
      method: 'get',
      params: { code },
      silentError: true,
    })
    const raw = unwrap(res)
    const arr = Array.isArray(raw) ? raw : []
    const options = arr
      .map((d: any) => ({
        label: String(d.dictValue || d.label || '').trim(),
        value: Number(d.dictKey),
      }))
      .filter((o) => o.label && Number.isFinite(o.value) && o.value >= 0)
    if (options.length) return options
  } catch {
    /* fall through */
  }
  return SCOPE_TYPE_FALLBACK[code] || []
}

export async function getDataScopeList(params?: any) {
  const page = toBladePage(params)
  const res: any = await request({
    url: '/api/blade-system/data-scope/list',
    method: 'get',
    params: {
      current: page.current,
      size: page.size,
      menuId: params?.menuId || undefined,
      scopeName: params?.scopeName || params?.name || undefined,
      resourceCode: params?.resourceCode || params?.code || undefined,
    },
  })
  return adaptPage(res, mapDataScopeRow)
}

export async function getDataScopeDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/data-scope/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapDataScopeRow(data) : {}
}

export async function doEditDataScope(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    menuId: data.menuId,
    resourceCode: data.resourceCode,
    scopeName: data.scopeName,
    scopeField: data.scopeField ?? '*',
    scopeClass: data.scopeClass,
    scopeColumn: data.scopeColumn,
    scopeType: data.scopeType != null ? Number(data.scopeType) : undefined,
    scopeValue: data.scopeValue,
    remark: data.remark ?? '',
  }
  if (!payload.menuId) throw new Error('请选择所属菜单')
  if (!payload.scopeName) throw new Error('权限名称不能为空')
  if (!payload.resourceCode) throw new Error('权限编号不能为空')
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === '') delete payload[k]
  })
  if (data.scopeField === '*') payload.scopeField = '*'

  const res: any = await request({
    url: '/api/blade-system/data-scope/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) throw new Error(res?.msg || '保存失败')
  return adaptMsg(res, '保存成功')
}

export async function doDeleteDataScope(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') throw new Error('缺少数据权限ID')
  const res: any = await request({
    url: '/api/blade-system/data-scope/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) throw new Error(res?.msg || '删除失败')
  return adaptMsg(res, '删除成功')
}

export async function getApiScopeList(params?: any) {
  const page = toBladePage(params)
  const res: any = await request({
    url: '/api/blade-system/api-scope/list',
    method: 'get',
    params: {
      current: page.current,
      size: page.size,
      menuId: params?.menuId || undefined,
      scopeName: params?.scopeName || params?.name || undefined,
      resourceCode: params?.resourceCode || params?.code || undefined,
    },
  })
  return adaptPage(res, mapApiScopeRow)
}

export async function getApiScopeDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/api-scope/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapApiScopeRow(data) : {}
}

export async function doEditApiScope(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    menuId: data.menuId,
    resourceCode: data.resourceCode,
    scopeName: data.scopeName,
    scopePath: data.scopePath,
    scopeType: data.scopeType != null ? Number(data.scopeType) : undefined,
    remark: data.remark ?? '',
  }
  if (!payload.menuId) throw new Error('请选择所属菜单')
  if (!payload.scopeName) throw new Error('权限名称不能为空')
  if (!payload.resourceCode) throw new Error('权限编号不能为空')
  if (!payload.scopePath) throw new Error('权限路径不能为空')
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === '') delete payload[k]
  })

  const res: any = await request({
    url: '/api/blade-system/api-scope/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) throw new Error(res?.msg || '保存失败')
  return adaptMsg(res, '保存成功')
}

export async function doDeleteApiScope(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') throw new Error('缺少接口权限ID')
  const res: any = await request({
    url: '/api/blade-system/api-scope/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) throw new Error(res?.msg || '删除失败')
  return adaptMsg(res, '删除成功')
}
