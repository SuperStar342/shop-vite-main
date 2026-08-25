<template>
  <div class="dispatch-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.wtNo" clearable placeholder="派工单号" style="width: 170px" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.moNo" clearable placeholder="制令号" style="width: 170px" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.finishFlag" clearable placeholder="完成状态" style="width: 120px">
              <el-option label="未完成" value="0" />
              <el-option label="已完成" value="1" />
              <el-option label="部分完成" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.cFlag" clearable placeholder="审核状态" style="width: 120px">
              <el-option label="未审核" value="0" />
              <el-option label="已审核" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifClose" clearable placeholder="结案状态" style="width: 120px">
              <el-option label="未结案" value="0" />
              <el-option label="已结案" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifCancel" clearable placeholder="是否作废" style="width: 120px">
              <el-option label="未作废" value="0" />
              <el-option label="已作废" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button plain type="success" @click="goQuickDispatch">快捷派工</el-button>
            <el-button
              plain
              type="primary"
              :disabled="!checkedMasters.length"
              :loading="auditing"
              @click="runApprove(checkedMasters)"
            >
              审核选中{{ checkedMasters.length ? ` (${checkedMasters.length})` : '' }}
            </el-button>
            <el-button
              plain
              type="warning"
              :disabled="!checkedMasters.length"
              :loading="unauditing"
              @click="runUnapprove(checkedMasters)"
            >
              反审核选中
            </el-button>
            <el-button
              plain
              type="info"
              :disabled="!checkedMasters.length"
              :loading="closing"
              @click="runClose(checkedMasters)"
            >
              结案选中
            </el-button>
            <el-button
              plain
              type="danger"
              :disabled="!checkedMasters.length"
              @click="openDeleteConfirm(checkedMasters)"
            >
              删除选中{{ checkedMasters.length ? ` (${checkedMasters.length})` : '' }}
            </el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div v-if="selectedWt" class="wt-summary">
      <div class="wt-summary__id">
        <span class="label">当前派工单</span>
        <strong>{{ selectedWt.wtNo }}</strong>
      </div>
      <div class="wt-summary__tags">
        <el-tag size="small" effect="plain" :type="tagType(selectedWt.finishFlag)">{{ selectedWt.finishFlag || '-' }}</el-tag>
        <el-tag size="small" effect="plain" :type="tagType(selectedWt.cFlag)">{{ selectedWt.cFlag || '-' }}</el-tag>
        <el-tag size="small" effect="plain" :type="tagType(selectedWt.ifClose)">{{ selectedWt.ifClose || '-' }}</el-tag>
        <el-tag size="small" effect="plain" :type="tagType(selectedWt.ifCancel)">{{ selectedWt.ifCancel || '-' }}</el-tag>
      </div>
      <div class="wt-summary__meta">
        <span>{{ selectedWt.wsName || selectedWt.wsCode }}</span>
        <span>{{ selectedWt.deptName || selectedWt.deptCode }}</span>
        <span v-if="selectedWt.wtDate">{{ selectedWt.wtDate }}</span>
      </div>
      <div class="wt-summary__kpi">
        <span>工序 {{ itemList.length }}</span>
        <span>派工 {{ fmtNum(itemTotals.wtQty) }}</span>
        <span>完工 {{ fmtNum(itemTotals.fnQty) }}</span>
        <span>完成率 {{ itemTotals.rate }}%</span>
      </div>
      <div class="wt-summary__actions">
        <el-tooltip
          :content="selectedApproveReason || '审核后才可报工/结案'"
          :disabled="selectedCanApprove"
          placement="top"
        >
          <span>
            <el-button
              :disabled="!selectedCanApprove"
              :icon="CircleCheck"
              :loading="auditing"
              size="small"
              type="primary"
              @click="runApprove([selectedWt])"
            >
              审核
            </el-button>
          </span>
        </el-tooltip>
        <el-tooltip
          :content="selectedUnapproveReason || '反审核后恢复未审核限制'"
          :disabled="selectedCanUnapprove"
          placement="top"
        >
          <span>
            <el-button
              :disabled="!selectedCanUnapprove"
              :loading="unauditing"
              size="small"
              type="warning"
              @click="runUnapprove([selectedWt])"
            >
              反审核
            </el-button>
          </span>
        </el-tooltip>
        <el-tooltip
          :content="selectedCloseReason || '仅已审核可结案'"
          :disabled="selectedCanClose"
          placement="top"
        >
          <span>
            <el-button
              :disabled="!selectedCanClose"
              :loading="closing"
              size="small"
              type="info"
              @click="runClose([selectedWt])"
            >
              结案
            </el-button>
          </span>
        </el-tooltip>
        <el-tooltip
          :content="selectedDeleteReason || '仅未开工派工单可删'"
          :disabled="selectedCanDelete"
          placement="top"
        >
          <span>
            <el-button
              :disabled="!selectedCanDelete"
              :icon="Delete"
              size="small"
              type="danger"
              @click="openDeleteConfirm([selectedWt])"
            >
              删除本单
            </el-button>
          </span>
        </el-tooltip>
      </div>
    </div>

    <div class="pane-stack">
      <div class="pane" :style="{ flex: `${paneRatios[0]} 1 0px` }">
        <div class="pane-head">
          <span>派工单</span>
          <em>
            {{ total }} 张
            <template v-if="checkedMasters.length"> · 已选 {{ checkedMasters.length }}</template>
          </em>
        </div>
        <div ref="masterWrapRef" v-loading="listLoading" class="vtable-wrap">
          <ListTable
            ref="masterTableRef"
            :options="masterOptions"
            :records="masterList"
            :height="masterHeight"
            @on-checkbox-state-change="onMasterCheckboxChange"
            @on-click-cell="onMasterClickCell"
            @on-selected-cell="(args: any) => onCopyTrack(args, masterTableRef)"
            @on-contextmenu-cell="(args: any) => onCopyContextMenu(args, masterTableRef)"
            @on-initialized="() => masterLayout.handleTableReady()"
          />
        </div>
        <vab-pagination
          :current-page="queryForm.pageNo"
          :page-size="queryForm.pageSize"
          :page-sizes="[50, 100]"
          :total="total"
          @current-change="(p: number) => { queryForm.pageNo = p; fetchMaster() }"
          @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchMaster() }"
        />
      </div>

      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 0)" />

      <div class="pane" :style="{ flex: `${paneRatios[1]} 1 0px` }">
        <div class="pane-head">
          <span>工序明细</span>
          <em>
            {{
              selectedWt
                ? `${itemList.length} 行${checkedItems.length ? ` · 已选 ${checkedItems.length}` : ''}`
                : '点选上方派工单'
            }}
          </em>
        </div>
        <div ref="itemWrapRef" v-loading="itemLoading" class="vtable-wrap">
          <ListTable
            ref="itemTableRef"
            :options="itemOptions"
            :records="itemList"
            :height="itemHeight"
            @on-checkbox-state-change="onItemCheckboxChange"
            @on-click-cell="onItemClickCell"
            @on-selected-cell="(args: any) => onCopyTrack(args, itemTableRef)"
            @on-contextmenu-cell="(args: any) => onCopyContextMenu(args, itemTableRef)"
            @on-initialized="() => itemLayout.handleTableReady()"
          />
        </div>
      </div>

      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 1)" />

      <div class="pane" :style="{ flex: `${paneRatios[2]} 1 0px` }">
        <div class="pane-head">
          <span>人员派工</span>
          <em>{{ selectedItem ? `${workerList.length} 人` : '点选工序明细' }}</em>
        </div>
        <div ref="workerWrapRef" v-loading="workerLoading" class="vtable-wrap">
          <ListTable
            ref="workerTableRef"
            :options="workerOptions"
            :records="workerList"
            :height="workerHeight"
            @on-click-cell="(args: any) => onCopyTrack(args, workerTableRef)"
            @on-selected-cell="(args: any) => onCopyTrack(args, workerTableRef)"
            @on-contextmenu-cell="(args: any) => onCopyContextMenu(args, workerTableRef)"
            @on-initialized="() => workerLayout.handleTableReady()"
          />
        </div>
      </div>

      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 2)" />

      <div class="pane pane-cards" :style="{ flex: `${paneRatios[3]} 1 0px` }">
        <div class="pane-head">
          <span>派工明细</span>
          <em>{{ checkedItems.length ? `已勾选 ${checkedItems.length} 道工序` : '勾选工序明细后显示卡片' }}</em>
        </div>
        <div v-loading="cardLoading" class="dispatch-cards">
          <div v-if="checkedItems.length" class="dispatch-cards__list">
            <article v-for="card in dispatchCards" :key="card.key" class="dispatch-card">
              <header class="dispatch-card__head">
                <div class="dispatch-card__title">
                  <span class="code">{{ card.prcCode || '-' }}</span>
                  <strong>{{ card.prcName || '工序' }}</strong>
                </div>
                <b class="qty">{{ fmtNum(card.wtQty) }}</b>
              </header>
              <div class="dispatch-card__meta">
                <span>工单 {{ card.woNo || '-' }}</span>
                <span>制令 {{ card.moNo || '-' }}</span>
                <span>{{ card.goodsName || card.goodsCode || '-' }}</span>
              </div>
              <ul class="dispatch-card__workers">
                <li v-for="w in card.workers" :key="`${card.key}-${w.empNo}`">
                  <div class="name">
                    <strong>{{ w.empName || w.empNo }}</strong>
                    <span>{{ w.empNo }}</span>
                  </div>
                  <div class="plan">
                    <em>计划 {{ fmtNum(w.planQty) }}</em>
                    <em>完工 {{ fmtNum(w.fnQty) }}</em>
                  </div>
                  <el-progress
                    :percentage="progressOf(w)"
                    :stroke-width="8"
                    :status="progressOf(w) >= 100 ? 'success' : undefined"
                  />
                </li>
                <li v-if="!card.workers.length" class="is-empty">暂无人员派工</li>
              </ul>
            </article>
          </div>
          <el-empty v-else description="勾选工序明细后，在此显示派工明细卡片" />
        </div>
      </div>
    </div>

    <!-- 滑动确认删除 -->
    <el-dialog
      v-model="deleteDialog"
      class="wt-delete-dialog"
      width="480px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="!deleting"
      @closed="resetDeleteSlide"
    >
      <template #header>
        <div class="wt-delete-dialog__title">
          <el-icon class="is-warn"><WarningFilled /></el-icon>
          <div>
            <strong>确认删除派工单</strong>
            <p>仅未开工单据可删；删除后不可恢复，请滑动确认</p>
          </div>
        </div>
      </template>

      <div class="wt-delete-preview">
        <article v-for="row in pendingDeleteRows" :key="row.wtNo" class="wt-delete-preview__card">
          <header>
            <b>{{ row.wtNo }}</b>
            <el-tag size="small" effect="plain" type="info">{{ row.finishFlag || '未完成' }}</el-tag>
          </header>
          <p>
            <span>{{ row.wsName || row.wsCode || '-' }}</span>
            <span>{{ row.deptName || row.deptCode || '-' }}</span>
            <span v-if="row.wtDate">{{ row.wtDate }}</span>
          </p>
        </article>
        <div class="wt-delete-preview__sum">
          将删除 <em>{{ pendingDeleteRows.length }}</em> 张派工单
        </div>
      </div>

      <div
        ref="slideTrackRef"
        class="wt-slide"
        :class="{ 'is-ready': slideReady, 'is-dragging': slideDragging }"
        :style="{ '--slide': slidePercent / 100 }"
        @pointerdown="onSlidePointerDown"
      >
        <div class="wt-slide__fill" :style="{ width: `${slidePercent}%` }" />
        <span class="wt-slide__hint">{{ slideReady ? '已解锁，可确认删除' : '按住滑块拖到尽头' }}</span>
        <button class="wt-slide__thumb" type="button" @pointerdown.stop="onSlidePointerDown">
          →
        </button>
      </div>

      <template #footer>
        <el-button :disabled="deleting" @click="deleteDialog = false">取消</el-button>
        <el-button type="danger" :loading="deleting" :disabled="!slideReady" @click="confirmDelete">
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { CircleCheck, Delete, Refresh, Search, WarningFilled } from '@element-plus/icons-vue'
import { ListTable } from '@visactor/vue-vtable'
import {
  approveWt,
  closeWt,
  getWtItems,
  getWtList,
  getWtWorkers,
  removeWt,
  unapproveWt,
} from '/@/api/procurement/dispatch'
import { $baseMessage } from '/@/hooks'
import { useListColumns } from '/@/hooks/useListColumns'
import { useVTableLayout } from '/@/hooks/useVTableLayout'
import { sortNewestFirst } from '/@/utils/bladeAdapter'
import { handleVTableContextMenuCell, trackVTableCellForCopy } from '/@/utils/tableCopy'

defineOptions({ name: 'DispatchManagement' })

const { visible } = useListColumns('dispatch')
const { visible: visibleWorker } = useListColumns('dispatchWorker')

const masterTableRef = ref<any>(null)
const itemTableRef = ref<any>(null)
const workerTableRef = ref<any>(null)
const masterWrapRef = ref<HTMLElement | null>(null)
const itemWrapRef = ref<HTMLElement | null>(null)
const workerWrapRef = ref<HTMLElement | null>(null)

const masterLayout = useVTableLayout(masterTableRef, masterWrapRef, { minHeight: 88 })
const itemLayout = useVTableLayout(itemTableRef, itemWrapRef, { minHeight: 88 })
const workerLayout = useVTableLayout(workerTableRef, workerWrapRef, { minHeight: 88 })

const masterHeight = computed(() => Math.max(88, masterLayout.tableHeight.value || 88))
const itemHeight = computed(() => Math.max(88, itemLayout.tableHeight.value || 88))
const workerHeight = computed(() => Math.max(88, workerLayout.tableHeight.value || 88))

const queryForm = reactive({
  pageNo: 1,
  pageSize: 50,
  wtNo: '',
  moNo: '',
  cFlag: '',
  ifClose: '',
  ifCancel: '',
  finishFlag: '',
})

const listLoading = ref(false)
const itemLoading = ref(false)
const workerLoading = ref(false)
const cardLoading = ref(false)
const masterList = ref<any[]>([])
const itemList = ref<any[]>([])
const workerList = ref<any[]>([])
const total = ref(0)
const selectedWt = ref<any>(null)
const selectedItem = ref<any>(null)
const checkedItems = ref<any[]>([])
const checkedMasters = ref<any[]>([])
const workersByItem = reactive<Record<string, any[]>>({})

const paneRatios = reactive([4, 4, 3, 3])
const paneResizing = ref(-1)
const resizeStartY = ref(0)
const resizeStartRatio = ref([0, 0])

/** 删除确认弹窗 / 滑块 */
const deleteDialog = ref(false)
const deleting = ref(false)
const auditing = ref(false)
const unauditing = ref(false)
const closing = ref(false)
const pendingDeleteRows = ref<any[]>([])
const slidePercent = ref(0)
const slideReady = ref(false)
const slideDragging = ref(false)
const slideTrackRef = ref<HTMLElement | null>(null)

const itemTotals = computed(() => {
  const wtQty = itemList.value.reduce((s, r) => s + num(r.wtQty), 0)
  const fnQty = itemList.value.reduce((s, r) => s + num(r.fnQty), 0)
  const rate = wtQty > 0 ? Math.round((fnQty / wtQty) * 1000) / 10 : 0
  return { wtQty, fnQty, rate }
})

const dispatchCards = computed(() =>
  checkedItems.value.map((item) => {
    const key = itemRowKey(item)
    return {
      key,
      prcCode: item.prcCode,
      prcName: item.prcName,
      woNo: item.woNo,
      moNo: item.moNo,
      goodsCode: item.goodsCode,
      goodsName: item.goodsName,
      wtQty: item.wtQty,
      workers: workersByItem[key] || [],
    }
  })
)

const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const fmtNum = (v: any, digits = 2) => {
  const n = num(v)
  if (!n) return v == null || v === '' ? '' : '0'
  return Number(n.toFixed(digits)).toString()
}

const progressOf = (row: any) => {
  const plan = num(row.planQty)
  if (plan <= 0) return num(row.fnQty) > 0 ? 100 : 0
  return Math.min(100, Math.round((num(row.fnQty) / plan) * 100))
}

const tagType = (label: string) => {
  const s = String(label || '')
  if (['已审核', '已完成', '已结案'].includes(s)) return 'success'
  if (['部分完成', '未审核'].includes(s)) return 'warning'
  if (['已作废', '作废'].includes(s)) return 'danger'
  return 'info'
}

const flagText = (v: any) => String(v ?? '').trim()

const isClosed = (row: any) => {
  const s = flagText(row?.ifClose)
  return s === '1' || s.includes('已结案') || s === '结案'
}

const isCancelled = (row: any) => {
  const s = flagText(row?.ifCancel)
  return s === '1' || s.includes('已作废') || s === '作废'
}

const isAudited = (row: any) => {
  const s = flagText(row?.cFlag)
  return s === '1' || s.includes('已审核')
}

/** 完成状态已开工：已完成 / 部分完成 */
const isStartedByFinish = (row: any) => {
  const s = flagText(row?.finishFlag)
  if (s === '1' || s === '2') return true
  return s.includes('已完成') || s.includes('部分完成')
}

/**
 * 未开工可删：未结案、未作废、完成状态未开工；
 * 若已加载明细则额外要求完工数合计为 0。
 */
const deleteBlockReason = (row: any, opts?: { fnQty?: number }) => {
  if (!row?.wtNo) return '无效派工单'
  if (isCancelled(row)) return '已作废，不可删除'
  if (isClosed(row)) return '已结案，不可删除'
  if (isStartedByFinish(row)) return '已开工/有完工，不可删除'
  if (opts?.fnQty != null && opts.fnQty > 0.000001) return '已有完工数量，不可删除'
  return ''
}

const approveBlockReason = (row: any) => {
  if (!row?.wtNo) return '无效派工单'
  if (isCancelled(row)) return '已作废，不可审核'
  if (isClosed(row)) return '已结案，不可审核'
  if (isAudited(row)) return '已审核'
  return ''
}

const unapproveBlockReason = (row: any, opts?: { fnQty?: number }) => {
  if (!row?.wtNo) return '无效派工单'
  if (isCancelled(row)) return '已作废，不可反审核'
  if (isClosed(row)) return '已结案，不可反审核'
  if (!isAudited(row)) return '未审核，无需反审核'
  if (isStartedByFinish(row)) return '已开工/有完工，不可反审核'
  if (opts?.fnQty != null && opts.fnQty > 0.000001) return '已有完工数量，不可反审核'
  return ''
}

const closeBlockReason = (row: any) => {
  if (!row?.wtNo) return '无效派工单'
  if (isCancelled(row)) return '已作废，不可结案'
  if (isClosed(row)) return '已结案'
  if (!isAudited(row)) return '未审核，不可结案'
  return ''
}

const selectedFnQty = computed(() =>
  selectedWt.value?.wtNo && itemList.value[0]?.wtNo === selectedWt.value.wtNo
    ? itemTotals.value.fnQty
    : undefined
)

const selectedDeleteReason = computed(() => {
  if (!selectedWt.value) return '请先选择派工单'
  return deleteBlockReason(selectedWt.value, { fnQty: selectedFnQty.value })
})

const selectedCanDelete = computed(() => !selectedDeleteReason.value)

const selectedApproveReason = computed(() => {
  if (!selectedWt.value) return '请先选择派工单'
  return approveBlockReason(selectedWt.value)
})
const selectedCanApprove = computed(() => !selectedApproveReason.value)

const selectedUnapproveReason = computed(() => {
  if (!selectedWt.value) return '请先选择派工单'
  return unapproveBlockReason(selectedWt.value, { fnQty: selectedFnQty.value })
})
const selectedCanUnapprove = computed(() => !selectedUnapproveReason.value)

const selectedCloseReason = computed(() => {
  if (!selectedWt.value) return '请先选择派工单'
  return closeBlockReason(selectedWt.value)
})
const selectedCanClose = computed(() => !selectedCloseReason.value)

const itemRowKey = (row: any) =>
  `${row.wtNo}-${row.sNo}-${row.woNo}-${row.moNo}-${row.goodsId}-${row.prcCode}`

const baseTableOpts = {
  hover: { highlightMode: 'row' as const },
  select: { highlightMode: 'cell' as const },
  keyboardOptions: { copySelected: true },
  columnResizeMode: 'all' as const,
  dragHeaderMode: 'column' as const,
  widthMode: 'standard' as const,
  autoFillWidth: false,
  defaultColWidth: 110,
  defaultRowHeight: 28,
  defaultHeaderRowHeight: 30,
  theme: {
    headerStyle: {
      bgColor: '#f4f8f5',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#4a5d73',
      borderColor: '#d9e4ef',
      padding: [4, 8, 4, 8],
    },
    bodyStyle: {
      fontSize: 12,
      color: '#303133',
      borderColor: '#e8eef4',
      padding: [2, 8, 2, 8],
    },
    frameStyle: { borderColor: '#d9e4ef' },
    selectionStyle: { cellBgColor: 'rgba(46, 125, 90, 0.18)', cellBorderColor: '#2e7d5a', cellBorderLineWidth: 2 },
  },
}

const col = (field: string, title: string, width = 110, extra: Record<string, any> = {}) => ({
  field,
  title,
  width,
  fieldFormat: (r: any) => (r?.[field] == null || r?.[field] === '' ? '' : String(r[field])),
  ...extra,
})

const numCol = (field: string, title: string, width = 90, digits = 2) => ({
  field,
  title,
  width,
  fieldFormat: (r: any) => fmtNum(r?.[field], digits),
  style: { textAlign: 'right' as const },
})

const EMPTY_TIP_SVG =
  '<svg viewBox="0 0 1194 1024" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M1038.7 367.2c13.3 23.3-16.6-40-63.1-40H219c-26.6 0-46.5 13.3-63.1 40S0 607.3 0 650.6v290a82.4 82.4 0 0 0 83 83.4h1028.7a82.3 82.3 0 0 0 83-83.4v-290c0-43.3-156-283.4-156-283.4zM730.1 667.3a136.3 136.3 0 0 1-132.7 133.3 133.4 133.4 0 0 1-132.8-133.3v-6.7a40.7 40.7 0 0 0-36.5-26.7H73l119.5-220s23.2-40 53.1-40h713.5c26.5 0 29.9 10 46.4 40l115.8 220H769.9c-26.2 0-39.8 7.6-39.8 33.3z" fill="#c0c4cc"/></svg>'

const emptyTip = (text: string) => ({
  text,
  spaceBetweenTextAndIcon: 6,
  textStyle: { fontSize: 12, color: '#909399' },
  icon: { width: 28, height: 28, image: EMPTY_TIP_SVG },
})

const checkboxCol = {
  field: '__checkbox__',
  cellType: 'checkbox' as const,
  headerType: 'checkbox' as const,
  width: 42,
  style: { textAlign: 'center' as const },
}

const masterColumnDefs: Array<{ field: string; title: string; width: number; center?: boolean }> = [
  { field: 'wtNo', title: '派工单号', width: 168 },
  { field: 'oriType', title: '单据来源', width: 100 },
  { field: 'wtDate', title: '派工日期', width: 110 },
  { field: 'wsCode', title: '车间代号', width: 90 },
  { field: 'wsName', title: '车间名称', width: 130 },
  { field: 'deptCode', title: '部门代号', width: 90 },
  { field: 'deptName', title: '部门名称', width: 130 },
  { field: 'prcGrpCode', title: '工序组代号', width: 110 },
  { field: 'prcGrpName', title: '工序组名称', width: 120 },
  { field: 'tpcPrcCode', title: '代表工序代号', width: 120 },
  { field: 'tpcPrcName', title: '代表工序名称', width: 120 },
  { field: 'finishFlag', title: '完成状态', width: 100, center: true },
  { field: 'cFlag', title: '审核状态', width: 90, center: true },
  { field: 'creator', title: '建立人', width: 80 },
  { field: 'approver', title: '审核人', width: 80 },
  { field: 'ifClose', title: '结案状态', width: 90, center: true },
  { field: 'closer', title: '结案人', width: 80 },
  { field: 'closeDate', title: '结案日期', width: 120 },
  { field: 'ifCancel', title: '是否已作废', width: 100, center: true },
  { field: 'dataOri', title: '数据来源', width: 100 },
  { field: 'oriNo', title: '来源单号', width: 130 },
  { field: 'moNo', title: '制令号', width: 150 },
  { field: 'ordNo', title: '订单号', width: 130 },
  { field: 'custOrdNo', title: '客户订单号', width: 130 },
  { field: 'quickQuery', title: '速查码', width: 110 },
  { field: 'clrCode', title: '颜色编号', width: 90 },
  { field: 'clrName', title: '颜色', width: 90 },
  { field: 'remark', title: '备注', width: 140 },
]

const masterOptions = computed(() => {
  const columns: any[] = [checkboxCol]
  for (const def of masterColumnDefs) {
    if (!visible(def.field)) continue
    columns.push(
      col(def.field, def.title, def.width, def.center ? { style: { textAlign: 'center' } } : {})
    )
  }
  columns.push(
    {
      field: '__op_audit__',
      title: '审核',
      width: 72,
      fieldFormat: (r: any) => (isAudited(r) ? '反审核' : '审核'),
      style: {
        color: '#409eff',
        cursor: 'pointer',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
      },
    },
    {
      field: '__op_del__',
      title: '删除',
      width: 60,
      fieldFormat: () => '删除',
      style: {
        color: '#f56c6c',
        cursor: 'pointer',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
      },
    }
  )
  return {
    ...baseTableOpts,
    frozenColCount: 2,
    rightFrozenColCount: 2,
    columns,
    emptyTip: emptyTip('暂无派工单'),
  }
})

const itemOptions = computed(() => ({
  ...baseTableOpts,
  frozenColCount: 2,
  columns: [
    checkboxCol,
    col('moNo', '制令号', 150),
    col('goodsCode', '品号', 110),
    col('goodsName', '品名', 160),
    col('goodsType', '货品类型', 90),
    col('sizeDesc', '规格尺寸', 120),
    col('unitCode', '标准单位', 90),
    col('mrName', '制程名称', 110),
    col('machiningSNo', '加工顺序', 90, { style: { textAlign: 'center' } }),
    col('prcCode', '工序代号', 90),
    col('prcName', '工序名称', 100),
    col('woBorSno', '工单BOR序号', 120),
    numCol('machiningUp', '加工单价', 90),
    numCol('wtQty', '派工数量', 90),
    numCol('fnQty', '完工数量', 90),
    col('woNo', '工单号', 120),
  ],
  emptyTip: emptyTip(selectedWt.value ? '暂无工序明细' : '请先选择派工单'),
}))

const workerOptions = computed(() => {
  const columns: any[] = []
  if (visibleWorker('empNo')) columns.push(col('empNo', '工号', 110))
  if (visibleWorker('empName')) columns.push(col('empName', '姓名', 90))
  if (visibleWorker('deptCode')) columns.push(col('deptCode', '实际生产部门代号', 140))
  if (visibleWorker('deptName')) columns.push(col('deptName', '实际生产部门名称', 150))
  if (visibleWorker('planQty')) columns.push(numCol('planQty', '计划加工数量', 120))
  if (visibleWorker('progress')) {
    columns.push({
      field: 'progress',
      title: '完工进度',
      width: 100,
      fieldFormat: (r: any) => `${progressOf(r)}%`,
      style: { textAlign: 'center' },
    })
  }
  if (visibleWorker('workGpName')) columns.push(col('workGpName', '加工小组', 110))
  if (visibleWorker('assistEmpNo')) columns.push(col('assistEmpNo', '辅助人员工号', 120))
  if (visibleWorker('assistEmpName')) columns.push(col('assistEmpName', '辅助人员姓名', 120))
  if (visibleWorker('assistRate')) columns.push(numCol('assistRate', '辅助补贴比例 (%)', 140))
  if (visibleWorker('fnQty')) columns.push(numCol('fnQty', '已完工数量', 110))
  if (visibleWorker('fnStatus')) {
    columns.push({
      field: 'fnStatus',
      title: '已完工状态',
      width: 110,
      fieldFormat: (r: any) => (progressOf(r) >= 100 ? '已完工' : '进行中'),
      style: { textAlign: 'center' },
    })
  }
  if (visibleWorker('fnStdTime')) columns.push(numCol('fnStdTime', '完工标准工时', 130, 4))
  if (visibleWorker('remark')) columns.push(col('remark', '备注', 140))
  return {
    ...baseTableOpts,
    columns,
    emptyTip: emptyTip(selectedItem.value ? '暂无人员派工' : '请先选择工序明细'),
  }
})

const onCopyContextMenu = (args: any, tableRef: any) => {
  handleVTableContextMenuCell(args, () => tableRef.value?.vTableInstance)
}

const onCopyTrack = (args: any, tableRef: any) => {
  trackVTableCellForCopy(args, () => tableRef.value?.vTableInstance)
}

const getColumnField = (tableRef: any, colIdx: number, options: any): string => {
  const inst = tableRef.value?.vTableInstance
  try {
    const def = inst?.getBodyColumnDefine?.(colIdx) || inst?.getColumnDefine?.(colIdx)
    if (def?.field != null) return String(def.field)
  } catch {
    /* fall through */
  }
  return String(options?.columns?.[colIdx]?.field ?? '')
}

const getRecordFromArgs = (args: any, tableRef: any, list: any[]) => {
  if (args.col === undefined || args.row === undefined) return null
  const vtable = tableRef.value?.vTableInstance
  if (!vtable) return null
  const headerCount = vtable.columnHeaderLevelCount ?? 1
  return list[args.row - headerCount] || null
}

const syncCheckedFromTable = (tableRef: any, list: any[]) => {
  const vtable = tableRef.value?.vTableInstance
  if (!vtable) return []
  const headerCount = vtable.columnHeaderLevelCount ?? 1
  const selected: any[] = []
  list.forEach((_item, index) => {
    const row = headerCount + index
    if (vtable.getCellCheckboxState(0, row) === true) selected.push(list[index])
  })
  return selected
}

const onMasterCheckboxChange = () => {
  nextTick(() => {
    checkedMasters.value = syncCheckedFromTable(masterTableRef, masterList.value)
  })
}

const onItemCheckboxChange = () => {
  nextTick(() => {
    const rows = syncCheckedFromTable(itemTableRef, itemList.value)
    onItemSelectionChange(rows)
  })
}

const onMasterClickCell = (args: any) => {
  onCopyTrack(args, masterTableRef)
  const field = getColumnField(masterTableRef, args.col, masterOptions.value)
  if (field === '__checkbox__') return
  const record = getRecordFromArgs(args, masterTableRef, masterList.value)
  if (!record) return
  if (field === '__op_audit__') {
    if (isAudited(record)) runUnapprove([record])
    else runApprove([record])
    return
  }
  if (field === '__op_del__') {
    openDeleteConfirm([record])
    return
  }
  handleMasterClick(record)
}

const onItemClickCell = (args: any) => {
  onCopyTrack(args, itemTableRef)
  const field = getColumnField(itemTableRef, args.col, itemOptions.value)
  if (field === '__checkbox__') return
  const record = getRecordFromArgs(args, itemTableRef, itemList.value)
  if (!record) return
  handleItemClick(record)
}

const syncAllLayouts = () => {
  ;[masterLayout, itemLayout, workerLayout].forEach((layout) => {
    layout.syncSize(0)
    layout.syncSize(80)
  })
}

const startPaneResize = (e: MouseEvent, gripIdx: number) => {
  paneResizing.value = gripIdx
  resizeStartY.value = e.clientY
  resizeStartRatio.value = [paneRatios[gripIdx], paneRatios[gripIdx + 1]]
  document.addEventListener('mousemove', onPaneResize)
  document.addEventListener('mouseup', stopPaneResize)
  e.preventDefault()
}

const onPaneResize = (e: MouseEvent) => {
  if (paneResizing.value < 0) return
  const dy = e.clientY - resizeStartY.value
  const idx = paneResizing.value
  const r0 = resizeStartRatio.value[0]
  const r1 = resizeStartRatio.value[1]
  const sum = r0 + r1
  const newR0 = Math.max(1, Math.min(sum - 1, r0 + Math.round(dy / 40)))
  paneRatios[idx] = newR0
  paneRatios[idx + 1] = sum - newR0
}

const stopPaneResize = () => {
  paneResizing.value = -1
  document.removeEventListener('mousemove', onPaneResize)
  document.removeEventListener('mouseup', stopPaneResize)
  syncAllLayouts()
}

const fetchMaster = async () => {
  listLoading.value = true
  try {
    const { data } = await getWtList(queryForm)
    masterList.value = sortNewestFirst(data.list || [], 'wtNo')
    total.value = data.total || 0
    selectedWt.value = null
    selectedItem.value = null
    itemList.value = []
    workerList.value = []
    checkedItems.value = []
    checkedMasters.value = []
    Object.keys(workersByItem).forEach((k) => delete workersByItem[k])
  } catch (e: any) {
    masterList.value = []
    total.value = 0
    $baseMessage(e?.message || '加载派工单失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const loadItems = async (wtNo: string) => {
  itemLoading.value = true
  selectedItem.value = null
  workerList.value = []
  checkedItems.value = []
  Object.keys(workersByItem).forEach((k) => delete workersByItem[k])
  try {
    itemList.value = await getWtItems(wtNo)
  } catch (e: any) {
    itemList.value = []
    $baseMessage(e?.message || '加载工序明细失败', 'error', 'hey')
  } finally {
    itemLoading.value = false
  }
}

const loadWorkers = async (item: any) => {
  if (!selectedWt.value?.wtNo || !item) {
    workerList.value = []
    return
  }
  workerLoading.value = true
  try {
    workerList.value = await getWtWorkers({
      wtNo: selectedWt.value.wtNo,
      woNo: item.woNo,
      moNo: item.moNo,
      goodsId: item.goodsId,
      prcCode: item.prcCode,
      woBorSno: item.woBorSno,
    })
  } catch (e: any) {
    workerList.value = []
    $baseMessage(e?.message || '加载人员派工失败', 'error', 'hey')
  } finally {
    workerLoading.value = false
  }
}

const ensureCardWorkers = async (items: any[]) => {
  if (!selectedWt.value?.wtNo) return
  const missing = items.filter((item) => !workersByItem[itemRowKey(item)])
  if (!missing.length) return
  cardLoading.value = true
  try {
    await Promise.all(
      missing.map(async (item) => {
        const key = itemRowKey(item)
        try {
          workersByItem[key] = await getWtWorkers({
            wtNo: selectedWt.value.wtNo,
            woNo: item.woNo,
            moNo: item.moNo,
            goodsId: item.goodsId,
            prcCode: item.prcCode,
            woBorSno: item.woBorSno,
          })
        } catch {
          workersByItem[key] = []
        }
      })
    )
  } finally {
    cardLoading.value = false
  }
}

const onItemSelectionChange = (rows: any[]) => {
  checkedItems.value = rows || []
  const keep = new Set(checkedItems.value.map((r) => itemRowKey(r)))
  Object.keys(workersByItem).forEach((k) => {
    if (!keep.has(k)) delete workersByItem[k]
  })
  ensureCardWorkers(checkedItems.value)
}

const handleMasterClick = (row: any) => {
  if (!row?.wtNo) return
  selectedWt.value = row
  loadItems(row.wtNo)
}

const handleItemClick = (row: any) => {
  selectedItem.value = row
  loadWorkers(row)
}

const resetDeleteSlide = () => {
  slidePercent.value = 0
  slideReady.value = false
  slideDragging.value = false
  pendingDeleteRows.value = []
}

const openDeleteConfirm = async (rows: any[]) => {
  const unique = new Map<string, any>()
  for (const row of rows || []) {
    if (!row?.wtNo) continue
    unique.set(row.wtNo, row)
  }
  const list = [...unique.values()]
  if (!list.length) {
    $baseMessage('请选择要删除的派工单', 'warning', 'hey')
    return
  }

  const blocked: string[] = []
  const allowed: any[] = []
  for (const row of list) {
    // 当前选中单且明细已加载时，用完工数再校验一次
    const fnQty =
      selectedWt.value?.wtNo === row.wtNo && itemList.value.length
        ? itemTotals.value.fnQty
        : undefined
    const reason = deleteBlockReason(row, { fnQty })
    if (reason) blocked.push(`${row.wtNo}：${reason}`)
    else allowed.push(row)
  }
  if (!allowed.length) {
    $baseMessage(blocked[0] || '所选派工单不可删除', 'warning', 'hey')
    return
  }
  if (blocked.length) {
    $baseMessage(`已跳过 ${blocked.length} 张不可删单据`, 'warning', 'hey')
  }

  pendingDeleteRows.value = allowed
  slidePercent.value = 0
  slideReady.value = false
  deleteDialog.value = true
}

const updateSlideFromClientX = (clientX: number) => {
  const track = slideTrackRef.value
  if (!track) return
  const rect = track.getBoundingClientRect()
  const thumb = 44
  const max = Math.max(1, rect.width - thumb)
  const x = Math.min(max, Math.max(0, clientX - rect.left - thumb / 2))
  const pct = Math.round((x / max) * 100)
  slidePercent.value = pct
  slideReady.value = pct >= 96
  if (slideReady.value) slidePercent.value = 100
}

const onSlidePointerMove = (e: PointerEvent) => {
  if (!slideDragging.value) return
  updateSlideFromClientX(e.clientX)
}

const onSlidePointerUp = () => {
  if (!slideDragging.value) return
  slideDragging.value = false
  document.removeEventListener('pointermove', onSlidePointerMove)
  document.removeEventListener('pointerup', onSlidePointerUp)
  if (!slideReady.value && slidePercent.value < 96) {
    slidePercent.value = 0
  }
}

const onSlidePointerDown = (e: PointerEvent) => {
  if (deleting.value) return
  slideDragging.value = true
  updateSlideFromClientX(e.clientX)
  document.addEventListener('pointermove', onSlidePointerMove)
  document.addEventListener('pointerup', onSlidePointerUp)
  e.preventDefault()
}

const confirmDelete = async () => {
  if (!slideReady.value || !pendingDeleteRows.value.length) return
  deleting.value = true
  try {
    const wtNos = pendingDeleteRows.value.map((r) => r.wtNo)
    await removeWt(wtNos)
    $baseMessage(`已删除 ${wtNos.length} 张派工单`, 'success', 'hey')
    deleteDialog.value = false
    resetDeleteSlide()
    await afterWtMutation(wtNos)
  } catch (e: any) {
    $baseMessage(e?.message || '删除失败', 'error', 'hey')
  } finally {
    deleting.value = false
  }
}

const pickAllowedRows = (
  rows: any[],
  reasonOf: (row: any, opts?: { fnQty?: number }) => string,
  emptyMsg: string
) => {
  const unique = new Map<string, any>()
  for (const row of rows || []) {
    if (!row?.wtNo) continue
    unique.set(row.wtNo, row)
  }
  const list = [...unique.values()]
  if (!list.length) {
    $baseMessage(emptyMsg, 'warning', 'hey')
    return []
  }
  const blocked: string[] = []
  const allowed: any[] = []
  for (const row of list) {
    const fnQty =
      selectedWt.value?.wtNo === row.wtNo && itemList.value.length
        ? itemTotals.value.fnQty
        : undefined
    const reason = reasonOf(row, { fnQty })
    if (reason) blocked.push(`${row.wtNo}：${reason}`)
    else allowed.push(row)
  }
  if (!allowed.length) {
    $baseMessage(blocked[0] || emptyMsg, 'warning', 'hey')
    return []
  }
  if (blocked.length) {
    $baseMessage(`已跳过 ${blocked.length} 张不可操作单据`, 'warning', 'hey')
  }
  return allowed
}

const afterWtMutation = async (wtNos: string[]) => {
  const keepWt = selectedWt.value?.wtNo
  listLoading.value = true
  try {
    const { data } = await getWtList(queryForm)
    masterList.value = sortNewestFirst(data.list || [], 'wtNo')
    total.value = data.total || 0
    checkedMasters.value = []
    if (keepWt && wtNos.includes(keepWt) && !masterList.value.some((r) => r.wtNo === keepWt)) {
      selectedWt.value = null
      selectedItem.value = null
      itemList.value = []
      workerList.value = []
      checkedItems.value = []
      Object.keys(workersByItem).forEach((k) => delete workersByItem[k])
      return
    }
    if (keepWt) {
      const fresh = masterList.value.find((r) => r.wtNo === keepWt)
      if (fresh) {
        selectedWt.value = fresh
        await loadItems(keepWt)
      }
    }
  } catch (e: any) {
    $baseMessage(e?.message || '刷新列表失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const runApprove = async (rows: any[]) => {
  const allowed = pickAllowedRows(rows, (r) => approveBlockReason(r), '请选择要审核的派工单')
  if (!allowed.length) return
  auditing.value = true
  try {
    const wtNos = allowed.map((r) => r.wtNo)
    await approveWt(wtNos)
    $baseMessage(`已审核 ${wtNos.length} 张派工单`, 'success', 'hey')
    await afterWtMutation(wtNos)
  } catch (e: any) {
    $baseMessage(e?.message || '审核失败', 'error', 'hey')
  } finally {
    auditing.value = false
  }
}

const runUnapprove = async (rows: any[]) => {
  const allowed = pickAllowedRows(rows, unapproveBlockReason, '请选择要反审核的派工单')
  if (!allowed.length) return
  unauditing.value = true
  try {
    const wtNos = allowed.map((r) => r.wtNo)
    await unapproveWt(wtNos)
    $baseMessage(`已反审核 ${wtNos.length} 张派工单`, 'success', 'hey')
    await afterWtMutation(wtNos)
  } catch (e: any) {
    $baseMessage(e?.message || '反审核失败', 'error', 'hey')
  } finally {
    unauditing.value = false
  }
}

const runClose = async (rows: any[]) => {
  const allowed = pickAllowedRows(rows, (r) => closeBlockReason(r), '请选择要结案的派工单')
  if (!allowed.length) return
  closing.value = true
  try {
    const wtNos = allowed.map((r) => r.wtNo)
    await closeWt(wtNos)
    $baseMessage(`已结案 ${wtNos.length} 张派工单`, 'success', 'hey')
    await afterWtMutation(wtNos)
  } catch (e: any) {
    $baseMessage(e?.message || '结案失败', 'error', 'hey')
  } finally {
    closing.value = false
  }
}

const router = useRouter()
const goQuickDispatch = () => {
  const moNo = selectedWt.value?.moNo || queryForm.moNo
  router.push({
    path: '/procurement/quickDispatch/index',
    query: moNo ? { moNo } : {},
  })
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchMaster()
}

const resetQuery = () => {
  queryForm.wtNo = ''
  queryForm.moNo = ''
  queryForm.cFlag = ''
  queryForm.ifClose = ''
  queryForm.ifCancel = ''
  queryForm.finishFlag = ''
  queryForm.pageNo = 1
  fetchMaster()
}

onBeforeMount(() => fetchMaster())
onBeforeUnmount(() => {
  stopPaneResize()
  document.removeEventListener('pointermove', onSlidePointerMove)
  document.removeEventListener('pointerup', onSlidePointerUp)
})
</script>

<style lang="scss" scoped>
.dispatch-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wt-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 8px 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f3faf6 0%, #f7fafc 100%);
  border: 1px solid #d8ebe0;

  &__id {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;

    .label {
      font-size: 12px;
      color: #7a8b7f;
    }

    strong {
      font-size: 15px;
      color: #2e7d5a;
      letter-spacing: 0.02em;
    }
  }

  &__tags {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__meta {
    display: inline-flex;
    gap: 12px;
    font-size: 12px;
    color: #5f6f66;
  }

  &__kpi {
    margin-left: auto;
    display: inline-flex;
    gap: 14px;
    font-size: 12px;
    color: #2e7d5a;
    font-variant-numeric: tabular-nums;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
}

.pane-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #d9e4ef;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.pane-cards {
  .dispatch-cards {
    flex: 1;
    min-height: 0;
  }
}

.dispatch-cards {
  display: flex;
  flex-direction: column;
  background: #fbfdfb;

  &__list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
    padding: 10px 12px 12px;
  }

  :deep(.el-empty) {
    flex: 1;
  }
}

.dispatch-card {
  border: 1px solid #dce8e0;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: flex-start;
  }

  &__title {
    min-width: 0;

    .code {
      display: inline-block;
      margin-bottom: 2px;
      font-size: 11px;
      font-weight: 700;
      color: #2e7d5a;
      letter-spacing: 0.03em;
    }

    strong {
      display: block;
      font-size: 13px;
      color: #24352c;
    }
  }

  .qty {
    color: #2e7d5a;
    font-variant-numeric: tabular-nums;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: #7a8b7f;
  }

  &__workers {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      padding: 6px 8px;
      border-radius: 6px;
      background: #f4f8f5;
    }

    .name {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;

      strong {
        font-size: 13px;
        color: #24352c;
      }

      span {
        font-size: 12px;
        color: #7a8b7f;
      }
    }

    .plan {
      display: flex;
      gap: 10px;
      margin-bottom: 4px;
      font-size: 12px;
      color: #5f6f66;

      em {
        font-style: normal;
        font-variant-numeric: tabular-nums;
      }
    }

    .is-empty {
      text-align: center;
      color: #9aaba0;
      background: transparent;
    }
  }
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  color: #2a3a32;
  background: #f6faf7;
  border-bottom: 1px solid #e3eee7;

  em {
    font-style: normal;
    font-size: 12px;
    color: #7a8b7f;
  }
}

.vtable-wrap {
  flex: 1;
  min-height: 88px;
  width: 100%;
  overflow: hidden;
  position: relative;

  :deep(canvas),
  :deep(.vtable) {
    width: 100% !important;
  }
}

.resize-grip {
  flex-shrink: 0;
  height: 10px;
  cursor: row-resize;
  background: transparent;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: #c5d4c9;
  }

  &:hover {
    background: rgba(46, 125, 90, 0.06);
    &::after {
      background: #2e7d5a;
      width: 72px;
    }
  }
}
</style>

<style lang="scss">
.wt-delete-dialog {
  .el-dialog__header {
    margin-right: 0;
    padding-bottom: 8px;
  }

  .el-dialog__body {
    padding-top: 4px;
  }
}

.wt-delete-dialog__title {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  .is-warn {
    margin-top: 2px;
    font-size: 22px;
    color: #e11d48;
  }

  strong {
    display: block;
    font-size: 16px;
    color: #1f2937;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #6b7280;
  }
}

.wt-delete-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 220px;
  overflow: auto;

  &__card {
    padding: 10px 12px;
    border: 1px solid #fecdd3;
    border-radius: 10px;
    background: linear-gradient(135deg, #fff1f2 0%, #fff 70%);

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;

      b {
        color: #be123c;
        font-size: 14px;
        letter-spacing: 0.02em;
      }
    }

    p {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0;
      font-size: 12px;
      color: #7a8b7f;
    }
  }

  &__sum {
    font-size: 13px;
    color: #4b5563;

    em {
      font-style: normal;
      font-weight: 700;
      color: #e11d48;
      margin: 0 2px;
    }
  }
}

.wt-slide {
  position: relative;
  height: 48px;
  border-radius: 999px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  cursor: pointer;

  &__fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(90deg, #fda4af 0%, #fb7185 55%, #e11d48 100%);
    transition: width 0.05s linear;
  }

  &__hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.04em;
    pointer-events: none;
    z-index: 1;
  }

  &__thumb {
    position: absolute;
    top: 4px;
    left: calc((100% - 48px) * var(--slide, 0) + 4px);
    z-index: 2;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
    color: #e11d48;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    cursor: grab;
  }

  &.is-dragging .wt-slide__thumb {
    cursor: grabbing;
  }

  &.is-ready {
    border-color: #e11d48;

    .wt-slide__hint {
      color: #fff;
      text-shadow: 0 1px 2px rgba(136, 19, 55, 0.35);
    }

    .wt-slide__thumb {
      background: #fff1f2;
      color: #be123c;
    }
  }
}
</style>
