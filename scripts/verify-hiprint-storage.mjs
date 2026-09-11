/** One-off contract check for hiprint storage helpers (mirrors storage.ts). */

const PREFIX = 'hiprint:tpl:'

const storageKey = (reportKey) => `${PREFIX}${reportKey}`

const loadLocalTemplate = (reportKey, localStorage) => {
  try {
    const raw = localStorage.getItem(storageKey(reportKey))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const saveLocalTemplate = (reportKey, template, localStorage) => {
  localStorage.setItem(storageKey(reportKey), JSON.stringify(template))
}

const clearLocalTemplate = (reportKey, localStorage) => {
  localStorage.removeItem(storageKey(reportKey))
}

const resolveTemplate = async (options, localStorage) => {
  if (options.onLoadTemplate) {
    const remote = await options.onLoadTemplate(options.reportKey)
    if (remote != null) return remote
  }
  return loadLocalTemplate(options.reportKey, localStorage) ?? options.defaultTemplate
}

function createMockLocalStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

async function main() {
  const ls = createMockLocalStorage()
  const reportKey = 'sales-report'

  assert(storageKey(reportKey) === 'hiprint:tpl:sales-report', 'storageKey format')

  assert(loadLocalTemplate(reportKey, ls) === null, 'load empty')

  const tpl = { panels: [{ index: 0 }] }
  saveLocalTemplate(reportKey, tpl, ls)
  assert(JSON.stringify(loadLocalTemplate(reportKey, ls)) === JSON.stringify(tpl), 'save/load roundtrip')

  clearLocalTemplate(reportKey, ls)
  assert(loadLocalTemplate(reportKey, ls) === null, 'clear removes entry')

  const defaultTemplate = { panels: [{ index: -1 }] }
  const fromDefault = await resolveTemplate({ reportKey, defaultTemplate }, ls)
  assert(JSON.stringify(fromDefault) === JSON.stringify(defaultTemplate), 'resolve falls back to default')

  saveLocalTemplate(reportKey, tpl, ls)
  const fromLocal = await resolveTemplate({ reportKey, defaultTemplate }, ls)
  assert(JSON.stringify(fromLocal) === JSON.stringify(tpl), 'resolve prefers local over default')

  const remoteTpl = { panels: [{ index: 99 }] }
  const fromRemote = await resolveTemplate(
    {
      reportKey,
      defaultTemplate,
      onLoadTemplate: async () => remoteTpl,
    },
    ls
  )
  assert(JSON.stringify(fromRemote) === JSON.stringify(remoteTpl), 'resolve prefers remote over local')

  const fromRemoteNull = await resolveTemplate(
    {
      reportKey,
      defaultTemplate,
      onLoadTemplate: async () => null,
    },
    ls
  )
  assert(JSON.stringify(fromRemoteNull) === JSON.stringify(tpl), 'resolve uses local when remote is null')

  console.log('storage ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
