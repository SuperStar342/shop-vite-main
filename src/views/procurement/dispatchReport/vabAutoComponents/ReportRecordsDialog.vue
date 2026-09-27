<template>
  <vab-dialog
    v-model="visible"
    append-to-body
    class="report-records-dialog"
    destroy-on-close
    :show-fullscreen="true"
    :style="dialogBoxStyle"
    title="报工记录"
    top="0"
    :width="`${dialogWidth}px`"
    @closed="onClosed"
    @opened="onOpened"
    @open="load"
  >
    <div ref="bodyRef" class="rrd-body">
      <div class="rrd-toolbar">
        <span>{{ subtitle }}</span>
        <el-button :icon="Refresh" link :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-table v-loading="loading" border :data="list" :max-height="tableMaxHeight">
        <el-table-column label="报工时间" min-width="150" prop="reportTime" />
        <el-table-column label="报工人" min-width="90" prop="reporter" />
        <el-table-column align="right" label="本次报工" min-width="80" prop="reportQty" />
        <el-table-column align="right" label="合格" min-width="64" prop="passQty" />
        <el-table-column align="right" label="不良" min-width="64" prop="defectQty" />
        <el-table-column align="right" label="返工" min-width="64" prop="reworkQty" />
        <el-table-column label="方式" min-width="90" prop="reportMethod" />
        <el-table-column label="备注" min-width="120" prop="remark" show-overflow-tooltip />
        <template #empty>
          <el-empty description="暂无报工记录" :image-size="72" />
        </template>
      </el-table>
    </div>
  </vab-dialog>

  <teleport to="body">
    <template v-if="visible && edgeReady && !fullscreen">
      <div
        v-for="edge in EDGE_KEYS"
        :key="edge"
        class="rrd-edge"
        :class="[`is-${edge}`, { 'is-dragging': resizing && resizeDir === edge }]"
        :style="edgeStyles[edge]"
        @mousedown.prevent="startResize(edge, $event)"
      />
    </template>
  </teleport>
</template>

<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'
import type { WorkReportRecord } from '/@/api/procurement/workReport'
import { getDispatchReportRecords } from '/@/api/procurement/workReport'

const MIN_W = 640
const MIN_H = 360
const DEFAULT_W = 860
const DEFAULT_H = 560
const EDGE = 6

type EdgeKey = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const EDGE_KEYS: EdgeKey[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const CURSOR: Record<EdgeKey, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
}

const props = defineProps<{
  modelValue: boolean
  wtNo?: string
  woNo?: string
  prcName?: string
  titleHint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const list = ref<WorkReportRecord[]>([])
const bodyRef = ref<HTMLElement | null>(null)
const tableMaxHeight = ref(420)
const edgeReady = ref(false)
const fullscreen = ref(false)

const dialogWidth = ref(DEFAULT_W)
const dialogHeight = ref(DEFAULT_H)
const dialogLeft = ref(0)
const dialogTop = ref(80)

const resizing = ref(false)
const resizeDir = ref<EdgeKey | ''>('')
const resizeStart = reactive({
  x: 0,
  y: 0,
  w: DEFAULT_W,
  h: DEFAULT_H,
  left: 0,
  top: 80,
})

const dialogBoxStyle = computed(() => ({
  '--rrd-dialog-height': `${dialogHeight.value}px`,
  marginTop: `${dialogTop.value}px`,
  marginLeft: `${dialogLeft.value}px`,
  marginBottom: '0',
  position: 'relative' as const,
}))

const edgeStyles = computed(() => {
  const l = dialogLeft.value
  const t = dialogTop.value
  const w = dialogWidth.value
  const h = dialogHeight.value
  const z = 4010
  return {
    n: { left: `${l + EDGE}px`, top: `${t - EDGE / 2}px`, width: `${w - EDGE * 2}px`, height: `${EDGE}px`, cursor: CURSOR.n, zIndex: z },
    s: { left: `${l + EDGE}px`, top: `${t + h - EDGE / 2}px`, width: `${w - EDGE * 2}px`, height: `${EDGE}px`, cursor: CURSOR.s, zIndex: z },
    e: { left: `${l + w - EDGE / 2}px`, top: `${t + EDGE}px`, width: `${EDGE}px`, height: `${h - EDGE * 2}px`, cursor: CURSOR.e, zIndex: z },
    w: { left: `${l - EDGE / 2}px`, top: `${t + EDGE}px`, width: `${EDGE}px`, height: `${h - EDGE * 2}px`, cursor: CURSOR.w, zIndex: z },
    nw: { left: `${l - EDGE / 2}px`, top: `${t - EDGE / 2}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor: CURSOR.nw, zIndex: z + 1 },
    ne: { left: `${l + w - EDGE}px`, top: `${t - EDGE / 2}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor: CURSOR.ne, zIndex: z + 1 },
    sw: { left: `${l - EDGE / 2}px`, top: `${t + h - EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor: CURSOR.sw, zIndex: z + 1 },
    se: { left: `${l + w - EDGE}px`, top: `${t + h - EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor: CURSOR.se, zIndex: z + 1 },
  } as Record<EdgeKey, Record<string, string | number>>
})

const subtitle = computed(
  () => props.titleHint || [props.wtNo, props.woNo, props.prcName].filter(Boolean).join(' · ') || '当前工序历史报工'
)

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const centerDialog = () => {
  dialogWidth.value = DEFAULT_W
  dialogHeight.value = DEFAULT_H
  dialogLeft.value = Math.max(12, Math.floor((window.innerWidth - DEFAULT_W) / 2))
  dialogTop.value = Math.max(24, Math.floor((window.innerHeight - DEFAULT_H) / 5))
}

const syncTableHeight = () => {
  const el = bodyRef.value
  if (!el) return
  tableMaxHeight.value = Math.max(180, el.clientHeight - 48)
}

const syncFullscreenFlag = () => {
  const dialogEl = document.querySelector('.report-records-dialog.el-dialog') as HTMLElement | null
  fullscreen.value = !!dialogEl?.classList.contains('is-fullscreen')
}

let ro: ResizeObserver | null = null
let fullscreenObserver: MutationObserver | null = null

const bindObservers = () => {
  ro?.disconnect()
  if (bodyRef.value) {
    ro = new ResizeObserver(() => syncTableHeight())
    ro.observe(bodyRef.value)
  }
  nextTick(syncTableHeight)

  fullscreenObserver?.disconnect()
  const dialogEl = document.querySelector('.report-records-dialog.el-dialog')
  if (dialogEl) {
    fullscreenObserver = new MutationObserver(() => {
      syncFullscreenFlag()
      nextTick(syncTableHeight)
    })
    fullscreenObserver.observe(dialogEl, { attributes: true, attributeFilter: ['class'] })
    syncFullscreenFlag()
  }
}

const onOpened = () => {
  edgeReady.value = true
  nextTick(bindObservers)
}

watch(visible, (open) => {
  if (open) {
    centerDialog()
  } else {
    edgeReady.value = false
    fullscreen.value = false
    ro?.disconnect()
    ro = null
    fullscreenObserver?.disconnect()
    fullscreenObserver = null
  }
})

watch(dialogHeight, () => nextTick(syncTableHeight))

const onResizeMove = (e: MouseEvent) => {
  if (!resizing.value || !resizeDir.value) return
  const dir = resizeDir.value
  const dx = e.clientX - resizeStart.x
  const dy = e.clientY - resizeStart.y
  const maxW = Math.floor(window.innerWidth - 16)
  const maxH = Math.floor(window.innerHeight - 16)

  let w = resizeStart.w
  let h = resizeStart.h
  let left = resizeStart.left
  let top = resizeStart.top

  if (dir.includes('e')) w = clamp(resizeStart.w + dx, MIN_W, maxW - left)
  if (dir.includes('s')) h = clamp(resizeStart.h + dy, MIN_H, maxH - top)
  if (dir.includes('w')) {
    const nextW = clamp(resizeStart.w - dx, MIN_W, resizeStart.w + resizeStart.left - 8)
    left = resizeStart.left + (resizeStart.w - nextW)
    w = nextW
  }
  if (dir.includes('n')) {
    const nextH = clamp(resizeStart.h - dy, MIN_H, resizeStart.h + resizeStart.top - 8)
    top = resizeStart.top + (resizeStart.h - nextH)
    h = nextH
  }

  dialogWidth.value = w
  dialogHeight.value = h
  dialogLeft.value = left
  dialogTop.value = top
}

const stopResize = () => {
  if (!resizing.value) return
  resizing.value = false
  resizeDir.value = ''
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
}

const startResize = (dir: EdgeKey, e: MouseEvent) => {
  if (fullscreen.value) return
  resizing.value = true
  resizeDir.value = dir
  resizeStart.x = e.clientX
  resizeStart.y = e.clientY
  resizeStart.w = dialogWidth.value
  resizeStart.h = dialogHeight.value
  resizeStart.left = dialogLeft.value
  resizeStart.top = dialogTop.value
  document.body.style.cursor = CURSOR[dir]
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
}

const load = async () => {
  loading.value = true
  try {
    const { data } = await getDispatchReportRecords({
      wtNo: props.wtNo,
      woNo: props.woNo,
      prcName: props.prcName,
    })
    list.value = data.list || []
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || '加载报工记录失败', 'error', 'hey')
  } finally {
    loading.value = false
    nextTick(syncTableHeight)
  }
}

const onClosed = () => {
  stopResize()
  centerDialog()
  edgeReady.value = false
  fullscreen.value = false
  ro?.disconnect()
  ro = null
  fullscreenObserver?.disconnect()
  fullscreenObserver = null
}

onBeforeUnmount(() => {
  stopResize()
  ro?.disconnect()
  fullscreenObserver?.disconnect()
})
</script>

<style lang="scss">
.report-records-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  max-width: 96vw;
  height: var(--rrd-dialog-height, 560px);
  max-height: 92vh;
  margin-right: auto !important;
  margin-bottom: 0 !important;

  .el-dialog__body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &.is-fullscreen {
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    --rrd-dialog-height: 100vh;

    .el-dialog__body {
      height: calc(100vh - 54px);
    }
  }
}

.rrd-edge {
  position: fixed;
  background: transparent;
  touch-action: none;

  &:hover,
  &.is-dragging {
    background: rgba(64, 158, 255, 0.18);
  }
}
</style>

<style lang="scss" scoped>
.rrd-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.rrd-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}
</style>
