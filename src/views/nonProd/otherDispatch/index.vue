<template>
  <div v-table-copy class="od-page auto-height-container">
    <section class="od-hero">
      <div v-for="card in statCards" :key="card.key" class="od-stat" :class="`od-stat--${card.key}`">
        <div class="od-stat__icon">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <div class="od-stat__body">
          <span class="od-stat__label">{{ card.label }}</span>
          <strong class="od-stat__value">{{ card.value }}</strong>
        </div>
      </div>
    </section>

    <section class="od-main">
      <header class="od-main__head">
        <h2 class="od-main__title">派工列表</h2>
        <div class="od-main__actions">
          <el-button :icon="Plus" type="primary" @click="openCreate">新增</el-button>
          <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
        </div>
      </header>

      <div class="od-list-pane">
        <div class="od-filter">
          <el-form inline :model="queryForm" @submit.prevent>
            <el-form-item label="派工日期">
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
              <el-select v-model="queryForm.closeStatus" clearable placeholder="结案状态" style="width: 120px">
                <el-option label="已结案" value="已结案" />
                <el-option label="未结案" value="未结案" />
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

        <div class="od-table-wrap">
          <el-table
            ref="masterTableRef"
            v-loading="loading"
            border
            class="od-table"
            :data="list"
            highlight-current-row
            :max-height="masterMaxHeight"
            stripe
            @current-change="onMasterCurrentChange"
            @row-click="(row: OtherDispatchRow) => loadDetail(row)"
          >
            <el-table-column label="序号" type="index" width="54" />
            <el-table-column fixed label="派工单号" min-width="160" prop="owtNo">
              <template #default="{ row }">
                <span class="od-owtno">{{ row.owtNo }}</span>
              </template>
            </el-table-column>
            <el-table-column label="部门名称" min-width="130" prop="deptName" show-overflow-tooltip />
            <el-table-column label="派工日期" min-width="110" prop="owtDate" />
            <el-table-column label="审核状态" min-width="90" prop="auditStatus">
              <template #default="{ row }">
                <el-tag effect="light" round size="small" :type="auditTagType(row.auditStatus)">
                  {{ row.auditStatus || '—' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结案状态" min-width="90" prop="closeStatus">
              <template #default="{ row }">
                <el-tag effect="plain" round size="small" :type="row.closeStatus === '已结案' ? 'info' : 'success'">
                  {{ row.closeStatus || '未结案' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140" prop="remark" show-overflow-tooltip />
            <el-table-column label="创建人" min-width="90" prop="creator" />
            <el-table-column label="创建日期" min-width="160" prop="createDate" />
            <el-table-column label="审核人" min-width="90" prop="approver" />
            <el-table-column align="center" label="明细行数" min-width="90" prop="itemCount" />
            <el-table-column align="center" label="人员数" min-width="80" prop="workerCount" />
            <el-table-column fixed="right" label="操作" width="160">
              <template #default="{ row }">
                <div class="od-row-ops">
                  <el-button link type="primary" @click.stop="viewRow(row)">查看</el-button>
                  <el-dropdown trigger="click" @command="(cmd: string) => handleRowAction(cmd, row)">
                    <el-button link type="primary" @click.stop>更多</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-if="row.auditStatus !== '已审核'" command="edit">编辑</el-dropdown-item>
                        <el-dropdown-item v-if="row.auditStatus !== '已审核'" command="audit">审核</el-dropdown-item>
                        <el-dropdown-item v-if="row.auditStatus === '已审核'" command="unaudit">反审核</el-dropdown-item>
                        <el-dropdown-item
                          v-if="row.auditStatus !== '已审核'"
                          command="delete"
                          divided
                          style="color: var(--el-color-danger)"
                        >
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <section class="od-link-panels">
          <div class="od-link-panel">
            <div class="od-link-panel__head">
              <h3>派工明细</h3>
              <span class="od-link-panel__hint">
                <template v-if="currentMaster">
                  {{ currentMaster.owtNo }} · 共 {{ detailItems.length }} 行 · 点击行查看人员
                </template>
                <template v-else>请选择上方派工单</template>
              </span>
            </div>
            <el-table
              ref="itemTableRef"
              v-loading="detailLoading"
              border
              :data="detailItems"
              highlight-current-row
              :max-height="itemMaxHeight"
              row-key="sNo"
              size="small"
              stripe
              @current-change="onItemCurrentChange"
              @row-click="onItemRowClick"
            >
              <el-table-column label="序号" prop="sNo" width="56" />
              <el-table-column label="派工类型" min-width="110" prop="pwSortName" show-overflow-tooltip />
              <el-table-column label="计件类型" min-width="90" prop="pieceType" />
              <el-table-column label="分配方式" min-width="110" prop="assignType" show-overflow-tooltip />
              <el-table-column label="单位" prop="unit" width="60" />
              <el-table-column align="right" label="派工数量" prop="planQty" width="90">
                <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="完工数量" prop="fnQty" width="90">
                <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="工序单价" prop="prcUp" width="90">
                <template #default="{ row }">{{ formatNum(row.prcUp) }}</template>
              </el-table-column>
              <el-table-column label="加工说明" min-width="120" prop="madeDesc" show-overflow-tooltip />
              <el-table-column label="计划完工日期" min-width="120" prop="planDate" />
              <el-table-column align="center" label="参与人数" width="90">
                <template #default="{ row }">
                  <el-tag effect="plain" round size="small" type="primary">
                    {{ workerCountOf(row) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="od-link-panel od-link-panel--workers">
            <div class="od-link-panel__head">
              <h3>人员明细</h3>
              <div class="od-link-panel__meta">
                <template v-if="selectedItem">
                  <el-tag effect="light" round size="small" type="success">
                    序号 {{ selectedItem.sNo }} · {{ selectedItem.pwSortName || '派工' }}
                  </el-tag>
                  <span>{{ filteredWorkers.length }} 人</span>
                </template>
                <span v-else class="od-link-panel__hint">请先选择上方一条派工明细</span>
              </div>
            </div>
            <el-table border :data="filteredWorkers" :max-height="workerMaxHeight" size="small" stripe>
              <el-table-column label="员工代码" min-width="100" prop="empNo" />
              <el-table-column label="姓名" min-width="80" prop="empName" />
              <el-table-column label="部门名称" min-width="110" prop="deptName" show-overflow-tooltip />
              <el-table-column align="right" label="派工数量" prop="planQty" width="90">
                <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="完工数量" prop="fnQty" width="90">
                <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
              </el-table-column>
              <el-table-column align="right" label="计件数量" prop="wageQty" width="90">
                <template #default="{ row }">{{ formatNum(row.wageQty) }}</template>
              </el-table-column>
              <el-table-column label="加工单元" min-width="120" prop="workGpName" show-overflow-tooltip />
            </el-table>
            <el-empty
              v-if="selectedItem && filteredWorkers.length === 0"
              description="该派工行暂无人员明细"
              :image-size="56"
            />
          </div>
        </section>

        <footer class="od-pager">
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
    </section>

    <other-dispatch-form-drawer v-model="formOpen" :edit-owt-no="editOwtNo" @saved="onFormSaved" />
  </div>
</template>

<script lang="ts" setup>
import { CircleCheck, Clock, Document, Plus, Refresh, Search, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  auditOtherDispatch,
  getOtherDispatchDeptOptions,
  getOtherDispatchDetail,
  getOtherDispatchList,
  getOtherDispatchStats,
  removeOtherDispatch,
  type DeptOption,
  type OtherDispatchItemRow,
  type OtherDispatchRow,
  type OtherDispatchStats,
  type OtherDispatchWorkerRow,
} from '/@/api/nonProd/otherDispatch'
import OtherDispatchFormDrawer from './OtherDispatchFormDrawer.vue'

defineOptions({
  name: 'OtherDispatch',
})

const loading = ref(false)
const detailLoading = ref(false)
const auditing = ref(false)
const removing = ref(false)
const list = ref<OtherDispatchRow[]>([])
const total = ref(0)
const formOpen = ref(false)
const editOwtNo = ref<string | undefined>()
const currentMaster = ref<OtherDispatchRow | null>(null)
const detailItems = ref<OtherDispatchItemRow[]>([])
const detailWorkers = ref<OtherDispatchWorkerRow[]>([])
const selectedItem = ref<OtherDispatchItemRow | null>(null)
const masterTableRef = ref<{ setCurrentRow?: (row?: OtherDispatchRow) => void } | null>(null)
const itemTableRef = ref<{ setCurrentRow?: (row?: OtherDispatchItemRow) => void } | null>(null)
const deptOptions = ref<DeptOption[]>([])
const stats = ref<OtherDispatchStats>({ totalCount: 0, auditedCount: 0, pendingCount: 0, recentCount: 0 })

/** 默认不限日期 */
const dateRange = ref<[string, string] | null>(null)

const queryForm = reactive({
  keyword: '',
  deptId: '' as number | '',
  auditStatus: '',
  closeStatus: '',
  pageNo: 1,
  pageSize: 50,
})

/** 派工行 ↔ 人员：按行号关联；两侧都有单号时再比 trim 后的单号 */
const isWorkerOfItem = (item: OtherDispatchItemRow, worker: OtherDispatchWorkerRow) => {
  if (Number(item.sNo) !== Number(worker.sNo)) return false
  const a = String(item.owtNo || '').trim()
  const b = String(worker.owtNo || '').trim()
  if (a && b && a !== b) return false
  return true
}

const filteredWorkers = computed(() => {
  if (!selectedItem.value) return []
  return detailWorkers.value.filter((w) => isWorkerOfItem(selectedItem.value!, w))
})

const workerCountOf = (item: OtherDispatchItemRow) =>
  detailWorkers.value.filter((w) => isWorkerOfItem(item, w)).length

const selectItem = (row: OtherDispatchItemRow | null | undefined) => {
  selectedItem.value = row || null
  nextTick(() => {
    if (row) itemTableRef.value?.setCurrentRow?.(row)
  })
}

const clearDetail = () => {
  currentMaster.value = null
  detailItems.value = []
  detailWorkers.value = []
  selectedItem.value = null
}

const statCards = computed(() => [
  { key: 'total', label: '派工总数', value: stats.value.totalCount, icon: Document },
  { key: 'audited', label: '已审核', value: stats.value.auditedCount, icon: CircleCheck },
  { key: 'pending', label: '未审核', value: stats.value.pendingCount, icon: Clock },
  { key: 'recent', label: '近30天', value: stats.value.recentCount, icon: TrendCharts },
])

const auditTagType = (status: string) => {
  if (status === '已审核') return 'success'
  if (status === '未审核' || status === '待审核') return 'warning'
  return 'info'
}

const formatNum = (v: number | undefined) => {
  if (v == null || Number.isNaN(v)) return '0'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 6 })
}

/** 行数少时表体收缩，多时到上限后内部滚动 */
const calcTableMaxHeight = (rowCount: number, rowH: number, headerH: number, minRows: number, cap: number) => {
  const n = Math.max(rowCount, minRows)
  return Math.min(headerH + n * rowH, cap)
}

const masterMaxHeight = computed(() => calcTableMaxHeight(list.value.length, 42, 44, 2, 480))
const itemMaxHeight = computed(() => calcTableMaxHeight(detailItems.value.length, 36, 40, 1, 360))
const workerMaxHeight = computed(() => calcTableMaxHeight(filteredWorkers.value.length, 36, 40, 1, 360))

const dateFrom = () => dateRange.value?.[0]
const dateTo = () => dateRange.value?.[1]

const fetchStats = async () => {
  try {
    stats.value = await getOtherDispatchStats(dateFrom(), dateTo())
  } catch {
    stats.value = { totalCount: 0, auditedCount: 0, pendingCount: 0, recentCount: 0 }
  }
}

const fetchDepts = async () => {
  try {
    deptOptions.value = await getOtherDispatchDeptOptions()
  } catch {
    deptOptions.value = []
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await getOtherDispatchList({
      ...queryForm,
      dateFrom: dateFrom(),
      dateTo: dateTo(),
    })
    list.value = data?.list || []
    total.value = data?.total || 0
    // 列表刷新后尽量保持当前选中；否则自动加载首行明细
    if (currentMaster.value) {
      const keep = list.value.find((r) => String(r.owtNo).trim() === String(currentMaster.value!.owtNo).trim())
      if (keep) {
        nextTick(() => masterTableRef.value?.setCurrentRow?.(keep))
        if (!detailItems.value.length) void loadDetail(keep)
      } else {
        clearDetail()
        if (list.value[0]) void loadDetail(list.value[0])
      }
    } else if (list.value[0]) {
      void loadDetail(list.value[0])
      nextTick(() => masterTableRef.value?.setCurrentRow?.(list.value[0]))
    }
  } catch (e: any) {
    list.value = []
    total.value = 0
    clearDetail()
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
  queryForm.closeStatus = ''
  dateRange.value = null
  queryData()
}

const loadDetail = async (row: OtherDispatchRow) => {
  const owtNo = String(row?.owtNo || '').trim()
  if (!owtNo) return
  currentMaster.value = { ...row, owtNo }
  detailLoading.value = true
  selectedItem.value = null
  try {
    const detail = await getOtherDispatchDetail(owtNo)
    detailItems.value = detail?.items || []
    detailWorkers.value = detail?.workers || []
    if (detail) {
      const idx = list.value.findIndex((r) => String(r.owtNo).trim() === owtNo)
      if (idx >= 0) {
        list.value[idx] = {
          ...list.value[idx],
          itemCount: detail.itemCount || detailItems.value.length,
          workerCount: detail.workerCount || detailWorkers.value.length,
          auditStatus: detail.auditStatus || list.value[idx].auditStatus,
          closeStatus: detail.closeStatus || list.value[idx].closeStatus,
        }
        currentMaster.value = list.value[idx]
      }
    }
    await nextTick()
    selectItem(detailItems.value[0] || null)
    if (!detailItems.value.length) {
      ElMessage.info('该派工单暂无派工明细')
    }
  } catch (e: any) {
    detailItems.value = []
    detailWorkers.value = []
    ElMessage.error(e?.message || '加载明细失败')
  } finally {
    detailLoading.value = false
  }
}

const onMasterCurrentChange = (row: OtherDispatchRow | undefined) => {
  if (!row?.owtNo) return
  const no = String(row.owtNo).trim()
  if (currentMaster.value && String(currentMaster.value.owtNo).trim() === no && detailItems.value.length) return
  void loadDetail(row)
}

const onItemCurrentChange = (row: OtherDispatchItemRow | undefined) => {
  if (!row) return
  selectedItem.value = row
}

const onItemRowClick = (row: OtherDispatchItemRow) => {
  if (!row) return
  selectItem(row)
}

const viewRow = (row: OtherDispatchRow) => {
  nextTick(() => masterTableRef.value?.setCurrentRow?.(row))
  void loadDetail(row)
}

const openCreate = () => {
  editOwtNo.value = undefined
  formOpen.value = true
}

const openEdit = (owtNo: string) => {
  if (!owtNo) return
  editOwtNo.value = owtNo
  formOpen.value = true
}

const doAudit = async (row: OtherDispatchRow, approve: boolean) => {
  const action = approve ? '审核' : '反审核'
  try {
    await ElMessageBox.confirm(`确定要${action}单据 ${row.owtNo} 吗？`, '确认', { type: 'warning' })
  } catch {
    return
  }
  auditing.value = true
  try {
    await auditOtherDispatch(row.owtNo, approve)
    ElMessage.success(`${action}成功`)
    await refreshAll()
    const refreshed = list.value.find((r) => r.owtNo === row.owtNo)
    if (refreshed) {
      await loadDetail(refreshed)
      nextTick(() => masterTableRef.value?.setCurrentRow?.(refreshed))
    } else {
      clearDetail()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || `${action}失败`)
  } finally {
    auditing.value = false
  }
}

const doRemove = async (owtNo: string) => {
  if (!owtNo) return
  try {
    await ElMessageBox.confirm(`确定删除未审核单据 ${owtNo} 吗？删除后不可恢复。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  removing.value = true
  try {
    await removeOtherDispatch(owtNo)
    const idx = list.value.findIndex((r) => r.owtNo === owtNo)
    const removed = idx >= 0 ? list.value[idx] : null
    if (idx >= 0) {
      list.value.splice(idx, 1)
      total.value = Math.max(0, total.value - 1)
    }
    if (removed) {
      stats.value.totalCount = Math.max(0, stats.value.totalCount - 1)
      if (removed.auditStatus !== '已审核') {
        stats.value.pendingCount = Math.max(0, stats.value.pendingCount - 1)
      } else {
        stats.value.auditedCount = Math.max(0, stats.value.auditedCount - 1)
      }
    }
    if (currentMaster.value?.owtNo === owtNo) {
      clearDetail()
    }
    ElMessage.success('删除成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  } finally {
    removing.value = false
  }
}

const handleRowAction = async (cmd: string, row: OtherDispatchRow) => {
  if (cmd === 'edit') {
    openEdit(row.owtNo)
    return
  }
  if (cmd === 'delete') {
    await doRemove(row.owtNo)
    return
  }
  if (cmd === 'audit') {
    await doAudit(row, true)
    return
  }
  if (cmd === 'unaudit') {
    await doAudit(row, false)
  }
}

const onFormSaved = async (owtNo: string) => {
  editOwtNo.value = undefined
  await refreshAll()
  if (owtNo) {
    const row = list.value.find((r) => r.owtNo === owtNo)
    if (row) {
      nextTick(() => masterTableRef.value?.setCurrentRow?.(row))
      await loadDetail(row)
    }
  }
}

onMounted(async () => {
  await Promise.all([fetchDepts(), refreshAll()])
})
</script>

<style lang="scss" scoped>
.od-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(180deg, #f0f4ff 0%, var(--el-bg-color-page) 120px);
}

.od-hero {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.od-stat {
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

  &--total .od-stat__icon {
    background: linear-gradient(135deg, #409eff, #66b1ff);
  }

  &--audited .od-stat__icon {
    background: linear-gradient(135deg, #67c23a, #95d475);
  }

  &--pending .od-stat__icon {
    background: linear-gradient(135deg, #e6a23c, #f3d19e);
  }

  &--recent .od-stat__icon {
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

.od-main {
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
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.od-list-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 16px 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.od-filter {
  margin-bottom: 10px;
  flex-shrink: 0;
}

.od-table-wrap {
  flex: none;
  width: 100%;
}

.od-link-panels {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
  margin-top: 12px;
  flex: none;
  align-items: start;
}

.od-row-ops {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 100%;
  line-height: 1;

  :deep(.el-button) {
    margin: 0;
    height: auto;
    padding: 0 4px;
    vertical-align: middle;
  }

  :deep(.el-dropdown) {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  }
}

.od-link-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  background: #fafcff;

  &--workers {
    background: #f7fbf8;
    border-color: color-mix(in srgb, var(--el-color-success) 22%, var(--el-border-color-lighter));
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
  }

  &__hint {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.od-pager {
  padding: 10px 0 12px;
  flex-shrink: 0;
}

.od-owtno {
  font-family: ui-monospace, monospace;
  color: var(--el-color-primary);
}

@media (max-width: 1200px) {
  .od-hero {
    grid-template-columns: repeat(2, 1fr);
  }

  .od-link-panels {
    grid-template-columns: 1fr;
  }
}
</style>
