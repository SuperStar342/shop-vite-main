import request from '/@/utils/request'
import { adaptList, adaptMsg, getEnvelope, unwrap } from '/@/utils/bladeAdapter'
import { resolveTenantId } from '/@/utils/tenant'

/**
 * 部门管理 → BladeX /blade-system/dept
 * 列表为树（ForestNodeMerger）；listNodeVO 不含 parentName，前端自行补全
 */

/** 递归映射部门树 */
function mapDept(d: any, level = 0): any {
  const childrenRaw = Array.isArray(d?.children) ? d.children : []
  const children = childrenRaw.length ? childrenRaw.map((c: any) => mapDept(c, level + 1)) : undefined
  const id = d.id != null ? String(d.id) : ''
  const parentId = d.parentId != null ? String(d.parentId) : '0'
  const deptName = d.deptName || d.title || d.label || d.name || ''
  return {
    ...d,
    id,
    parentId,
    parentName: d.parentName || '',
    deptName,
    fullName: d.fullName || deptName,
    deptCategory: d.deptCategory != null ? Number(d.deptCategory) : undefined,
    deptCategoryName: d.deptCategoryName || '',
    sort: d.sort ?? d.order ?? 0,
    remark: d.remark || '',
    status: d.status,
    level,
    hasChildren: childrenRaw.length > 0,
    children,
    users: [] as any[],
    userCount: 0,
    label: deptName,
    name: deptName,
    value: id,
    parentValue: parentId === '0' ? '' : parentId,
    order: d.sort ?? d.order ?? 0,
  }
}

/** 扁平化部门树 → id→名称 */
function flattenDeptNameMap(nodes: any[], map = new Map<string, string>()) {
  nodes.forEach((n) => {
    if (n?.id != null) map.set(String(n.id), n.deptName || n.label || '')
    if (n.children?.length) flattenDeptNameMap(n.children, map)
  })
  return map
}

/** 为每个节点补全上级部门名称 */
function fillParentNames(nodes: any[], nameMap: Map<string, string>): any[] {
  return nodes.map((n) => {
    const parentId = String(n.parentId ?? '0')
    const parentName =
      !parentId || parentId === '0'
        ? '顶级'
        : n.parentName || nameMap.get(parentId) || '未知'
    return {
      ...n,
      parentName,
      children: n.children?.length ? fillParentNames(n.children, nameMap) : undefined,
    }
  })
}

/** 用户简要信息 */
function toUserBrief(u: any) {
  return {
    id: u.id != null ? String(u.id) : '',
    username: u.account || u.username || '',
    account: u.account || '',
    name: u.realName || u.name || u.account || '',
    avatar: u.avatar || '',
    phone: u.phone || '',
    email: u.email || '',
    status: u.status,
    statusLabel: u.status === 0 || u.status === '0' ? '停用' : '启用',
    roleName: u.roleName || '',
  }
}

/** 按部门 id 归组用户（支持多部门逗号分隔） */
function groupUsersByDept(users: any[] = []) {
  const map = new Map<string, any[]>()
  users.forEach((u) => {
    const brief = toUserBrief(u)
    String(u.deptId || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((deptId) => {
        if (!map.has(deptId)) map.set(deptId, [])
        map.get(deptId)!.push(brief)
      })
  })
  return map
}

/** 每个部门挂上直属用户与人数 */
function attachDeptUsers(nodes: any[] = [], userMap: Map<string, any[]>): any[] {
  return nodes.map((n) => {
    const users = userMap.get(String(n.id)) || []
    const children = n.children?.length ? attachDeptUsers(n.children, userMap) : undefined
    return {
      ...n,
      users,
      userCount: users.length,
      children,
      hasChildren: !!(children && children.length),
    }
  })
}

/** 拉取用户列表用于统计（优先 user-page，避免 /user/page 菜单鉴权 401） */
async function fetchAllUsers() {
  const tryUrls = ['/api/blade-system/user/user-page', '/api/blade-system/user/page']
  for (const url of tryUrls) {
    try {
      const res: any = await request({
        url,
        method: 'get',
        params: { current: 1, size: 2000 },
        silentError: true,
      })
      const page = res?.data || {}
      const records = Array.isArray(page.records) ? page.records : page.list || []
      if (Array.isArray(records)) return records
    } catch {
      /* try next */
    }
  }
  return []
}

/** 部门列表（树）+ 上级名称 + 各部门人数/成员 */
export async function getList(params?: any) {
  const keyword = params?.label || params?.name || params?.deptName
  const withUsers = params?.withUsers !== false

  let deptRes: any
  try {
    deptRes = await request({
      url: '/api/blade-system/dept/list',
      method: 'get',
      params: { deptName: keyword || undefined },
      silentError: true,
    })
  } catch (e: any) {
    throw new Error(e?.msg || e?.message || '无部门管理权限，请在角色中勾选「部门管理」菜单后重新登录')
  }
  if (deptRes?.success === false || Number(deptRes?.code) === 401) {
    throw new Error(deptRes?.msg || '无部门管理权限，请在角色中勾选「部门管理」菜单后重新登录')
  }
  const raw = deptRes?.data
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  let list = arr.map((row: any) => mapDept(row, 0))

  // 补全上级部门名称（后端 listNodeVO 不返回 parentName）
  const nameMap = flattenDeptNameMap(list)
  list = fillParentNames(list, nameMap)

  if (withUsers) {
    const users = await fetchAllUsers().catch(() => [])
    list = attachDeptUsers(list, groupUsersByDept(users))
  }

  return {
    code: deptRes?.code ?? 200,
    success: deptRes?.success ?? true,
    msg: deptRes?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

/** 部门详情（编辑回显） */
export async function getDeptDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/dept/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapDept(data, 0) : {}
}

/** 部门树（上级选择，不拉用户） */
export async function getDeptTree(tenantId?: string) {
  const res: any = await request({
    url: '/api/blade-system/dept/tree',
    method: 'get',
    params: { tenantId },
  })
  const adapted = adaptList(res, (row) => mapDept(row, 0))
  const nameMap = flattenDeptNameMap(adapted.data.list)
  adapted.data.list = fillParentNames(adapted.data.list, nameMap)
  return adapted
}

/** 某部门直属人员 */
export async function getDeptUsers(deptId: string) {
  if (!deptId) {
    return { code: 200, success: true, msg: 'ok', data: { list: [], total: 0 } }
  }
  const tryUrls = ['/api/blade-system/user/user-page', '/api/blade-system/user/page']
  let records: any[] = []
  let lastRes: any = null
  for (const url of tryUrls) {
    try {
      const res: any = await request({
        url,
        method: 'get',
        params: { current: 1, size: 500, deptId },
        silentError: true,
      })
      lastRes = res
      const page = res?.data || {}
      records = Array.isArray(page.records) ? page.records : page.list || []
      if (records.length || res?.success !== false) break
    } catch {
      /* try next */
    }
  }
  const list = records
    .filter((u: any) =>
      String(u.deptId || '')
        .split(',')
        .map((s: string) => s.trim())
        .includes(String(deptId))
    )
    .map(toUserBrief)
  return {
    code: lastRes?.code ?? 200,
    success: lastRes?.success ?? true,
    msg: lastRes?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

/** 机构类型字典 */
export async function getOrgCategoryOptions() {
  const res: any = await request({
    url: '/api/blade-system/dict/dictionary',
    method: 'get',
    params: { code: 'org_category' },
  })
  const raw = res?.data
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((d: any) => ({
    label: d.dictValue || d.label,
    value: Number(d.dictKey),
  }))
}

/** 新增 / 修改 */
export async function doEdit(data: any) {
  const deptName = String(data.deptName || data.label || data.name || '').trim()
  if (!deptName) throw new Error('请输入部门名称')

  const rawParent = data.parentId ?? data.parentValue
  const parentId =
    rawParent === '' || rawParent === undefined || rawParent === null || rawParent === '0'
      ? 0
      : rawParent

  const payload: Record<string, any> = {
    parentId,
    deptName,
    fullName: String(data.fullName || deptName).trim(),
    deptCategory: Number(data.deptCategory ?? 1),
    sort: Number(data.sort ?? data.order ?? 0),
    // 超管新增顶级部门时后端 TenantGuard 不会自动填，必须显式传
    tenantId: resolveTenantId(data.tenantId),
  }
  if (data.remark) payload.remark = data.remark
  if (data.id) payload.id = data.id

  const res: any = await request({
    url: '/api/blade-system/dept/submit',
    method: 'post',
    data: payload,
  })
  const envelope = getEnvelope(res) || {}
  if (envelope?.success === false) throw new Error(envelope?.msg || '保存失败')

  const entity = unwrap(res)
  const entityObj =
    entity && typeof entity === 'object' && !Array.isArray(entity) ? (entity as Record<string, any>) : {}
  const savedId =
    entityObj.id != null && entityObj.id !== ''
      ? String(entityObj.id)
      : data.id
        ? String(data.id)
        : ''

  return {
    ...adaptMsg(res, '保存成功'),
    data: {
      ...entityObj,
      id: savedId,
      parentId: String(parentId),
      deptName,
      fullName: payload.fullName,
      deptCategory: payload.deptCategory,
      deptCategoryName: entityObj.deptCategoryName || '',
      sort: payload.sort,
      remark: payload.remark || '',
      needReload: !savedId,
    },
  }
}

/** 删除 */
export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') throw new Error('缺少部门ID')
  const res: any = await request({
    url: '/api/blade-system/dept/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) throw new Error(res?.msg || '删除失败')
  return adaptMsg(res, '删除成功')
}
