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
    </div>

    <div class="pane-stack">
      <div class="pane" :style="{ flex: `${paneRatios[0]} 1 0px` }">
        <div class="pane-head">
          <span>派工单</span>
          <em>{{ total }} 张</em>
        </div>
        <div class="table-wrap">
          <el-table
            v-loading="listLoading"
            border
            highlight-current-row
            height="100%"
            :data="masterList"
            row-key="wtNo"
            @row-click="handleMasterClick"
          >
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
        <div class="table-wrap">
          <el-table
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
            <el-table-column label="制令号" min-width="150" prop="moNo" show-overflow-tooltip />
            <el-table-column label="品号" min-width="110" prop="goodsCode" show-overflow-tooltip />
            <el-table-column label="品名" min-width="160" prop="goodsName" show-overflow-tooltip />
            <el-table-column label="货品类型" min-width="90" prop="goodsType" />
            <el-table-column label="规格尺寸" min-width="120" prop="sizeDesc" show-overflow-tooltip />
            <el-table-column label="标准单位" min-width="90" prop="unitCode" />
            <el-table-column label="制程名称" min-width="110" prop="mrName" show-overflow-tooltip />
            <el-table-column align="center" label="加工顺序" min-width="90" prop="machiningSNo" />
            <el-table-column label="工序代号" min-width="90" prop="prcCode" />
            <el-table-column label="工序名称" min-width="100" prop="prcName" show-overflow-tooltip />
            <el-table-column label="工单BOR序号" min-width="120" prop="woBorSno" />
            <el-table-column align="right" label="加工单价" min-width="90">
              <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
            </el-table-column>
            <el-table-column align="right" label="派工数量" min-width="90">
              <template #default="{ row }">{{ fmtNum(row.wtQty) }}</template>
            </el-table-column>
            <el-table-column align="right" label="完工数量" min-width="90">
              <template #default="{ row }">{{ fmtNum(row.fnQty) }}</template>
            </el-table-column>
            <el-table-column label="工单号" min-width="120" prop="woNo" show-overflow-tooltip />
            <template #empty>
              <el-empty :description="selectedWt ? '暂无工序明细' : '请先选择派工单'" />
            </template>
          </el-table>
        </div>
      </div>

      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 1)" />

      <div class="pane" :style="{ flex: `${paneRatios[2]} 1 0px` }">
        <div class="pane-head">
          <span>人员派工</span>
          <em>{{ selectedItem ? `${workerList.length} 人` : '点选工序明细' }}</em>
        </div>
        <div class="table-wrap">
          <el-table
            v-loading="workerLoading"
            border
            height="100%"
            :data="workerList"
            :row-key="workerRowKey"
          >
            <el-table-column v-if="visibleWorker('empNo')" label="工号" min-width="110" prop="empNo" />
            <el-table-column v-if="visibleWorker('empName')" label="姓名" min-width="90" prop="empName" />
            <el-table-column v-if="visibleWorker('deptCode')" label="实际生产部门代号" min-width="140" prop="deptCode" />
            <el-table-column v-if="visibleWorker('deptName')" label="实际生产部门名称" min-width="150" prop="deptName" show-overflow-tooltip />
            <el-table-column v-if="visibleWorker('planQty')" align="right" label="计划加工数量" min-width="120">
              <template #default="{ row }">{{ fmtNum(row.planQty) }}</template>
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
            <el-table-column v-if="visibleWorker('workGpName')" label="加工小组" min-width="110" prop="workGpName" show-overflow-tooltip />
            <el-table-column v-if="visibleWorker('assistEmpNo')" label="辅助人员工号" min-width="120" prop="assistEmpNo" />
            <el-table-column v-if="visibleWorker('assistEmpName')" label="辅助人员姓名" min-width="120" prop="assistEmpName" />
            <el-table-column v-if="visibleWorker('assistRate')" align="right" label="辅助补贴比例 (%)" min-width="140">
              <template #default="{ row }">{{ fmtNum(row.assistRate) }}</template>
            </el-table-column>
            <el-table-column v-if="visibleWorker('fnQty')" align="right" label="已完工数量" min-width="110">
              <template #default="{ row }">{{ fmtNum(row.fnQty) }}</template>
            </el-table-column>
            <el-table-column v-if="visibleWorker('fnStatus')" align="center" label="已完工状态" min-width="110">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" :type="progressOf(row) >= 100 ? 'success' : 'info'">
                  {{ progressOf(row) >= 100 ? '已完工' : '进行中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="visibleWorker('fnStdTime')" align="right" label="完工标准工时" min-width="130">
              <template #default="{ row }">{{ fmtNum(row.fnStdTime, 4) }}</template>
            </el-table-column>
            <el-table-column v-if="visibleWorker('remark')" label="备注" min-width="140" prop="remark" show-overflow-tooltip />
            <template #empty>
              <el-empty :description="selectedItem ? '暂无人员派工' : '请先选择工序明细'" />
            </template>
          </el-table>
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
  </div>
</template>

<script lang="ts" setup>
import { Refresh, Search } from '@element-plus/icons-vue'
import { getWtItems, getWtList, getWtWorkers } from '/@/api/procurement/dispatch'
import { $baseMessage } from '/@/hooks'
import { useListColumns } from '/@/hooks/useListColumns'

defineOptions({ name: 'DispatchManagement' })

const { visible } = useListColumns('dispatch')
const { visible: visibleWorker } = useListColumns('dispatchWorker')

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
const workersByItem = reactive<Record<string, any[]>>({})

const paneRatios = reactive([4, 4, 3, 3])
const paneResizing = ref(-1)
const resizeStartY = ref(0)
const resizeStartRatio = ref([0, 0])

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
  if (['部分完成'].includes(s)) return 'warning'
  if (['已作废', '作废'].includes(s)) return 'danger'
  return 'info'
}

const itemRowKey = (row: any) =>
  `${row.wtNo}-${row.sNo}-${row.woNo}-${row.moNo}-${row.goodsId}-${row.prcCode}`

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
    masterList.value = data.list || []
    total.value = data.total || 0
    selectedWt.value = null
    selectedItem.value = null
    itemList.value = []
    workerList.value = []
    checkedItems.value = []
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
onBeforeUnmount(() => stopPaneResize())
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

.table-wrap {
  flex: 1;
  min-height: 88px;
  overflow: hidden;

  :deep(.el-table) {
    --el-table-current-row-bg-color: #e8f4ec;
    --el-table-header-bg-color: #f4f8f5;
  }

  :deep(.el-progress__text) {
    font-size: 12px;
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
