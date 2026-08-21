declare interface AclModuleType {
  admin: boolean
  permission: string[]
  role: string[]
  /** 当前用户已授权菜单 code（含路由 name 展开） */
  menuCodes: string[]
  /** 当前用户已授权菜单 path */
  menuPaths: string[]
  /** 列表列权限：pageCode → 可见 prop 列表 */
  listColumnMap: Record<string, string[]>
}

declare interface BingModuleType {
  backgroundList: string[]
}

declare interface ErrorLogItem {
  err: Error | Record<string, unknown>
  url: string
  timestamp?: string
}

declare interface ErrorLogModuleType {
  errorLogs: ErrorLogItem[]
}

declare interface RouteItem {
  path: string
  name: string
  meta: Record<string, unknown>
  component?: unknown
  children?: RouteItem[]
}

declare interface RoutesModuleType {
  tab: {
    data: string | undefined
  }
  tabMenu: string | undefined
  activeMenu: {
    data: string | undefined
  }
  routes: any[]
  allRoutes: any[]
  breadcrumbRoutes: any[]
}

declare type DeviceType = 'mobile' | 'desktop'
declare type LanguageType = 'zh' | 'en'

declare interface SettingsModuleType {
  collapse: boolean
  device: DeviceType
  language: LanguageType
  lock: boolean
  logo: string
  mode: string
  persistenceTab: boolean
  theme: ThemeType
  title: string
  scrollTop: unknown[]
}

declare interface TabsModuleType {
  caughtRoutes: unknown[]
  visitedRoutes: RouteItem[]
}

declare interface UserModuleType {
  avatar: string
  username: string
  tenantId: string
  userInfo: Record<string, any> | any[]
  permission: Record<string, boolean>
  roles: any[]
  menuId: Record<string, any>
  menu: any[]
  menuAll: any[]
  token: string
  refreshToken: string
}
