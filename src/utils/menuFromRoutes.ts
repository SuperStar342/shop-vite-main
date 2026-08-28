/**
 * 将前端当前路由（asyncRoutes）转为菜单管理可展示/可同步的树形数据
 */
import { asyncRoutes } from '/@/router/modules'
import { toBladeMenuCode } from '/@/utils/bladeMenuCodes'

export type RouteMenuNode = {
  id: string
  parentId: string
  code: string
  name: string
  alias: string
  path: string
  component: string
  source: string
  sort: number
  category: number
  action: number
  isOpen: number
  remark: string
  meta: { title: string; icon: string }
  label: string
  title: string
  level: number
  childCount: number
  children?: RouteMenuNode[]
  hasChildren: boolean
  /** 来自前端路由，非库表 id */
  fromRoute?: boolean
}

const isHidden = (route: any) => !!(route?.meta?.hidden || route?.hidden)

const resolveComponent = (route: any): string => {
  if (!route?.component) return ''
  if (typeof route.component === 'string') return route.component
  // Layout / 动态 import 无法序列化，用约定值
  if (route.children?.length) return 'Layout'
  return route.name ? `views/${String(route.name)}` : ''
}

const joinPath = (parent: string, path: string) => {
  if (!path) return parent || '/'
  if (path.startsWith('http') || path.startsWith('//')) return path
  if (path.startsWith('/')) return path
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent
  return `${base || ''}/${path}`.replace(/\/+/g, '/')
}

/**
 * 将 Vab 路由树转为菜单管理树（过滤 hidden / 404）
 */
export function routesToMenuTree(routes: any[] = asyncRoutes, parentId = '0', parentPath = '', level = 0): RouteMenuNode[] {
  const result: RouteMenuNode[] = []
  let sort = 0
  for (const route of routes) {
    if (!route || isHidden(route)) continue
    if (route.path === '/:pathMatch(.*)*' || route.name === 'NotFound') continue

    sort += 1
    const id = String(route.name || route.path || `menu_${level}_${sort}`)
    const fullPath = joinPath(parentPath, route.path || '')
    const title = route.meta?.title || route.name || fullPath || id
    const icon = route.meta?.icon || ''
    const children = Array.isArray(route.children) ? routesToMenuTree(route.children, id, fullPath, level + 1) : []

    const routeName = String(route.name || id)
    // code 对齐 BladeX @PreAuth；alias 保留路由 name 供侧边栏过滤
    result.push({
      id,
      parentId,
      code: toBladeMenuCode(routeName),
      name: title,
      alias: routeName,
      path: fullPath || route.path || '',
      component: resolveComponent(route),
      source: icon,
      sort,
      category: 1,
      action: 0,
      isOpen: 1,
      remark: route.meta?.guard ? `guard:${JSON.stringify(route.meta.guard)}` : '',
      meta: { title, icon },
      label: title,
      title,
      level,
      childCount: children.length,
      children: children.length ? children : undefined,
      hasChildren: children.length > 0,
      fromRoute: true,
    })
  }
  return result
}

/** 按名称/编号过滤菜单树 */
export function filterMenuTree(nodes: RouteMenuNode[], name?: string, code?: string): RouteMenuNode[] {
  const n = String(name || '')
    .trim()
    .toLowerCase()
  const c = String(code || '')
    .trim()
    .toLowerCase()
  if (!n && !c) return nodes

  const walk = (list: RouteMenuNode[]): RouteMenuNode[] => {
    const out: RouteMenuNode[] = []
    for (const node of list) {
      const children = node.children?.length ? walk(node.children) : []
      const selfMatch = (!n || String(node.name).toLowerCase().includes(n)) && (!c || String(node.code).toLowerCase().includes(c))
      if (selfMatch || children.length) {
        out.push({
          ...node,
          children: children.length ? children : undefined,
          childCount: children.length,
          hasChildren: children.length > 0,
        })
      }
    }
    return out
  }
  return walk(nodes)
}

/** 获取当前前端侧边栏对应的菜单树 */
export function getCurrentRouteMenus(params?: { name?: string; code?: string }) {
  const tree = routesToMenuTree(asyncRoutes)
  return filterMenuTree(tree, params?.name, params?.code)
}
