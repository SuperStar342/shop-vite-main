/**
 * @description 登录、获取用户信息、退出登录、清除token逻辑，不建议修改
 */
import { useTabsStore } from './tabs'
import { useAclStore } from './acl'
import { setToken, setRefreshToken, removeToken, removeRefreshToken, getToken, getRefreshToken, setTokenExpireAt } from '/@/utils/auth'
import { setStore, getStore } from '/@/utils/store'
import { deepClone } from '/@/utils/util'
import { loginByUsername, getUserInfo, logout, refreshToken, getButtons } from '/@/api/user'
import { getRoutes, getTopMenu } from '/@/api/system/menu'
import { getMyMenuCodes } from '/@/api/menuManagement'
import { expandMenuCodesForRoutes } from '/@/utils/bladeMenuCodes'
import { unwrap } from '/@/utils/bladeAdapter'
import { ElMessage } from 'element-plus'
import { sm2Encrypt } from '/@/utils/sm2'
import { validatenull } from '/@/utils/validate'
import { formatMenu } from '/@/router/avue-router'

const splitRoles = (roleName?: string | string[]) => {
  if (!roleName) return []
  if (Array.isArray(roleName)) return roleName.filter(Boolean).map(String)
  return String(roleName)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 识别 BladeX 超级管理员（勿用 includes('admin')，避免误判普通角色） */
const isAdminRole = (roles: string[]) =>
  roles.some((r) => {
    const raw = String(r).trim()
    const lower = raw.toLowerCase()
    return lower === 'administrator' || lower === 'admin' || raw === '超级管理员'
  })

const applyAdminAccess = (roles: string[]) => {
  const aclStore = useAclStore()
  if (isAdminRole(roles)) {
    aclStore.setFull(true)
    if (!roles.includes('Admin')) aclStore.setRole([...roles, 'Admin'])
    else aclStore.setRole(roles)
  } else {
    aclStore.setFull(false)
    if (roles.length) aclStore.setRole(roles)
  }
}

const extractButtonCodes = (buttons: any): string[] => {
  if (!buttons) return []
  const list = Array.isArray(buttons) ? buttons : []
  const codes: string[] = []
  const walk = (nodes: any[]) => {
    nodes.forEach((node) => {
      if (Array.isArray(node?.children) && node.children.length) {
        walk(node.children)
      } else if (node?.code) {
        codes.push(String(node.code))
      }
    })
  }
  walk(list)
  return codes.filter(Boolean)
}

/** 启动时把 localStorage 中的 token 回写到 cookie，避免刷新后请求无 Blade-Auth 被当成「未分配菜单」 */
const restoreAuthCookies = () => {
  const token = getStore({ name: 'token' }) || ''
  const refresh = getStore({ name: 'refreshToken' }) || ''
  if (token && !getToken()) setToken(token)
  if (refresh && !getRefreshToken()) setRefreshToken(refresh)
}
restoreAuthCookies()

export const useUserStore = defineStore('user', {
  state: (): UserModuleType => ({
    tenantId: getStore({ name: 'tenantId' }) || '',
    userInfo: getStore({ name: 'userInfo' }) || {},
    permission: getStore({ name: 'permission' }) || {},
    roles: [],
    menuId: {},
    menu: getStore({ name: 'menu' }) || [],
    menuAll: getStore({ name: 'menuAll' }) || [],
    token: getStore({ name: 'token' }) || '',
    refreshToken: getStore({ name: 'refreshToken' }) || '',
    username:
      (getStore({ name: 'userInfo' }) as any)?.user_name ||
      (getStore({ name: 'userInfo' }) as any)?.userName ||
      (getStore({ name: 'userInfo' }) as any)?.account ||
      '游客',
    avatar: (getStore({ name: 'userInfo' }) as any)?.avatar || './static/svg/avatar.svg',
  }),
  actions: {
    /**
     * @description 登录
     * @param {*} userInfo
     */
    async login(userInfo: any) {
      try {
        const res = await loginByUsername(
          userInfo.tenantId,
          userInfo.deptId,
          userInfo.roleId,
          userInfo.username,
          sm2Encrypt(userInfo.password),
          userInfo.type,
          userInfo.key,
          userInfo.code
        )

        console.log('login res:')
        console.log(res)
        const data = res.data

        if (data.error_description) {
          ElMessage({
            message: data.error_description,
            type: 'error',
          })
          throw new Error(data.msg)
        } else {
          // 换账号登录前先清掉上一会话的动态路由，强制重新 GetMenu
          try {
            const { useRoutesStore } = await import('/@/store/modules/routes')
            await useRoutesStore().clearRoutes()
          } catch {
            /* ignore */
          }
          this.SET_TOKEN(data.access_token)
          this.SET_REFRESH_TOKEN(data.refresh_token)
          setTokenExpireAt(data.expires_in ?? 3600)
          this.SET_TENANT_ID(data.tenant_id)
          this.SET_USER_INFO(data)
          try {
            const { startTokenKeepAlive } = await import('/@/utils/tokenKeepAlive')
            startTokenKeepAlive()
          } catch {
            /* ignore */
          }
          // 登录响应即可识别超管，后续 GetUserInfo / GetButtons 再补全
          const roles = splitRoles(data.role_name || data.roleName)
          this.SET_ROLES(roles)
          applyAdminAccess(roles)
          this.DEL_ALL_TAG()
        }
      } catch (err: any) {
        ElMessage({
          message: `登录失败：${err.message || err}`,
          type: 'error',
        })
        throw err
      }
    },
    async GetUserInfo() {
      const res = await getUserInfo()
      const data = (unwrap(res) || {}) as Record<string, any>
      // BladeX UserVO 多为 roleName 字符串；兼容 roles 数组
      let roles = Array.isArray(data.roles) ? data.roles.map(String) : splitRoles(data.roleName || data.role_name)

      // OAuth token 载荷里的 role_name 往往更准（administrator）
      if (!roles.length) {
        roles = splitRoles((this.userInfo as any)?.role_name || (this.userInfo as any)?.roleName)
      }

      this.SET_ROLES(roles)
      applyAdminAccess(roles)

      if (data && typeof data === 'object') {
        this.SET_USER_INFO({
          ...this.userInfo,
          ...data,
          role_name: data.roleName || data.role_name || (this.userInfo as any)?.role_name,
          user_id: data.id || data.userId || data.user_id || (this.userInfo as any)?.user_id,
          user_name: data.account || data.userName || data.user_name || (this.userInfo as any)?.user_name,
          tenant_id: data.tenantId || data.tenant_id || (this.userInfo as any)?.tenant_id,
          dept_id: data.deptId || data.dept_id || (this.userInfo as any)?.dept_id,
          role_id: data.roleId || data.role_id || (this.userInfo as any)?.role_id,
          avatar: data.avatar || (this.userInfo as any)?.avatar,
        })
      }

      // 同步菜单 code / 列权限到 ACL（失败不阻断登录）
      try {
        const menuRes: any = await getMyMenuCodes()
        const codes = expandMenuCodesForRoutes(menuRes?.data?.codes || [])
        useAclStore().setMenuCodes(codes)
        useAclStore().setMenuPaths(menuRes?.data?.paths || [])
      } catch (e) {
        console.warn('获取角色菜单权限失败', e)
      }
      try {
        const { getMyListColumnMap } = await import('/@/api/listColumnPermission')
        const map = await getMyListColumnMap()
        useAclStore().setListColumnMap(map)
      } catch (e) {
        console.warn('获取列表列权限失败', e)
      }

      return data
    },

    async RefreshToken(userInfo: any) {
      const res = await refreshToken(
        getRefreshToken(),
        this.tenantId,
        !validatenull(userInfo) ? userInfo.deptId : this.userInfo.dept_id,
        !validatenull(userInfo) ? userInfo.roleId : this.userInfo.role_id
      )

      const data = res.data || {}
      const status = Number(data.error_code ?? data.code ?? res.status ?? 0)
      if (data.error_description || data.error || !data.access_token || (status && status !== 200)) {
        throw new Error(data.error_description || data.msg || data.error || '刷新令牌失败')
      }
      this.SET_TOKEN(data.access_token)
      this.SET_REFRESH_TOKEN(data.refresh_token || getRefreshToken())
      setTokenExpireAt(data.expires_in ?? 3600)
      this.SET_USER_INFO(data)
      const roles = splitRoles(data.role_name || data.roleName)
      if (roles.length) {
        this.SET_ROLES(roles)
        applyAdminAccess(roles)
      }
      return data
    },

    /**
     * @description 退出登录
     */
    async LogOut() {
      try {
        await logout()
      } catch {
        /* 退出接口失败也清理本地 */
      }
      await this.clearSession()
    },

    //注销session
    /** 确保请求头 Cookie 与本地 token 一致（冷启动/刷新常见不同步） */
    syncAuthCookies() {
      if (this.token && !getToken()) setToken(this.token)
      if (this.refreshToken && !getRefreshToken()) setRefreshToken(this.refreshToken)
    },

    async FedLogOut() {
      await this.clearSession()
    },

    /** 清理登录态 + 动态路由，保证换账号后重新拉取菜单 */
    async clearSession() {
      try {
        const { stopTokenKeepAlive } = await import('/@/utils/tokenKeepAlive')
        stopTokenKeepAlive()
      } catch {
        /* ignore */
      }
      this.SET_TOKEN('')
      this.SET_MENUALL_NULL()
      this.SET_MENU([])
      this.SET_ROLES([])
      this.permission = {}
      setStore({ name: 'permission', content: {} })
      try {
        useAclStore().reset()
      } catch {
        /* ignore */
      }
      removeToken()
      removeRefreshToken()
      // 清除「未分配菜单」会话提示，换账号/重新授权后可再提示一次
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('jpai_empty_menu_tip'))
          .forEach((k) => sessionStorage.removeItem(k))
      } catch {
        /* ignore */
      }
      try {
        const { useRoutesStore } = await import('/@/store/modules/routes')
        await useRoutesStore().clearRoutes()
      } catch {
        /* pinia/路由未就绪时忽略 */
      }
      try {
        useTabsStore().delAllVisitedRoutes()
      } catch {
        /* ignore */
      }
    },

    GetTopMenu() {
      return getTopMenu().then((res) => {
        const data = res.data.data || []
        return data
      })
    },

    GetMenu(topMenuId: any) {
      return getRoutes(topMenuId)
        .then((res) => {
          // 兼容 AxiosResponse / 已解包 body；空数组也合法（角色未授权菜单）
          const raw = unwrap(res)
          const data = Array.isArray(raw) ? raw : Array.isArray(raw?.list) ? raw.list : []
          const menu = deepClone(data)
          formatMenu(menu)
          this.SET_MENU(menu)
          this.SET_MENU_ALL(menu)
          this.GetButtons()
          return menu
        })
        .catch((e: any) => {
          console.error('[GetMenu] 加载菜单失败', e)
          const status = Number(e?.response?.status ?? e?.status ?? e?.code ?? e?.response?.data?.code ?? 0)
          const msg = String(e?.message || e?.msg || e?.response?.data?.msg || '')
          const isAuth =
            status === 401 || /401|未授权|认证|令牌|token|登录过期|Full authentication|invalid_token|Token expired|请求未授权/i.test(msg)
          // 鉴权失败应交由路由守卫退登，勿当成「角色未分配菜单」
          if (isAuth) return Promise.reject(e)
          const empty: any[] = []
          this.SET_MENU(empty)
          this.SET_MENU_ALL(empty)
          return empty
        })
    },

    GetButtons() {
      return getButtons()
        .then((res) => {
          const data = unwrap(res)
          this.SET_PERMISSION(Array.isArray(data) ? data : data?.list || [])
        })
        .catch((e: any) => {
          // 非管理员也可能无 buttons 接口权限，勿阻断登录
          console.warn('[GetButtons] 加载按钮权限失败', e)
          this.SET_PERMISSION([])
        })
    },

    SET_TOKEN(token: string) {
      this.token = token
      setToken(token)
      setStore({ name: 'token', content: this.token })
    },
    SET_REFRESH_TOKEN(refreshToken: string) {
      this.refreshToken = refreshToken
      setRefreshToken(refreshToken)
      setStore({ name: 'refreshToken', content: this.refreshToken })
    },
    SET_MENU_ID(menuId: any) {
      this.menuId = menuId
    },
    SET_TENANT_ID(tenantId: any) {
      this.tenantId = tenantId
      setStore({ name: 'tenantId', content: this.tenantId })
    },
    SET_USER_INFO(userInfo: any) {
      if (validatenull(userInfo.user_id) && validatenull(userInfo.account) && validatenull(userInfo.id)) {
        this.userInfo = { user_name: 'unauth', role_name: 'unauth', authority: 'unauth' }
      } else {
        if (validatenull(userInfo.avatar)) {
          userInfo.avatar = '/img/bg/img-logo.png'
        }
        if (!validatenull(userInfo.role_name)) {
          userInfo.roleName = userInfo.role_name
          userInfo.authority = userInfo.role_name
        }
        if (!validatenull(userInfo.user_id)) {
          userInfo.userId = userInfo.user_id
        }
        if (!validatenull(userInfo.user_name)) {
          userInfo.userName = userInfo.user_name
        }
        if (!validatenull(userInfo.tenant_id)) {
          userInfo.tenantId = userInfo.tenant_id
        }
        if (!validatenull(userInfo.dept_id)) {
          userInfo.deptId = userInfo.dept_id
        }
        if (!validatenull(userInfo.role_id)) {
          userInfo.roleId = userInfo.role_id
        }
        if (!validatenull(userInfo.oauth_id)) {
          userInfo.oauthId = userInfo.oauth_id
        }
        this.userInfo = userInfo
        this.username =
          userInfo.realName ||
          userInfo.real_name ||
          userInfo.name ||
          userInfo.user_name ||
          userInfo.userName ||
          userInfo.account ||
          this.username
        this.avatar = userInfo.avatar || this.avatar
      }

      setStore({ name: 'userInfo', content: this.userInfo })
    },
    /** 个人中心等页面兼容（对齐 shop-vite-main (5)） */
    setUserInfo(info: Record<string, any>) {
      this.SET_USER_INFO(info || {})
    },
    setUsername(username: string) {
      this.username = username || '游客'
    },
    setAvatar(avatar: string) {
      this.avatar = avatar || './static/svg/avatar.svg'
      if (this.userInfo && typeof this.userInfo === 'object' && !Array.isArray(this.userInfo)) {
        ;(this.userInfo as any).avatar = this.avatar
        setStore({ name: 'userInfo', content: this.userInfo })
      }
    },
    SET_MENU_ALL(menuAll: any[]) {
      let menu = [...this.menuAll]
      menuAll.forEach((ele) => {
        const index = menu.findIndex((item) => item.path === ele.path)
        if (index === -1) {
          menu.push(ele)
        } else {
          menu[index] = ele
        }
      })
      this.menuAll = menu
      setStore({ name: 'menuAll', content: this.menuAll })
    },
    SET_MENUALL_NULL() {
      this.menuAll = []
      setStore({ name: 'menuAll', content: this.menuAll })
    },
    SET_MENU(menu: any[]) {
      this.menu = menu
      setStore({ name: 'menu', content: this.menu })
    },
    SET_ROLES(roles: any[]) {
      this.roles = roles
    },
    SET_PERMISSION(permissionData: any) {
      const result = extractButtonCodes(permissionData)
      this.permission = {}
      result.forEach((ele) => {
        this.permission[ele] = true
      })
      setStore({ name: 'permission', content: this.permission, type: 'session' })
      // 同步到 acl，供 v-permissions / hasPermission 使用
      try {
        useAclStore().setPermission(result)
      } catch {
        /* ignore */
      }
    },
    async DEL_ALL_TAG() {
      // 清除标签
      const tabsStore = useTabsStore()
      await tabsStore.delAllVisitedRoutes()
    },
  },
})
