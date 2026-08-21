import { adaptList, adaptMsg, getEnvelope, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'
import { toBladeMenuCode } from '/@/utils/bladeMenuCodes'
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

  // 常见默认租户兜底（最先设置，避免接口失败时无任何映射）
  const builtIn: Record<string, string> = {
    '000000': '管理组',
  }
  Object.entries(builtIn).forEach(([k, v]) => map.set(k, v))

  const absorb = (arr: any[]) => {
    ;(arr || []).forEach((t: any) => {
      // 兼容 BladeX tenant/select（{tenantId,tenantName}）与第三方返回（{value,label} / {id,name}）
      const tid = String(t.tenantId ?? t.tenantCode ?? t.code ?? t.value ?? '').trim()
      const pk = t.id != null ? String(t.id) : ''
      const name = String(t.tenantName || t.name || t.label || t.title || '').trim()
      if (!name) return
      // 角色上存的是业务租户号 tenantId（如 000000），不是主键 id
      if (tid) map.set(tid, name)
      if (pk && pk !== tid) map.set(pk, name)
    })
  }

  const tryFetch = async (url: string, params?: Record<string, any>) => {
    try {
      const res: any = await request({ url, method: 'get', params, silentError: true })
      // 兼容 AxiosResponse 与已解包 body
      const data = unwrap(res)
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.records)) return data.records
      if (Array.isArray(data?.list)) return data.list
      const envelope = getEnvelope(res)
      if (Array.isArray(envelope?.data)) return envelope.data
      if (Array.isArray(envelope?.data?.records)) return envelope.data.records
    } catch {
      /* ignore */
    }
    return []
  }

  // select 可能受租户范围限制；page 作补充（管理员可看到更多）
  absorb(await tryFetch('/api/blade-system/tenant/select'))
  absorb(await tryFetch('/api/blade-system/tenant/page', { current: 1, size: 500 }))

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

  // 解析租户显示名称：优先后端 tenantName（前提是不等于 tenantId 本身），其次租户字典，最后兜底
  let tenantDisplay = ''
  if (tenantId) {
    const raw = String(r.tenantName ?? '').trim()
    // 后端偶发把 tenantId 填进 tenantName，或返回「租户 000000」
    if (raw && raw !== tenantId && !/^租户\s*/.test(raw)) {
      tenantDisplay = raw
    }
    if (!tenantDisplay) {
      const mapped = tenantMap?.get(tenantId)
      if (mapped && mapped !== tenantId && !/^租户\s*/.test(mapped)) {
        tenantDisplay = mapped
      }
    }
    // 默认 / 全局租户
    if (!tenantDisplay && (tenantId === '0' || tenantId === '000000')) {
      tenantDisplay = '管理组'
    }
    // 最终兜底：带「租户」前缀，而非裸 ID
    if (!tenantDisplay) {
      tenantDisplay = `租户 ${tenantId}`
    }
  }

  return {
    ...r,
    id: r.id != null ? String(r.id) : '',
    parentId: r.parentId != null ? String(r.parentId) : '0',
    parentName: r.parentName || '',
    tenantId,
    tenantName: tenantDisplay,
    roleName,
    roleAlias,
    role: roleAlias || roleName,
    sort: r.sort != null ? Number(r.sort) : 0,
    level,
    children,
    hasChildren: !!(children && children.length),
  }
}

export async function getList(params?: any) {
  const tenantMap = await loadTenantNameMap()
  const res: any = await request({
    url: '/api/blade-system/role/list',
    method: 'get',
    params: {
      roleName: params?.role || params?.roleName,
      roleAlias: params?.roleAlias,
    },
  })
  // 必须直接把 AxiosResponse 交给 adaptList；勿再包一层 { data:{ code,data } }，
  // 否则 unwrap 取不到数组，角色树会变成空列表
  return adaptList(res, (r: any) => mapRole(r, 0, tenantMap))
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

export async function getRoleTree(tenantId?: string) {
  const tenantMap = await loadTenantNameMap()
  try {
    const res: any = await request({
      url: '/api/blade-system/role/tree',
      method: 'get',
      params: tenantId ? { tenantId } : undefined,
      silentError: true,
    })
    const raw = unwrap(res)
    const arr = Array.isArray(raw) ? raw : []
    return {
      code: 200,
      success: true,
      msg: '操作成功',
      data: { list: arr.map((r: any) => mapRole(r, 0, tenantMap)), total: arr.length },
    }
  } catch {
    return { code: 200, success: true, msg: '操作成功', data: { list: [], total: 0 } }
  }
}

export async function doEdit(data: any) {
  const payload = {
    id: data.id || undefined,
    parentId: data.parentId || 0,
    roleName: data.roleName || data.role || data.name,
    roleAlias: data.roleAlias || data.role || data.alias,
    sort: data.sort != null ? Number(data.sort) : 0,
    // 超管新增顶级角色时 TenantGuard 不会自动填 tenantId
    tenantId: resolveTenantId(data.tenantId),
  }
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

/**
 * 解析权限树节点 id：数字 = 菜单主键；非数字 = 菜单 code/alias，需查库转 id
 * （权限树回退前端路由时 id 常为 UserManagement 等字符串）
 */
async function resolveMenuIds(rawIds: any[]): Promise<string[]> {
  const ids = (rawIds || []).map((id) => String(id)).filter(Boolean)
  const numeric = ids.filter((id) => /^\d+$/.test(id))
  const codes = ids.filter((id) => !/^\d+$/.test(id))
  if (!codes.length) return [...new Set(numeric)]

  const codeToId = new Map<string, string>()
  const absorb = (nodes: any[]) => {
    ;(nodes || []).forEach((n) => {
      const id = n?.id != null ? String(n.id) : ''
      if (!id) return
      if (n.code) codeToId.set(String(n.code), id)
      if (n.alias) codeToId.set(String(n.alias), id)
      if (n.children?.length) absorb(n.children)
    })
  }

  try {
    const listRes: any = await request({
      url: '/api/blade-system/menu/list',
      method: 'get',
      silentError: true,
    })
    const raw = unwrap(listRes)
    absorb(Array.isArray(raw) ? raw : raw?.list || [])
  } catch {
    /* ignore */
  }
  if (!codeToId.size) {
    try {
      const routesRes: any = await request({
        url: '/api/blade-system/menu/routes',
        method: 'get',
        silentError: true,
      })
      absorb(Array.isArray(unwrap(routesRes)) ? unwrap(routesRes) : [])
    } catch {
      /* ignore */
    }
  }

  const resolved = codes
    .map((c) => codeToId.get(c) || codeToId.get(toBladeMenuCode(c)))
    .filter(Boolean) as string[]
  const unresolved = codes.filter((c) => !codeToId.has(c) && !codeToId.has(toBladeMenuCode(c)))
  if (unresolved.length) {
    throw new Error(
      `菜单未同步到后端，请先用管理员在「菜单管理」点击「同步当前菜单」后再授权。缺失：${unresolved
        .slice(0, 8)
        .join(', ')}${unresolved.length > 8 ? '…' : ''}`
    )
  }
  return [...new Set([...numeric, ...resolved])]
}

export async function grantRole(data: any) {
  const roleIds = data.roleIds || (data.roleId != null ? [data.roleId] : [])
  const dataScopeIds = (data.dataScopeIds || []).map((id: any) => String(id))
  const apiScopeIds = (data.apiScopeIds || []).map((id: any) => String(id))
  const menuIds = await resolveMenuIds(data.menuIds || [])

  try {
    const res: any = await request({
      url: '/api/blade-system/role/grant',
      method: 'post',
      data: {
        roleIds: roleIds.map((id: any) => String(id)),
        menuIds,
        dataScopeIds,
        apiScopeIds,
      },
      silentError: true,
    })
    const envelope = getEnvelope(res) || {}
    if (envelope?.success === false) {
      throw new Error(envelope?.msg || '权限配置失败')
    }
    return adaptMsg(res, '权限配置成功')
  } catch (e: any) {
    const msg = String(e?.message || e?.msg || '')
    if (/请求未授权|权限不足|无访问权限|access is denied|forbidden/i.test(msg)) {
      throw new Error('无权限配置权限，请在角色中勾选「菜单管理」和「角色管理」菜单后重新登录')
    }
    throw e
  }
}

