<template>
  <teleport to="body">
    <div
      v-show="visible"
      class="br-resize-handle"
      :class="{ 'is-dragging': resizing }"
      :style="resizeHandleStyle"
      title="拖动调整宽度"
      @mousedown.prevent="onResizeStart"
    />
  </teleport>

  <el-drawer
    v-model="visible"
    append-to-body
    class="br-drawer"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    destroy-on-close
    :modal="false"
    modal-class="br-drawer-mask"
    :size="`${drawerWidth}px`"
    title="批量报工"
    @closed="onClosed"
    @opened="onOpened"
  >
    <template #header>
      <div class="br-drawer__head">
        <div>
          <h2>批量报工</h2>
          <p>点左侧派工单即可切换本侧数据 · 左缘拖拽调宽</p>
        </div>
        <div v-if="prep?.wtNo" class="br-drawer__wt">
          <span class="label">派工单</span>
          <strong>{{ prep.wtNo }}</strong>
          <el-tag v-if="wtInfo?.cFlag" effect="plain" size="small">{{ wtInfo.cFlag }}</el-tag>
        </div>
      </div>
    </template>

    <div v-loading="loading" class="br-body">
      <section v-if="prep" class="br-kpi">
        <article v-for="k in kpiCards" :key="k.key" class="br-kpi__card" :class="`br-kpi__card--${k.key}`">
          <em>{{ k.label }}</em>
          <strong>{{ k.value }}</strong>
        </article>
      </section>

      <div v-if="prep?.items.length" class="br-toolbar">
        <el-checkbox v-model="allSelected" :indeterminate="indeterminate" @change="toggleAll">全选工序</el-checkbox>
        <el-button plain size="small" type="primary" @click="fillAllPending">全部报满待报量</el-button>
        <el-button plain size="small" @click="expandAll">展开全部人员</el-button>
        <el-button plain size="small" @click="collapseAll">收起全部</el-button>
      </div>

      <div v-if="prep?.items.length" class="br-list">
        <article
          v-for="row in prep.items"
          :key="row.itemKey"
          class="br-item"
          :class="{ 'is-selected': row.selected, 'is-expanded': row.expanded }"
        >
          <header class="br-item__head" @click="row.expanded = !row.expanded">
            <el-checkbox v-model="row.selected" @change="syncItemSelection(row)" @click.stop />
            <div class="br-item__title">
              <span class="code">{{ row.prcCode }}</span>
              <strong>{{ row.prcName }}</strong>
              <el-tag effect="plain" size="small" type="info">{{ row.pWageType || '计件' }}</el-tag>
            </div>
            <div class="br-item__chips">
              <span>{{ row.goodsName || row.goodsCode }}</span>
              <span>工单 {{ row.woNo }}</span>
            </div>
            <div class="br-item__nums">
              <div>
                <em>派工</em>
                <b>{{ fmt(row.wtQty) }}</b>
              </div>
              <div>
                <em>已报</em>
                <b>{{ fmt(row.fnQty) }}</b>
              </div>
              <div class="is-pending">
                <em>待报</em>
                <b>{{ fmt(row.pendingQty) }}</b>
              </div>
              <div>
                <em>单价</em>
                <b>¥{{ fmtMoney(row.machiningUp) }}</b>
              </div>
              <div>
                <em>加工金额</em>
                <b>¥{{ fmtMoney(row.machiningAmt) }}</b>
              </div>
              <div class="is-amt">
                <em>本次金额</em>
                <b>¥{{ fmtMoney(itemReportAmt(row)) }}</b>
              </div>
            </div>
            <el-icon class="br-item__chev"><arrow-down /></el-icon>
          </header>

          <div v-show="row.expanded" class="br-item__workers">
            <el-table border :data="row.workers" size="small">
              <el-table-column align="center" width="44">
                <template #default="{ row: w }">
                  <el-checkbox v-model="w.selected" @change="onWorkerToggle(row)" />
                </template>
              </el-table-column>
              <el-table-column label="工号" min-width="100" prop="empNo" />
              <el-table-column label="姓名" min-width="90" prop="empName" />
              <el-table-column label="部门" min-width="110" prop="deptName" show-overflow-tooltip />
              <el-table-column align="right" label="计划" min-width="72">
                <template #default="{ row: w }">{{ fmt(w.planQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="已报" min-width="72">
                <template #default="{ row: w }">{{ fmt(w.fnQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="待报" min-width="72">
                <template #default="{ row: w }">
                  <span class="br-pending">{{ fmt(w.pendingQty) }}</span>
                </template>
              </el-table-column>
              <el-table-column align="right" label="单价" min-width="88">
                <template #default="{ row: w }">¥{{ fmtMoney(w.machiningUp) }}</template>
              </el-table-column>
              <el-table-column align="center" label="本次报工" min-width="120">
                <template #default="{ row: w }">
                  <el-input-number
                    v-model="w.reportQty"
                    :controls="false"
                    :max="w.pendingQty"
                    :min="0"
                    :precision="2"
                    size="small"
                    @change="onQtyChange(w)"
                  />
                </template>
              </el-table-column>
              <el-table-column align="right" label="本次金额" min-width="100">
                <template #default="{ row: w }">
                  <strong class="br-amt">¥{{ fmtMoney(w.reportAmt) }}</strong>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </article>
      </div>

      <el-empty v-else-if="!loading" description="该派工单暂无待报工序或人员" />
    </div>

    <template #footer>
      <div class="br-foot">
        <div class="br-foot__sum">
          <span>已选 <b>{{ selectedWorkerCount }}</b> 人</span>
          <span>报工量 <b>{{ fmt(totals.qty) }}</b></span>
          <span class="is-amt">预估金额 <b>¥{{ fmtMoney(totals.amt) }}</b></span>
        </div>
        <div class="br-foot__actions">
          <el-button :disabled="submitting" @click="visible = false">取消</el-button>
          <el-button :disabled="!selectedWorkerCount" plain type="warning" @click="fillAllPending">报满待报</el-button>
          <el-button
            :disabled="!selectedWorkerCount"
            :loading="submitting"
            type="success"
            @click="submitBatch"
          >
            提交批量报工（{{ selectedWorkerCount }}）
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ArrowDown } from '@element-plus/icons-vue'
import type { BatchReportItemRow, BatchReportPrep, BatchReportWorkerRow, DispatchReportPayload } from '/@/api/procurement/workReport'
import { getBatchReportPrep, submitDispatchReportBatch, validateDispatchReport } from '/@/api/procurement/workReport'
import { $baseMessage } from '/@/hooks'

const props = defineProps<{
  modelValue: boolean
  wtNo?: string
  wtInfo?: Record<string, any> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const submitting = ref(false)
const prep = ref<BatchReportPrep | null>(null)

const DRAWER_MIN = 360
const DRAWER_MAX = 900
const DRAWER_DEFAULT = 480
const drawerWidth = ref(DRAWER_DEFAULT)
const resizing = ref(false)
const resizeStartX = ref(0)
const resizeStartW = ref(DRAWER_DEFAULT)

const resizeHandleStyle = computed(() => ({
  right: `${Math.max(0, drawerWidth.value - 3)}px`,
}))

const clampDrawerWidth = (w: number) => {
  const max = Math.min(DRAWER_MAX, Math.floor(window.innerWidth * 0.72))
  return Math.max(DRAWER_MIN, Math.min(max, Math.round(w)))
}

const onResizeMove = (e: MouseEvent) => {
  if (!resizing.value) return
  const dx = resizeStartX.value - e.clientX
  drawerWidth.value = clampDrawerWidth(resizeStartW.value + dx)
}

const onResizeEnd = () => {
  if (!resizing.value) return
  resizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

const onResizeStart = (e: MouseEvent) => {
  resizing.value = true
  resizeStartX.value = e.clientX
  resizeStartW.value = drawerWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

onBeforeUnmount(() => onResizeEnd())

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const fmt = (v: unknown, digits = 2) => {
  const n = num(v)
  if (!n) return v == null || v === '' ? '0' : '0'
  return Number(n.toFixed(digits)).toString()
}

const fmtMoney = (v: unknown) => fmt(v, 2)

const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const onQtyChange = (w: BatchReportWorkerRow) => {
  const qty = Math.max(0, Math.min(num(w.pendingQty), num(w.reportQty)))
  w.reportQty = qty
  w.passQty = qty
  w.defectQty = 0
  w.reworkQty = 0
  w.reportAmt = qty * num(w.machiningUp)
  w.selected = qty > 0
}

const itemReportAmt = (row: BatchReportItemRow) =>
  row.workers.filter((w) => w.selected && num(w.reportQty) > 0).reduce((s, w) => s + num(w.reportAmt), 0)

const totals = computed(() => {
  let qty = 0
  let amt = 0
  for (const row of prep.value?.items || []) {
    for (const w of row.workers) {
      if (!w.selected || num(w.reportQty) <= 0) continue
      qty += num(w.reportQty)
      amt += num(w.reportAmt)
    }
  }
  return { qty, amt }
})

const selectedWorkerCount = computed(() => {
  let n = 0
  for (const row of prep.value?.items || []) {
    n += row.workers.filter((w) => w.selected && num(w.reportQty) > 0).length
  }
  return n
})

const kpiCards = computed(() => [
  { key: 'items', label: '待报工序', value: prep.value?.pendingItemCount ?? 0 },
  { key: 'qty', label: '待报数量', value: fmt(prep.value?.totalPendingQty) },
  { key: 'amt', label: '单据加工金额', value: `¥${fmtMoney(prep.value?.totalReportAmt)}` },
  { key: 'sel', label: '本次提交', value: `${selectedWorkerCount.value} 人` },
])

const allSelected = computed({
  get: () => Boolean(prep.value?.items.length && prep.value.items.every((r) => r.selected)),
  set: () => {},
})

const indeterminate = computed(() => {
  const items = prep.value?.items || []
  if (!items.length) return false
  const sel = items.filter((r) => r.selected).length
  return sel > 0 && sel < items.length
})

const toggleAll = (val: boolean | string | number) => {
  const on = Boolean(val)
  for (const row of prep.value?.items || []) {
    row.selected = on
    for (const w of row.workers) {
      w.selected = on && num(w.reportQty) > 0
    }
  }
}

const syncItemSelection = (row: BatchReportItemRow) => {
  for (const w of row.workers) {
    if (row.selected && num(w.reportQty) <= 0) {
      w.reportQty = w.pendingQty
      onQtyChange(w)
    }
    w.selected = row.selected && num(w.reportQty) > 0
  }
}

const onWorkerToggle = (row: BatchReportItemRow) => {
  row.selected = row.workers.some((w) => w.selected && num(w.reportQty) > 0)
}

const fillAllPending = () => {
  for (const row of prep.value?.items || []) {
    row.selected = true
    for (const w of row.workers) {
      w.reportQty = w.pendingQty
      onQtyChange(w)
      w.selected = w.pendingQty > 0
    }
  }
}

const expandAll = () => {
  for (const row of prep.value?.items || []) row.expanded = true
}

const collapseAll = () => {
  for (const row of prep.value?.items || []) row.expanded = false
}

const loadPrep = async () => {
  const wtNo = String(props.wtNo || '').trim()
  if (!wtNo) {
    prep.value = null
    return
  }
  loading.value = true
  try {
    prep.value = await getBatchReportPrep(wtNo, props.wtInfo || undefined)
    if (prep.value.items.length === 1) prep.value.items[0].expanded = true
  } catch (e: any) {
    prep.value = null
    $baseMessage(e?.message || '加载批量报工数据失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const buildPayloads = (): DispatchReportPayload[] => {
  const payloads: DispatchReportPayload[] = []
  const wtNo = prep.value?.wtNo || props.wtNo || ''
  for (const row of prep.value?.items || []) {
    if (!row.selected) continue
    for (const w of row.workers) {
      if (!w.selected || num(w.reportQty) <= 0) continue
      const payload: DispatchReportPayload = {
        wtNo,
        woNo: row.woNo,
        moNo: row.moNo,
        goodsName: row.goodsName,
        prcCode: row.prcCode,
        prcName: row.prcName,
        empNo: w.empNo,
        empName: w.empName,
        pendingQty: w.pendingQty,
        reportQty: num(w.reportQty),
        passQty: num(w.passQty),
        defectQty: num(w.defectQty),
        reworkQty: num(w.reworkQty),
        reportTime: nowStr(),
        reportMethod: '批量报工',
      }
      const err = validateDispatchReport(payload)
      if (!err) payloads.push(payload)
    }
  }
  return payloads
}

const submitBatch = async () => {
  const payloads = buildPayloads()
  if (!payloads.length) {
    $baseMessage('请勾选工序并填写报工数量', 'warning', 'hey')
    return
  }
  submitting.value = true
  try {
    const res = await submitDispatchReportBatch({ payloads })
    if (res.failCount > 0) {
      const first = res.errors?.[0]?.message
      $baseMessage(`部分失败：成功 ${res.successCount}，失败 ${res.failCount}${first ? `（${first}）` : ''}`, 'warning', 'hey')
    } else {
      $baseMessage(`批量报工成功：${res.successCount} 人`, 'success', 'hey')
    }
    emit('success')
    visible.value = false
  } catch (e: any) {
    $baseMessage(e?.message || '批量报工失败', 'error', 'hey')
  } finally {
    submitting.value = false
  }
}

const onOpened = () => loadPrep()
const onClosed = () => {
  prep.value = null
  onResizeEnd()
}

watch(
  () => props.wtNo,
  (no, prev) => {
    if (!visible.value) return
    const next = String(no || '').trim()
    const before = String(prev || '').trim()
    if (!next || next === before) return
    loadPrep()
  }
)
</script>

<style lang="scss">
/* 非模态抽屉：容器全屏但需穿透，否则点不到左侧列表 */
.el-drawer__container:has(.br-drawer),
.br-drawer-mask {
  pointer-events: none !important;
  background: transparent !important;
}

.el-drawer.br-drawer {
  pointer-events: auto !important;
}
</style>

<style lang="scss" scoped>
.br-resize-handle {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 6px;
  z-index: 4001;
  cursor: col-resize;
  touch-action: none;
  pointer-events: auto;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 1px;
    width: 3px;
    height: 48px;
    margin-top: -24px;
    border-radius: 2px;
    background: rgb(26 111 181 / 28%);
    transition: background 0.15s ease, height 0.15s ease;
  }

  &:hover::after,
  &.is-dragging::after {
    height: 72px;
    margin-top: -36px;
    background: rgb(26 111 181 / 55%);
  }
}

.br-drawer {
  box-shadow: -8px 0 28px rgb(26 58 82 / 12%);

  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 14px 16px;
    border-bottom: 1px solid #e8eef5;
  }

  :deep(.el-drawer__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.el-drawer__footer) {
    padding: 10px 16px;
    border-top: 1px solid #e8eef5;
    background: #fafcff;
  }
}

.br-drawer__head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;

  h2 {
    margin: 0 0 4px;
    font-size: 17px;
    color: #1a3a52;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #7a8b9a;
  }
}

.br-drawer__wt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef6fc, #f8fbff);
  border: 1px solid #d4e6f5;
  align-self: flex-start;

  .label {
    font-size: 12px;
    color: #7a8b9a;
  }

  strong {
    font-size: 15px;
    color: #1a6fb5;
    font-variant-numeric: tabular-nums;
  }
}

.br-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px 16px;
  background: linear-gradient(180deg, #f4f8fc 0%, #f8fafc 120px, #fff 100%);
}

.br-kpi {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;

  &__card {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #e3ecf5;
    background: #fff;
    box-shadow: 0 4px 14px rgb(26 58 82 / 4%);

    em {
      display: block;
      font-style: normal;
      font-size: 11px;
      color: #7a8b9a;
      margin-bottom: 4px;
    }

    strong {
      font-size: 18px;
      color: #1a3a52;
      font-variant-numeric: tabular-nums;
    }

    &--amt strong,
    &--sel strong {
      color: #1a6fb5;
    }
  }
}

.br-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef5;
}

.br-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.br-item {
  border: 1px solid #e3ecf5;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &.is-selected {
    border-color: #9ec9eb;
    box-shadow: 0 4px 16px rgb(26 111 181 / 8%);
  }

  &__head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px 10px;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    background: linear-gradient(90deg, #fafcff, #fff);

    &:hover {
      background: linear-gradient(90deg, #f0f7fd, #fff);
    }
  }

  &__title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;

    .code {
      font-size: 11px;
      font-weight: 700;
      color: #1a6fb5;
      padding: 2px 6px;
      border-radius: 4px;
      background: #eef6fc;
    }

    strong {
      font-size: 13px;
      color: #1a3a52;
    }
  }

  &__chips {
    grid-column: 2 / -1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: #909399;
    min-width: 0;
  }

  &__nums {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 12px;
    font-variant-numeric: tabular-nums;

    div {
      text-align: left;
      min-width: 52px;
    }

    em {
      display: block;
      font-style: normal;
      font-size: 10px;
      color: #a0a8b3;
    }

    b {
      font-size: 12px;
      color: #303133;
    }

    .is-pending b {
      color: #e6a23c;
    }

    .is-amt b {
      color: #1a6fb5;
    }
  }

  &__chev {
    transition: transform 0.2s ease;
    color: #a0a8b3;
  }

  &.is-expanded &__chev {
    transform: rotate(180deg);
  }

  &__workers {
    padding: 0 10px 10px;
    border-top: 1px dashed #e8eef5;
    overflow-x: auto;
  }
}

.br-pending {
  color: #e6a23c;
  font-weight: 600;
}

.br-amt {
  color: #1a6fb5;
}

.br-foot {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;

  &__sum {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: #606266;

    b {
      color: #1a3a52;
      font-variant-numeric: tabular-nums;
    }

    .is-amt b {
      color: #1a6fb5;
      font-size: 15px;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
