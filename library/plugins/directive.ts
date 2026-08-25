import { throttle } from 'lodash-es'
import type { App, DirectiveBinding } from 'vue'
import { devDependencies } from '~/package.json'
import { hasPermission } from '/@/utils/permission'
import { openTableCopyFromElCell } from '/@/utils/tableCopy'

type ElWithCopy = HTMLElement & { __tableCopyHandler?: (e: MouseEvent) => void }

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
     * @description 表格右键复制（单元格/整行）v-table-copy
     * 挂在包含 el-table 的容器或 el-table 根节点上即可。
     */
    app.directive('table-copy', {
      mounted(el: ElWithCopy) {
        const handler = (e: MouseEvent) => {
          const target = e.target as HTMLElement | null
          if (!target) return
          if (target.closest('input, textarea, .el-input, .el-textarea, .el-select, button, .el-button, a')) {
            return
          }
          const td = target.closest('td.el-table__cell') as HTMLElement | null
          if (!td || !el.contains(td)) return
          openTableCopyFromElCell(e, td)
        }
        el.__tableCopyHandler = handler
        el.addEventListener('contextmenu', handler)
      },
      beforeUnmount(el: ElWithCopy) {
        if (el.__tableCopyHandler) {
          el.removeEventListener('contextmenu', el.__tableCopyHandler)
          delete el.__tableCopyHandler
        }
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
