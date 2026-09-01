/**
 * 前端路由 name ↔ BladeX 菜单 code（@PreAuth(menu = "xxx")）映射
 * 侧边栏按路由 name 过滤；接口鉴权按 blade_menu.code 校验
 */
export const ROUTE_TO_BLADE_CODE: Record<string, string> = {
  UserManagement: 'user',
  RoleManagement: 'role',
  DepartmentManagement: 'dept',
  DictionaryManagement: 'dict',
  BizDictionaryManagement: 'dictbiz',
  MenuManagement: 'menu',
  ParamManagement: 'param',
  DataScope: 'data_scope',
  ApiScope: 'api_scope',
  TenantManagement: 'tenant',
  DispatchManagement: 'dispatch',
  DispatchReportManagement: 'dispatchReport',
  QuickDispatch: 'quickDispatch',
  NormalDispatch: 'normalDispatch',
  WorkReportManagement: 'workReport',
  UnitPriceSetting: 'unitPriceSetting',
  // 资源：路由 name 与 PreAuth code 一致
  oss: 'oss',
  attach: 'attach',
  sms: 'sms',
}

/** BladeX code → 前端路由 name */
export const BLADE_CODE_TO_ROUTE: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_TO_BLADE_CODE).map(([route, blade]) => [blade, route])
)

/** 同步到后端时的菜单编号：优先用 PreAuth 所需 code */
export function toBladeMenuCode(routeName: string): string {
  return ROUTE_TO_BLADE_CODE[routeName] || routeName
}

/** 侧边栏过滤时：把后端 code/alias 展开为可匹配的路由 name 集合 */
export function expandMenuCodesForRoutes(codes: string[]): string[] {
  const set = new Set<string>()
  for (const raw of codes || []) {
    const c = String(raw || '').trim()
    if (!c) continue
    set.add(c)
    if (BLADE_CODE_TO_ROUTE[c]) set.add(BLADE_CODE_TO_ROUTE[c])
    if (ROUTE_TO_BLADE_CODE[c]) set.add(ROUTE_TO_BLADE_CODE[c])
  }
  return [...set]
}
