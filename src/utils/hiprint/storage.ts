const PREFIX = 'hiprint:tpl:'

export const storageKey = (reportKey: string) => `${PREFIX}${reportKey}`

export const loadLocalTemplate = (reportKey: string): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(storageKey(reportKey))
    if (!raw) return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export const saveLocalTemplate = (reportKey: string, template: unknown): void => {
  localStorage.setItem(storageKey(reportKey), JSON.stringify(template))
}

export const clearLocalTemplate = (reportKey: string): void => {
  localStorage.removeItem(storageKey(reportKey))
}

/** 空串 / 空对象 / 无 panels 时视为无有效模板，回落出厂默认 */
export const isBlankTemplate = (raw: unknown): boolean => {
  if (raw == null) return true
  let data: unknown = raw
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return true
    try {
      data = JSON.parse(text)
    } catch {
      return true
    }
  }
  if (typeof data !== 'object' || data === null) return true
  const panels = (data as { panels?: unknown }).panels
  return !Array.isArray(panels) || panels.length === 0
}

export const resolveTemplate = async (options: {
  reportKey: string
  defaultTemplate: unknown
  onLoadTemplate?: (key: string) => Promise<unknown | null>
}): Promise<unknown> => {
  if (options.onLoadTemplate) {
    const remote = await options.onLoadTemplate(options.reportKey)
    if (!isBlankTemplate(remote)) {
      return typeof remote === 'string' ? JSON.parse(remote) : remote
    }
  }
  const local = loadLocalTemplate(options.reportKey)
  if (!isBlankTemplate(local)) return local
  return options.defaultTemplate
}
