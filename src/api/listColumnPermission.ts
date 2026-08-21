import request from '/@/utils/request'
import { adaptMsg, unwrap } from '/@/utils/bladeAdapter'

/** 列表列权限 → BladeX /blade-system/role-list-column（真实库表，非 mock） */

export async function getMyListColumnMap() {
  try {
    const res: any = await request({
      url: '/api/blade-system/role-list-column/my-map',
      method: 'get',
      silentError: true,
      meta: { silentError: true },
    })
    const rawMap = unwrap(res)
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) {
      return {} as Record<string, string[]>
    }
    const map: Record<string, string[]> = {}
    Object.keys(rawMap).forEach((pageCode) => {
      // 忽略信封残留字段
      if (pageCode === 'code' || pageCode === 'success' || pageCode === 'msg') return
      const raw = (rawMap as any)[pageCode]
      if (raw == null) return
      map[pageCode] = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    })
    return map
  } catch (e) {
    console.warn('[listColumn] /my-map 失败，列权限降级为全部可见', e)
    return {}
  }
}

export async function getListColumnByRole(roleId: string | number) {
  const res: any = await request({
    url: '/api/blade-system/role-list-column/list-by-role',
    method: 'get',
    params: { roleId },
    silentError: true,
  })
  const raw = unwrap(res)
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  return arr as any[]
}

export async function submitListColumn(data: {
  id?: string | number
  roleId: string | number
  pageCode: string
  pageName?: string
  visibleColumns: string
  remark?: string
}) {
  const res: any = await request({
    url: '/api/blade-system/role-list-column/submit',
    method: 'post',
    data,
  })
  return adaptMsg(res, '保存成功')
}

export async function submitListColumnBatch(
  items: Array<{
    roleId: string | number
    pageCode: string
    pageName?: string
    visibleColumns: string
  }>
) {
  const res: any = await request({
    url: '/api/blade-system/role-list-column/submit-batch',
    method: 'post',
    data: items,
  })
  return adaptMsg(res, '保存成功')
}

export async function removeListColumn(ids: string | number) {
  const res: any = await request({
    url: '/api/blade-system/role-list-column/remove',
    method: 'post',
    params: { ids },
  })
  return adaptMsg(res, '删除成功')
}

export async function removeListColumnByRolePage(roleId: string | number, pageCode: string) {
  const res: any = await request({
    url: '/api/blade-system/role-list-column/remove-by-role-page',
    method: 'post',
    params: { roleId, pageCode },
  })
  return adaptMsg(res, '已清除')
}
