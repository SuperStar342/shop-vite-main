import { reactive } from 'vue'
import { useClipboard } from '@vueuse/core'
import { $baseMessage } from '/@/hooks'

export type TableCopyKind = '单元格' | '整行'

/** 全局右键复制菜单状态（单例，供 TableCopyMenu 使用） */
export const tableCopyMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  zIndex: 5000,
  cellText: '',
  rowText: '',
})

/** 当前明确选中的单元格（供 Ctrl+C） */
export const tableCopySelection = reactive({
  hasSelection: false,
  cellText: '',
  rowText: '',
  preview: '',
})

let activeTd: HTMLElement | null = null
let keydownBound = false
let styleInjected = false

const normalizeText = (v: unknown) =>
  String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

const truncate = (text: string, max = 36) => {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

const ensureCopyStyles = () => {
  if (styleInjected || typeof document === 'undefined') return
  styleInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-table-copy', '1')
  style.textContent = `
.el-table td.el-table__cell.is-table-copy-active {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--el-color-primary) !important;
  outline-offset: -2px;
  background-color: color-mix(in srgb, var(--el-color-primary) 14%, transparent) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 45%, transparent);
}
.el-table td.el-table__cell.is-table-copy-active::after {
  content: '已选';
  position: absolute;
  top: 1px;
  right: 2px;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 14px;
  color: #fff;
  background: var(--el-color-primary);
  pointer-events: none;
  opacity: 0.92;
}
.el-table td.el-table__cell.is-table-copy-flash {
  animation: table-copy-flash 0.5s ease;
}
@keyframes table-copy-flash {
  0% { background-color: color-mix(in srgb, var(--el-color-success) 40%, transparent) !important; }
  100% { background-color: color-mix(in srgb, var(--el-color-primary) 14%, transparent) !important; }
}
`
  document.head.appendChild(style)
}

const extractRowText = (tr: HTMLElement) =>
  [...tr.querySelectorAll(':scope > td.el-table__cell')]
    .filter((cell) => {
      if (cell.classList.contains('el-table-column--selection')) return false
      if (cell.querySelector('.el-checkbox')) return false
      const text = normalizeText((cell as HTMLElement).innerText)
      if (!text && cell.querySelector('.el-button,button')) return false
      return true
    })
    .map((cell) => normalizeText((cell as HTMLElement).innerText))
    .join('\t')

const setSelectionPayload = (cellText: string, rowText: string) => {
  tableCopySelection.cellText = cellText
  tableCopySelection.rowText = rowText || cellText
  tableCopySelection.preview = truncate(cellText)
  tableCopySelection.hasSelection = Boolean(cellText || rowText)
}

const flashActiveTd = () => {
  if (!activeTd) return
  activeTd.classList.remove('is-table-copy-flash')
  // restart animation
  void activeTd.offsetWidth
  activeTd.classList.add('is-table-copy-flash')
  window.setTimeout(() => activeTd?.classList.remove('is-table-copy-flash'), 520)
}

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el?.closest) return false
  return Boolean(
    el.closest('input, textarea, [contenteditable="true"], .el-input, .el-textarea, .el-select, .el-message-box')
  )
}

export async function copyTableText(text: string, kind: TableCopyKind = '单元格') {
  const value = text == null ? '' : String(text)
  if (!value.trim()) {
    $baseMessage(`暂无可复制的${kind}内容`, 'warning', 'hey')
    return false
  }
  try {
    const { copy, isSupported } = useClipboard({ legacy: true })
    if (isSupported.value) {
      await copy(value)
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else {
      throw new Error('clipboard unsupported')
    }
    const tip = truncate(value)
    $baseMessage(kind === '单元格' ? `已复制单元格：${tip}` : `已复制整行：${tip}`, 'success', 'hey')
    flashActiveTd()
    return true
  } catch {
    $baseMessage(`复制${kind}失败`, 'error', 'hey')
    return false
  }
}

export function openTableCopyMenu(x: number, y: number, cellText: string, rowText: string) {
  tableCopyMenu.cellText = cellText
  tableCopyMenu.rowText = rowText
  tableCopyMenu.x = x
  tableCopyMenu.y = y
  tableCopyMenu.show = true
  setSelectionPayload(cellText, rowText)
}

export function closeTableCopyMenu() {
  tableCopyMenu.show = false
}

export function copyTableCopyCell() {
  return copyTableText(tableCopyMenu.cellText || tableCopySelection.cellText, '单元格')
}

export function copyTableCopyRow() {
  return copyTableText(
    tableCopyMenu.rowText || tableCopySelection.rowText || tableCopyMenu.cellText || tableCopySelection.cellText,
    '整行'
  )
}

export function clearElTableCellSelection() {
  if (activeTd) {
    activeTd.classList.remove('is-table-copy-active', 'is-table-copy-flash')
    activeTd = null
  }
}

/** 单击选中单元格，明确高亮，供 Ctrl+C 使用 */
export function selectElTableCell(td: HTMLElement) {
  ensureCopyStyles()
  const tr = td.closest('tr')
  if (!tr) return
  if (activeTd && activeTd !== td) {
    activeTd.classList.remove('is-table-copy-active', 'is-table-copy-flash')
  }
  activeTd = td
  td.classList.add('is-table-copy-active')
  const cellText = normalizeText(td.innerText)
  const rowText = extractRowText(tr)
  setSelectionPayload(cellText, rowText)
  // 便于后续快捷键，不抢走输入焦点
  const host = td.closest('[data-table-copy-host]') as HTMLElement | null
  host?.focus?.({ preventScroll: true })
}

/** 从 Element Plus 表格单元格打开复制菜单 */
export function openTableCopyFromElCell(e: MouseEvent, td: HTMLElement) {
  e.preventDefault()
  e.stopPropagation()
  selectElTableCell(td)
  openTableCopyMenu(e.clientX, e.clientY, tableCopySelection.cellText, tableCopySelection.rowText)
}

/** VTable 通用：启用 Ctrl+C 复制选中单元格 */
export const vtableCopyKeyboardOptions = {
  copySelected: true,
} as const

const readVTableCell = (inst: any, c: number, r: number) => {
  try {
    const v = inst.getCellValue?.(c, r) ?? inst.getCellOriginValue?.(c, r) ?? ''
    return normalizeText(v)
  } catch {
    return ''
  }
}

const buildVTableRowText = (inst: any, row: number) => {
  const colCount = Number(inst.colCount ?? 0)
  const parts: string[] = []
  for (let c = 0; c < colCount; c++) {
    try {
      const def = inst.getBodyColumnDefine?.(c) || inst.getHeaderDefine?.(c) || {}
      const cellType = def.cellType || def.type || def.headerType
      if (cellType === 'checkbox' || cellType === 'radio') continue
      if (def.field === undefined && def.title === '操作') continue
    } catch {
      /* ignore */
    }
    parts.push(readVTableCell(inst, c, row))
  }
  return parts.join('\t')
}

/** 点击/选中 VTable 单元格后记录，供 Ctrl+C */
export function trackVTableCellForCopy(args: any, getInstance: () => any) {
  const inst = getInstance?.()
  if (!inst) return
  const col = Number(args?.col)
  const row = Number(args?.row)
  if (!Number.isFinite(col) || !Number.isFinite(row)) return
  const headerLevels = Number(inst.columnHeaderLevelCount ?? 1)
  if (row < headerLevels) return
  clearElTableCellSelection()
  const cellText = readVTableCell(inst, col, row)
  const rowText = buildVTableRowText(inst, row)
  setSelectionPayload(cellText, rowText || cellText)
}

/**
 * VTable 右键：复制单元格 / 整行
 */
export function handleVTableContextMenuCell(args: any, getInstance: () => any) {
  const event: MouseEvent | undefined = args?.event || args?.nativeEvent
  event?.preventDefault?.()
  event?.stopPropagation?.()

  const inst = getInstance?.()
  if (!inst) return

  const col = Number(args?.col)
  const row = Number(args?.row)
  if (!Number.isFinite(col) || !Number.isFinite(row)) return

  const headerLevels = Number(inst.columnHeaderLevelCount ?? 1)
  if (row < headerLevels) return

  trackVTableCellForCopy(args, getInstance)
  const x = event?.clientX ?? 0
  const y = event?.clientY ?? 0
  openTableCopyMenu(x, y, tableCopySelection.cellText, tableCopySelection.rowText)
}

export function handleTableCopyHotkey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key !== 'c' && e.key !== 'C') return
  if (isEditableTarget(e.target)) return
  if (!tableCopySelection.hasSelection) return

  e.preventDefault()
  e.stopPropagation()
  if (e.shiftKey) {
    void copyTableText(tableCopySelection.rowText || tableCopySelection.cellText, '整行')
  } else {
    void copyTableText(tableCopySelection.cellText, '单元格')
  }
}

/** 全局快捷键只绑定一次 */
export function ensureTableCopyHotkeys() {
  if (keydownBound || typeof document === 'undefined') return
  keydownBound = true
  ensureCopyStyles()
  document.addEventListener('keydown', handleTableCopyHotkey, true)
}
