import type { Ref } from 'vue'

/**
 * VTable 在 flex 布局下偶发高度为 0 / 仅一小块：
 * - 初始化时父容器尚未结算
 * - keep-alive 切回
 * - 窄屏 auto-height-container 变为 height:auto
 * 用像素高度 + ResizeObserver 强制同步。
 *
 * 注意：切勿用 minHeight 去抬高已测量到的较小容器高度（分栏场景会撑破布局，导致首次无法完整渲染）。
 */
export function useVTableLayout(tableRef: Ref<any>, wrapperRef: Ref<HTMLElement | null | undefined>, options?: { minHeight?: number }) {
  const minHeight = options?.minHeight ?? 320
  const tableHeight = ref(minHeight)

  const forceResize = () => {
    try {
      const inst = tableRef.value?.vTableInstance
      if (!inst) return
      inst.resize?.()
    } catch {
      /* ignore */
    }
  }

  const syncSize = (delay = 0) => {
    const run = () => {
      const el = wrapperRef.value
      if (!el) return
      const h = Math.floor(el.clientHeight)
      // 容器已结算时严格跟随实际高度；未结算时才用 minHeight 兜底
      const next = h > 0 ? h : minHeight
      if (next !== tableHeight.value) {
        tableHeight.value = next
      }
      nextTick(() => {
        forceResize()
        requestAnimationFrame(() => forceResize())
      })
    }
    if (delay > 0) {
      setTimeout(() => nextTick(run), delay)
    } else {
      nextTick(run)
    }
  }

  const handleTableReady = () => {
    // 多拍几次，覆盖 flex / keep-alive / 字体加载 / 数据回填后的二次布局
    ;[0, 50, 120, 240, 400].forEach((ms) => syncSize(ms))
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const bind = () => {
      const el = wrapperRef.value
      if (!el || resizeObserver) return
      resizeObserver = new ResizeObserver(() => syncSize())
      resizeObserver.observe(el)
    }
    bind()
    // ref 偶发晚于 onMounted 就绪
    nextTick(bind)
    handleTableReady()
  })

  watch(
    () => wrapperRef.value,
    (el, prev) => {
      if (el === prev) return
      resizeObserver?.disconnect()
      resizeObserver = null
      if (el) {
        resizeObserver = new ResizeObserver(() => syncSize())
        resizeObserver.observe(el)
        handleTableReady()
      }
    }
  )

  onActivated(() => {
    handleTableReady()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    tableHeight,
    syncSize,
    handleTableReady,
  }
}
