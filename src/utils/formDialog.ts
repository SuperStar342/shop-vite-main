import type { Ref } from 'vue'
import { nextTick } from 'vue'
import { unwrap } from '/@/utils/bladeAdapter'
import { $baseMessage } from '/@/hooks'

/**
 * 保存成功：先关弹窗，再提示，避免 Message 被 dialog 遮罩挡住
 */
export async function afterSaveSuccess(
  visible: Ref<boolean>,
  msg?: string,
  onDone?: () => void
) {
  visible.value = false
  await nextTick()
  $baseMessage(msg || '保存成功', 'success', 'hey')
  onDone?.()
}

/**
 * 保存失败提示（弹窗保持打开）
 */
export function afterSaveFail(error?: any, fallback = '保存失败') {
  const msg =
    (typeof error === 'string' && error) ||
    error?.message ||
    error?.msg ||
    fallback
  $baseMessage(msg, 'error', 'hey')
}

/** 是否为带有效 id 的业务实体 */
export function hasEntityId(data: any): boolean {
  return data != null && data.id != null && String(data.id).trim() !== ''
}

/**
 * 解析编辑回显实体
 * - 兼容：已 unwrap 的实体 / AxiosResponse / Blade 信封 { code, data }
 * - 详情无效时回退列表行，避免清空 form.id 导致标题变成「添加」
 */
export function resolveEditDetail(detail: any, fallback?: any): any {
  const entity = unwrap(detail)
  if (hasEntityId(entity)) return entity
  if (hasEntityId(detail) && !isBladeEnvelope(detail)) return detail
  if (hasEntityId(fallback)) return fallback
  if (entity && typeof entity === 'object' && !Array.isArray(entity)) return entity
  return fallback && typeof fallback === 'object' ? fallback : {}
}

function isBladeEnvelope(obj: any): boolean {
  return (
    !!obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    'data' in obj &&
    ('code' in obj || 'success' in obj)
  )
}

/**
 * 拉取详情并解析为回显数据；失败或无 id 时回退 row
 */
export async function loadEditDetail(
  fetcher: (id: string | number) => Promise<any>,
  row: any
): Promise<any> {
  if (!hasEntityId(row)) return row || {}
  try {
    const detail = await fetcher(row.id)
    return resolveEditDetail(detail, row)
  } catch (e) {
    console.error('获取详情失败', e)
    return row
  }
}
