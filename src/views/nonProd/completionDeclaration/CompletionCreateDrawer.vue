<template>
  <el-drawer
    v-model="visible"
    class="cd-create-drawer"
    :class="{ 'is-resizing': resizing }"
    :destroy-on-close="true"
    direction="rtl"
    :size="drawerSize"
    :title="isEdit ? '编辑完工确认' : '新增完工确认'"
    @closed="onClosed"
  >
    <div class="cd-create-drawer__resizer" title="拖拽调整宽度" @mousedown.prevent="startResize" />

    <div v-loading="loadingEdit" class="cd-create">
      <el-form ref="formRef" class="cd-create__form" label-width="100px" :model="form" :rules="rules">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="完工确认单号">
              <el-input v-model="form.fnNo" disabled placeholder="保存时自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="完工日期" prop="fnDate" required>
              <el-date-picker
                v-model="form.fnDate"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
                @change="onFnDateChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="deptId" required>
              <el-select
                v-model="form.deptId"
                filterable
                placeholder="请选择部门"
                style="width: 100%"
                @change="onDeptChange"
              >
                <el-option
                  v-for="d in depts"
                  :key="d.deptId"
                  :label="`${d.deptCode ? d.deptCode + ' · ' : ''}${d.deptName}`"
                  :value="d.deptId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核状态">
              <el-input model-value="未审核" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" maxlength="200" :rows="2" show-word-limit type="textarea" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="cd-create__actions">
        <el-button :loading="generating" type="primary" @click="handleGenerate">产生明细</el-button>
        <el-button disabled title="后续对接附件模块">附件管理</el-button>
        <span class="cd-create__tip">
          {{ isEdit ? '可修改数量或重新产生明细后保存（仅未审核）' : '选择部门后点击「产生明细」，拉取可完工派工与人员' }}
        </span>
      </div>

      <section class="cd-link-panel">
        <div class="cd-link-panel__head">
          <h3>派工明细</h3>
          <span class="cd-link-panel__hint">共 {{ form.items.length }} 行 · 点击行查看人员</span>
        </div>
        <el-table
          ref="itemTableRef"
          border
          :data="form.items"
          highlight-current-row
          max-height="240"
          size="small"
          stripe
          @current-change="onItemSelect"
          @row-click="onItemSelect"
        >
          <el-table-column type="selection" width="42" />
          <el-table-column fixed label="派工单号" min-width="140" prop="owtNo" />
          <el-table-column label="序号" prop="sNo" width="56" />
          <el-table-column label="派工类型名称" min-width="110" prop="pwSortName" />
          <el-table-column label="单据名称" min-width="100" prop="receiptName" show-overflow-tooltip />
          <el-table-column label="品号" min-width="100" prop="goodsCode" show-overflow-tooltip />
          <el-table-column label="计件类型" min-width="90" prop="pieceType" />
          <el-table-column label="单位" prop="unit" width="56" />
          <el-table-column align="right" label="本次完工数量" min-width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.fnQty" :controls="false" :min="0" :precision="4" size="small" />
            </template>
          </el-table-column>
          <el-table-column align="right" label="派工数量" prop="planQty" width="90">
            <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
          </el-table-column>
          <el-table-column label="分配方式" min-width="120" prop="assignType" show-overflow-tooltip />
          <el-table-column label="是否团体再分配" prop="ifRedivide" width="120" />
          <el-table-column label="行号" prop="owtFnSNo" width="56" />
          <el-table-column label="单据代号" min-width="90" prop="receiptCode" />
          <el-table-column label="加工说明" min-width="110" prop="madeDesc" show-overflow-tooltip />
          <el-table-column label="计划完工日期" min-width="110" prop="planDate" />
          <el-table-column align="right" label="工序单价" prop="prcUp" width="90">
            <template #default="{ row }">{{ formatNum(row.prcUp) }}</template>
          </el-table-column>
          <el-table-column align="center" label="参与人数" width="80">
            <template #default="{ row }">{{ workerCountOf(row) }}</template>
          </el-table-column>
        </el-table>
      </section>

      <section class="cd-link-panel cd-link-panel--workers">
        <div class="cd-link-panel__head">
          <h3>人员明细</h3>
          <div class="cd-link-panel__meta">
            <template v-if="selectedItem">
              <el-tag effect="light" round size="small" type="success">
                {{ selectedItem.owtNo }} · 序号 {{ selectedItem.sNo }}
              </el-tag>
              <span>{{ filteredWorkers.length }} 人</span>
            </template>
            <span v-else class="cd-link-panel__hint">请先选择上方派工行</span>
          </div>
        </div>
        <el-table border :data="filteredWorkers" max-height="260" size="small" stripe>
          <el-table-column type="selection" width="42" />
          <el-table-column label="部门名称" min-width="100" prop="deptName" />
          <el-table-column label="员工代号" min-width="100" prop="empNo" />
          <el-table-column label="姓名" min-width="80" prop="empName" />
          <el-table-column align="right" label="派工数量" prop="planQty" width="90">
            <template #default="{ row }">{{ formatNum(row.planQty) }}</template>
          </el-table-column>
          <el-table-column align="right" label="完工余量" prop="remainQty" width="90">
            <template #default="{ row }">{{ formatNum(row.remainQty) }}</template>
          </el-table-column>
          <el-table-column align="right" label="本次完工数量" min-width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.fnQty" :controls="false" :min="0" :precision="4" size="small" @change="() => recalcWage(row)" />
            </template>
          </el-table-column>
          <el-table-column label="是否已计算薪资" prop="ifWage" width="120" />
          <el-table-column label="计薪期间" min-width="100" prop="wagePeriod" />
          <el-table-column align="right" label="本次计件数量" min-width="110">
            <template #default="{ row }">
              <el-input-number v-model="row.wageQty" :controls="false" :min="0" :precision="4" size="small" @change="() => recalcWage(row)" />
            </template>
          </el-table-column>
          <el-table-column align="right" label="分配系数" min-width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.allotmentRate" :controls="false" :min="0" :precision="4" size="small" @change="() => recalcWage(row)" />
            </template>
          </el-table-column>
          <el-table-column align="right" label="单价系数" min-width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.upRate" :controls="false" :min="0" :precision="4" size="small" @change="() => recalcWage(row)" />
            </template>
          </el-table-column>
          <el-table-column align="right" label="计件金额" prop="wageAmt" width="90">
            <template #default="{ row }">{{ formatNum(row.wageAmt) }}</template>
          </el-table-column>
          <el-table-column align="right" label="实际工时(小时)" min-width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.workTime" :controls="false" :min="0" :precision="4" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="加工单元名称" min-width="110" prop="workGpName" show-overflow-tooltip />
        </el-table>
      </section>
    </div>

    <template #footer>
      <div class="cd-create-drawer__footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button :loading="saving" type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  generateCompletionDetails,
  getCompletionActiveDepts,
  getCompletionDeptOptions,
  getCompletionDetail,
  getNextCompletionFnNo,
  submitCompletion,
  updateCompletion,
  type CompletionItemRow,
  type CompletionWorkerRow,
  type DeptOption,
} from '/@/api/nonProd/completionDeclaration'

const props = defineProps<{
  modelValue: boolean
  /** 传入单号则为编辑模式 */
  editFnNo?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: [fnNo: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => Boolean(props.editFnNo))

const DRAWER_MIN = 480
const DRAWER_DEFAULT = 720
const DRAWER_KEY = 'cd-create-drawer-width'

const readWidth = () => {
  const max = Math.floor(window.innerWidth * 0.95)
  try {
    const saved = Number(sessionStorage.getItem(DRAWER_KEY))
    if (Number.isFinite(saved) && saved >= DRAWER_MIN) return Math.min(max, saved)
  } catch {
    // ignore
  }
  return Math.min(max, DRAWER_DEFAULT)
}

const drawerWidth = ref(typeof window === 'undefined' ? DRAWER_DEFAULT : readWidth())
const drawerSize = computed(() => `${drawerWidth.value}px`)
const resizing = ref(false)

const formRef = ref<FormInstance>()
const itemTableRef = ref<{ setCurrentRow?: (row?: CompletionItemRow) => void } | null>(null)
const depts = ref<DeptOption[]>([])
const generating = ref(false)
const saving = ref(false)
const loadingEdit = ref(false)
const selectedItem = ref<CompletionItemRow | null>(null)

const emptyForm = () => ({
  fnNo: '',
  fnDate: new Date().toISOString().slice(0, 10),
  deptId: undefined as number | undefined,
  deptName: '',
  remark: '',
  items: [] as CompletionItemRow[],
  workers: [] as CompletionWorkerRow[],
})

const form = reactive(emptyForm())

const rules: FormRules = {
  fnDate: [{ required: true, message: '请选择完工日期', trigger: 'change' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
}

const isWorkerOfItem = (item: CompletionItemRow, worker: CompletionWorkerRow) => {
  if (worker.owtNo !== item.owtNo) return false
  if (item.owtFnSNo > 0 && worker.owtFnSNo > 0) return worker.owtFnSNo === item.owtFnSNo
  return worker.sNo === item.sNo
}

const filteredWorkers = computed(() => {
  if (!selectedItem.value) return []
  return form.workers.filter((w) => isWorkerOfItem(selectedItem.value!, w))
})

const workerCountOf = (item: CompletionItemRow) =>
  form.workers.filter((w) => isWorkerOfItem(item, w)).length

const formatNum = (v: number | undefined) => {
  if (v == null || Number.isNaN(v)) return '0'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

const startResize = (e: MouseEvent) => {
  resizing.value = true
  const startX = e.clientX
  const startW = drawerWidth.value
  const onMove = (ev: MouseEvent) => {
    const max = Math.floor(window.innerWidth * 0.95)
    drawerWidth.value = Math.min(max, Math.max(DRAWER_MIN, startW + (startX - ev.clientX)))
  }
  const onUp = () => {
    resizing.value = false
    document.body.classList.remove('cd-drawer-resizing')
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    try {
      sessionStorage.setItem(DRAWER_KEY, String(drawerWidth.value))
    } catch {
      // ignore
    }
  }
  document.body.classList.add('cd-drawer-resizing')
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const loadDepts = async () => {
  try {
    const rows = await getCompletionActiveDepts()
    if (rows.length) {
      depts.value = rows
      return
    }
  } catch (e: any) {
    console.warn('[completion-create] active-depts failed', e)
  }
  try {
    depts.value = await getCompletionDeptOptions()
    if (!depts.value.length) {
      ElMessage.warning('暂无可用部门，请确认后端已重启并包含 active-depts 接口')
    }
  } catch (e: any) {
    depts.value = []
    ElMessage.error(e?.message || '部门加载失败')
  }
}

const refreshFnNo = async () => {
  if (isEdit.value) return
  if (!form.deptId || !form.fnDate) {
    form.fnNo = ''
    return
  }
  try {
    form.fnNo = await getNextCompletionFnNo(form.deptId, form.fnDate)
  } catch {
    form.fnNo = ''
  }
}

const onFnDateChange = async () => {
  await refreshFnNo()
}

const onDeptChange = async (deptId: number) => {
  const d = depts.value.find((x) => x.deptId === deptId)
  form.deptName = d?.deptName || ''
  form.items = []
  form.workers = []
  selectedItem.value = null
  await refreshFnNo()
}

const onItemSelect = (row: CompletionItemRow | undefined) => {
  if (!row) return
  selectedItem.value = row
}

const selectFirstItem = () => {
  const first = form.items[0] || null
  selectedItem.value = first
  nextTick(() => itemTableRef.value?.setCurrentRow?.(first || undefined))
}

const findItemPrc = (worker: CompletionWorkerRow) => {
  const item = form.items.find(
    (i) =>
      i.owtNo === worker.owtNo &&
      ((i.owtFnSNo > 0 && i.owtFnSNo === worker.owtFnSNo) || i.sNo === worker.sNo)
  )
  return item?.prcUp || 0
}

const recalcWage = (worker: CompletionWorkerRow) => {
  const qty = Number(worker.wageQty ?? worker.fnQty) || 0
  const rate = Number(worker.allotmentRate) || 1
  const upRate = Number(worker.upRate) || 1
  worker.wageAmt = Math.round(qty * findItemPrc(worker) * rate * upRate * 1e6) / 1e6
}

const handleGenerate = async () => {
  await formRef.value?.validateField?.('deptId').catch(() => undefined)
  if (!form.deptId) {
    ElMessage.warning('请先选择部门')
    return
  }
  generating.value = true
  try {
    const data = await generateCompletionDetails(form.deptId, isEdit.value ? form.fnNo : undefined)
    form.items = data?.items || []
    form.workers = data?.workers || []
    selectFirstItem()
    ElMessage.success(`已产生 ${form.items.length} 条派工、${form.workers.length} 条人员明细`)
  } catch (e: any) {
    ElMessage.error(e?.message || '产生明细失败')
  } finally {
    generating.value = false
  }
}

const handleSave = async () => {
  await formRef.value?.validate()
  if (!form.items.length) {
    ElMessage.warning('请先产生明细')
    return
  }
  saving.value = true
  try {
    const payload = {
      fnNo: form.fnNo,
      fnDate: form.fnDate,
      deptId: form.deptId,
      deptName: form.deptName,
      remark: form.remark,
      items: form.items,
      workers: form.workers,
    }
    const res = isEdit.value ? await updateCompletion(payload) : await submitCompletion(payload)
    const fnNo = res.data || form.fnNo
    ElMessage.success(`保存成功：${fnNo}`)
    visible.value = false
    emit('saved', fnNo)
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const loadEdit = async (fnNo: string) => {
  loadingEdit.value = true
  try {
    const data = await getCompletionDetail(fnNo)
    if (!data) {
      ElMessage.error('单据不存在')
      visible.value = false
      return
    }
    if (data.auditStatus === '已审核' || data.auditFlag === '1') {
      ElMessage.warning('仅未审核单据可编辑')
      visible.value = false
      return
    }
    form.fnNo = data.fnNo
    form.fnDate = data.fnDate
    form.deptId = data.deptId || undefined
    form.deptName = data.deptName || ''
    form.remark = data.remark || ''
    form.items = data.items || []
    form.workers = data.workers || []
    selectFirstItem()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载单据失败')
    visible.value = false
  } finally {
    loadingEdit.value = false
  }
}

const reset = () => {
  Object.assign(form, emptyForm())
  selectedItem.value = null
  formRef.value?.clearValidate()
}

const onClosed = () => {
  reset()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    reset()
    await loadDepts()
    if (props.editFnNo) {
      await loadEdit(props.editFnNo)
    }
  }
)
</script>

<style lang="scss" scoped>
.cd-create {
  padding: 4px 8px 16px;
}

.cd-create__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
}

.cd-create__tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.cd-link-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 14px;
  background: #fafcff;

  &--workers {
    background: #f7fbf8;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
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

.cd-create-drawer {
  :deep(.el-drawer__body) {
    position: relative;
    padding: 0 12px;
  }

  &__resizer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    width: 8px;
    cursor: col-resize;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label) {
  color: #c45656;
}
</style>
