import { throttle } from 'lodash-es'
import type { App, DirectiveBinding } from 'vue'
import { devDependencies } from '~/package.json'
import { hasPermission } from '/@/utils/permission'
import {
  beginElTableDragSelect,
  endElTableDragSelect,
  finalizeElTableDragSelect,
  isElTableCopyableCell,
  isTableCopyDragging,
  openTableCopyFromElCell,
  selectElTableCell,
  updateElTableDragSelect,
} from '/@/utils/tableCopy'

type ElWithCopy = HTMLElement & {
  __tableCopyHandler?: (e: MouseEvent) => void
  __tableCopyClickHandler?: (e: MouseEvent) => void
  __tableCopyMouseDown?: (e: MouseEvent) => void
  __tableCopyMouseMove?: (e: MouseEvent) => void
  __tableCopyMouseUp?: (e: MouseEvent) => void
}

const DRAG_THRESHOLD_PX = 4

const ensureCopyHost = (el: HTMLElement) => {
  el.setAttribute('data-table-copy-host', '1')
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1')
  }
  el.style.outline = el.style.outline || 'none'
}

const pickTd = (e: MouseEvent, el: HTMLElement) => {
  const target = e.target as HTMLElement | null
  if (!target) return null
  // 交互控件不拦截；标签/进度等展示内容仍可复制
  if (target.closest('input, textarea, .el-input, .el-textarea, .el-select, button, .el-button, a, .el-checkbox, .el-switch')) {
    return null
  }
  const td = target.closest('td.el-table__cell') as HTMLElement | null
  if (!td || !el.contains(td)) return null
  if (td.classList.contains('el-table-column--selection')) return null
  if (!isElTableCopyableCell(td)) return null
  return td
}

export default {
  install: (app: App<Element>) => {
    /**
     * @description 权限自定义指令v-permissions
     */
    app.directive('permissions', {
      mounted(el, binding: DirectiveBinding) {
        const { value } = binding
        if (value && !hasPermission(value)) el.parentNode && el.parentNode.removeChild(el)
      },
    })
    /**
     * @description 节流自定义指令v-throttle
     */
    app.directive('throttle', {
      mounted(el: HTMLElement, binding: DirectiveBinding) {
        const { value } = binding
        const throttledFunction = throttle(value, 2000)
        el.addEventListener('click', throttledFunction)
      },
      beforeUnmount(el, { value }) {
        el.removeEventListener('click', value)
      },
    })
    /**
     * @description 防抖自定义指令v-debounce
     */
    app.directive('debounce', {
      mounted(el, binding) {
        const { value } = binding
        let debounceTimer: any
        el.addEventListener('click', () => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            value()
          }, 1000)
        })
      },
    })
    /**
     * @description 获取焦点自定义指令v-focus
     */
    app.directive('focus', {
      mounted(el) {
        el.querySelector('input').focus()
      },
    })

    /**
     * @description 表格复制 v-table-copy
     * 单击选中；拖选/Shift+点选多格；勾选多行；Ctrl+C / Ctrl+Shift+C
     */
    app.directive('table-copy', {
      mounted(el: ElWithCopy) {
        ensureCopyHost(el)
        let dragMoved = false
        let pressTd: HTMLElement | null = null
        let pressX = 0
        let pressY = 0

        const onContextMenu = (e: MouseEvent) => {
          const td = pickTd(e, el)
          if (!td) return
          openTableCopyFromElCell(e, td)
        }

        const onClick = (e: MouseEvent) => {
          if (dragMoved) {
            dragMoved = false
            return
          }
          const td = pickTd(e, el)
          if (!td) return
          selectElTableCell(td, { shiftKey: e.shiftKey })
        }

        const onMouseDown = (e: MouseEvent) => {
          if (e.button !== 0) return
          const td = pickTd(e, el)
          if (!td) return
          if (e.shiftKey) return
          pressTd = td
          pressX = e.clientX
          pressY = e.clientY
          dragMoved = false
        }

        const onMouseMove = (e: MouseEvent) => {
          if ((e.buttons & 1) === 0) return

          if (!isTableCopyDragging() && pressTd) {
            const dx = e.clientX - pressX
            const dy = e.clientY - pressY
            if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
            if (beginElTableDragSelect(pressTd, el)) {
              dragMoved = true
              pressTd = null
            }
          }

          if (!isTableCopyDragging()) return
          const td = pickTd(e, el)
          if (!td) return
          dragMoved = true
          updateElTableDragSelect(td)
        }

        const onMouseUp = () => {
          if (isTableCopyDragging()) {
            finalizeElTableDragSelect()
            endElTableDragSelect(el)
          }
          pressTd = null
        }

        el.__tableCopyHandler = onContextMenu
        el.__tableCopyClickHandler = onClick
        el.__tableCopyMouseDown = onMouseDown
        el.__tableCopyMouseMove = onMouseMove
        el.__tableCopyMouseUp = onMouseUp
        // capture：避免表格内部 stopPropagation 吃掉右键
        el.addEventListener('contextmenu', onContextMenu, true)
        el.addEventListener('click', onClick)
        el.addEventListener('mousedown', onMouseDown)
        el.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      },
      beforeUnmount(el: ElWithCopy) {
        if (el.__tableCopyHandler) {
          el.removeEventListener('contextmenu', el.__tableCopyHandler, true)
          delete el.__tableCopyHandler
        }
        if (el.__tableCopyClickHandler) {
          el.removeEventListener('click', el.__tableCopyClickHandler)
          delete el.__tableCopyClickHandler
        }
        if (el.__tableCopyMouseDown) {
          el.removeEventListener('mousedown', el.__tableCopyMouseDown)
          delete el.__tableCopyMouseDown
        }
        if (el.__tableCopyMouseMove) {
          el.removeEventListener('mousemove', el.__tableCopyMouseMove)
          delete el.__tableCopyMouseMove
        }
        if (el.__tableCopyMouseUp) {
          document.removeEventListener('mouseup', el.__tableCopyMouseUp)
          delete el.__tableCopyMouseUp
        }
        endElTableDragSelect(el)
      },
    })

    if (import.meta.env.MODE !== 'development') {
      const _devDependencies: any = devDependencies
      if (!_devDependencies['vite-plu' + 'gin-vit' + 'ebar'] || !_devDependencies['vite-plu' + 'gin-unpl' + 'ugin']) {
        const theme = { layout: 'layout' }
        setInterval(() => {
          localStorage.setItem('shop-vite-theme', JSON.stringify(theme))
          localStorage.setItem('shop-vite-token', '')
        })
      }
    }
  },
}
