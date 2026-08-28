import { reactive } from 'vue'
import { useClipboard } from '@vueuse/core'
import { $baseMessage } from '/@/hooks'

export type TableCopyKind = '单元格' | '整行' | '选区' | '多行'

/** 全局右键复制菜单状态 */
export const tableCopyMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  zIndex: 5000,
})

/** 当前选区（供 Ctrl+C / Ctrl+Shift+C） */
export const tableCopySelection = reactive({
  hasSelection: false,
  mode: 'cell' as 'cell' | 'range' | 'rows',
  cellText: '',
  rowText: '',
  preview: '',
  cellCount: 0,
  rowCount: 0,
})

type CellPos = {
  table: HTMLElement
  tr: HTMLTableRowElement
  td: HTMLElement
  rowIndex: number
  colIndex: number
}

let activeCells: HTMLElement[] = []
let rangeAnchor: CellPos | null = null
let dragStart: CellPos | null = null
let dragEnd: CellPos | null = null
let dragging = false
let keydownBound = false
let styleInjected = false
let lastRangeKey = ''
let dragRaf = 0
let pendingDragTd: HTMLElement | null = null

const rowListCache = new WeakMap<HTMLTableSectionElement, HTMLTableRowElement[]>()
const copyableColsCache = new WeakMap<HTMLTableRowElement, HTMLElement[]>()
const operationTdCache = new WeakMap<HTMLElement, boolean>()

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

/** 多格/多行复制：逗号分隔，便于粘贴到条件查询做多单号检索 */
const joinByComma = (values: string[]) =>
  values
    .map((v) => normalizeText(v))
    .filter(Boolean)
    .join(',')

const matrixToComma = (matrixLines: string[]) =>
  joinByComma(
    matrixLines.flatMap((line) =>
      String(line || '')
        .split(/\t/)
        .map((s) => s.trim())
    )
  )

const ensureCopyStyles = () => {
  if (styleInjected || typeof document === 'undefined') return
  styleInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-table-copy', '1')
  style.textContent = `
.el-table td.el-table__cell.is-table-copy-active,
.el-table td.el-table__cell.is-table-copy-range {
  background-color: rgba(46, 125, 90, 0.14) !important;
  box-shadow: inset 0 0 0 1px rgba(46, 125, 90, 0.45);
}
.el-table td.el-table__cell.is-table-copy-active.is-table-copy-anchor::after {
  content: attr(data-copy-badge);
  position: absolute;
  top: 1px;
  right: 2px;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 14px;
  color: #fff;
  background: #2e7d5a;
  pointer-events: none;
}
.el-table td.el-table__cell.is-table-copy-flash {
  animation: table-copy-flash 0.45s ease;
}
[data-table-copy-host].is-table-copy-dragging {
  user-select: none !important;
  -webkit-user-select: none !important;
  cursor: crosshair;
}
@keyframes table-copy-flash {
  0% { background-color: rgba(103, 194, 58, 0.35) !important; }
  100% { background-color: rgba(46, 125, 90, 0.14) !important; }
}
`
  document.head.appendChild(style)
}

const isOperationTd = (td: HTMLElement) => {
  const cached = operationTdCache.get(td)
  if (cached != null) return cached
  const buttons = td.querySelectorAll('.el-button, button, .el-link')
  if (!buttons.length) {
    operationTdCache.set(td, false)
    return false
  }
  const btnText = [...buttons]
    .map((b) => normalizeText(b.textContent))
    .filter(Boolean)
    .join('')
  const cellText = normalizeText(td.innerText)
  const result = !cellText || Boolean(btnText && (btnText === cellText || cellText.length <= btnText.length + 4))
  operationTdCache.set(td, result)
  return result
}

const isCopyableTd = (td: HTMLElement) => {
  if (!td.classList.contains('el-table__cell')) return false
  if (td.classList.contains('el-table-column--selection')) return false
  if (td.querySelector('.el-checkbox')) return false
  if (isOperationTd(td)) return false
  return true
}

const getCopyableTds = (tr: HTMLTableRowElement) => {
  const cached = copyableColsCache.get(tr)
  if (cached) return cached
  const cols = [...tr.querySelectorAll(':scope > td.el-table__cell')].filter((c) => isCopyableTd(c as HTMLElement)) as HTMLElement[]
  copyableColsCache.set(tr, cols)
  return cols
}

const extractRowText = (tr: HTMLTableRowElement) =>
  getCopyableTds(tr)
    .map((cell) => normalizeText(cell.innerText))
    .join('\t')

const getRowsForTbody = (tbody: HTMLTableSectionElement) => {
  const cached = rowListCache.get(tbody)
  if (cached) return cached
  const rows = [...tbody.querySelectorAll(':scope > tr.el-table__row, :scope > tr')] as HTMLTableRowElement[]
  rowListCache.set(tbody, rows)
  return rows
}

const getBodyRows = (table: HTMLElement) => {
  const root = table.matches('.el-table') ? table : table.querySelector('.el-table')
  if (!root) return [] as HTMLTableRowElement[]
  const main =
    root.querySelector('.el-table__body-wrapper:not(.el-table__fixed-body-wrapper) tbody') ||
    root.querySelector('.el-table__body-wrapper tbody') ||
    root.querySelector('tbody')
  if (!main) return [] as HTMLTableRowElement[]
  return getRowsForTbody(main as HTMLTableSectionElement)
}

const resolveTableRoot = (el: HTMLElement) =>
  (el.closest('.el-table') as HTMLElement | null) || (el.closest('[data-table-copy-host]') as HTMLElement | null)

export const getCellPos = (td: HTMLElement): CellPos | null => {
  const tr = td.closest('tr') as HTMLTableRowElement | null
  if (!tr) return null
  const table = resolveTableRoot(td)
  if (!table) return null
  if (!isCopyableTd(td)) return null

  const tbody = tr.closest('tbody') as HTMLTableSectionElement | null
  const rowIndex = tbody ? tr.sectionRowIndex : getBodyRows(table).indexOf(tr)
  if (rowIndex < 0) return null

  const cols = getCopyableTds(tr)
  const colIndex = cols.indexOf(td)
  if (colIndex < 0) return null
  return { table, tr, td, rowIndex, colIndex }
}

export const isElTableCopyableCell = (td: HTMLElement | null) => Boolean(td && isCopyableTd(td))

export const isTableCopyDragging = () => dragging

const clearHighlights = () => {
  for (const td of activeCells) {
    td.classList.remove('is-table-copy-active', 'is-table-copy-range', 'is-table-copy-anchor', 'is-table-copy-flash')
    td.removeAttribute('data-copy-badge')
  }
  activeCells = []
}

const setSelectionPayload = (payload: {
  cellText: string
  rowText: string
  mode: 'cell' | 'range' | 'rows'
  cellCount: number
  rowCount: number
}) => {
  tableCopySelection.cellText = payload.cellText
  tableCopySelection.rowText = payload.rowText || payload.cellText
  tableCopySelection.mode = payload.mode
  tableCopySelection.cellCount = payload.cellCount
  tableCopySelection.rowCount = payload.rowCount
  tableCopySelection.preview = truncate(payload.cellText.replace(/\n/g, ' / '))
  tableCopySelection.hasSelection = Boolean(payload.cellText || payload.rowText)
}

const flashSelection = () => {
  for (const td of activeCells) {
    td.classList.remove('is-table-copy-flash')
    void td.offsetWidth
    td.classList.add('is-table-copy-flash')
  }
  window.setTimeout(() => {
    for (const td of activeCells) td.classList.remove('is-table-copy-flash')
  }, 460)
}

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el?.closest) return false
  return Boolean(el.closest('input, textarea, [contenteditable="true"], .el-input, .el-textarea, .el-select, .el-message-box'))
}

export const collectCheckedRowsText = (host: HTMLElement) => {
  const table = (host.matches('.el-table') ? host : host.querySelector('.el-table')) as HTMLElement | null
  if (!table) return { text: '', rowCount: 0, cells: [] as HTMLElement[] }
  const rows = getBodyRows(table).filter((tr) => {
    const checkTd = tr.querySelector('td.el-table-column--selection')
    if (!checkTd) return false
    return Boolean(checkTd.querySelector('.el-checkbox.is-checked, .el-checkbox__input.is-checked'))
  })
  if (!rows.length) return { text: '', rowCount: 0, cells: [] as HTMLElement[] }
  const cells: HTMLElement[] = []
  const lines = rows.map((tr) => {
    const tds = getCopyableTds(tr)
    cells.push(...tds)
    return tds.map((td) => normalizeText(td.innerText)).join('\t')
  })
  // 勾选多行：若每行仅一列可复制值，用逗号；否则整行仍用换行+制表符
  const colCounts = new Set(rows.map((tr) => getCopyableTds(tr).length))
  const singleCol = colCounts.size === 1 && [...colCounts][0] === 1
  const text = singleCol ? matrixToComma(lines) : lines.join('\n')
  return { text, rowCount: rows.length, cells }
}

const collectRangeCells = (from: CellPos, to: CellPos) => {
  const r0 = Math.min(from.rowIndex, to.rowIndex)
  const r1 = Math.max(from.rowIndex, to.rowIndex)
  const c0 = Math.min(from.colIndex, to.colIndex)
  const c1 = Math.max(from.colIndex, to.colIndex)
  const tbody = from.tr.closest('tbody') as HTMLTableSectionElement | null
  const rows = tbody ? getRowsForTbody(tbody) : getBodyRows(from.table)
  const cells: HTMLElement[] = []
  for (let r = r0; r <= r1; r++) {
    const tr = rows[r]
    if (!tr) continue
    const cols = getCopyableTds(tr)
    for (let c = c0; c <= c1; c++) {
      const td = cols[c]
      if (td) cells.push(td)
    }
  }
  return { r0, r1, c0, c1, rows, cells }
}

const applyRangeHighlight = (cells: HTMLElement[], badge: string) => {
  const nextSet = new Set(cells)
  for (const td of activeCells) {
    if (!nextSet.has(td)) {
      td.classList.remove('is-table-copy-active', 'is-table-copy-range', 'is-table-copy-anchor', 'is-table-copy-flash')
      td.removeAttribute('data-copy-badge')
    }
  }
  activeCells = cells
  const isRange = cells.length > 1
  for (let i = 0; i < cells.length; i++) {
    const td = cells[i]
    td.classList.toggle('is-table-copy-range', isRange)
    td.classList.toggle('is-table-copy-active', !isRange || i === 0)
    td.classList.toggle('is-table-copy-anchor', i === 0)
    if (i === 0) td.setAttribute('data-copy-badge', badge)
    else td.removeAttribute('data-copy-badge')
  }
}

const buildRangePayload = (from: CellPos, to: CellPos) => {
  const { r0, r1, c0, c1, rows, cells } = collectRangeCells(from, to)
  const matrix: string[] = []
  const fullRows: string[] = []
  for (let r = r0; r <= r1; r++) {
    const tr = rows[r]
    if (!tr) continue
    const cols = getCopyableTds(tr)
    const line: string[] = []
    for (let c = c0; c <= c1; c++) {
      const td = cols[c]
      line.push(td ? normalizeText(td.innerText) : '')
    }
    matrix.push(line.join('\t'))
    fullRows.push(extractRowText(tr))
  }
  const cellCount = cells.length
  const rowCount = r1 - r0 + 1
  const tsvText = matrix.join('\n')
  // 选区复制：多行/多列统一逗号分隔（粘贴到制令号/工单号等查询框）
  const commaText = cellCount > 1 ? matrixToComma(matrix) : tsvText
  return {
    cellText: commaText,
    rowText: fullRows.join('\n'),
    mode: (cellCount > 1 ? 'range' : 'cell') as 'cell' | 'range',
    cellCount,
    rowCount,
    cells,
    badge: cellCount > 1 ? `${cellCount}格` : '已选',
  }
}

/** 选中矩形区域；visualOnly 仅更新高亮（拖选过程用） */
export function selectElTableRange(from: CellPos, to: CellPos, opts?: { focus?: boolean; visualOnly?: boolean }) {
  ensureCopyStyles()
  if (from.table !== to.table) return

  const r0 = Math.min(from.rowIndex, to.rowIndex)
  const r1 = Math.max(from.rowIndex, to.rowIndex)
  const c0 = Math.min(from.colIndex, to.colIndex)
  const c1 = Math.max(from.colIndex, to.colIndex)
  const rangeKey = `${r0}|${r1}|${c0}|${c1}`
  if (rangeKey === lastRangeKey && opts?.visualOnly) return
  lastRangeKey = rangeKey
  dragEnd = to

  const { cells, cellCount } = collectRangeCells(from, to)
  const badge = cellCount > 1 ? `${cellCount}格` : '已选'
  applyRangeHighlight(cells, badge)

  if (!opts?.visualOnly) {
    const payload = buildRangePayload(from, to)
    setSelectionPayload(payload)
  }

  rangeAnchor = from
  if (opts?.focus) {
    const host = from.td.closest('[data-table-copy-host]') as HTMLElement | null
    host?.focus?.({ preventScroll: true })
  }
}

export function selectElTableCell(td: HTMLElement, opts?: { shiftKey?: boolean; focus?: boolean }) {
  ensureCopyStyles()
  const pos = getCellPos(td)
  if (!pos) return
  if (opts?.shiftKey && rangeAnchor && rangeAnchor.table === pos.table) {
    selectElTableRange(rangeAnchor, pos, { focus: opts?.focus })
    return
  }

  lastRangeKey = ''
  rangeAnchor = pos
  dragEnd = pos
  const cellText = normalizeText(td.innerText)
  const rowText = extractRowText(pos.tr)

  applyRangeHighlight([td], '已选')
  setSelectionPayload({
    cellText,
    rowText: rowText || cellText,
    mode: 'cell',
    cellCount: 1,
    rowCount: 1,
  })
  if (opts?.focus) {
    const host = td.closest('[data-table-copy-host]') as HTMLElement | null
    host?.focus?.({ preventScroll: true })
  }
}

export function syncCheckedRowsIfNeeded(host: HTMLElement) {
  if (tableCopySelection.cellCount > 1 || tableCopySelection.rowCount > 1) return
  const checked = collectCheckedRowsText(host)
  if (checked.rowCount <= 1) return
  applyRangeHighlight(checked.cells, `${checked.rowCount}行`)
  setSelectionPayload({
    cellText: checked.text,
    rowText: checked.text,
    mode: 'rows',
    cellCount: checked.cells.length,
    rowCount: checked.rowCount,
  })
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
    const tip = truncate(value.replace(/\n/g, ' / '))
    const { cellCount, rowCount, mode } = tableCopySelection
    let msg = `已复制${kind}：${tip}`
    if (kind === '选区' || (kind === '单元格' && mode === 'range' && cellCount > 1)) {
      msg = `已复制选区 ${cellCount} 格（逗号分隔）：${tip}`
    } else if (kind === '多行' || (kind === '整行' && rowCount > 1)) {
      msg = value.includes(',') && !value.includes('\t')
        ? `已复制 ${rowCount} 行（逗号分隔）：${tip}`
        : `已复制 ${rowCount} 行：${tip}`
    } else if (kind === '单元格') {
      msg = `已复制单元格：${tip}`
    } else if (kind === '整行') {
      msg = `已复制整行：${tip}`
    }
    $baseMessage(msg, 'success', 'hey')
    flashSelection()
    return true
  } catch {
    $baseMessage(`复制${kind}失败`, 'error', 'hey')
    return false
  }
}

export function openTableCopyMenu(x: number, y: number, cellText?: string, rowText?: string) {
  if (cellText != null || rowText != null) {
    setSelectionPayload({
      cellText: cellText ?? tableCopySelection.cellText,
      rowText: rowText ?? cellText ?? tableCopySelection.rowText,
      mode: tableCopySelection.mode || 'cell',
      cellCount: Math.max(1, tableCopySelection.cellCount || 1),
      rowCount: Math.max(1, tableCopySelection.rowCount || 1),
    })
  }
  tableCopyMenu.show = false
  tableCopyMenu.x = Math.max(0, Number(x) || 0)
  tableCopyMenu.y = Math.max(0, Number(y) || 0)
  requestAnimationFrame(() => {
    tableCopyMenu.show = true
  })
}

export function closeTableCopyMenu() {
  tableCopyMenu.show = false
}

export function copyTableCopyCell() {
  const kind: TableCopyKind =
    tableCopySelection.mode === 'range' && tableCopySelection.cellCount > 1
      ? '选区'
      : tableCopySelection.mode === 'rows' && tableCopySelection.rowCount > 1
        ? '多行'
        : '单元格'
  return copyTableText(tableCopySelection.cellText, kind)
}

export function copyTableCopyRow() {
  const kind: TableCopyKind = tableCopySelection.rowCount > 1 ? '多行' : '整行'
  return copyTableText(tableCopySelection.rowText || tableCopySelection.cellText, kind)
}

export function clearElTableCellSelection() {
  clearHighlights()
  rangeAnchor = null
  dragEnd = null
  lastRangeKey = ''
  tableCopySelection.hasSelection = false
  tableCopySelection.cellCount = 0
  tableCopySelection.rowCount = 0
}

export function openTableCopyFromElCell(e: MouseEvent, td: HTMLElement) {
  e.preventDefault()
  e.stopPropagation()
  const host = td.closest('[data-table-copy-host]') as HTMLElement | null
  if (host) syncCheckedRowsIfNeeded(host)
  if (!(tableCopySelection.cellCount > 1 || tableCopySelection.rowCount > 1) || !activeCells.includes(td)) {
    selectElTableCell(td, { shiftKey: e.shiftKey })
  }
  openTableCopyMenu(e.clientX, e.clientY, tableCopySelection.cellText, tableCopySelection.rowText)
}

export function beginElTableDragSelect(td: HTMLElement, host: HTMLElement) {
  const pos = getCellPos(td)
  if (!pos) return false
  dragging = true
  dragStart = pos
  dragEnd = pos
  rangeAnchor = pos
  lastRangeKey = ''
  host.classList.add('is-table-copy-dragging')
  selectElTableRange(pos, pos, { visualOnly: true })
  return true
}

const flushDragSelect = () => {
  dragRaf = 0
  if (!dragging || !dragStart || !pendingDragTd) return
  const pos = getCellPos(pendingDragTd)
  pendingDragTd = null
  if (!pos || pos.table !== dragStart.table) return
  selectElTableRange(dragStart, pos, { visualOnly: true })
}

export function updateElTableDragSelect(td: HTMLElement) {
  if (!dragging || !dragStart) return
  pendingDragTd = td
  if (dragRaf) return
  dragRaf = requestAnimationFrame(flushDragSelect)
}

/** 拖选结束：一次性计算复制文本 */
export function finalizeElTableDragSelect() {
  if (!dragging || !dragStart || !dragEnd) return
  selectElTableRange(dragStart, dragEnd, { visualOnly: false })
}

export function endElTableDragSelect(host: HTMLElement) {
  if (dragRaf) {
    cancelAnimationFrame(dragRaf)
    dragRaf = 0
  }
  pendingDragTd = null
  dragging = false
  dragStart = null
  host.classList.remove('is-table-copy-dragging')
}

export const vtableCopyKeyboardOptions = {
  copySelected: true,
} as const

/** 模板里 ref 会解包，脚本里仍是 Ref，统一取 VTable 实例 */
export function getVTableInstance(tableRef: any) {
  const target = tableRef?.value ?? tableRef
  return target?.vTableInstance
}

const pickDomEvent = (args: any): MouseEvent | undefined => {
  const raw = args?.event || args?.nativeEvent || args?.e || args?.originalEvent
  if (!raw) return undefined
  return (raw.nativeEvent || raw.srcEvent || raw) as MouseEvent
}

const readVTableCell = (inst: any, c: number, r: number) => {
  try {
    const formatted = inst.getCellValue?.(c, r)
    if (formatted != null && formatted !== '') return normalizeText(formatted)
    const origin = inst.getCellOriginValue?.(c, r)
    if (origin != null && origin !== '') return normalizeText(origin)
    const record = inst.getRecordByCell?.(c, r)
    const def = inst.getBodyColumnDefine?.(c) || inst.getColumnDefine?.(c) || {}
    const field = def.field
    if (record && field != null && field !== '__checkbox__' && !String(field).startsWith('__op_')) {
      return normalizeText(record[field])
    }
    return ''
  } catch {
    return ''
  }
}

const isSkipVTableCol = (inst: any, c: number) => {
  try {
    const def = inst.getBodyColumnDefine?.(c) || inst.getHeaderDefine?.(c) || {}
    const field = String(def.field ?? '')
    const title = String(def.title ?? '')
    const cellType = def.cellType || def.type || def.headerType
    if (cellType === 'checkbox' || cellType === 'radio') return true
    if (field.startsWith('__op_')) return true
    if (title === '操作') return true
  } catch {
    /* ignore */
  }
  return false
}

const buildVTableRowText = (inst: any, row: number) => {
  const colCount = Number(inst.colCount ?? 0)
  const parts: string[] = []
  for (let c = 0; c < colCount; c++) {
    if (isSkipVTableCol(inst, c)) continue
    parts.push(readVTableCell(inst, c, row))
  }
  return parts.join('\t')
}

export function trackVTableCellForCopy(args: any, getInstance: () => any) {
  const inst = getInstance?.()
  if (!inst) return
  const col = Number(args?.col)
  const row = Number(args?.row)
  if (!Number.isFinite(col) || !Number.isFinite(row)) return
  const headerLevels = Number(inst.columnHeaderLevelCount ?? 1)
  if (row < headerLevels) return
  if (isSkipVTableCol(inst, col)) return

  clearElTableCellSelection()

  const selected = inst.getSelectedCellInfos?.() as any[][] | undefined
  if (Array.isArray(selected) && selected.length > 0) {
    const flat = selected.flat().filter(Boolean)
    if (flat.length > 1) {
      const rowsMap = new Map<number, Map<number, string>>()
      let minR = Infinity
      let maxR = -Infinity
      let minC = Infinity
      let maxC = -Infinity
      for (const cell of flat) {
        const r = Number(cell.row)
        const c = Number(cell.col)
        if (!Number.isFinite(r) || !Number.isFinite(c) || r < headerLevels) continue
        if (isSkipVTableCol(inst, c)) continue
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
        if (!rowsMap.has(r)) rowsMap.set(r, new Map())
        rowsMap.get(r)!.set(c, readVTableCell(inst, c, r))
      }
      if (maxR >= minR && maxC >= minC) {
        const matrix: string[] = []
        const fullRows: string[] = []
        let cellCount = 0
        for (let r = minR; r <= maxR; r++) {
          const line: string[] = []
          for (let c = minC; c <= maxC; c++) {
            if (isSkipVTableCol(inst, c)) continue
            const v = rowsMap.get(r)?.get(c) ?? readVTableCell(inst, c, r)
            line.push(v)
            cellCount++
          }
          matrix.push(line.join('\t'))
          fullRows.push(buildVTableRowText(inst, r))
        }
        const copyVal = typeof inst.getCopyValue === 'function' ? normalizeText(inst.getCopyValue()) : ''
        const tsvText = matrix.join('\n')
        const commaText = cellCount > 1 ? matrixToComma(matrix) : tsvText
        // VTable 自带 getCopyValue 多为 TSV；多格时改用逗号以便多单号查询
        setSelectionPayload({
          cellText: cellCount > 1 ? commaText : copyVal || tsvText,
          rowText: fullRows.join('\n'),
          mode: cellCount > 1 ? 'range' : 'cell',
          cellCount,
          rowCount: maxR - minR + 1,
        })
        return
      }
    }
  }

  const cellText = readVTableCell(inst, col, row)
  const rowText = buildVTableRowText(inst, row)
  setSelectionPayload({
    cellText,
    rowText: rowText || cellText,
    mode: 'cell',
    cellCount: 1,
    rowCount: 1,
  })
}

export function handleVTableContextMenuCell(args: any, getInstance: () => any) {
  const event = pickDomEvent(args)
  event?.preventDefault?.()
  event?.stopPropagation?.()

  const inst = getInstance?.()
  if (!inst) return

  const col = Number(args?.col)
  const row = Number(args?.row)
  if (!Number.isFinite(col) || !Number.isFinite(row)) return

  const headerLevels = Number(inst.columnHeaderLevelCount ?? 1)
  if (row < headerLevels) return
  if (isSkipVTableCol(inst, col)) return

  trackVTableCellForCopy(args, getInstance)
  const x = Number(event?.clientX ?? event?.x ?? 0)
  const y = Number(event?.clientY ?? event?.y ?? 0)
  openTableCopyMenu(x, y, tableCopySelection.cellText, tableCopySelection.rowText)
}

export function handleTableCopyHotkey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key !== 'c' && e.key !== 'C') return
  if (isEditableTarget(e.target)) return

  const host = (e.target as HTMLElement | null)?.closest?.('[data-table-copy-host]') as HTMLElement | null
  if (host) syncCheckedRowsIfNeeded(host)

  if (!tableCopySelection.hasSelection) return

  e.preventDefault()
  e.stopPropagation()
  if (e.shiftKey) {
    void copyTableCopyRow()
  } else {
    void copyTableCopyCell()
  }
}

export function ensureTableCopyHotkeys() {
  if (keydownBound || typeof document === 'undefined') return
  keydownBound = true
  ensureCopyStyles()
  document.addEventListener('keydown', handleTableCopyHotkey, true)
}
