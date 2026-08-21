import { tenantId as defaultTenantId } from '/@/config'
import { getStore } from '/@/utils/store'
import { useUserStore } from '/@/store/modules/user'

/**
 * 解析当前业务租户号（如 000000）
 * BladeX 4.x 超管新增顶级部门/角色时 TenantGuard 不会自动填 tenantId，请求体必须带上
 */
export function resolveTenantId(explicit?: string | null): string {
  const fromArg = String(explicit ?? '').trim()
  if (fromArg) return fromArg

  let fromUser = ''
  try {
    fromUser = String(useUserStore()?.tenantId || '').trim()
  } catch {
    /* pinia 未就绪 */
  }
  if (fromUser) return fromUser

  const fromStore = String(getStore({ name: 'tenantId' }) || '').trim()
  if (fromStore) return fromStore

  return String(defaultTenantId || '000000')
}
