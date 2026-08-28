import { asyncRoutes } from '/@/router/modules'
import { adaptMsg } from '/@/utils/bladeAdapter'
import { expandMenuCodesForRoutes, toBladeMenuCode } from '/@/utils/bladeMenuCodes'
import { getCurrentRouteMenus, routesToMenuTree, type RouteMenuNode } from '/@/utils/menuFromRoutes'
import request from '/@/utils/request'

/**
 * 菜单管理 → BladeX /blade-system/menu（列表/增删改均以数据库 blade_menu 为准）
 *
 * 「同步路由到库」：把前端 router 里的菜单一次性写入/更新到库表，便于初始化或对齐侧边栏。
 *
 * BladeX Menu: id / parentId / code / name / alias / path / source / component / sort / category / action / isOpen / remark
 */

/** 递归映射菜单树，供 el-table / el-tree 使用 */
const mapMenuTree = (nodes: any[] = [], level = 0): any[] =>
  nodes.map((m) => {
    const rawChildren = Array.isArray(m.children) && m.children.length ? m.children : undefined
    const children = rawChildren ? mapMenuTree(rawChildren, level + 1) : undefined
    const title = m.name || m.title || m.meta?.title || ''
    const icon = m.source || m.meta?.icon || ''
    const childCount = children?.length || 0
    return {
      ...m,
      id: m.id != null ? String(m.id) : m.id,
      parentId: m.parentId != null && m.parentId !== '' ? String(m.parentId) : '0',
      name: title,
      code: m.code || '',
      alias: m.alias || '',
      path: m.path || '',
      component: m.component || '',
      source: icon,
      sort: Number(m.sort ?? 0),
      category: Number(m.category ?? 1),
      action: Number(m.action ?? 0),
      isOpen: Number(m.isOpen ?? 1),
      remark: m.remark || '',
      meta: {
        ...(m.meta || {}),
        title,
        icon,
      },
      label: title,
      title,
      level,
      childCount,
      children,
      hasChildren: childCount > 0 || !!m.hasChildren,
    }
  })

/** 左侧 TreeNode：title → label；补齐 name 供 tree-select 显示 */
const mapTreeNodes = (nodes: any[] = []): any[] =>
  nodes.map((n) => {
    const children = Array.isArray(n.children) && n.children.length ? mapTreeNodes(n.children) : undefined
    const title = n.title || n.label || n.name || ''
    return {
      ...n,
      id: String(n.id ?? n.key ?? n.value ?? ''),
      value: String(n.id ?? n.key ?? n.value ?? ''),
      label: title,
      name: title,
      title,
      children,
    }
  })

/** 编辑表单 → BladeX Menu 提交体 */
const toBladeMenu = (data: any) => {
  const payload: Record<string, any> = {
    parentId: data.parentId === '' || data.parentId === undefined || data.parentId === null ? 0 : data.parentId,
    code: data.code,
    name: data.name || data.meta?.title || data.label,
    alias: data.alias || data.code,
    path: data.path || '',
    source: data.source || data.meta?.icon || '',
    component: data.component || '',
    sort: Number(data.sort ?? data.order ?? 0),
    category: Number(data.category ?? 1),
    action: Number(data.action ?? 0),
    isOpen: Number(data.isOpen ?? 1),
    remark: data.remark || '',
  }
  // 新增不传 id；前端路由同步项的 id 是路由 name，不能当库表主键
  if (data.id !== undefined && data.id !== null && data.id !== '' && /^\d+$/.test(String(data.id))) {
    payload.id = data.id
  }
  return payload
}

export async function getTree(params?: any) {
  const res: any = await request({
    url: '/api/blade-system/menu/tree',
    method: 'get',
    params,
  })
  const raw = res?.data
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  const list = mapTreeNodes(arr)
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

export async function getList(params?: any) {
  // 菜单管理列表：直接读数据库 blade_menu
  return getBackendList(params)
}

/** 从后端拉取库表菜单 */
export async function getBackendList(params?: any) {
  const res: any = await request({
    url: '/api/blade-system/menu/list',
    method: 'get',
    params: {
      name: params?.name || params?.title || params?.['meta.title'],
      code: params?.code,
    },
  })
  const raw = res?.data
  const arr = Array.isArray(raw) ? raw : raw?.records || raw?.list || []
  const list = mapMenuTree(arr)
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: { list, total: list.length },
  }
}

const flattenMenus = (nodes: RouteMenuNode[], acc: RouteMenuNode[] = []): RouteMenuNode[] => {
  nodes.forEach((n) => {
    acc.push(n)
    if (n.children?.length) flattenMenus(n.children, acc)
  })
  return acc
}

/** 拉取后端菜单并建立 code / path / parent+name 索引 */
const refreshBackendMenuMaps = async () => {
  const backendRes: any = await getBackendList()
  const backendFlat: any[] = []
  const walk = (nodes: any[]) => {
    nodes.forEach((n) => {
      backendFlat.push(n)
      if (n.children?.length) walk(n.children)
    })
  }
  walk(backendRes?.data?.list || [])
  const byCode = new Map<string, any>()
  const byPath = new Map<string, any>()
  const byParentName = new Map<string, any>()
  const codeToId = new Map<string, string>()
  backendFlat.forEach((m) => {
    if (m.code) {
      byCode.set(String(m.code), m)
      if (m.id) codeToId.set(String(m.code), String(m.id))
    }
    if (m.alias && m.id) {
      codeToId.set(String(m.alias), String(m.id))
      byCode.set(String(m.alias), m)
    }
    if (m.path) byPath.set(String(m.path), m)
    if (m.name != null) {
      byParentName.set(`${m.parentId ?? 0}::${m.name}`, m)
    }
  })
  return { byCode, byPath, byParentName, codeToId }
}

/** 提交菜单；遇「已存在」时按 code/path 归并后重试（兼容未重启的旧版 BladeX） */
const submitMenuPayload = async (
  payload: Record<string, any>,
  getMaps: () => Promise<Awaited<ReturnType<typeof refreshBackendMenuMaps>>>
) => {
  const trySubmit = async (data: Record<string, any>) => {
    await request({
      url: '/api/blade-system/menu/submit',
      method: 'post',
      data,
    })
  }

  try {
    await trySubmit(payload)
    return
  } catch (e: any) {
    const msg = String(e?.msg || e?.message || '')
    if (!/已存在/.test(msg)) throw e

    const refreshed = await getMaps()
    const exist =
      (payload.code && refreshed.byCode.get(String(payload.code))) ||
      (payload.alias && refreshed.byCode.get(String(payload.alias))) ||
      (payload.path && refreshed.byPath.get(String(payload.path)))

    if (!exist?.id) throw e

    await trySubmit({
      ...payload,
      id: exist.id,
      // 旧版全局 name 唯一：与库中其它菜单重名时用编号区分
      name: payload.name?.includes(String(payload.code)) ? payload.name : `${payload.name}·${payload.code}`,
      // 路径冲突时保留库中原 path，避免「菜单路径已存在」
      path: exist.path || payload.path,
    })
    payload.id = exist.id
  }
}

/**
 * 将当前前端路由菜单同步到 BladeX 菜单表
 * 匹配顺序：code → alias → path；名称带编号后缀以兼容旧版全局同名校验
 */
export async function syncCurrentMenusToBackend(options?: { onlyCodes?: string[] }) {
  const routeTree = routesToMenuTree(asyncRoutes)
  const flat = flattenMenus(routeTree)
  const only = options?.onlyCodes?.length ? new Set(options.onlyCodes.map(String)) : null

  let maps = await refreshBackendMenuMaps()
  let { byCode, byPath, byParentName, codeToId } = maps
  const ordered = [...flat].filter((item) => !only || only.has(String(item.code))).sort((a, b) => a.level - b.level || a.sort - b.sort)

  if (only) {
    const need = new Set(ordered.map((i) => String(i.code)))
    const all = flattenMenus(routeTree)
    const byRouteId = new Map(all.map((i) => [String(i.id), i]))
    const addAncestors = (code: string) => {
      let cur = all.find((i) => String(i.code) === code) || byRouteId.get(code)
      while (cur?.parentId && cur.parentId !== '0') {
        const pId = String(cur.parentId)
        need.add(pId)
        const parent = byRouteId.get(pId)
        if (parent?.code) need.add(String(parent.code))
        cur = parent
      }
    }
    ;[...need].forEach(addAncestors)
    ordered.length = 0
    ordered.push(
      ...all.filter((i) => need.has(String(i.code)) || need.has(String(i.id))).sort((a, b) => a.level - b.level || a.sort - b.sort)
    )
  }

  let created = 0
  let updated = 0
  const reloadMaps = async () => {
    maps = await refreshBackendMenuMaps()
    byCode = maps.byCode
    byPath = maps.byPath
    byParentName = maps.byParentName
    codeToId = maps.codeToId
    return maps
  }

  for (const item of ordered) {
    const parentResolved = !item.parentId || item.parentId === '0' ? 0 : Number(codeToId.get(String(item.parentId)) || 0)

    const exist =
      byCode.get(item.code) ||
      (item.alias ? byCode.get(String(item.alias)) : undefined) ||
      (item.path ? byPath.get(item.path) : undefined) ||
      byParentName.get(`${parentResolved || 0}::${item.name}`)

    // 名称带 code，避免旧版「菜单名全局唯一」与库中同名菜单冲突
    const payload: Record<string, any> = {
      parentId: parentResolved || 0,
      code: item.code,
      name: `${item.name}·${item.code}`,
      alias: item.alias || item.code,
      path: item.path,
      source: item.source,
      component: item.component === 'Layout' ? '' : item.component,
      sort: item.sort,
      category: 1,
      action: 0,
      isOpen: 1,
      remark: item.remark || 'sync:frontend-route',
    }
    if (exist?.id) {
      payload.id = exist.id
      await submitMenuPayload(payload, reloadMaps)
      updated += 1
      const id = String(payload.id || exist.id)
      codeToId.set(String(item.code), id)
      if (item.alias) codeToId.set(String(item.alias), id)
      byCode.set(String(item.code), { ...exist, ...payload, id })
    } else {
      await submitMenuPayload(payload, reloadMaps)
      created += 1
      await reloadMaps()
    }
  }

  return {
    code: 200,
    success: true,
    msg: `同步完成：新增 ${created}，更新 ${updated}`,
    data: { created, updated },
  }
}

export function getMenuTree() {
  return getTree()
}

/** 权限配置树：展示当前前端路由菜单（与侧边栏一致）；节点 id 用菜单 code（含 PreAuth code） */
export async function getCurrentGrantTree() {
  const menu = getCurrentRouteMenus().map(function mapNode(n: RouteMenuNode): any {
    const key = n.code || n.alias || n.id
    return {
      id: key,
      key,
      value: key,
      label: n.name || n.label,
      title: n.name || n.title,
      name: n.name,
      code: n.code,
      alias: n.alias,
      children: n.children?.length ? n.children.map(mapNode) : undefined,
    }
  })
  return {
    code: 200,
    success: true,
    msg: '操作成功',
    data: { menu, dataScope: [], apiScope: [] },
  }
}

/** 权限分配菜单树：GrantTreeVO.menu（后端库表，旧数据） */
export async function getGrantTree() {
  const res: any = await request({
    url: '/api/blade-system/menu/grant-tree',
    method: 'get',
  })
  const menu = res?.data?.menu || []
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: {
      menu: mapTreeNodes(Array.isArray(menu) ? menu : []),
      dataScope: mapTreeNodes(Array.isArray(res?.data?.dataScope) ? res.data.dataScope : []),
      apiScope: mapTreeNodes(Array.isArray(res?.data?.apiScope) ? res.data.apiScope : []),
    },
  }
}

/** 从 /menu/routes 构建 id↔code（超管返回全部菜单，无需 /menu/list 管理员权限） */
const buildCodeMapsFromRoutes = async () => {
  const res: any = await request({
    url: '/api/blade-system/menu/routes',
    method: 'get',
    silentError: true,
  })
  const idToCode = new Map<string, string>()
  const codeToId = new Map<string, string>()
  const walk = (nodes: any[]) => {
    ;(nodes || []).forEach((n) => {
      const id = n?.id != null ? String(n.id) : ''
      const code = n?.code != null ? String(n.code) : ''
      const alias = n?.alias != null ? String(n.alias) : ''
      if (id && code) {
        idToCode.set(id, code)
        codeToId.set(code, id)
      }
      if (id && alias) {
        codeToId.set(alias, id)
        if (!code) idToCode.set(id, alias)
      }
      if (n?.children?.length) walk(n.children)
    })
  }
  const raw = res?.data
  walk(Array.isArray(raw) ? raw : raw?.list || [])
  return { idToCode, codeToId }
}

/** 构建菜单 id ↔ code 映射：优先 routes，失败再试需管理员的 list */
const buildMenuCodeMaps = async () => {
  try {
    const fromRoutes = await buildCodeMapsFromRoutes()
    if (fromRoutes.codeToId.size > 0) return fromRoutes
  } catch {
    /* ignore */
  }
  try {
    return await buildBackendCodeMaps()
  } catch {
    return { idToCode: new Map<string, string>(), codeToId: new Map<string, string>() }
  }
}

/** 构建后端菜单 id ↔ code 映射（含 alias，兼容路由 name）— 依赖 /menu/list */
const buildBackendCodeMaps = async () => {
  const backendRes: any = await getBackendList()
  const idToCode = new Map<string, string>()
  const codeToId = new Map<string, string>()
  const walk = (nodes: any[]) => {
    nodes.forEach((n) => {
      const id = n.id != null ? String(n.id) : ''
      const code = n.code != null ? String(n.code) : ''
      const alias = n.alias != null ? String(n.alias) : ''
      if (id && code) {
        idToCode.set(id, code)
        codeToId.set(code, id)
      }
      if (id && alias) {
        codeToId.set(alias, id)
        if (!code) idToCode.set(id, alias)
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(backendRes?.data?.list || [])
  return { idToCode, codeToId }
}

/**
 * 读取当前登录用户已授权菜单（任意角色可调 /menu/routes）
 * 返回 code/alias（侧边栏）与 path（路径匹配）
 */
export async function getMyMenuCodes() {
  const res: any = await request({
    url: '/api/blade-system/menu/routes',
    method: 'get',
    silentError: true,
  })
  const codes: string[] = []
  const paths: string[] = []
  const walk = (nodes: any[]) => {
    ;(nodes || []).forEach((n) => {
      if (n?.code) codes.push(String(n.code))
      if (n?.alias) codes.push(String(n.alias))
      if (n?.name && n.name !== n.code) codes.push(String(n.name))
      if (n?.path) paths.push(String(n.path))
      if (n?.children?.length) walk(n.children)
    })
  }
  const raw = res?.data
  walk(Array.isArray(raw) ? raw : raw?.list || [])
  return {
    code: 200,
    success: true,
    msg: '操作成功',
    data: {
      codes: [...new Set(codes.filter(Boolean))],
      paths: [...new Set(paths.filter(Boolean))],
    },
  }
}

/**
 * 读取指定角色已授权菜单 code（权限配置回显）
 * 不依赖需管理员的 /menu/list，改用 /menu/routes 做 id↔code
 */
export async function getRoleMenuCodes(roleIds: string) {
  if (!roleIds) {
    return { code: 200, success: true, data: { codes: [] as string[], menuIds: [] as string[] } }
  }
  const [keysRes, maps] = await Promise.all([getRoleMenuTree(roleIds), buildMenuCodeMaps()])
  const menuIds = (keysRes?.data?.menu || []).map(String)
  const codes = menuIds.map((id) => maps.idToCode.get(id)).filter(Boolean) as string[]
  menuIds.forEach((id) => {
    if (!maps.idToCode.has(id) && maps.codeToId.has(id)) codes.push(id)
  })
  return {
    code: 200,
    success: true,
    msg: '操作成功',
    data: { codes: expandMenuCodesForRoutes([...new Set(codes)]), menuIds },
  }
}

/**
 * 按菜单编号授权：只写 blade_role_menu，不同步菜单表
 * 请先在「菜单管理」用管理员同步当前菜单
 */
export async function grantRoleByMenuCodes(roleId: string, codes: string[]) {
  const requested = [...new Set(codes.map(String).filter(Boolean))]
  const { codeToId } = await buildMenuCodeMaps()
  const menuIds = [...new Set(requested.map((c) => codeToId.get(c) || codeToId.get(toBladeMenuCode(c))).filter(Boolean) as string[])]
  const unresolved = requested.filter((c) => !codeToId.has(c) && !codeToId.has(toBladeMenuCode(c)))
  if (unresolved.length) {
    throw new Error(
      `菜单未同步到后端，请先用管理员在「菜单管理」点击「同步当前菜单」后再授权。缺失：${unresolved
        .slice(0, 8)
        .join(', ')}${unresolved.length > 8 ? '…' : ''}`
    )
  }
  if (requested.length && !menuIds.length) {
    throw new Error('未能匹配到后端菜单，请先同步当前菜单')
  }

  const res: any = await request({
    url: '/api/blade-system/role/grant',
    method: 'post',
    data: {
      roleIds: [String(roleId)],
      menuIds,
      dataScopeIds: [],
      apiScopeIds: [],
    },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '权限配置失败')
  }
  return adaptMsg(res, '权限配置成功')
}

/** 角色已勾选的菜单/数据/接口权限 keys */
export async function getRoleMenuTree(roleIds: string) {
  const res: any = await request({
    url: '/api/blade-system/menu/role-tree-keys',
    method: 'get',
    params: { roleIds },
  })
  const menu = res?.data?.menu || []
  return {
    code: res?.code ?? 200,
    success: res?.success ?? true,
    msg: res?.msg || '操作成功',
    data: {
      menu: (Array.isArray(menu) ? menu : []).map(String),
      dataScope: (res?.data?.dataScope || []).map(String),
      apiScope: (res?.data?.apiScope || []).map(String),
    },
  }
}

/** 按角色过滤菜单树（仅保留该角色已授权节点及其祖先） */
const filterMenuByKeys = (nodes: any[] = [], keys: Set<string>, level = 0): any[] => {
  const result: any[] = []
  for (const node of nodes) {
    const children = Array.isArray(node.children) ? filterMenuByKeys(node.children, keys, level + 1) : []
    const selfMatch = keys.has(String(node.id))
    if (selfMatch || children.length) {
      result.push({
        ...node,
        level,
        childCount: children.length,
        children: children.length ? children : undefined,
        hasChildren: children.length > 0,
      })
    }
  }
  return result
}

/**
 * 获取指定角色有权访问的菜单树
 * 全量 menu/list + role-tree-keys 求交
 */
export async function getMenusByRole(roleId: string | number) {
  if (!roleId && roleId !== 0) {
    return { code: 200, success: true, msg: '操作成功', data: { list: [], total: 0 } }
  }
  // 角色授权菜单以库表为准
  const [listRes, keysRes]: any[] = await Promise.all([getBackendList(), getRoleMenuTree(String(roleId))])
  const rawKeys = keysRes?.data?.menu ?? keysRes?.data ?? []
  const keys = new Set((Array.isArray(rawKeys) ? rawKeys : []).map((k: any) => String(k)))
  const list = filterMenuByKeys(listRes?.data?.list || [], keys)
  return {
    code: 200,
    success: true,
    msg: '操作成功',
    data: { list, total: list.length, menuKeys: [...keys] },
  }
}

export function getRoutes(roleId?: string, topMenuId?: string) {
  return request({
    url: '/api/blade-system/menu/routes',
    method: 'get',
    params: { roleId, topMenuId },
  })
}

export async function doEdit(data: any) {
  const res: any = await request({
    url: '/api/blade-system/menu/submit',
    method: 'post',
    data: toBladeMenu(data),
  })
  return adaptMsg(res, '保存成功')
}

export async function doDelete(data: any) {
  const ids = typeof data === 'string' ? data : data?.ids || data?.id
  const res: any = await request({
    url: '/api/blade-system/menu/remove',
    method: 'post',
    params: { ids },
  })
  return adaptMsg(res, '删除成功')
}
