/**
 * @description 路由守卫，目前两种模式：all模式与intelligence模式
 */
import VabProgress from 'nprogress'
import 'nprogress/nprogress.css'
import type { Router } from 'vue-router'
import { authentication, loginInterception, routesWhiteList, supportVisit } from '/@/config'
import { useRoutesStore } from '/@/store/modules/routes'
import { useSettingsStore } from '/@/store/modules/settings'
import { useUserStore } from '/@/store/modules/user'
import getPageTitle from '/@/utils/pageTitle'
import { toLoginRoute } from '/@/utils/routes'

/** 取第一个可访问菜单 path，避免登录后跳 / 无路由白屏 */
const firstMenuPath = (routes: any[]): string | null => {
  for (const route of routes || []) {
    if (route?.meta?.hidden) continue
    if (route?.children?.length) {
      const child = firstMenuPath(route.children)
      if (child) return child
    }
    const path = String(route?.path || '')
    if (path && !path.includes('*') && path !== '/') return path
  }
  return null
}

const homePath = (routesStore: ReturnType<typeof useRoutesStore>) => {
  return firstMenuPath(routesStore.routes) || '/404'
}

export const setupPermissions = (router: Router) => {
  VabProgress.configure({
    easing: 'ease',
    speed: 500,
    trickleSpeed: 200,
    showProgressBar: false,
  })
  router.beforeEach(async (to, from, next) => {
    const {
      getTheme: { showProgressBar },
    } = useSettingsStore()
    // 用 allRoutes 判断是否已装载：无菜单时 routes（可见菜单）会被 filterHidden 滤成 []，
    // 若仍用 routes.length 会反复 setRoutes，导致「未分配菜单」提示连弹
    const routesStore = useRoutesStore()
    const { setRoutes } = routesStore
    const { token, GetUserInfo, FedLogOut } = useUserStore()
    if (showProgressBar) VabProgress.start()

    let hasToken = token
    //登陆拦截关闭时，没有token也进入
    // if (!loginInterception) hasToken = true

    const routesReady = routesStore.allRoutes.length > 0

    if (hasToken) {
      if (routesReady) {
        // 禁止已登录用户返回登录页
        if (to.path === '/login') {
          next({ path: homePath(routesStore), replace: true })
          if (showProgressBar) VabProgress.done()
        } else next()
      } else {
        try {
          // 拉取用户信息后再装载动态菜单，保证角色/租户头正确
          try {
            await GetUserInfo()
          } catch (e) {
            console.warn('GetUserInfo 失败，继续用 token 载荷加载菜单', e)
          }
          await setRoutes(authentication)

          const hasMenu = routesStore.routes.length > 0
          // 无菜单：不要 next 回原业务路径（无 Layout 会白屏），统一进 404
          if (!hasMenu) {
            next({ path: '/404', replace: true })
          } else if (to.path === '/login' || to.path === '/') {
            next({ path: homePath(routesStore), replace: true })
          } else {
            next({ ...to, replace: true })
          }
        } catch (error) {
          console.error('vue-shop-vite 错误拦截:', error)
          await FedLogOut()
          next(toLoginRoute(to.fullPath))
        }
      }
    } else {
      if (routesWhiteList.includes(to.path)) {
        // 设置游客路由(不需要可以删除)
        if (supportVisit && routesStore.allRoutes.length === 0) {
          await setRoutes('visit')
          next({ path: to.path, replace: true })
        } else next()
      } else next(toLoginRoute(to.fullPath))
    }
  })
  router.afterEach((to) => {
    if (typeof to.meta.title === 'string') document.title = getPageTitle(to.meta.title)
    if (VabProgress.status) VabProgress.done()
  })

  router.onError((error: any) => {
    console.error('vue-shop-vite 错误拦截:', error.message)
  })

  return router
}
