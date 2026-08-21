import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useAclStore } from '/@/store/modules/acl'

/**
 * 列表列可见性：pageCode 为路由 name（可传 ref/computed）。
 * - 超管 / 该页无配置 → 全部可见
 * - 有配置 → 仅配置中的 prop 可见
 */
export function useListColumns(pageCode: MaybeRefOrGetter<string>) {
  const aclStore = useAclStore()

  const resolvedCode = computed(() => String(toValue(pageCode) || ''))

  const restricted = computed(() => {
    if (aclStore.admin) return false
    const code = resolvedCode.value
    if (!code) return false
    const map = aclStore.listColumnMap || {}
    return Object.prototype.hasOwnProperty.call(map, code)
  })

  const visibleSet = computed(() => {
    const cols = aclStore.listColumnMap?.[resolvedCode.value]
    return new Set((cols || []).map(String))
  })

  const visible = (prop: string) => {
    if (!restricted.value) return true
    return visibleSet.value.has(prop)
  }

  return { restricted, visibleSet, visible, pageCode: resolvedCode }
}
