import Sortable from 'sortablejs'

type FindResult = { siblings: any[]; index: number }

/** 在树中定位节点及其同级数组 */
export function findSiblings(nodes: any[], id: string, parentArr: any[] = nodes): FindResult | null {
  const index = parentArr.findIndex((n) => String(n.id) === id)
  if (index > -1) return { siblings: parentArr, index }
  for (const n of nodes) {
    if (Array.isArray(n.children) && n.children.length) {
      const found = findSiblings(n.children, id, n.children)
      if (found) return found
    }
  }
  return null
}

export function getRowKey(el: Element | null | undefined): string {
  if (!el) return ''
  return (el as HTMLElement).getAttribute('data-row-key') || (el as HTMLElement).getAttribute('row-key') || ''
}

export type TreeSortableOptions = {
  /** el-table 根元素 */
  getTableEl: () => HTMLElement | undefined
  /** 树数据 ref */
  getList: () => any[]
  setList: (list: any[]) => void
  /** 同级排序变更后回调（siblings 已按新顺序更新 sort） */
  onSorted: (siblings: any[], moved: any) => void | Promise<void>
  /**
   * 长按延迟（ms），默认 350；设为 0 则立即拖拽
   * 不传 handle 时整行可拖，建议保留 delay 避免误触
   */
  delay?: number
  /** 拖拽把手选择器；不传则整行长按拖拽 */
  handle?: string
  /** 忽略的交互元素，避免与按钮/复选框冲突 */
  filter?: string
}

const DEFAULT_FILTER =
  '.el-button, .el-checkbox, .el-checkbox__input, .el-switch, .el-input, input, a, button, .el-table__expand-icon, .el-link, .el-tooltip__trigger'

/**
 * 为 el-table 树表启用同级拖拽排序（SortableJS）
 * 注意：仅允许同一 parentId 下重排
 */
export function createTreeTableSortable(options: TreeSortableOptions) {
  let instance: Sortable | null = null

  const destroy = () => {
    instance?.destroy()
    instance = null
  }

  const init = () => {
    destroy()
    const tableEl = options.getTableEl()
    if (!tableEl) return
    const tbody = tableEl.querySelector('.el-table__body-wrapper tbody') as HTMLElement | null
    if (!tbody) return

    const delay = options.delay ?? 350

    instance = Sortable.create(tbody, {
      ...(options.handle ? { handle: options.handle } : {}),
      animation: 180,
      delay,
      delayOnTouchOnly: false,
      touchStartThreshold: 3,
      filter: options.filter || DEFAULT_FILTER,
      preventOnFilter: true,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      forceFallback: true,
      fallbackOnBody: true,
      onMove: (evt) => {
        const draggedId = getRowKey(evt.dragged)
        const relatedId = getRowKey(evt.related)
        if (!draggedId || !relatedId) return false
        const a = findSiblings(options.getList(), draggedId)
        const b = findSiblings(options.getList(), relatedId)
        if (!a || !b) return false
        // 同一父级数组引用才允许
        return a.siblings === b.siblings
      },
      onEnd: (evt) => {
        if (evt.oldIndex == null || evt.newIndex == null || evt.oldIndex === evt.newIndex) {
          return
        }
        const draggedId = getRowKey(evt.item)
        if (!draggedId) {
          options.setList([...options.getList()])
          return
        }

        const found = findSiblings(options.getList(), draggedId)
        if (!found) {
          options.setList([...options.getList()])
          return
        }

        const { siblings } = found
        const siblingIdSet = new Set(siblings.map((s) => String(s.id)))

        // 按当前 DOM 顺序收集同级 id（Sortable 已改 DOM）
        const orderedIds = Array.from(evt.from.querySelectorAll('tr'))
          .map((tr) => getRowKey(tr))
          .filter((id) => id && siblingIdSet.has(id))

        if (orderedIds.length !== siblings.length) {
          // DOM 与数据不一致时回滚视图
          options.setList([...options.getList()])
          return
        }

        const map = new Map(siblings.map((s) => [String(s.id), s]))
        const reordered = orderedIds.map((id) => map.get(id)!).filter(Boolean)
        if (reordered.length !== siblings.length) {
          options.setList([...options.getList()])
          return
        }

        siblings.splice(0, siblings.length, ...reordered)
        siblings.forEach((item, idx) => {
          item.sort = idx + 1
        })

        const moved = map.get(draggedId)
        options.setList([...options.getList()])
        if (moved) {
          Promise.resolve(options.onSorted(siblings, moved)).catch(() => {
            /* 由业务侧提示 */
          })
        }
      },
    })
  }

  return { init, destroy }
}
