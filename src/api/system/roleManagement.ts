import { adaptList, adaptMsg, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'
import { resolveTenantId } from '/@/utils/tenant'

/**
 * 角色管理 → BladeX /blade-system/role
 * /list 经 ForestNodeMerger 返回树（含 children）
 */

let tenantNameCache: Map<string, string> | null = null

/** 租户 ID → 名称（缓存，供列表展示所属租户） */
async function loadTenantNameMap(force = false): Promise<Map<string, string>> {
  if (!force && tenantNameCache && tenantNameCache.size > 0) return tenantNameCache
  const map = new Map<string, string>()

  const absorb = (arr: any[]) => {
    ;(arr || []).forEach((t: any) => {
      const tid = String(t.tenantId ?? '').trim()
      const pk = t.id != null ? String(t.id) : ''
      const name = String(t.tenantName || t.name || '').trim()
      if (!name) return
      // 角色上存的是业务租户号 tenantId（如 000000），不是主键 id
      if (tid) map.set(tid, name)
      if (pk && pk !== tid) map.set(pk, name)
    })
  }

  const tryFetch = async (url: string, params?: Record<string, any>) => {
    try {
      const res: any = await request({ url, method: 'get', params, silentError: true })
      const raw = res?.data
      if (Array.isArray(raw)) return raw
      if (Array.isArray(raw?.records)) return raw.records
      if (Array.isArray(raw?.list)) return raw.list
      if (Array.isArray(res) && res.length && (res[0]?.tenantId || res[0]?.tenantName)) return res
    } catch {
      /* ignore */
    }
    return []
  }

  // select 可能受租户范围限制；page 作补充（管理员可看到更多）
  absorb(await tryFetch('/api/blade-system/tenant/select'))
  if (map.size === 0) {
    absorb(await tryFetch('/api/blade-system/tenant/page', { current: 1, size: 500 }))
  }

  tenantNameCache = map
  return map
}

/** 递归映射角色树节点 */
function mapRole(r: any, level = 0, tenantMap?: Map<string, string>): any {
  const childrenRaw = Array.isArray(r?.children) ? r.children : []
  const children = childrenRaw.length
    ? childrenRaw.map((c: any) => mapRole(c, level + 1, tenantMap))
    : undefined
  const roleAlias = String(r.roleAlias || r.role || r.alias || '').trim()
  // /role/tree 只返回 title；部分数据仅有别名
  const roleName = String(r.roleName || r.title || r.label || r.name || roleAlias || '').trim()
  const tenantId = r.tenantId != null && r.tenantId !== '' ? String(r.tenantId) : ''
  const mappedName = tenantId ? tenantMap?.get(tenantId) : ''
  // 优先用后端 RoleVO.tenantName，其次前端租户字典；不要用 tenantId 冒充名称
  const tenantName = String(r.tenantName || mappedName || '').trim()
  return {
    ...r,
    id: r.id != null ? String(r.id) : '',
    parentId: r.parentId != null ? String(r.parentId) : '0',
    parentName: r.parentName || '',
    tenantId,
    tenantName: tenantName || (tenantId ? `租户 ${tenantId}` : ''),
    roleName,
    roleAlias: roleAlias || roleName,
    label: roleName || roleAlias || '-',
    title: roleName || roleAlias || r.title || '',
    role: roleAlias || roleName,
    sort: r.sort ?? 0,
    status: r.status,
    level,
    hasChildren: childrenRaw.length > 0,
    children,
  }
}

/** 用树内节点补全上级角色名称 */
function fillRoleParentNames(nodes: any[], nameMap?: Map<string, string>): any[] {
  const map = nameMap || new Map<string, string>()
  const walkCollect = (list: any[]) => {
    list.forEach((n) => {
      const name = n.roleName || n.roleAlias || n.label || ''
      if (n.id != null && name) map.set(String(n.id), name)
      if (n.children?.length) walkCollect(n.children)
    })
  }
  if (!nameMap) walkCollect(nodes)
  return nodes.map((n) => {
    const parentId = String(n.parentId ?? '0')
    const parentName =
      !parentId || parentId === '0'
        ? n.parentName || '顶级'
        : n.parentName || map.get(parentId) || '-'
    return {
      ...n,
      parentName,
      children: n.children?.length ? fillRoleParentNames(n.children, map) : undefined,
    }
  })
}

/** 角色列表（树） */
export async function getList(params?: any) {
  const [res, tenantMap]: any[] = await Promise.all([
    request({
      url: '/api/blade-system/role/list',
      method: 'get',
      params: {
        roleName: params?.role || params?.roleName || undefined,
        roleAlias: params?.roleAlias || undefined,
      },
    }),
    loadTenantNameMap(),
  ])
  const adapted = adaptList(res, (row) => mapRole(row, 0, tenantMap))
  adapted.data.list = fillRoleParentNames(adapted.data.list)
  return adapted
}

/** 角色详情（编辑回显） */
export async function getRoleDetail(id: string | number) {
  const tenantMap = await loadTenantNameMap()
  const res: any = await request({
    url: '/api/blade-system/role/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapRole(data, 0, tenantMap) : {}
}

/** 角色树（下拉/上级选择） */
export async function getRoleTree(tenantId?: string) {
  const [res, tenantMap]: any[] = await Promise.all([
    request({
      url: '/api/blade-system/role/tree',
      method: 'get',
      params: { tenantId },
    }),
    loadTenantNameMap(),
  ])
  const adapted = adaptList(res, (row) => mapRole(row, 0, tenantMap))
  adapted.data.list = fillRoleParentNames(adapted.data.list)
  return adapted
}

export async function doEdit(data: any) {
  const parentId =
    data.parentId === '' || data.parentId === undefined || data.parentId === null
      ? 0
      : data.parentId
  const payload: Record<string, any> = {
    id: data.id || undefined,
    parentId,
    roleName: data.roleName || data.role,
    roleAlias: data.roleAlias || data.role,
    sort: data.sort ?? 0,
    // 超管新增顶级角色时 TenantGuard 不会自动填 tenantId
    tenantId: resolveTenantId(data.tenantId),
  }
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === '') delete payload[k]
  })
  // parentId=0 表示顶级，需保留
  if (parentId === 0 || parentId === '0') payload.parentId = 0

  const res: any = await request({
    url: '/api/blade-system/role/submit',
    method: 'post',
    data: payload,
  })
  return adaptMsg(res, '保存成功')
}

export async function doDelete(data: any) {
  const res: any = await request({
    url: '/api/blade-system/role/remove',
    method: 'post',
    params: { ids: data?.ids || data?.id },
  })
  return adaptMsg(res, '删除成功')
}

/** 菜单管理左侧：角色树 */
export async function getRoleOptions(params?: any) {
  try {
    return await getList({ roleName: params?.role || params?.roleName })
  } catch {
    /* fall through */
  }
  return getRoleTree(params?.tenantId)
}

export async function grantRole(data: any) {
  const roleIds = data.roleIds || (data.roleId != null ? [data.roleId] : [])
  const menuIds = data.menuIds || []
  const dataScopeIds = data.dataScopeIds || []
  const apiScopeIds = data.apiScopeIds || []
  const res: any = await request({
    url: '/api/blade-system/role/grant',
    method: 'post',
    data: {
      roleIds: roleIds.map((id: any) => String(id)),
      menuIds: menuIds.map((id: any) => String(id)),
      dataScopeIds: dataScopeIds.map((id: any) => String(id)),
      apiScopeIds: apiScopeIds.map((id: any) => String(id)),
    },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '权限配置失败')
  }
  return adaptMsg(res, '权限配置成功')
}
