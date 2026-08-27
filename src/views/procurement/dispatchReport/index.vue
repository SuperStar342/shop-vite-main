<template>
  <div v-table-copy class="dr-page auto-height-container">
    <header class="dr-hero">
      <div class="dr-hero__text">
        <h1>派工报工</h1>
        <p>点选派工单 · 按工序录入 · 支持批量报工</p>
      </div>
      <div v-if="showDetail" class="dr-hero__actions">
        <el-button type="primary" @click="openBatchReport">
          <el-icon><Grid /></el-icon>
          批量报工
        </el-button>
      </div>
    </header>

    <div class="dr-stats" v-if="showDetail">
      <article v-for="card in statCards" :key="card.key" class="dr-stat" :class="`dr-stat--${card.key}`">
        <em>{{ card.label }}</em>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

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
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button plain type="success" @click="goQuickDispatch">快捷派工</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div class="dp-body">
      <div class="dp-main">
        <div v-if="selectedWt" class="wt-summary">
          <div class="wt-summary__id">
            <span class="label">当前派工单</span>
            <strong>{{ selectedWt.wtNo }}</strong>
          </div>
          <div class="wt-summary__tags">
            <el-tag size="small" effect="plain" :type="tagType(selectedWt.finishFlag)">{{ selectedWt.finishFlag || '-' }}</el-tag>
            <el-tag size="small" effect="plain" :type="tagType(selectedWt.cFlag)">{{ selectedWt.cFlag || '-' }}</el-tag>
            <el-tag size="small" effect="plain" :type="tagType(selectedWt.ifClose)">{{ selectedWt.ifClose || '-' }}</el-tag>
          </div>
          <div class="wt-summary__meta">
            <span>{{ selectedWt.wsName || selectedWt.wsCode }}</span>
            <span>{{ selectedWt.deptName || selectedWt.deptCode }}</span>
            <span v-if="selectedWt.wtDate">{{ selectedWt.wtDate }}</span>
          </div>
          <div class="wt-summary__kpi">
            <span>工序 {{ itemList.length }}</span>
            <span>人员 {{ workerTotalCount }}</span>
            <span>派工 {{ fmtNum(itemTotals.wtQty) }}</span>
            <span>完工 {{ fmtNum(itemTotals.fnQty) }}</span>
            <span>完成率 {{ itemTotals.rate }}%</span>
          </div>
          <div class="wt-summary__actions">
            <el-button :disabled="!pendingWorkerCount" plain size="small" type="primary" @click="fillAllPendingWorkers">
              一键填满待报
            </el-button>
            <el-button
              :disabled="!filledWorkerCount"
              :loading="reporting"
              size="small"
              type="success"
              @click="oneClickSubmitCurrent"
            >
              一键提交本工序
            </el-button>
            <el-button :disabled="!selectedItem" link type="info" @click="openRecords(selectedItem)">报工记录</el-button>
          </div>
        </div>

        <div
          class="pane pane-master"
          :class="{ 'is-solo': !showDetail }"
          :style="showDetail ? { flex: `${paneRatios[0]} 1 0px` } : undefined"
        >
          <div class="pane-head">
            <span>派工单列表</span>
            <em>
              {{ total }} 张
              <template v-if="selectedWt?.wtNo"> · 当前 {{ selectedWt.wtNo }}</template>
            </em>
          </div>
          <div class="table-wrap">
            <el-table
              ref="masterTableRef"
              v-loading="listLoading"
              border
              highlight-current-row
              height="100%"
              :data="masterList"
              row-key="wtNo"
              @row-click="handleMasterClick"
            >
              <el-table-column align="center" width="42">
                <template #default="{ row }">
                  <el-radio
                    :model-value="selectedWt?.wtNo"
                    :value="row.wtNo"
                    @change="handleMasterClick(row)"
                    @click.stop
                  />
                </template>
              </el-table-column>
              <el-table-column v-if="visible('wtNo')" label="派工单号" min-width="168" prop="wtNo" show-overflow-tooltip />
              <el-table-column v-if="visible('oriType')" label="单据来源" min-width="100" prop="oriType" show-overflow-tooltip />
              <el-table-column v-if="visible('wtDate')" label="派工日期" min-width="110" prop="wtDate" show-overflow-tooltip />
              <el-table-column v-if="visible('wsCode')" label="车间代号" min-width="90" prop="wsCode" />
              <el-table-column v-if="visible('wsName')" label="车间名称" min-width="130" prop="wsName" show-overflow-tooltip />
              <el-table-column v-if="visible('deptCode')" label="部门代号" min-width="90" prop="deptCode" />
              <el-table-column v-if="visible('deptName')" label="部门名称" min-width="130" prop="deptName" show-overflow-tooltip />
              <el-table-column v-if="visible('prcGrpCode')" label="工序组代号" min-width="110" prop="prcGrpCode" show-overflow-tooltip />
              <el-table-column v-if="visible('prcGrpName')" label="工序组名称" min-width="120" prop="prcGrpName" show-overflow-tooltip />
              <el-table-column v-if="visible('tpcPrcCode')" label="代表工序代号" min-width="120" prop="tpcPrcCode" />
              <el-table-column v-if="visible('tpcPrcName')" label="代表工序名称" min-width="120" prop="tpcPrcName" show-overflow-tooltip />
              <el-table-column v-if="visible('finishFlag')" align="center" label="完成状态" min-width="100" prop="finishFlag">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" :type="tagType(row.finishFlag)">{{ row.finishFlag || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="visible('cFlag')" align="center" label="审核状态" min-width="90" prop="cFlag">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" :type="tagType(row.cFlag)">{{ row.cFlag || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="visible('creator')" label="建立人" min-width="80" prop="creator" />
              <el-table-column v-if="visible('approver')" label="审核人" min-width="80" prop="approver" />
              <el-table-column v-if="visible('ifClose')" align="center" label="结案状态" min-width="90" prop="ifClose" />
              <el-table-column v-if="visible('closer')" label="结案人" min-width="80" prop="closer" />
              <el-table-column v-if="visible('closeDate')" label="结案日期" min-width="120" prop="closeDate" show-overflow-tooltip />
              <el-table-column v-if="visible('ifCancel')" align="center" label="是否已作废" min-width="100" prop="ifCancel" />
              <el-table-column v-if="visible('dataOri')" label="数据来源" min-width="100" prop="dataOri" />
              <el-table-column v-if="visible('oriNo')" label="来源单号" min-width="130" prop="oriNo" show-overflow-tooltip />
              <el-table-column v-if="visible('moNo')" label="制令号" min-width="150" prop="moNo" show-overflow-tooltip />
              <el-table-column v-if="visible('ordNo')" label="订单号" min-width="130" prop="ordNo" show-overflow-tooltip />
              <el-table-column v-if="visible('custOrdNo')" label="客户订单号" min-width="130" prop="custOrdNo" show-overflow-tooltip />
              <el-table-column v-if="visible('quickQuery')" label="速查码" min-width="110" prop="quickQuery" show-overflow-tooltip />
              <el-table-column v-if="visible('clrCode')" label="颜色编号" min-width="90" prop="clrCode" />
              <el-table-column v-if="visible('clrName')" label="颜色" min-width="90" prop="clrName" />
              <el-table-column v-if="visible('remark')" label="备注" min-width="140" prop="remark" show-overflow-tooltip />
              <template #empty>
                <el-empty description="暂无派工单" />
              </template>
            </el-table>
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

        <!-- 未选派工单：明细区隐藏 -->
        <template v-if="showDetail">
          <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 0)" />

          <div class="pane pane-items" :style="{ flex: `${paneRatios[1]} 1 0px` }">
            <div class="pane-head pane-head--tabs">
              <el-radio-group v-model="detailTab" size="small">
                <el-radio-button value="items">工序明细</el-radio-button>
                <el-radio-button value="progress">加工进度汇总</el-radio-button>
              </el-radio-group>
              <em>
                {{
                  detailTab === 'items'
                    ? `${itemList.length} 行${checkedItems.length ? ` · 已选 ${checkedItems.length}` : ''}`
                    : `完成率 ${itemTotals.rate}%`
                }}
              </em>
            </div>
            <div v-show="detailTab === 'items'" class="table-wrap">
              <el-table
                ref="itemTableRef"
                v-loading="itemLoading"
                border
                highlight-current-row
                height="100%"
                :data="itemList"
                :row-key="itemRowKey"
                @row-click="handleItemClick"
                @selection-change="onItemSelectionChange"
              >
                <el-table-column type="selection" width="42" />
                <dispatch-wt-item-columns :fmt="fmtNum" show-progress selection />
                <template #empty>
                  <el-empty description="暂无工序明细" />
                </template>
              </el-table>
            </div>
            <div v-show="detailTab === 'progress'" v-loading="progressWorkersLoading" class="progress-summary">
              <article
                v-for="row in itemList"
                :key="itemRowKey(row)"
                class="progress-summary__card"
                :class="{ 'is-active': selectedItemKey === itemRowKey(row) }"
                @click="handleProgressCardClick(row)"
              >
                <header>
                  <strong>{{ row.prcName || row.prcCode }}</strong>
                  <el-tag effect="plain" size="small" :type="itemProgress(row) >= 100 ? 'success' : 'info'">
                    {{ itemProgress(row) }}%
                  </el-tag>
                </header>
                <p>{{ row.goodsName || row.goodsCode }} · {{ row.woNo }}</p>
                <el-progress :percentage="itemProgress(row)" :stroke-width="10" />
                <div class="progress-summary__nums">
                  <span>派工 {{ fmtNum(row.wtQty) }}</span>
                  <span>已报 {{ fmtNum(row.fnQty) }}</span>
                  <span class="is-pending">待报 {{ fmtNum(Math.max(0, num(row.wtQty) - num(row.fnQty))) }}</span>
                </div>
                <ul v-if="workersByItem[itemRowKey(row)]?.length" class="progress-summary__workers">
                  <li v-for="w in workersByItem[itemRowKey(row)]" :key="workerRowKey(w)">
                    <span class="name">{{ w.empName || w.empNo }}</span>
                    <el-progress
                      :percentage="progressOf(w)"
                      :stroke-width="6"
                      :status="progressOf(w) >= 100 ? 'success' : undefined"
                    />
                    <em>{{ fmtNum(w.fnQty) }}/{{ fmtNum(w.planQty) }}</em>
                  </li>
                </ul>
              </article>
              <el-empty v-if="!itemList.length" description="暂无进度数据" />
            </div>
          </div>

          <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 1)" />

          <div class="pane pane-workers" :style="{ flex: `${paneRatios[2]} 1 0px` }">
            <div class="pane-head">
              <span>
                工序人员派工
                <template v-if="selectedItem"> · {{ selectedItem.prcName }}</template>
              </span>
              <em>{{ selectedItem ? `${workerList.length} 人` : '点选工序明细或进度卡片' }}</em>
            </div>
            <div class="table-wrap">
              <el-table
                v-loading="workerLoading"
                border
                height="100%"
                :data="workerList"
                :row-key="workerRowKey"
              >
                <el-table-column v-if="visibleWorker('empNo')" label="工号" min-width="100" prop="empNo" />
                <el-table-column v-if="visibleWorker('empName')" label="姓名" min-width="90" prop="empName" />
                <el-table-column v-if="visibleWorker('deptCode')" label="实际生产部门代号" min-width="130" prop="deptCode" />
                <el-table-column
                  v-if="visibleWorker('deptName')"
                  label="实际生产部门名称"
                  min-width="150"
                  prop="deptName"
                  show-overflow-tooltip
                />
                <el-table-column v-if="visibleWorker('planQty')" align="right" label="计划加工数量" min-width="120">
                  <template #default="{ row }">{{ fmtNum(row.planQty) }}</template>
                </el-table-column>
                <el-table-column
                  v-if="visibleWorker('workGpName')"
                  label="加工小组"
                  min-width="110"
                  prop="workGpName"
                  show-overflow-tooltip
                />
                <el-table-column v-if="visibleWorker('assistEmpNo')" label="辅助人员工号" min-width="120" prop="assistEmpNo" />
                <el-table-column
                  v-if="visibleWorker('assistEmpName')"
                  label="辅助人员工名"
                  min-width="120"
                  prop="assistEmpName"
                />
                <el-table-column v-if="visibleWorker('assistRate')" align="right" label="辅助补贴比例 (%)" min-width="140">
                  <template #default="{ row }">{{ fmtNum(row.assistRate) }}</template>
                </el-table-column>
                <el-table-column v-if="visibleWorker('fnQty')" align="right" label="已完工数量" min-width="110">
                  <template #default="{ row }">{{ fmtNum(row.fnQty) }}</template>
                </el-table-column>
                <el-table-column v-if="visibleWorker('fnPcsQty')" align="right" label="已完工计件数量" min-width="130">
                  <template #default="{ row }">{{ fmtNum(fnPcsOf(row)) }}</template>
                </el-table-column>
                <el-table-column v-if="visibleWorker('fnStdTime')" align="right" label="完工标准工时" min-width="120">
                  <template #default="{ row }">{{ fmtNum(row.fnStdTime, 4) }}</template>
                </el-table-column>
                <el-table-column
                  v-if="visibleWorker('remark')"
                  label="备注"
                  min-width="140"
                  prop="remark"
                  show-overflow-tooltip
                />
                <el-table-column v-if="visibleWorker('woBorSno')" label="工单BOR序号" min-width="120">
                  <template #default="{ row }">{{ row.woBorSno || selectedItem?.woBorSno || '' }}</template>
                </el-table-column>
                <el-table-column v-if="visibleWorker('progress')" label="完工进度" min-width="140">
                  <template #default="{ row }">
                    <el-progress
                      :percentage="progressOf(row)"
                      :stroke-width="8"
                      :status="progressOf(row) >= 100 ? 'success' : undefined"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="right" label="待报" min-width="72">
                  <template #default="{ row }">
                    <span class="wr-pending">{{ workerPending(row) }}</span>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="本次报工" min-width="110">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="workerDraft(row).reportQty"
                      controls-position="right"
                      :max="Math.max(workerPending(row), 0)"
                      :min="0"
                      size="small"
                      :disabled="!isAudited(selectedWt) || workerPending(row) <= 0"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="合格" min-width="90">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="workerDraft(row).passQty"
                      controls-position="right"
                      :max="workerDraft(row).reportQty"
                      :min="0"
                      size="small"
                      :disabled="!workerDraft(row).reportQty"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="不良" min-width="90">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="workerDraft(row).defectQty"
                      controls-position="right"
                      :max="workerDraft(row).reportQty"
                      :min="0"
                      size="small"
                      :disabled="!workerDraft(row).reportQty"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="返工" min-width="90">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="workerDraft(row).reworkQty"
                      controls-position="right"
                      :max="workerDraft(row).reportQty"
                      :min="0"
                      size="small"
                      :disabled="!workerDraft(row).reportQty"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" fixed="right" label="操作" width="72">
                  <template #default="{ row }">
                    <el-button
                      link
                      type="primary"
                      :disabled="!workerDraft(row).reportQty"
                      :loading="reporting"
                      @click="submitOneWorker(row)"
                    >
                      报工
                    </el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty :description="selectedItem ? '暂无人员派工' : '请先选择工序明细'" />
                </template>
              </el-table>
            </div>
            <footer v-if="selectedItem && workerList.length" class="worker-foot">
              <span>已填 {{ filledWorkerCount }} 人 · 合计 {{ batchReportSum }} · 待报 {{ pendingWorkerCount }} 人</span>
              <div>
                <el-button :disabled="!pendingWorkerCount" plain type="warning" @click="fillAllPendingWorkers">一键报满</el-button>
                <el-button link type="info" @click="openRecords(selectedItem)">报工记录</el-button>
                <el-button :disabled="!filledWorkerCount" :loading="reporting" type="primary" @click="submitBatchWorkers">
                  提交报工
                </el-button>
              </div>
            </footer>
          </div>
        </template>

        <div v-else class="dp-hint">
          <el-empty description="点选上方派工单后，展开工序明细与报工区" :image-size="80" />
        </div>
      </div>
    </div>

    <report-records-dialog
      v-model="recordsVisible"
      :prc-name="recordsCtx.prcName"
      :title-hint="recordsCtx.hint"
      :wo-no="recordsCtx.woNo"
      :wt-no="recordsCtx.wtNo"
    />

    <batch-report-drawer
      v-model="batchDrawerVisible"
      :wt-info="selectedWt"
      :wt-no="selectedWt?.wtNo"
      @success="onBatchReportSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
import { Grid, Refresh, Search } from '@element-plus/icons-vue'
import BatchReportDrawer from './vabAutoComponents/BatchReportDrawer.vue'
import DispatchWtItemColumns from '../shared/DispatchWtItemColumns.vue'
import ReportRecordsDialog from './vabAutoComponents/ReportRecordsDialog.vue'
import { getWtItems, getWtList, getWtWorkers } from '/@/api/procurement/dispatch'
import type { DispatchReportPayload } from '/@/api/procurement/workReport'
import {
  submitDispatchReport,
  submitDispatchReportBatch,
  validateDispatchReport,
} from '/@/api/procurement/workReport'
import { $baseMessage } from '/@/hooks'
import { useListColumns } from '/@/hooks/useListColumns'
import { sortNewestFirst } from '/@/utils/bladeAdapter'

defineOptions({ name: 'DispatchReportManagement' })

const { visible } = useListColumns('dispatch')
const { visible: visibleWorker } = useListColumns('dispatchWorker')

const queryForm = reactive({
  pageNo: 1,
  pageSize: 50,
  wtNo: '',
  moNo: '',
  cFlag: '1',
  ifClose: '',
  finishFlag: '',
})

const listLoading = ref(false)
const itemLoading = ref(false)
const workerLoading = ref(false)
const reporting = ref(false)
const progressWorkersLoading = ref(false)
const masterList = ref<any[]>([])
const itemList = ref<any[]>([])
const workerList = ref<any[]>([])
const workersByItem = reactive<Record<string, any[]>>({})
const total = ref(0)
const selectedWt = ref<any>(null)
const selectedItem = ref<any>(null)
const checkedItems = ref<any[]>([])
const masterTableRef = ref<any>(null)
const itemTableRef = ref<any>(null)
const detailTab = ref<'items' | 'progress'>('items')
const workerDrafts = reactive<Record<string, { reportQty: number; passQty: number; defectQty: number; reworkQty: number }>>({})

const recordsVisible = ref(false)
const batchDrawerVisible = ref(false)
const recordsCtx = reactive({ wtNo: '', woNo: '', prcName: '', hint: '' })

/** 有选中派工单才展开明细 */
const showDetail = computed(() => Boolean(selectedWt.value?.wtNo))

const paneRatios = reactive([5, 4, 3])
const paneResizing = ref(-1)
const resizeStartY = ref(0)
const resizeStartRatio = ref([0, 0])

const pendingItemCount = computed(() =>
  itemList.value.filter((r) => Math.max(0, num(r.wtQty) - num(r.fnQty)) > 0).length
)

const pendingWorkerCount = computed(() => workerList.value.filter((w) => workerPending(w) > 0).length)

const statCards = computed(() => [
  { key: 'items', label: '工序', value: itemList.value.length },
  { key: 'pending', label: '待报工序', value: pendingItemCount.value },
  { key: 'rate', label: '完成率', value: `${itemTotals.value.rate}%` },
  { key: 'workers', label: '当前人员', value: workerTotalCount.value },
])

const itemTotals = computed(() => {
  const wtQty = itemList.value.reduce((s, r) => s + num(r.wtQty), 0)
  const fnQty = itemList.value.reduce((s, r) => s + num(r.fnQty), 0)
  const rate = wtQty > 0 ? Math.round((fnQty / wtQty) * 1000) / 10 : 0
  return { wtQty, fnQty, rate }
})

const workerTotalCount = computed(() => workerList.value.length)

const filledWorkerCount = computed(
  () => workerList.value.filter((w) => num(workerDraft(w).reportQty) > 0).length
)

const batchReportSum = computed(() =>
  workerList.value.reduce((s, w) => s + num(workerDraft(w).reportQty), 0)
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

const itemProgress = (row: any) => {
  const wt = num(row.wtQty)
  if (wt <= 0) return 0
  return Math.min(100, Math.round((num(row.fnQty) / wt) * 100))
}

const workerPending = (row: any) => Math.max(0, num(row.planQty) - num(row.fnQty))

/** 已完工计件数量：兼容后端多种字段名 */
const fnPcsOf = (row: any) =>
  row?.fnPcsQty ?? row?.fnPieceQty ?? row?.pieceFnQty ?? row?.fnPcs ?? row?.pcsFnQty ?? 0

const resetWorkerDraft = (row: any) => {
  const pending = workerPending(row)
  const qty = pending > 0 ? pending : 0
  const d = workerDraft(row)
  d.reportQty = qty
  d.passQty = qty
  d.defectQty = 0
  d.reworkQty = 0
}

const initWorkerDraftsForList = (list: any[]) => {
  for (const w of list) {
    if (workerPending(w) > 0) resetWorkerDraft(w)
  }
}

const workerDraft = (row: any) => {
  const key = workerRowKey(row)
  if (!workerDrafts[key]) {
    workerDrafts[key] = { reportQty: 0, passQty: 0, defectQty: 0, reworkQty: 0 }
    resetWorkerDraft(row)
  }
  return workerDrafts[key]
}

const tagType = (label: string) => {
  const s = String(label || '')
  if (['已审核', '已完成', '已结案'].includes(s)) return 'success'
  if (['部分完成', '未审核'].includes(s)) return 'warning'
  if (['已作废', '作废'].includes(s)) return 'danger'
  return 'info'
}

const flagText = (v: any) => String(v ?? '').trim()

const isAudited = (row: any) => {
  const s = flagText(row?.cFlag)
  return s === '1' || s.includes('已审核')
}

const itemRowKey = (row: any) =>
  `${row.wtNo}-${row.sNo}-${row.woNo}-${row.moNo}-${row.goodsId}-${row.prcCode}`

const selectedItemKey = computed(() => (selectedItem.value ? itemRowKey(selectedItem.value) : ''))

const workerRowKey = (row: any) =>
  `${row.empNo}-${row.moNo}-${row.goodsId}-${row.prcCode}-${row.woNo}`

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
}

const fetchMaster = async () => {
  listLoading.value = true
  try {
    const { data } = await getWtList(queryForm)
    masterList.value = sortNewestFirst(data.list || [], 'wtNo')
    total.value = data.total || 0
    clearDetail()
  } catch (e: any) {
    masterList.value = []
    total.value = 0
    $baseMessage(e?.message || '加载派工单失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const clearDetail = () => {
  selectedWt.value = null
  selectedItem.value = null
  itemList.value = []
  workerList.value = []
  checkedItems.value = []
  Object.keys(workerDrafts).forEach((k) => delete workerDrafts[k])
  Object.keys(workersByItem).forEach((k) => delete workersByItem[k])
}

const loadItems = async (wtNo: string) => {
  itemLoading.value = true
  selectedItem.value = null
  workerList.value = []
  checkedItems.value = []
  Object.keys(workerDrafts).forEach((k) => delete workerDrafts[k])
  Object.keys(workersByItem).forEach((k) => delete workersByItem[k])
  try {
    itemList.value = await getWtItems(wtNo)
    if (detailTab.value === 'progress') ensureProgressWorkers()
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
  Object.keys(workerDrafts).forEach((k) => delete workerDrafts[k])
  try {
    const list = await getWtWorkers({
      wtNo: selectedWt.value.wtNo,
      woNo: item.woNo,
      moNo: item.moNo,
      goodsId: item.goodsId,
      prcCode: item.prcCode,
      woBorSno: item.woBorSno,
    })
    workerList.value = list
    workersByItem[itemRowKey(item)] = list
    initWorkerDraftsForList(list)
  } catch (e: any) {
    workerList.value = []
    $baseMessage(e?.message || '加载人员派工失败', 'error', 'hey')
  } finally {
    workerLoading.value = false
  }
}

const ensureProgressWorkers = async () => {
  if (!selectedWt.value?.wtNo || !itemList.value.length) return
  progressWorkersLoading.value = true
  try {
    await Promise.all(
      itemList.value.map(async (item) => {
        const key = itemRowKey(item)
        if (workersByItem[key]?.length) return
        workersByItem[key] = await getWtWorkers({
          wtNo: selectedWt.value.wtNo,
          woNo: item.woNo,
          moNo: item.moNo,
          goodsId: item.goodsId,
          prcCode: item.prcCode,
          woBorSno: item.woBorSno,
        })
      })
    )
  } catch {
    // 进度汇总加载失败不阻断主流程
  } finally {
    progressWorkersLoading.value = false
  }
}

const onItemSelectionChange = (rows: any[]) => {
  checkedItems.value = rows || []
}

const handleMasterClick = (row: any) => {
  if (!row?.wtNo) return
  const same = selectedWt.value?.wtNo === row.wtNo
  selectedWt.value = row
  nextTick(() => {
    masterTableRef.value?.setCurrentRow?.(row)
  })
  if (!same) {
    loadItems(row.wtNo)
    // 抽屉打开时切换单号会由 BatchReportDrawer watch(wtNo) 自动 reload
  }
}

const handleItemClick = (row: any) => {
  selectItem(row)
}

const handleProgressCardClick = (row: any) => {
  selectItem(row)
}

const selectItem = async (row: any) => {
  if (!row) return
  selectedItem.value = row
  nextTick(() => {
    itemTableRef.value?.setCurrentRow?.(row)
  })
  await loadWorkers(row)
}

const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const applyLocalReport = (qty: number, empNo?: string) => {
  if (selectedItem.value) {
    selectedItem.value.fnQty = num(selectedItem.value.fnQty) + qty
    const idx = itemList.value.findIndex((r) => itemRowKey(r) === itemRowKey(selectedItem.value))
    if (idx >= 0) itemList.value[idx] = { ...selectedItem.value }
  }
  if (empNo) {
    const w = workerList.value.find((x) => x.empNo === empNo)
    if (w) w.fnQty = num(w.fnQty) + qty
  }
}

const openRecords = (item: any) => {
  recordsCtx.wtNo = selectedWt.value?.wtNo || ''
  recordsCtx.woNo = item?.woNo || ''
  recordsCtx.prcName = item?.prcName || ''
  recordsCtx.hint = [selectedWt.value?.wtNo, item?.prcName, item?.woNo].filter(Boolean).join(' · ')
  recordsVisible.value = true
}

const buildWorkerPayload = (row: any): DispatchReportPayload | string => {
  if (!selectedWt.value || !selectedItem.value) return '请先选择工序'
  const draft = workerDraft(row)
  const payload: DispatchReportPayload = {
    wtNo: selectedWt.value.wtNo,
    woNo: selectedItem.value.woNo,
    moNo: selectedItem.value.moNo,
    goodsName: selectedItem.value.goodsName,
    prcCode: selectedItem.value.prcCode,
    prcName: selectedItem.value.prcName,
    empNo: row.empNo,
    empName: row.empName,
    pendingQty: workerPending(row),
    reportQty: num(draft.reportQty),
    passQty: num(draft.passQty),
    defectQty: num(draft.defectQty),
    reworkQty: num(draft.reworkQty),
    reportTime: nowStr(),
    reportMethod: '批量报工',
  }
  if (payload.passQty + payload.defectQty + payload.reworkQty !== payload.reportQty) {
    payload.passQty = Math.max(0, payload.reportQty - payload.defectQty - payload.reworkQty)
  }
  return validateDispatchReport(payload) || payload
}

const fillAllPendingWorkers = () => {
  for (const w of workerList.value) {
    if (workerPending(w) > 0) resetWorkerDraft(w)
  }
}

const applyBatchLocalReport = (payloads: DispatchReportPayload[]) => {
  for (const p of payloads) {
    if (selectedItem.value && p.woNo === selectedItem.value.woNo && p.prcCode === selectedItem.value.prcCode) {
      applyLocalReport(p.reportQty, p.empNo)
    }
    const item = itemList.value.find((r) => r.woNo === p.woNo && r.prcCode === p.prcCode)
    if (item) item.fnQty = num(item.fnQty) + p.reportQty
    const key = item ? itemRowKey(item) : ''
    const workers = key ? workersByItem[key] : []
    const w = workers?.find((x) => x.empNo === p.empNo)
    if (w) w.fnQty = num(w.fnQty) + p.reportQty
  }
}

const submitOneWorker = async (row: any) => {
  if (!isAudited(selectedWt.value)) {
    $baseMessage('请先审核派工单后再报工', 'warning', 'hey')
    return
  }
  const built = buildWorkerPayload(row)
  if (typeof built === 'string') {
    $baseMessage(built, 'warning', 'hey')
    return
  }
  reporting.value = true
  try {
    const res = await submitDispatchReport(built)
    applyLocalReport(built.reportQty, row.empNo)
    resetWorkerDraft(row)
    $baseMessage(`报工成功：${res.reportNo}`, 'success', 'hey')
  } catch (e: any) {
    $baseMessage(e?.message || '报工失败', 'error', 'hey')
  } finally {
    reporting.value = false
  }
}

const submitBatchWorkers = async () => {
  if (!isAudited(selectedWt.value)) {
    $baseMessage('请先审核派工单后再报工', 'warning', 'hey')
    return
  }
  const rows = workerList.value.filter((w) => num(workerDraft(w).reportQty) > 0)
  if (!rows.length) {
    $baseMessage('请先填写本次报工数量', 'warning', 'hey')
    return
  }
  const payloads: DispatchReportPayload[] = []
  for (const row of rows) {
    const built = buildWorkerPayload(row)
    if (typeof built === 'string') {
      $baseMessage(`${row.empName || row.empNo}：${built}`, 'warning', 'hey')
      continue
    }
    payloads.push(built)
  }
  if (!payloads.length) return

  reporting.value = true
  try {
    const res = await submitDispatchReportBatch({ payloads })
    applyBatchLocalReport(payloads)
    for (const row of rows) resetWorkerDraft(row)
    $baseMessage(`已提交 ${res.successCount} 人报工`, 'success', 'hey')
  } catch (e: any) {
    $baseMessage(e?.message || '批量报工失败', 'error', 'hey')
  } finally {
    reporting.value = false
  }
}

const oneClickSubmitCurrent = async () => {
  fillAllPendingWorkers()
  await submitBatchWorkers()
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchMaster()
}

const openBatchReport = () => {
  if (!selectedWt.value?.wtNo) {
    $baseMessage('请先选择派工单', 'warning', 'hey')
    return
  }
  if (!isAudited(selectedWt.value)) {
    $baseMessage('仅已审核派工单可批量报工', 'warning', 'hey')
    return
  }
  batchDrawerVisible.value = true
}

const onBatchReportSuccess = async () => {
  if (!selectedWt.value?.wtNo) return
  await loadItems(selectedWt.value.wtNo)
  if (selectedItem.value) await loadWorkers(selectedItem.value)
  if (detailTab.value === 'progress') ensureProgressWorkers()
}

const router = useRouter()

const goQuickDispatch = () => {
  const moNo = selectedWt.value?.moNo || queryForm.moNo
  router.push({
    path: '/procurement/quickDispatch/index',
    query: moNo ? { moNo } : {},
  })
}

const resetQuery = () => {
  queryForm.wtNo = ''
  queryForm.moNo = ''
  queryForm.cFlag = '1'
  queryForm.ifClose = ''
  queryForm.finishFlag = ''
  queryForm.pageNo = 1
  fetchMaster()
}

watch(detailTab, (tab) => {
  if (tab === 'progress') ensureProgressWorkers()
})

onBeforeMount(() => fetchMaster())
onBeforeUnmount(() => {
  stopPaneResize()
})
</script>

<style lang="scss" scoped>
.dr-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.dr-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f4c75 0%, #1a6fb5 48%, #2d9cdb 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgb(26 111 181 / 18%);

  &__text {
    h1 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    p {
      margin: 0;
      font-size: 13px;
      opacity: 0.88;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.dr-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.dr-stat {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e3ecf5;
  background: linear-gradient(180deg, #f8fbff, #fff);

  em {
    display: block;
    font-style: normal;
    font-size: 12px;
    color: #7a8b9a;
  }

  strong {
    font-size: 20px;
    color: #1a3a52;
    font-variant-numeric: tabular-nums;
  }

  &--pending strong {
    color: #e6a23c;
  }

  &--rate strong {
    color: #1a6fb5;
  }
}

.dp-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dp-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dp-hint {
  flex: 1;
  display: grid;
  place-items: center;
  border: 1px dashed #d5e0e8;
  border-radius: 10px;
  background: #f8fafc;
}

.wt-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef6fc 0%, #f7fafc 100%);
  border: 1px solid #d4e4f2;

  &__id {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;

    .label {
      font-size: 12px;
      color: #7a8b9a;
    }

    strong {
      font-size: 15px;
      color: #1a6fb5;
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
    color: #5f6f7a;
  }

  &__kpi {
    margin-left: auto;
    display: inline-flex;
    gap: 14px;
    font-size: 12px;
    color: #1a6fb5;
    font-variant-numeric: tabular-nums;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
}

.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #d9e4ef;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.pane-master {
  flex: 1 1 0;
  min-height: 180px;

  &.is-solo {
    flex: 1;
  }
}

.pane-items,
.pane-workers {
  min-height: 120px;
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  color: #1a3a52;
  background: #f4f8fc;
  border-bottom: 1px solid #e3ecf5;

  em {
    font-style: normal;
    font-size: 12px;
    color: #7a8b9a;
  }

  &--tabs {
    gap: 12px;
  }
}

.table-wrap {
  flex: 1;
  min-height: 88px;
  overflow: hidden;

  :deep(.el-table) {
    --el-table-current-row-bg-color: #e8f2fb;
    --el-table-header-bg-color: #f4f8fc;
  }

  :deep(.el-radio) {
    height: auto;
    margin-right: 0;

    .el-radio__label {
      display: none;
    }
  }

  :deep(.el-progress__text) {
    font-size: 12px;
  }

  :deep(.el-input-number) {
    width: 96px;
  }
}

.wr-pending {
  color: #f56c6c;
  font-weight: 600;
}

.worker-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #eef2f6;
  background: #fafcff;
  font-size: 12px;
  color: #606266;
}

.progress-summary {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  padding: 12px;

  &__card {
    padding: 12px;
    border: 1px solid #e3ecf5;
    border-radius: 10px;
    background: linear-gradient(180deg, #f8fbff, #fff);
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: #b3d4f5;
      box-shadow: 0 2px 8px rgb(26 58 82 / 8%);
    }

    &.is-active {
      border-color: #1a6fb5;
      box-shadow: 0 0 0 1px rgb(26 111 181 / 18%);
      background: linear-gradient(180deg, #eef6fc, #fff);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    p {
      margin: 0 0 8px;
      font-size: 12px;
      color: #909399;
    }
  }

  &__nums {
    display: flex;
    gap: 10px;
    margin-top: 8px;
    font-size: 12px;
    color: #606266;

    .is-pending {
      color: #f56c6c;
      font-weight: 600;
    }
  }

  &__workers {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      gap: 8px;
      align-items: center;
      font-size: 11px;

      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #303133;
      }

      em {
        font-style: normal;
        color: #909399;
        font-variant-numeric: tabular-nums;
      }
    }
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
    background: #c5d0d9;
  }

  &:hover {
    background: rgba(26, 111, 181, 0.06);
    &::after {
      background: #1a6fb5;
      width: 72px;
    }
  }
}

@media (max-width: 1280px) {
  .progress-summary {
    grid-template-columns: 1fr;
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
