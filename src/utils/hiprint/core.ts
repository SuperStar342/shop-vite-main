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
}

export const renderPreview = async (container: HTMLElement, tpl: any, printData: unknown) => {
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
