<template>
  <div v-table-copy class="wr-page auto-height-container">
    <!-- 顶栏：页签 + 筛选 -->
    <header class="wr-hero">
      <div class="wr-hero__title">
        <h1>报工管理</h1>
        <p>派工 → 报工 → 进度回写，形成生产闭环</p>
      </div>
      <el-segmented v-model="viewTab" :options="viewTabs" />
    </header>

    <vab-query-form v-if="viewTab !== 'records'">
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-select v-model="queryForm.wsName" clearable placeholder="车间" style="width: 120px">
              <el-option v-for="w in workshopOptions" :key="w" :label="w" :value="w" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.prcName" clearable placeholder="工序" style="width: 120px" @keyup.enter="loadTasks" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.status" clearable placeholder="状态" style="width: 110px">
              <el-option label="待报工" value="待报工" />
              <el-option label="部分完工" value="部分完工" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input
              v-model.trim="queryForm.keyword"
              clearable
              placeholder="工单 / 制令 / 品名"
              style="width: 200px"
              @keyup.enter="loadTasks"
            />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="loading" type="primary" @click="loadTasks">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button :icon="FullScreen" plain type="primary" @click="scanVisible = true">扫报工</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <!-- KPI 卡片 -->
    <div v-if="viewTab !== 'records'" class="wr-stats">
      <article v-for="card in statCards" :key="card.key" class="wr-stat" :class="`wr-stat--${card.key}`">
        <div class="wr-stat__icon">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <div>
          <em>{{ card.label }}</em>
          <strong>{{ card.value }}</strong>
          <span v-if="card.sub">{{ card.sub }}</span>
        </div>
      </article>
    </div>

    <!-- 主工作区 -->
    <div v-if="viewTab !== 'records'" class="wr-main">
      <section class="wr-panel wr-panel--list">
        <header class="wr-panel__head">
          <strong>待报工任务列表</strong>
          <em>共 {{ taskList.length }} 条</em>
        </header>
        <div class="wr-panel__body">
          <el-table
            v-loading="loading"
            border
            :data="taskList"
            highlight-current-row
            height="100%"
            row-key="id"
            :row-class-name="rowClassName"
            @current-change="(row: any) => onTaskSelect(row)"
            @row-click="(row: any) => onTaskSelect(row)"
          >
            <el-table-column align="center" width="42">
              <template #default="{ row }">
                <el-radio :model-value="selectedTask?.id" :value="row.id" @change="onTaskSelect(row as WorkReportTask)" />
              </template>
            </el-table-column>
            <el-table-column label="工单号" min-width="130" prop="woNo" show-overflow-tooltip />
            <el-table-column label="产品名称" min-width="140" prop="goodsName" show-overflow-tooltip />
            <el-table-column label="工序" min-width="120" prop="prcName" show-overflow-tooltip />
            <el-table-column align="right" label="派工" min-width="64" prop="wtQty" />
            <el-table-column align="right" label="已报" min-width="64" prop="fnQty" />
            <el-table-column align="right" label="待报" min-width="64">
              <template #default="{ row }">
                <span class="wr-pending">{{ row.pendingQty }}</span>
              </template>
            </el-table-column>
            <el-table-column label="进度" min-width="120">
              <template #default="{ row }">
                <el-progress :color="progressColor(row.progress)" :percentage="row.progress" :stroke-width="8" />
              </template>
            </el-table-column>
            <el-table-column align="center" label="状态" min-width="90">
              <template #default="{ row }">
                <el-tag effect="plain" size="small" :type="statusTagType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column align="center" fixed="right" label="操作" width="72">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="onTaskSelect(row as WorkReportTask)">报工</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无待报工任务" />
            </template>
          </el-table>
        </div>
      </section>

      <report-quick-form
        class="wr-panel wr-panel--form"
        :submitting="submitting"
        :task="selectedTask"
        @reset="selectedTask = null"
        @submit="onSubmitReport"
      />
    </div>

    <!-- 报工记录 -->
    <section v-else class="wr-records">
      <header class="wr-panel__head">
        <strong>报工记录</strong>
        <el-input
          v-model.trim="recordKeyword"
          clearable
          placeholder="单号 / 品名"
          style="width: 220px"
          @keyup.enter="loadRecords"
        />
      </header>
      <el-table v-loading="recordLoading" border :data="recordList" height="100%">
        <el-table-column label="报工单号" min-width="130" prop="reportNo" />
        <el-table-column label="工单号" min-width="130" prop="woNo" />
        <el-table-column label="制令号" min-width="120" prop="moNo" />
        <el-table-column label="产品" min-width="140" prop="goodsName" show-overflow-tooltip />
        <el-table-column label="工序" min-width="120" prop="prcName" show-overflow-tooltip />
        <el-table-column align="right" label="报工数" min-width="72" prop="reportQty" />
        <el-table-column align="right" label="合格" min-width="64" prop="passQty" />
        <el-table-column align="right" label="不良" min-width="64" prop="defectQty" />
        <el-table-column label="报工时间" min-width="150" prop="reportTime" />
        <el-table-column label="报工人" min-width="80" prop="reporter" />
        <template #empty>
          <el-empty description="暂无报工记录" />
        </template>
      </el-table>
    </section>

    <!-- 进度看板 -->
    <report-progress-board v-if="viewTab !== 'records'" class="wr-board" :progress="moProgress" />

    <footer v-if="viewTab !== 'records'" class="wr-tips">
      <el-icon><InfoFilled /></el-icon>
      <span>报工数量不可超过待报数量；合格 + 不良 + 返工 = 报工数量；提交后实时回写任务进度与制令看板。</span>
    </footer>

    <!-- 扫码报工 -->
    <el-dialog v-model="scanVisible" align-center title="扫码报工" width="400px">
      <el-input
        ref="scanInputRef"
        v-model.trim="scanCode"
        autofocus
        placeholder="扫描或输入工单号 / 派工单号"
        @keyup.enter="onScan"
      />
      <template #footer>
        <el-button @click="scanVisible = false">取消</el-button>
        <el-button :loading="scanLoading" type="primary" @click="onScan">定位任务</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import {
  CircleCheck,
  Clock,
  FullScreen,
  InfoFilled,
  List,
  Refresh,
  Search,
  TrendCharts,
} from '@element-plus/icons-vue'
import ReportProgressBoard from './vabAutoComponents/ReportProgressBoard.vue'
import ReportQuickForm from './vabAutoComponents/ReportQuickForm.vue'
import type {
  MoProgress,
  SubmitWorkReportPayload,
  WorkReportRecord,
  WorkReportStats,
  WorkReportTask,
} from '/@/api/procurement/workReport'
import {
  getMoProgress,
  getPendingReportTasks,
  getReportRecords,
  getWorkReportStats,
  scanReportByCode,
  submitWorkReport,
} from '/@/api/procurement/workReport'

defineOptions({ name: 'WorkReportManagement' })

const viewTab = ref<'mine' | 'all' | 'records'>('mine')
const viewTabs = [
  { label: '我的待报工', value: 'mine' },
  { label: '全部待报工', value: 'all' },
  { label: '报工记录', value: 'records' },
]

const loading = ref(false)
const recordLoading = ref(false)
const submitting = ref(false)
const scanVisible = ref(false)
const scanLoading = ref(false)
const scanCode = ref('')
const scanInputRef = ref()

const taskList = ref<WorkReportTask[]>([])
const recordList = ref<WorkReportRecord[]>([])
const selectedTask = ref<WorkReportTask | null>(null)
const moProgress = ref<MoProgress | null>(null)
const stats = ref<WorkReportStats | null>(null)
const recordKeyword = ref('')

const workshopOptions = ['木工车间', '海绵车间', '缝纫车间', '包装车间']

const queryForm = reactive({
  wsName: '',
  prcName: '',
  status: '',
  keyword: '',
})

const scope = computed(() => (viewTab.value === 'all' ? 'all' : 'mine'))

const statCards = computed(() => {
  const s = stats.value
  return [
    {
      key: 'pending',
      icon: List,
      label: '我的待报工',
      value: s ? `${s.pendingCount} 项` : '—',
      sub: s ? `合计 ${s.pendingSets} 套` : '',
    },
    {
      key: 'today',
      icon: TrendCharts,
      label: '今日已报',
      value: s ? `${s.todayReported} 套` : '—',
      sub: s ? `较昨日 +${s.todayTrend}%` : '',
    },
    {
      key: 'hours',
      icon: Clock,
      label: '今日工时',
      value: s ? `${s.todayHours} h` : '—',
      sub: s ? `效率 ${s.efficiency}%` : '',
    },
    {
      key: 'rate',
      icon: CircleCheck,
      label: '合格率',
      value: s ? `${s.passRate}%` : '—',
      sub: s ? `不良 ${s.defectCount} 套` : '',
    },
  ]
})

const progressColor = (p: number) => {
  if (p >= 100) return '#2e7d5a'
  if (p >= 50) return '#1a6fb5'
  return '#e6a23c'
}

const statusTagType = (status: string) => {
  if (status === '已完工') return 'success'
  if (status === '部分完工') return 'warning'
  return 'info'
}

const rowClassName = ({ row }: { row: WorkReportTask }) =>
  row.id === selectedTask.value?.id ? 'is-selected-row' : ''

const loadStats = async () => {
  try {
    stats.value = await getWorkReportStats({ scope: scope.value })
  } catch {
    stats.value = null
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const { data } = await getPendingReportTasks({ ...queryForm, scope: scope.value })
    taskList.value = data.list || []
    if (selectedTask.value) {
      const hit = taskList.value.find((t) => t.id === selectedTask.value!.id)
      selectedTask.value = hit || null
    }
    await loadStats()
  } catch (e: any) {
    taskList.value = []
    $baseMessage(e?.message || '加载任务失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const loadRecords = async () => {
  recordLoading.value = true
  try {
    const { data } = await getReportRecords({ keyword: recordKeyword.value })
    recordList.value = data.list || []
  } catch (e: any) {
    recordList.value = []
    $baseMessage(e?.message || '加载记录失败', 'error', 'hey')
  } finally {
    recordLoading.value = false
  }
}

const loadMoProgress = async (moNo?: string) => {
  if (!moNo) {
    moProgress.value = null
    return
  }
  try {
    moProgress.value = await getMoProgress(moNo)
  } catch {
    moProgress.value = null
  }
}

const onTaskSelect = async (row: WorkReportTask | null) => {
  if (!row?.id) return
  selectedTask.value = row
  await loadMoProgress(row.moNo)
}

const onSubmitReport = async (payload: SubmitWorkReportPayload) => {
  submitting.value = true
  try {
    const res = await submitWorkReport(payload)
    $baseMessage(`报工成功：${res.reportNo}`, 'success', 'hey')
    selectedTask.value = res.task?.pendingQty > 0 ? res.task : null
    await loadTasks()
    if (res.task?.moNo) await loadMoProgress(res.task.moNo)
    else moProgress.value = null
  } catch (e: any) {
    $baseMessage(e?.message || '报工失败', 'error', 'hey')
  } finally {
    submitting.value = false
  }
}

const resetQuery = () => {
  queryForm.wsName = ''
  queryForm.prcName = ''
  queryForm.status = ''
  queryForm.keyword = ''
  loadTasks()
}

const onScan = async () => {
  scanLoading.value = true
  try {
    const task = await scanReportByCode(scanCode.value)
    viewTab.value = 'mine'
    await loadTasks()
    await onTaskSelect(task)
    scanVisible.value = false
    scanCode.value = ''
    $baseMessage(`已定位：${task.woNo}`, 'success', 'hey')
  } catch (e: any) {
    $baseMessage(e?.message || '扫码失败', 'warning', 'hey')
  } finally {
    scanLoading.value = false
  }
}

watch(viewTab, (tab) => {
  if (tab === 'records') loadRecords()
  else loadTasks()
})

watch(scanVisible, (v) => {
  if (v) nextTick(() => scanInputRef.value?.focus?.())
})

onMounted(() => {
  loadTasks()
})
</script>

<style lang="scss" scoped>
.wr-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
  background: linear-gradient(180deg, #f0f5fa 0%, #f6f8fb 120px, #f6f8fb 100%);
}

.wr-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 0;

  h1 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #1a3a52;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #7a8b9a;
  }
}

.wr-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.wr-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8eef4;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(26, 63, 95, 0.04);

  em {
    display: block;
    font-size: 12px;
    font-style: normal;
    color: #909399;
    margin-bottom: 4px;
  }

  strong {
    font-size: 22px;
    font-weight: 700;
    color: #1a3a52;
    line-height: 1.1;
  }

  span {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: #67c23a;
  }

  &__icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    font-size: 22px;
    border-radius: 10px;
  }

  &--pending .wr-stat__icon {
    color: #1a6fb5;
    background: #e8f2fb;
  }

  &--today .wr-stat__icon {
    color: #2e7d5a;
    background: #e8f5ee;
  }

  &--hours .wr-stat__icon {
    color: #e6a23c;
    background: #fdf6ec;
  }

  &--rate .wr-stat__icon {
    color: #67c23a;
    background: #f0f9eb;
  }
}

.wr-main {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 12px;
  flex: 1;
  min-height: 280px;
}

.wr-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e8eef4;
  border-radius: 12px;
  overflow: hidden;

  &--form {
    border: none;
    background: transparent;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    font-size: 13px;
    background: #f8fafc;
    border-bottom: 1px solid #eef2f6;

    strong {
      color: #1a3a52;
    }

    em {
      font-size: 12px;
      font-style: normal;
      color: #909399;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    padding: 0;

    :deep(.el-table) {
      --el-table-header-bg-color: #f4f8fc;
      --el-table-current-row-bg-color: #e8f2fb;
    }

    :deep(tr.is-selected-row > td) {
      background: #e8f2fb !important;
    }
  }
}

.wr-pending {
  color: #f56c6c;
  font-weight: 600;
}

.wr-records {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e8eef4;
  border-radius: 12px;
  overflow: hidden;

  .wr-panel__head {
    border-bottom: 1px solid #eef2f6;
  }

  .el-table {
    flex: 1;
  }
}

.wr-board {
  flex-shrink: 0;
}

.wr-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #7a8b9a;
  background: #fff;
  border: 1px dashed #dce4ec;
  border-radius: 8px;

  .el-icon {
    color: #1a6fb5;
  }
}

@media (max-width: 1200px) {
  .wr-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .wr-main {
    grid-template-columns: 1fr;
  }
}
</style>
