import '/@/styles/hiprint-print-lock.css'

export const A4_W = 595.28
export const A4_H = 841.89

export const ensureJquery = async () => {
  const jquery = (await import('jquery')).default
  const w = window as any
  w.$ = jquery
  w.jQuery = jquery
  return jquery
}

export const initHiprint = async (providers: any[] = []) => {
  await ensureJquery()
  const { hiprint } = await import('vue-plugin-hiprint')
  hiprint.init({ providers })
  return hiprint
}

export const createPrintTemplate = async (options: {
  template?: unknown
  settingContainer?: string
} = {}) => {
  const { hiprint } = await import('vue-plugin-hiprint')
  return new hiprint.PrintTemplate({
    template: options.template,
    settingContainer: options.settingContainer,
  })
}

export const designTemplate = (tpl: any, containerSelector: string) => {
  tpl.design(containerSelector)
}

export const buildProviderPanel = async ($container: any, moduleName: string) => {
  const { hiprint } = await import('vue-plugin-hiprint')
  $container.empty()
  hiprint.PrintElementTypeManager.build($container, moduleName)
  const el = $container?.[0] as HTMLElement | undefined
  if (el) decorateProviderIcons(el)
}

/** 为左侧拖拽组件补图标，不影响 hiprint tid 拖拽行为 */
export const decorateProviderIcons = (root: HTMLElement) => {
  root.querySelectorAll('a.ep-draggable-item[tid]').forEach((node) => {
    const a = node as HTMLAnchorElement
    if (a.querySelector('.hp-el-icon')) return
    const tid = a.getAttribute('tid') || ''
    const title = (a.textContent || '').trim()
    a.classList.add('hp-el-item')
    a.innerHTML = ''
    const icon = document.createElement('span')
    icon.className = `hp-el-icon ${iconClassForTid(tid)}`
    icon.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.className = 'hp-el-title'
    label.textContent = title
    a.append(icon, label)
  })

  root.querySelectorAll('.title').forEach((node) => {
    const title = node as HTMLElement
    if (title.classList.contains('hp-group-title')) return
    title.classList.add('hp-group-title')
  })
}

const iconClassForTid = (tid: string) => {
  const t = tid.toLowerCase()
  if (t.includes('.table') || t.endsWith('table')) return 'is-table'
  if (t.includes('longtext')) return 'is-longtext'
  if (t.includes('hline')) return 'is-hline'
  if (t.includes('vline')) return 'is-vline'
  if (t.includes('rect') || t.includes('oval')) return 'is-rect'
  if (t.includes('qrcode')) return 'is-qrcode'
  if (t.includes('barcode')) return 'is-barcode'
  if (t.includes('image') || t.includes('img')) return 'is-image'
  if (t.startsWith('instructionmodule.')) return 'is-field'
  return 'is-text'
}

export const renderPreview = async (
  container: HTMLElement,
  tpl: any,
  printData: unknown
) => {
  const $ = await ensureJquery()
  const html = tpl.getHtml(printData) as any
  const $wrap = $('<div class="hiprint-printPagination hiprint-report-preview-fit"/>')
  if (html) $wrap.append(html)
  $(container).empty().append($wrap)
  requestAnimationFrame(() => {
    fitPreviewToContainer(container)
    requestAnimationFrame(() => fitPreviewToContainer(container))
  })
}

/** printData 可为单对象或数组（多份连续打印） */
export const printWithTemplate = (tpl: any, printData: unknown) => {
  tpl.print(printData)
}

export const fitPreviewToContainer = (container: HTMLElement) => {
  const paper = container.querySelector('.hiprint-printPaper') as HTMLElement | null
  if (!paper) return
  const wrap = paper.parentElement as HTMLElement | null
  const avail = container.clientWidth - 8
  const paperW = paper.offsetWidth || A4_W
  if (avail <= 0 || paperW <= 0) return
  const scale = Math.min(avail / paperW, 2.4)
  paper.style.transformOrigin = 'top center'
  paper.style.transform = `scale(${scale})`
  paper.style.margin = '0 auto'
  if (wrap) {
    wrap.style.width = '100%'
    wrap.style.display = 'flex'
    wrap.style.justifyContent = 'center'
    wrap.style.minHeight = `${paper.offsetHeight * scale + 24}px`
    wrap.style.paddingTop = '8px'
  }
}
