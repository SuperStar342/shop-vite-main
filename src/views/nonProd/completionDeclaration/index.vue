<template>
  <div class="cd-page auto-height-container">
    <section class="cd-hero">
      <div v-for="card in statCards" :key="card.key" class="cd-stat" :class="`cd-stat--${card.key}`">
        <div class="cd-stat__icon">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <div class="cd-stat__body">
          <span class="cd-stat__label">{{ card.label }}</span>
          <strong class="cd-stat__value">{{ card.value }}</strong>
        </div>
      </div>
    </section>

    <section class="cd-main">
      <header class="cd-main__head">
        <el-tabs v-model="activeTab" class="cd-tabs">
          <el-tab-pane label="申报列表" name="list" />
          <el-tab-pane label="申报统计" name="stats" />
        </el-tabs>
        <div class="cd-main__actions">
          <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
        </div>
      </header>

      <div v-show="activeTab === 'list'" class="cd-list-pane">
        <div class="cd-filter">
          <el-form inline :model="queryForm" @submit.prevent>
            <el-form-item label="完工日期">
              <el-date-picker
                v-model="dateRange"
                clearable
                end-placeholder="结束"
                range-separator="至"
                start-placeholder="开始"
                style="width: 250px"
                type="daterange"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryForm.auditStatus" clearable placeholder="审核状态" style="width: 120px">
                <el-option label="已审核" value="已审核" />
                <el-option label="未审核" value="未审核" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryForm.deptId" clearable filterable placeholder="部门" style="width: 160px">
                <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-input
                v-model.trim="queryForm.keyword"
                clearable
                placeholder="单号 / 部门 / 备注 / 创建人"
                style="width: 220px"
                @keyup.enter="queryData"
              />
            </el-form-item>
            <el-form-item>
              <el-button :icon="Search" :loading="loading" type="primary" @click="queryData">查询</el-button>
              <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="cd-table-wrap">
          <el-table
            v-loading="loading"
            border
            class="cd-table"
            :data="list"
            height="100%"
            highlight-current-row
            stripe
            @row-click="(row: CompletionRow) => openDetail(row)"
            @row-dblclick="(row: CompletionRow) => openDetail(row)"
          >
            <el-table-column label="序号" type="index" width="54" />
            <el-table-column fixed label="完工确认单号" min-width="160" prop="fnNo">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="openDetail(row)">{{ row.fnNo }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="部门名称" min-width="130" prop="deptName" show-overflow-tooltip />
            <el-table-column label="完工日期" min-width="110" prop="fnDate" />
            <el-table-column label="审核状态" min-width="90" prop="auditStatus">
              <template #default="{ row }">
                <el-tag effect="light" round size="small" :type="auditTagType(row.auditStatus)">
                  {{ row.auditStatus || '—' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140" prop="remark" show-overflow-tooltip />
            <el-table-column label="作业回单" min-width="110" prop="workReceipt" show-overflow-tooltip />
            <el-table-column label="作业人" min-width="90" prop="workerName" />
            <el-table-column label="作业人代码" min-width="110" prop="workerCode" />
            <el-table-column label="财务核对状态" min-width="110" prop="accountantStatus">
              <template #default="{ row }">
                <el-tag effect="plain" round size="small" :type="row.accountantStatus === '是' ? 'success' : 'info'">
                  {{ row.accountantStatus || '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="财务核对人" min-width="100" prop="accountant" />
            <el-table-column label="财务核对时间" min-width="160" prop="accountantDate" />
            <el-table-column label="创建人" min-width="90" prop="creator" />
            <el-table-column label="创建日期" min-width="160" prop="createDate" />
            <el-table-column label="审核人" min-width="90" prop="approver" />
            <el-table-column fixed="right" label="操作" width="140">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="openDetail(row)">查看</el-button>
                <el-dropdown trigger="click" @command="(cmd: string) => handleRowAction(cmd, row)">
                  <el-button link type="primary" @click.stop>更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="row.auditStatus !== '已审核'" command="audit">审核</el-dropdown-item>
                      <el-dropdown-item v-if="row.auditStatus === '已审核'" command="unaudit">反审核</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <footer class="cd-pager">
          <vab-pagination
            :current-page="queryForm.pageNo"
            :page-size="queryForm.pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="total"
            @current-change="(p: number) => { queryForm.pageNo = p; fetchList() }"
            @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchList() }"
          />
        </footer>
      </div>

      <div v-show="activeTab === 'stats'" class="cd-stats-pane">
        <div class="cd-stats-grid">
          <article v-for="card in statCards" :key="'s-' + card.key" class="cd-stats-card">
            <div class="cd-stats-card__head">
              <el-icon><component :is="card.icon" /></el-icon>
              <span>{{ card.label }}</span>
            </div>
            <strong class="cd-stats-card__num">{{ card.value }}</strong>
            <p class="cd-stats-card__hint">{{ card.hint }}</p>
          </article>
        </div>
        <div class="cd-stats-bar">
          <div class="cd-stats-bar__label">审核占比</div>
          <el-progress :percentage="auditPercent" :stroke-width="14" :text-inside="true" striped striped-flow />
          <div class="cd-stats-bar__meta">
            <span>已审核 {{ stats.auditedCount }}</span>
            <span>未审核 {{ stats.pendingCount }}</span>
          </div>
        </div>
      </div>
    </section>

    <el-drawer
      v-model="drawerOpen"
      class="cd-drawer"
      :destroy-on-close="false"
      direction="rtl"
      size="86%"
      :title="drawerTitle"
      @closed="onDrawerClosed"
    >
      <div v-loading="detailLoading" class="cd-drawer__body">
        <template v-if="detail">
          <header class="cd-drawer__hero">
            <div>
              <p class="cd-drawer__no">{{ detail.fnNo }}</p>
              <p class="cd-drawer__sub">{{ detail.deptName }} · {{ detail.fnDate }}</p>
            </div>
            <div class="cd-drawer__tags">
              <el-tag effect="dark" round :type="auditTagType(detail.auditStatus)">{{ detail.auditStatus }}</el-tag>
              <el-tag effect="plain" round :type="detail.accountantStatus === '是' ? 'success' : 'info'">
                财务核对：{{ detail.accountantStatus || '否' }}
              </el-tag>
            </div>
          </header>

          <div class="cd-kpi">
            <div v-for="kpi in kpiCards" :key="kpi.label" class="cd-kpi__item" :style="{ '--kpi-color': kpi.color }">
              <span class="cd-kpi__label">{{ kpi.label }}</span>
              <strong class="cd-kpi__value">{{ kpi.value }}</strong>
            </div>
          </div>

          <section class="cd-info">
            <h3>申报信息</h3>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="完工确认单号">{{ detail.fnNo }}</el-descriptions-item>
              <el-descriptions-item label="部门名称">{{ detail.deptName }}</el-descriptions-item>
              <el-descriptions-item label="完工日期">{{ detail.fnDate }}</el-descriptions-item>
              <el-descriptions-item label="审核状态">{{ detail.auditStatus }}</el-descriptions-item>
              <el-descriptions-item label="作业回单">{{ detail.workReceipt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="作业人">{{ detail.workerName || '—' }}</el-descriptions-item>
              <el-descriptions-item label="作业人代码">{{ detail.workerCode || '—' }}</el-descriptions-item>
              <el-descriptions-item label="财务核对状态">{{ detail.accountantStatus || '否' }}</el-descriptions-item>
              <el-descriptions-item label="财务核对人">{{ detail.accountant || '—' }}</el-descriptions-item>
              <el-descriptions-item label="财务核对时间">{{ detail.accountantDate || '—' }}</el-descriptions-item>
              <el-descriptions-item label="创建人">{{ detail.creator }}</el-descriptions-item>
              <el-descriptions-item label="审核人">{{ detail.approver || '—' }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="3">
                <el-input
                  v-if="detail.auditStatus !== '已审核' && editingRemark"
                  v-model="remarkDraft"
                  maxlength="200"
                  :rows="2"
                  show-word-limit
                  type="textarea"
                />
                <span v-else>{{ detail.remark || '—' }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="cd-timeline">
            <h3>操作记录</h3>
            <el-timeline>
              <el-timeline-item v-if="detail.createDate" :timestamp="detail.createDate" type="primary">
                {{ detail.creator }} 创建申报
              </el-timeline-item>
              <el-timeline-item v-if="detail.appDate" :timestamp="detail.appDate" type="success">
                {{ detail.approver }} 审核通过
              </el-timeline-item>
              <el-timeline-item v-if="detail.accountantDate" :timestamp="detail.accountantDate" type="warning">
                {{ detail.accountant }} 财务核对
              </el-timeline-item>
            </el-timeline>
          </section>

          <section class="cd-detail-tabs">
            <el-tabs v-model="detailTab">
              <el-tab-pane :label="`派工明细 (${detail.items?.length || 0})`" name="items">
                <el-table
                  border
                  :data="detail.items || []"
                  highlight-current-row
                  max-height="320"
                  size="small"
                  stripe
                  @current-change="onItemSelect"
                >
                  <el-table-column fixed label="派工单号" min-width="150" prop="owtNo" />
                  <el-table-column label="序号" prop="sNo" width="60" />
                  <el-table-column label="派工类型解释" min-width="110" prop="pwSortName" />
                  <el-table-column label="单据名称" min-width="100" prop="receiptName" show-overflow-tooltip />
                  <el-table-column label="品号" min-width="110" prop="goodsCode" show-overflow-tooltip />
                  <el-table-column label="计价类型" min-width="90" prop="pieceType" />
                  <el-table-column label="单位" prop="unit" width="60" />
                  <el-table-column align="right" label="本次完工数量" prop="fnQty" width="110">
                    <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="派工数量" prop="planQty" width="90">
                    <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
                  </el-table-column>
                  <el-table-column label="分配方式" min-width="130" prop="assignType" show-overflow-tooltip />
                  <el-table-column label="是否超外发分配" prop="ifRedivide" width="120" />
                  <el-table-column label="行号" prop="owtFnSNo" width="60" />
                  <el-table-column label="单据代码" min-width="100" prop="receiptCode" />
                  <el-table-column label="加工说明" min-width="120" prop="madeDesc" show-overflow-tooltip />
                  <el-table-column label="计划完工日期" min-width="120" prop="planDate" />
                  <el-table-column label="备注" min-width="100" prop="itemRemark" show-overflow-tooltip />
                  <el-table-column label="壳外品定制线号" min-width="130" prop="cstlotNo" show-overflow-tooltip />
                  <el-table-column label="品名" min-width="140" prop="goodsName" show-overflow-tooltip />
                  <el-table-column label="作业属性" min-width="90" prop="workAttr" />
                  <el-table-column align="right" label="工序单价" prop="prcUp" width="90">
                    <template #default="{ row }">{{ formatNum(row.prcUp) }}</template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
              <el-tab-pane :label="`人员明细 (${filteredWorkers.length})`" name="workers">
                <div v-if="selectedItem" class="cd-worker-filter">
                  当前派工：{{ selectedItem.owtNo }}
                  <el-button link type="primary" @click="clearItemSelect">显示全部人员</el-button>
                </div>
                <el-table border :data="filteredWorkers" max-height="320" size="small" stripe>
                  <el-table-column label="部门名称" min-width="110" prop="deptName" />
                  <el-table-column label="员工代码" min-width="100" prop="empNo" />
                  <el-table-column label="姓名" min-width="80" prop="empName" />
                  <el-table-column align="right" label="派工数量" prop="planQty" width="90">
                    <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="完工余量" prop="remainQty" width="90">
                    <template #default="{ row }">{{ formatNum(row.remainQty) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="本次完工数量" prop="fnQty" width="110">
                    <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
                  </el-table-column>
                  <el-table-column label="最后远计单据号" min-width="130" prop="wagePeriod" show-overflow-tooltip />
                  <el-table-column label="计价规则" min-width="90" prop="ifWage" />
                  <el-table-column align="right" label="本次计件数量" prop="wageQty" width="110">
                    <template #default="{ row }">{{ formatNum(row.wageQty) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="分配系数" prop="allotmentRate" width="90">
                    <template #default="{ row }">{{ formatNum(row.allotmentRate) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="单价系数" prop="upRate" width="90">
                    <template #default="{ row }">{{ formatNum(row.upRate) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="计价金额" prop="wageAmt" width="90">
                    <template #default="{ row }">{{ formatNum(row.wageAmt) }}</template>
                  </el-table-column>
                  <el-table-column align="right" label="实际工时(小时)" prop="workTime" width="120">
                    <template #default="{ row }">{{ formatNum(row.workTime) }}</template>
                  </el-table-column>
                  <el-table-column label="加工单元名称" min-width="120" prop="workGpName" show-overflow-tooltip />
                  <el-table-column label="加工单元代码" min-width="120" prop="workGpCode" />
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </section>
        </template>
      </div>

      <template #footer>
        <div class="cd-drawer__footer">
          <el-button @click="drawerOpen = false">关闭</el-button>
          <template v-if="detail">
            <el-button v-if="detail.auditStatus !== '已审核' && !editingRemark" @click="startEditRemark">编辑备注</el-button>
            <el-button v-if="editingRemark" :loading="saving" type="primary" @click="saveRemark">保存备注</el-button>
            <el-button v-if="detail.auditStatus !== '已审核'" :loading="auditing" type="primary" @click="doAudit(true)">
              审核
            </el-button>
            <el-button v-if="detail.auditStatus === '已审核'" :loading="auditing" type="warning" @click="doAudit(false)">
              反审核
            </el-button>
          </template>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { CircleCheck, Clock, Document, Refresh, Search, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  auditCompletion,
  getCompletionDeptOptions,
  getCompletionDetail,
  getCompletionList,
  getCompletionStats,
  updateCompletionRemark,
  type CompletionItemRow,
  type CompletionRow,
  type CompletionStats,
  type CompletionWorkerRow,
  type DeptOption,
} from '/@/api/nonProd/completionDeclaration'

defineOptions({
  name: 'CompletionDeclaration',
})

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const auditing = ref(false)
const list = ref<CompletionRow[]>([])
const total = ref(0)
const activeTab = ref('list')
const drawerOpen = ref(false)
const detailTab = ref('items')
const detail = ref<CompletionRow | null>(null)
const selectedItem = ref<CompletionItemRow | null>(null)
const editingRemark = ref(false)
const remarkDraft = ref('')
const deptOptions = ref<DeptOption[]>([])
const stats = ref<CompletionStats>({ totalCount: 0, auditedCount: 0, pendingCount: 0, recentCount: 0 })

/** 默认不限日期，总数与 ERP 全量一致 */
const dateRange = ref<[string, string] | null>(null)

const queryForm = reactive({
  keyword: '',
  deptId: '' as number | '',
  auditStatus: '',
  pageNo: 1,
  pageSize: 50,
})

const drawerTitle = computed(() => (detail.value ? `完工申报 · ${detail.value.fnNo}` : '完工申报详情'))

const auditPercent = computed(() => {
  const t = stats.value.totalCount
  if (!t) return 0
  return Math.round((stats.value.auditedCount / t) * 100)
})

const filteredWorkers = computed(() => {
  const workers = detail.value?.workers || []
  if (!selectedItem.value) return workers
  return workers.filter(
    (w: CompletionWorkerRow) =>
      w.owtNo === selectedItem.value!.owtNo &&
      (w.owtFnSNo === selectedItem.value!.sNo || w.sNo === selectedItem.value!.sNo)
  )
})

const statCards = computed(() => [
  { key: 'total', label: '申报总数', value: stats.value.totalCount, hint: '与 ERP 全量一致（可按日期筛选）', icon: Document },
  { key: 'audited', label: '已审核', value: stats.value.auditedCount, hint: '已完成审核', icon: CircleCheck },
  { key: 'pending', label: '未审核', value: stats.value.pendingCount, hint: '等待处理', icon: Clock },
  { key: 'recent', label: '近30天', value: stats.value.recentCount, hint: '近期新增', icon: TrendCharts },
])

const kpiCards = computed(() => {
  const d = detail.value
  if (!d) return []
  const firstItem = d.items?.[0]
  return [
    { label: '完工数量', value: formatNum(d.totalFnQty), color: '#409eff' },
    { label: '明细行数', value: String(d.itemCount || 0), color: '#67c23a' },
    { label: '计价类型', value: firstItem?.pieceType || '—', color: '#9254de' },
    { label: '分配方式', value: firstItem?.assignType || '—', color: '#e6a23c' },
  ]
})

const auditTagType = (status: string) => {
  if (status === '已审核') return 'success'
  if (status === '未审核' || status === '待审核') return 'warning'
  return 'info'
}

const formatNum = (v: number | undefined) => {
  if (v == null || Number.isNaN(v)) return '0'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 6 })
}

const dateFrom = () => dateRange.value?.[0]
const dateTo = () => dateRange.value?.[1]

const fetchStats = async () => {
  try {
    stats.value = await getCompletionStats(dateFrom(), dateTo())
  } catch {
    stats.value = { totalCount: 0, auditedCount: 0, pendingCount: 0, recentCount: 0 }
  }
}

const fetchDepts = async () => {
  try {
    deptOptions.value = await getCompletionDeptOptions()
  } catch {
    deptOptions.value = []
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await getCompletionList({
      ...queryForm,
      dateFrom: dateFrom(),
      dateTo: dateTo(),
    })
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e: any) {
    list.value = []
    total.value = 0
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchStats(), fetchList()])
}

const queryData = () => {
  queryForm.pageNo = 1
  refreshAll()
}

const resetQuery = () => {
  queryForm.keyword = ''
  queryForm.deptId = ''
  queryForm.auditStatus = ''
  dateRange.value = null
  queryData()
}

const openDetail = async (row: CompletionRow) => {
  drawerOpen.value = true
  detailLoading.value = true
  editingRemark.value = false
  detailTab.value = 'items'
  selectedItem.value = null
  try {
    detail.value = await getCompletionDetail(row.fnNo)
    remarkDraft.value = detail.value?.remark || ''
  } catch (e: any) {
    detail.value = null
    ElMessage.error(e?.message || '加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

const onItemSelect = (row: CompletionItemRow | undefined) => {
  selectedItem.value = row || null
  if (row) detailTab.value = 'workers'
}

const clearItemSelect = () => {
  selectedItem.value = null
}

const onDrawerClosed = () => {
  editingRemark.value = false
  selectedItem.value = null
  detail.value = null
}

const startEditRemark = () => {
  remarkDraft.value = detail.value?.remark || ''
  editingRemark.value = true
}

const saveRemark = async () => {
  if (!detail.value) return
  saving.value = true
  try {
    await updateCompletionRemark(detail.value.fnNo, remarkDraft.value)
    ElMessage.success('备注已保存')
    detail.value.remark = remarkDraft.value
    editingRemark.value = false
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const doAudit = async (approve: boolean) => {
  if (!detail.value) return
  const action = approve ? '审核' : '反审核'
  try {
    await ElMessageBox.confirm(`确定要${action}单据 ${detail.value.fnNo} 吗？`, '确认', { type: 'warning' })
  } catch {
    return
  }
  auditing.value = true
  try {
    await auditCompletion(detail.value.fnNo, approve)
    ElMessage.success(`${action}成功`)
    await openDetail({ fnNo: detail.value.fnNo } as CompletionRow)
    await refreshAll()
  } catch (e: any) {
    ElMessage.error(e?.message || `${action}失败`)
  } finally {
    auditing.value = false
  }
}

const handleRowAction = async (cmd: string, row: CompletionRow) => {
  if (cmd === 'audit' || cmd === 'unaudit') {
    await openDetail(row)
    await doAudit(cmd === 'audit')
  }
}

onMounted(async () => {
  await Promise.all([fetchDepts(), refreshAll()])
})
</script>

<style lang="scss" scoped>
.cd-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(180deg, #f0f4ff 0%, var(--el-bg-color-page) 120px);
}

.cd-hero {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.cd-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgb(64 158 255 / 8%);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 22px;
    color: #fff;
  }

  &--total .cd-stat__icon {
    background: linear-gradient(135deg, #409eff, #66b1ff);
  }

  &--audited .cd-stat__icon {
    background: linear-gradient(135deg, #67c23a, #95d475);
  }

  &--pending .cd-stat__icon {
    background: linear-gradient(135deg, #e6a23c, #f3d19e);
  }

  &--recent .cd-stat__icon {
    background: linear-gradient(135deg, #9254de, #b37feb);
  }

  &__label {
    display: block;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
}

.cd-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgb(0 0 0 / 4%);
  overflow: hidden;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

.cd-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.cd-list-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 16px 0;
}

.cd-filter {
  margin-bottom: 10px;
}

.cd-table-wrap {
  flex: 1;
  min-height: 0;
}

.cd-pager {
  padding: 10px 0 12px;
}

.cd-stats-pane {
  padding: 20px 24px 32px;
}

.cd-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.cd-stats-card {
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(145deg, #fafbff, #fff);
  border: 1px solid var(--el-border-color-lighter);

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  &__num {
    display: block;
    font-size: 32px;
    font-weight: 700;
    color: var(--el-color-primary);
  }

  &__hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.cd-stats-bar {
  max-width: 560px;

  &__label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.cd-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-drawer__body) {
    padding: 0;
  }

  &__body {
    padding: 16px 20px 24px;
    min-height: 200px;
  }

  &__hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  &__no {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    font-family: ui-monospace, monospace;
  }

  &__sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__tags {
    display: flex;
    gap: 8px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.cd-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;

  &__item {
    padding: 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--kpi-color) 8%, #fff);
    border-left: 3px solid var(--kpi-color);
  }

  &__label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__value {
    display: block;
    margin-top: 4px;
    font-size: 16px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cd-timeline,
.cd-info,
.cd-detail-tabs {
  margin-bottom: 20px;

  h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
  }
}

.cd-worker-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1200px) {
  .cd-hero,
  .cd-stats-grid,
  .cd-kpi {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
