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

export const resolveTemplate = async (options: {
  reportKey: string
  defaultTemplate: unknown
  onLoadTemplate?: (key: string) => Promise<unknown | null>
}): Promise<unknown> => {
  if (options.onLoadTemplate) {
    const remote = await options.onLoadTemplate(options.reportKey)
    if (remote != null) return remote
  }
  return loadLocalTemplate(options.reportKey) ?? options.defaultTemplate
}
