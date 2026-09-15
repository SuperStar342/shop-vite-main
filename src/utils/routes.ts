import { stringify } from 'qs'
import { recordRoute } from '/@/config'
import { useTabsStore } from '/@/store/modules/tabs'
import { hasPermission } from '/@/utils/permission'
import { isExternal } from '/@/utils/validate'

/**
 * 解析 blade_menu.component → glob key（对齐 shop-vite-main (5)）
 * 支持: Layout | views/system/xxx/index | /@/views/...vue | components/iframe/main
 */
const resolveComponentKey = (component: string, path?: string): string | null => {
  if (!component || component === 'Layout') return null
  if (component === 'components/iframe/main') return 'views/other/iframe/view'

  let key = String(component)
    .replace(/^\/@\//, '')
    .replace(/^\//, '')
    .replace(/\.vue$/i, '')

  const viewsIdx = key.indexOf('views')
  if (viewsIdx >= 0) key = key.slice(viewsIdx)
  else if (key.startsWith('system/') || key.startsWith('setting/') || key.startsWith('other/')) {
    key = `views/${key}`
  } else if (path) {
    key = `views/${String(path).replace(/^\//, '').split('?')[0]}`
  } else {
    key = `views/${key}`
  }
  return key
}

/**
 * @description all模式：按 blade_menu.component 映射 Vue（参考 shop-vite-main (5)）
 */
export const convertRouter = (asyncRoutes: VabRouteRecord[]) => {
  const routeAllPathToCompMap = import.meta.glob(`../**/*.vue`)

  return asyncRoutes.map((route: VabRouteRecord) => {
    if (route.component) {
      if (route.component === 'Layout') {
        route.component = () => import('/@vab/layouts/index.vue')
      } else if (typeof route.component === 'string') {
        const key = resolveComponentKey(route.component, route.path)
        route.component = (key && routeAllPathToCompMap[`../${key}.vue`]) || (() => import('/@/views/error/403.vue'))
      }
    }
    if (route.children && route.children.length > 0) route.children = convertRouter(route.children)
    if (route.children && route.children.length === 0) delete route.children
    return route
  })
}

/**
 * @description 根据roles数组拦截路由
 * @param routes 路由
 * @param rolesControl 是否进行权限控制
 * @param baseUrl 基础路由
 * @returns {[]}
 */
export const filterRoutes = (routes: VabRouteRecord[], rolesControl: boolean, baseUrl = '/') => {
  return routes
    .filter((route: VabRouteRecord) => (rolesControl && route.meta && route.meta.guard ? hasPermission(route.meta.guard) : true))
    .map((route: VabRouteRecord) => {
      route = { ...route }
      if (route.path !== '*' && !isExternal(route.path)) {
        // BladeX 子菜单常为绝对 path，避免拼成 /system/system/xxx
        const isAbsolute = route.path.startsWith('/')
        if (!(isAbsolute && baseUrl !== '/')) {
          if (baseUrl.slice(-1) === '/') route.path = baseUrl + (route.path[0] === '/' ? route.path.slice(1) : route.path)
          else route.path = baseUrl + (route.path[0] === '/' ? route.path : `/${route.path}`)
        }
      }
      if (route.children && route.children.length > 0) {
        route.children = filterRoutes(route.children, rolesControl, route.path)
        if (route.children.length > 0) {
          route.childrenPathList = route.children.flatMap((item: VabRouteRecord) => item.childrenPathList)
          if (!route.redirect) route.redirect = route.children[0].redirect ? route.children[0].redirect : route.children[0].path
        }
      } else route.childrenPathList = [route.path]
      return route
    })
}

/**
 * 根据path路径获取matched
 * @param routes 菜单routes
 * @param name 路由名
 * @returns {*} matched
 */
/**
 * 根据path路径获取matched
 * @param routes 菜单routes
 * @param path 路径
 * @returns {*} matched
 */
export const handleMatched = (routes: VabRouteRecord[], path: string): VabRouteRecord[] => {
  return routes
    .filter((route) => route.childrenPathList.indexOf(path) + 1)
    .flatMap((route) => (route.children ? [route, ...handleMatched(route.children, path)] : [route]))
}

/**
 * 生成单个多标签元素，可用于同步/异步添加多标签
 * @param tag route页信息
 */
export const handleTabs = (tag: VabRoute) => {
  let parentIcon = null
  if (tag.matched)
    for (let i = tag.matched.length - 2; i >= 0; i--) if (!parentIcon && tag.matched[i].meta.icon) parentIcon = tag.matched[i].meta.icon
  if (!parentIcon) parentIcon = 'menu-line'
  const path = handleActivePath(tag, true)
  if (tag.name && tag.meta && tag.meta.tabHidden !== true) {
    const tabsStore = useTabsStore && useTabsStore()
    let existedMeta = null
    if (tabsStore && tabsStore.visitedRoutes) {
      const existed = tabsStore.visitedRoutes.find((r: any) => r.path === path)
      if (existed) existedMeta = existed.meta
    }
    return {
      path,
      query: tag.query,
      params: tag.params,
      name: tag.name,
      parentIcon,
      meta: existedMeta ? { ...tag.meta, ...existedMeta } : { ...tag.meta },
    }
  }
}

/**
 * 根据当前route获取激活菜单
 * @param route 当前路由
 * @param isTab 是否是标签
 * @returns {string|*}
 */
export const handleActivePath = (route: VabRoute, isTab = false) => {
  const { meta, path, matched, query }: any = route
  const rawPath = matched ? matched.at(-1).path : path
  const fullPath = query && Object.keys(query).length > 0 ? `${path}?${stringify(query)}` : path
  if (isTab) return meta.dynamicNewTab ? fullPath : rawPath
  if (meta.activeMenu) return meta.activeMenu
  return fullPath
}

/**
 * 报表模板设计页：即使未执行菜单 SQL，也注入隐藏路由，保证可从列表打开标签页
 */
export const ensurePrintTemplateDesignRoute = (routes: VabRouteRecord[]): VabRouteRecord[] => {
  const designChild: VabRouteRecord = {
    path: '/printReport/templates/design',
    name: 'printTemplateDesign',
    component: () => import('/@/views/printReport/templates/design.vue'),
    meta: {
      title: '模板设计',
      hidden: true,
      dynamicNewTab: true,
      activeMenu: '/printReport/templates/index',
      noKeepAlive: true,
    },
  }

  const walk = (list: VabRouteRecord[]): boolean => {
    for (const route of list) {
      const name = String(route.name || '')
      const path = String(route.path || '')
      if (name === 'printReport' || path === '/printReport' || path.endsWith('/printReport')) {
        route.children = route.children || []
        const exists = route.children.some(
          (c) =>
            String(c.name) === 'printTemplateDesign' ||
            String(c.path || '').includes('/printReport/templates/design') ||
            String(c.path || '').endsWith('templates/design')
        )
        if (!exists) route.children.push(designChild)
        return true
      }
      if (route.children?.length && walk(route.children)) return true
    }
    return false
  }

  const next = [...routes]
  if (!walk(next)) {
    next.unshift({
      path: '/printReport',
      name: 'printReportFallback',
      component: () => import('/@vab/layouts/index.vue'),
      meta: { title: '报表中心', hidden: true },
      children: [designChild],
    } as VabRouteRecord)
  }
  return next
}

/**
 * 获取当前跳转登录页的Route
 * @param currentPath 当前页面地址
 */
export const toLoginRoute = (currentPath: string) => {
  if (recordRoute && currentPath !== '/')
    return {
      path: '/login',
      query: { redirect: currentPath },
      replace: true,
    }
  else return { path: '/login', replace: true }
}

/**
 * 获取路由中所有的Name
 * @param routes 路由数组
 * @returns {*} Name数组
 */
export const getNames = (routes: VabRouteRecord[]): string[] => {
  return routes.flatMap((route: VabRouteRecord) => {
    const names = []
    if (route.name) names.push(route.name)
    if (route.children) names.push(...getNames(route.children))
    return names
  })
}
