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

const normalizeText = (v: unknown) =>
  String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

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
    $baseMessage(`已复制${kind}`, 'success', 'hey')
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
}

export function closeTableCopyMenu() {
  tableCopyMenu.show = false
}

export function copyTableCopyCell() {
  return copyTableText(tableCopyMenu.cellText, '单元格')
}

export function copyTableCopyRow() {
  return copyTableText(tableCopyMenu.rowText || tableCopyMenu.cellText, '整行')
}

/** 从 Element Plus 表格单元格打开复制菜单 */
export function openTableCopyFromElCell(e: MouseEvent, td: HTMLElement) {
  const tr = td.closest('tr')
  if (!tr) return
  e.preventDefault()
  e.stopPropagation()

  const cellText = normalizeText(td.innerText)
  const rowText = [...tr.querySelectorAll(':scope > td.el-table__cell')]
    .filter((cell) => {
      if (cell.classList.contains('el-table-column--selection')) return false
      if (cell.querySelector('.el-checkbox')) return false
      // 纯操作列（只有按钮）跳过
      const text = normalizeText(cell.innerText)
      if (!text && cell.querySelector('.el-button,button')) return false
      return true
    })
    .map((cell) => normalizeText(cell.innerText))
    .join('\t')

  openTableCopyMenu(e.clientX, e.clientY, cellText, rowText)
}

/** VTable 通用：启用 Ctrl+C 复制选中单元格 */
export const vtableCopyKeyboardOptions = {
  copySelected: true,
} as const

/**
 * VTable 右键：复制单元格 / 整行
 * @param args on-contextmenu-cell 回调参数
 * @param getInstance 返回 vTableInstance
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

  const readCell = (c: number, r: number) => {
    try {
      const v = inst.getCellValue?.(c, r) ?? inst.getCellOriginValue?.(c, r) ?? ''
      return normalizeText(v)
    } catch {
      return ''
    }
  }

  const cellText = readCell(col, row)
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
    parts.push(readCell(c, row))
  }
  const rowText = parts.filter((p, i, arr) => !(p === '' && i === arr.length - 1)).join('\t')
  const x = event?.clientX ?? 0
  const y = event?.clientY ?? 0
  openTableCopyMenu(x, y, cellText, rowText || cellText)
}
