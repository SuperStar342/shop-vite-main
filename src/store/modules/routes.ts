/**
 * @description 路由拦截状态管理，目前两种模式：all模式与intelligence模式，其中partialRoutes是菜单暂未使用
 */
import { getList } from '/@/api/router'
import { authentication, rolesControl } from '/@/config'
import { asyncRoutes, constantRoutes, resetRouter } from '/@/router'
import { expandMenuCodesForRoutes } from '/@/utils/bladeMenuCodes'
import { convertRouter, filterRoutes } from '/@/utils/routes'
import { isArray } from '/@/utils/validate'
import { gp } from '/@vab/plugins/vab'
import { useAclStore } from '/@/store/modules/acl'
import { useUserStore } from '/@/store/modules/user'

/** 防止路由守卫并发触发多次 setRoutes（刷新时连弹提示） */
let setRoutesPromise: Promise<void> | null = null

const EMPTY_MENU_TIP_KEY = 'jpai_empty_menu_tip'

const filterHidden = (data: any) => {
  return data.reduce((acc: any, item: any) => {
    if (item.meta && item.meta.hidden) return acc
    const newItem = { ...item }
    if (item.children && item.children.length > 0) newItem.children = filterHidden(item.children)
    return [...acc, newItem]
  }, [])
}

/**
 * 非超管：用 acl.menuCodes / menuPaths 再过滤一层动态路由，防止脏缓存或接口异常露出未授权菜单。
 * 无 menuCodes 时不强制清空（避免 codes 接口失败时误删已下发菜单）。
 */
const filterRoutesByMenuAcl = (routes: VabRouteRecord[]): VabRouteRecord[] => {
  const acl = useAclStore()
  if (acl.admin) return routes
  const codes = expandMenuCodesForRoutes(acl.menuCodes || [])
  if (!codes.length) return routes
  const codeSet = new Set(codes.map(String))
  const pathSet = new Set((acl.menuPaths || []).map((p) => String(p || '').replace(/\/+$/, '')).filter(Boolean))

  const matchLeaf = (route: VabRouteRecord): boolean => {
    if (route.meta?.hidden) return true
    const name = route.name != null ? String(route.name) : ''
    if (name && codeSet.has(name)) return true
    const path = String(route.path || '').replace(/\/+$/, '')
    if (path && (pathSet.has(path) || [...pathSet].some((p) => path.endsWith(p) || p.endsWith(path)))) return true
    // 通配 / 根重定向保留
    if (path.includes('*') || name === 'NotFound' || name === 'RootRedirect') return true
    return false
  }

  const walk = (list: VabRouteRecord[]): VabRouteRecord[] =>
    list
      .map((route) => {
        const next = { ...route }
        if (next.children?.length) {
          next.children = walk(next.children)
          if (next.children.length) return next
          // 父节点本身也在授权集合中则保留空壳（少见）
          return matchLeaf(next) ? next : null
        }
        return matchLeaf(next) ? next : null
      })
      .filter(Boolean) as VabRouteRecord[]

  const filtered = walk(routes)
  const countVisible = (list: VabRouteRecord[]): number =>
    list.reduce((n, r) => {
      if (r.meta?.hidden) return n
      if (r.children?.length) return n + countVisible(r.children)
      const path = String(r.path || '')
      if (path && !path.includes('*') && path !== '/') return n + 1
      return n
    }, 0)
  // menuCodes 与路由 name 偶发不一致时勿把侧栏清空成「未分配菜单」
  if (countVisible(routes) > 0 && countVisible(filtered) === 0) {
    console.warn('[filterRoutesByMenuAcl] 过滤后可见菜单为空，已回退为未过滤结果')
    return routes
  }
  return filtered
}

const filterBreadcrumb = (data: any) => {
  return data.reduce((acc: any, item: any) => {
    const newItem = { ...item }
    if (item.children && item.children.length > 0) newItem.children = filterBreadcrumb(item.children)
    return [...acc, newItem]
  }, [])
}

/** 无菜单提示：同一账号会话内只弹一次，避免刷新连弹 */
const tipEmptyMenuOnce = (roleId?: string) => {
  const key = `${EMPTY_MENU_TIP_KEY}_${roleId || 'none'}`
  try {
    if (sessionStorage.getItem(key) === '1') return
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
  gp.$baseMessage('当前角色未分配菜单，请联系管理员在「角色管理 → 权限」中授权后重新登录', 'warning', 'hey')
}

export const useRoutesStore = defineStore('routes', {
  state: (): RoutesModuleType => ({
    tab: {
      data: undefined,
    },
    tabMenu: undefined,
    activeMenu: {
      data: undefined,
    },
    routes: [],
    allRoutes: [],
    breadcrumbRoutes: [],
  }),
  getters: {
    getTab: (state) => state.tab,
    getTabMenu: (state) => (state.tab.data ? state.routes.find((route) => route.name === state.tab.data) : { meta: { title: '' } }),
    getActiveMenu: (state) => state.activeMenu,
    getRoutes: (state) => state.routes.filter((_route) => _route.meta && _route.meta.hidden !== true),
    getAllRoutes: (state) => state.allRoutes.filter((_route) => _route.meta && _route.meta.hidden !== true),
    getBreadcrumbRoutes: (state) => state.breadcrumbRoutes.filter((_route) => _route.meta && _route.meta.hidden !== true),
    getPartialRoutes: (state) => (state.tab.data ? (state.routes.find((route) => route.name === state.tab.data)?.children ?? []) : []),
  },
  actions: {
    /**
     * @description 多模式设置路由
     * @param mode
     * @returns
     */
    async setRoutes(mode = 'none') {
      if (setRoutesPromise) return setRoutesPromise
      setRoutesPromise = this._doSetRoutes(mode).finally(() => {
        setRoutesPromise = null
      })
      return setRoutesPromise
    },
    async _doSetRoutes(mode = 'none') {
      const userStore = useUserStore()
      const { GetMenu } = userStore
      // 默认前端路由
      let routes: VabRouteRecord[] = [...asyncRoutes]

      // 设置游客路由关闭路由拦截(不需要可以删除)
      const control = mode === 'visit' ? false : rolesControl
      // 设置后端路由
      if (authentication === 'all') {
        const list = await GetMenu()
        if (!isArray(list)) {
          gp.$baseMessage('路由格式返回有误！', 'error', 'hey')
          // 即使格式异常也写入占位路由，避免守卫反复 setRoutes
          const fallback = filterRoutes([...constantRoutes], control)
          this.routes = filterHidden(fallback)
          this.allRoutes = fallback
          this.breadcrumbRoutes = filterBreadcrumb(fallback)
          await resetRouter(fallback)
          return
        }
        if (!list.length) {
          const roleId = (userStore.userInfo as any)?.role_id || (userStore.userInfo as any)?.roleId || ''
          tipEmptyMenuOnce(String(roleId))
        }
        const hadMenus = list.length > 0
        const last = hadMenus ? list.at(-1) : null
        if (!last || last.path !== '/:pathMatch(.*)*') {
          list.push({
            path: '/:pathMatch(.*)*',
            // 无菜单时勿 redirect 到 /（无首页会与通配互相跳转死循环）
            redirect: '/404',
            name: 'NotFound',
            meta: { hidden: true },
          })
        }
        routes = convertRouter(list)
      }
      // 根据权限和rolesControl过滤路由
      let accessRoutes = filterRoutes([...constantRoutes, ...routes], control)
      // 非超管：按 acl.menuCodes 兜底过滤动态菜单（constantRoutes 一并走 walk，hidden/404 会保留）
      accessRoutes = filterRoutesByMenuAcl(accessRoutes)
      // 设置菜单所需路由
      this.routes = filterHidden(accessRoutes)
      // 有菜单时补 `/` → 首页，避免登录/刷新落到无路由的 / 白屏
      const rootMenu = (() => {
        const walk = (list: any[]): string | null => {
          for (const r of list || []) {
            if (r?.meta?.hidden) continue
            if (r?.children?.length) {
              const c = walk(r.children)
              if (c) return c
            }
            const p = String(r?.path || '')
            if (p && !p.includes('*') && p !== '/') return p
          }
          return null
        }
        return walk(this.routes)
      })()
      if (rootMenu && !accessRoutes.some((r) => r.path === '/')) {
        accessRoutes.unshift({
          path: '/',
          name: 'RootRedirect',
          redirect: rootMenu,
          meta: { hidden: true },
        } as VabRouteRecord)
      }
      this.allRoutes = accessRoutes
      this.breadcrumbRoutes = filterBreadcrumb(accessRoutes)

      // 根据可访问路由重置Vue Router
      await resetRouter(accessRoutes)
    },
    changeMenuMeta(options: any) {
      function handleRoutes(routes: any[]) {
        return routes.map((route) => {
          if (route.name === options.name) Object.assign(route.meta, options.meta)
          if (route.children && route.children.length > 0) route.children = handleRoutes(route.children)
          return route
        })
      }

      this.routes = handleRoutes(this.routes)
    },
    /**
     * 退出/切换账号时清空动态路由，避免下一账号跳过 GetMenu/setRoutes 仍看到上一账号菜单
     */
    async clearRoutes() {
      setRoutesPromise = null
      this.routes = []
      this.allRoutes = []
      this.breadcrumbRoutes = []
      this.tab.data = undefined
      this.tabMenu = undefined
      this.activeMenu.data = undefined
      await resetRouter(constantRoutes)
    },
    /**
     * @description 修改 activeName
     * @param activeMenu 当前激活菜单
     */
    changeActiveMenu(activeMenu: string) {
      this.activeMenu.data = activeMenu
    },
  },
})
