/**
 * @description 登录、获取用户信息、退出登录、清除token逻辑
 */
import { useAclStore } from './acl'
import { useRoutesStore } from './routes'
import { useSettingsStore } from './settings'
import { useTabsStore } from './tabs'
import { getButtons, getOauthUserInfo, getUserInfo, login, logout } from '/@/api/user'
import { getMyMenuCodes } from '/@/api/menuManagement'
import { expandMenuCodesForRoutes } from '/@/utils/bladeMenuCodes'
import { storage, tokenName } from '/@/config'
import { toOssPreviewUrl } from '/@/utils/ossUrl'
import { getToken, removeToken, setRefreshToken, setTenantId, setToken } from '/@/utils/token'
import { isArray, isString } from '/@/utils/validate'
import { gp } from '/@vab/plugins/vab'

const splitRoles = (roleName?: string | string[]) => {
  if (!roleName) return []
  if (isArray(roleName)) return roleName.filter(Boolean)
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

const applyAdminAccess = (aclStore: ReturnType<typeof useAclStore>, roles: string[]) => {
  if (isAdminRole(roles)) {
    aclStore.setFull(true)
    // 兼容前端路由里的 guard: ['Admin']
    if (!roles.includes('Admin')) {
      aclStore.setRole([...roles, 'Admin'])
    } else {
      aclStore.setRole(roles)
    }
  } else {
    aclStore.setFull(false)
    if (roles.length) aclStore.setRole(roles)
  }
}

const extractPermissions = (buttons: any): string[] => {
  if (!buttons) return []
  const list = Array.isArray(buttons) ? buttons : buttons.data || []
  const codes: string[] = []
  const walk = (nodes: any[]) => {
    nodes.forEach((node) => {
      if (node?.code) codes.push(node.code)
      if (Array.isArray(node?.children) && node.children.length) walk(node.children)
    })
  }
  walk(list)
  return codes
}

const normalizeAvatar = (avatar?: string) => {
  if (!avatar || !isString(avatar)) return './static/svg/avatar.svg'
  return toOssPreviewUrl(avatar) || avatar
}

const emptyUserInfo = () => ({})

export const useUserStore = defineStore('user', {
  state: (): UserModuleType => ({
    token: getToken() as string,
    username: '游客',
    avatar: './static/svg/avatar.svg',
    userInfo: emptyUserInfo(),
  }),
  getters: {
    getToken: (state) => state.token,
    getUsername: (state) => state.username,
    getAvatar: (state) => state.avatar,
    getProfile: (state) => state.userInfo,
  },
  actions: {
    setToken(token: string) {
      this.token = token
      setToken(token)
    },
    setRefreshToken(token: string) {
      setRefreshToken(token)
    },
    setTenantId(id: string) {
      setTenantId(id)
    },
    setUsername(username: string) {
      this.username = username
    },
    setAvatar(avatar: string) {
      this.avatar = normalizeAvatar(avatar)
    },
    setUserInfo(info: Record<string, any>) {
      this.userInfo = info || emptyUserInfo()
    },
    setVirtualRoles() {
      const aclStore = useAclStore()
      aclStore.setFull(true)
      this.setUsername('admin(未开启登录拦截)')
      this.setAvatar('./static/svg/avatar.svg')
    },
    afterLogin(token: string, tokenNameKey: string) {
      const settingsStore = useSettingsStore()
      if (token) {
        this.setToken(token)
        const hour = new Date().getHours()
        const thisTime = hour < 8 ? '早上好' : hour <= 11 ? '上午好' : hour <= 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
        gp.$baseNotify(`欢迎登录${settingsStore.title}`, `${thisTime}！`)
      } else {
        const err = `登录接口异常，未正确返回${tokenNameKey}...`
        gp.$baseMessage(err, 'error', 'hey')
        throw err
      }
    },
    /**
     * BladeX OAuth2 登录（对齐 Saber LoginByUsername）
     * 响应体根级含 access_token / refresh_token / tenant_id / role_name
     */
    async login(userInfo: any) {
      // 换账号前先清路由，避免守卫因旧 routes 跳过重新鉴权
      const routesStore = useRoutesStore()
      if (routesStore.routes.length) {
        await routesStore.clearRoutes()
      }

      const data: any = await login(userInfo)
      if (data?.error_description) {
        const err = data.error_description
        gp.$baseMessage(err, 'error', 'hey')
        throw err
      }
      // 与 Saber 一致：只存 access_token 原文，请求时再拼 bearer/crypto 前缀
      const token = data?.[tokenName] || data?.access_token || data?.data?.[tokenName] || data?.data?.access_token
      this.afterLogin(token, tokenName)

      if (data?.refresh_token) this.setRefreshToken(data.refresh_token)
      if (data?.tenant_id) this.setTenantId(data.tenant_id)
      else if (userInfo?.tenantId) this.setTenantId(userInfo.tenantId)

      // 优先用 token 载荷中的用户信息，再补拉详情与菜单权限
      const roleName = data?.role_name || data?.roleName
      const username = data?.user_name || data?.account || data?.nick_name || data?.real_name || userInfo.username
      const avatar = data?.avatar
      if (username) this.setUsername(username)
      if (avatar) this.setAvatar(avatar)

      const aclStore = useAclStore()
      const roles = splitRoles(roleName)
      applyAdminAccess(aclStore, roles)

      await this.getUserInfo()
    },
    async getUserInfo() {
      const aclStore = useAclStore()
      let username = ''
      let avatar = ''
      let roles: string[] = []
      let permissions: string[] = []
      let profile: Record<string, any> = {}
      let roleIdStr = ''

      try {
        // 系统用户详情
        const infoRes: any = await getUserInfo()
        const info = infoRes?.data || infoRes || {}
        profile = { ...info }
        username = info.realName || info.name || info.account || info.user_name || ''
        avatar = info.avatar || ''
        roles = splitRoles(info.roleName || info.role_name)
        roleIdStr = String(info.roleId || info.role_id || '')
      } catch (e) {
        console.warn('获取系统用户信息失败，尝试 OAuth user-info', e)
      }

      try {
        // 优先使用 oauth user-info 的角色别名（administrator），避免只有中文角色名时侧边栏被过滤
        const oauthRes: any = await getOauthUserInfo()
        const oauth = oauthRes?.data || oauthRes || {}
        profile = {
          ...profile,
          ...oauth,
          account: profile.account || oauth.account || oauth.user_name,
          realName: profile.realName || oauth.real_name || oauth.nick_name,
          name: profile.name || oauth.nick_name || oauth.real_name,
          avatar: profile.avatar || oauth.avatar,
          roleName: profile.roleName || oauth.role_name || oauth.roleName,
          deptName: profile.deptName || oauth.dept_name,
          phone: profile.phone || oauth.phone,
          email: profile.email || oauth.email,
        }
        if (!username) {
          username = profile.realName || profile.name || profile.account || oauth.account || oauth.user_name || ''
        }
        if (!avatar) avatar = profile.avatar || oauth.avatar || ''
        if (!roleIdStr) roleIdStr = String(oauth.role_id || oauth.roleId || profile.roleId || '')
        const oauthRoles = splitRoles(oauth.roleName || oauth.role_name || oauth.authorities)
        if (oauthRoles.length) roles = oauthRoles
      } catch (e) {
        console.warn('获取 OAuth 用户信息失败', e)
      }

      try {
        const btnRes: any = await getButtons()
        permissions = extractPermissions(btnRes?.data ?? btnRes)
      } catch (e) {
        console.warn('获取按钮权限失败', e)
      }

      // 拉取当前用户已授权菜单（/menu/routes，普通角色可访问）
      let menuCodes: string[] = []
      let menuPaths: string[] = []
      try {
        const menuRes: any = await getMyMenuCodes()
        menuCodes = expandMenuCodesForRoutes(menuRes?.data?.codes || [])
        menuPaths = menuRes?.data?.paths || []
      } catch (e) {
        console.warn('获取角色菜单权限失败', e)
      }

      let listColumnMap: Record<string, string[]> = {}
      try {
        const { getMyListColumnMap } = await import('/@/api/listColumnPermission')
        listColumnMap = await getMyListColumnMap()
      } catch (e) {
        console.warn('获取列表列权限失败', e)
      }

      if (
        (username && !isString(username)) ||
        (avatar && !isString(avatar)) ||
        (roles.length && !isArray(roles)) ||
        (permissions.length && !isArray(permissions))
      ) {
        const err = 'getUserInfo核心接口异常，请检查返回JSON格式是否正确'
        gp.$baseMessage(err, 'error', 'hey')
        throw err
      }

      if (username) this.setUsername(username)
      if (avatar) this.setAvatar(avatar)
      else if (!this.avatar || this.avatar.includes('avatar.svg')) {
        this.setAvatar('./static/svg/avatar.svg')
      }
      this.setUserInfo(profile)
      applyAdminAccess(aclStore, roles)
      if (permissions.length) aclStore.setPermission(permissions)
      aclStore.setMenuCodes(menuCodes)
      aclStore.setMenuPaths(menuPaths)
      aclStore.setListColumnMap(listColumnMap)
    },
    async logout() {
      try {
        await logout()
      } catch {
        /* 退出接口失败也清理本地 */
      }
      await this.resetAll()
    },
    async resetAll() {
      const aclStore = useAclStore()
      const tabsStore = useTabsStore()
      const routesStore = useRoutesStore()

      await removeToken(storage)
      this.setToken('')

      await aclStore.setPermission([])
      await aclStore.setFull(false)
      await aclStore.setRole([])
      aclStore.setMenuCodes([])
      aclStore.setMenuPaths([])
      aclStore.setListColumnMap({})

      await tabsStore.delAllVisitedRoutes()
      await routesStore.clearRoutes()

      if (storage === 'localStorage') {
        localStorage.removeItem('caughtRoutes')
      }

      this.setUsername('游客')
      this.setAvatar('./static/svg/avatar.svg')
      this.setUserInfo(emptyUserInfo())
    },
  },
})
