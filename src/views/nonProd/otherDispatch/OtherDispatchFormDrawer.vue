<template>
  <el-drawer
    v-model="visible"
    class="od-create-drawer"
    :class="{ 'is-resizing': resizing }"
    :destroy-on-close="true"
    direction="rtl"
    :size="drawerSize"
    :title="isEdit ? '编辑派工单' : '新增派工单'"
    @closed="onClosed"
  >
    <div class="od-create-drawer__resizer" title="拖拽调整宽度" @mousedown.prevent="startResize" />

    <div v-loading="loadingEdit" class="od-create">
      <el-form ref="formRef" class="od-create__form" label-width="120px" :model="form" :rules="rules">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="派工单号">
              <el-input v-model="form.owtNo" disabled placeholder="选择部门与日期后预览" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成本承担部门" prop="deptId" required>
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
            <el-form-item label="派工日期" prop="owtDate" required>
              <el-date-picker
                v-model="form.owtDate"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
                @change="onOwtDateChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划完工日期">
              <el-date-picker
                v-model="form.planDate"
                clearable
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核状态">
              <el-input model-value="未审核" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结案状态">
              <el-input model-value="未结案" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" maxlength="200" :rows="2" show-word-limit type="textarea" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="od-create__actions">
        <el-button :icon="Plus" type="primary" @click="addItem">添加明细</el-button>
        <el-button :disabled="!selectedItem" :icon="Delete" @click="removeSelectedItem">删除明细</el-button>
        <el-button :disabled="!selectedItem" :icon="Plus" @click="addWorker">添加人员</el-button>
        <el-button :disabled="!selectedWorker" :icon="Delete" @click="removeSelectedWorker">删除人员</el-button>
        <span class="od-create__tip">
          {{ isEdit ? '可修改明细与人员后保存（仅未审核）' : '添加派工明细，并为每行配置参与人员' }}
        </span>
      </div>

      <section class="od-link-panel">
        <div class="od-link-panel__head">
          <h3>派工明细</h3>
          <span class="od-link-panel__hint">共 {{ form.items.length }} 行 · 点击行编辑人员</span>
        </div>
        <el-table
          ref="itemTableRef"
          border
          :data="form.items"
          highlight-current-row
          max-height="320"
          size="small"
          stripe
          @current-change="onItemSelect"
          @row-click="onItemSelect"
        >
          <el-table-column min-width="140">
            <template #header><span class="od-th-req">派工类型代号</span></template>
            <template #default="{ row }">
              <el-select
                v-model="row.pwSortCode"
                filterable
                placeholder="代号"
                size="small"
                style="width: 100%"
                @change="(code: string) => onPwSortChange(row, code)"
              >
                <el-option v-for="t in typeOptions" :key="t.code" :label="`${t.code} · ${t.name}`" :value="t.code" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="派工类型名称" min-width="120" prop="pwSortName" show-overflow-tooltip />
          <el-table-column label="序号" prop="sNo" width="56" />
          <el-table-column label="控制属性" min-width="110" prop="controlAttr" show-overflow-tooltip />
          <el-table-column label="单据代号" min-width="100" prop="receiptCode" show-overflow-tooltip />
          <el-table-column label="单据名称" min-width="110" prop="receiptName" show-overflow-tooltip />
          <el-table-column label="计件类型" min-width="110">
            <template #default="{ row }">
              <el-select
                v-model="row.pieceTypeCode"
                placeholder="计件类型"
                size="small"
                style="width: 100%"
                @change="(code: string) => onPieceTypeChange(row, code)"
              >
                <el-option
                  v-for="p in pieceTypeOptions"
                  :key="p.code"
                  :label="p.label"
                  :value="p.code"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="来源单号" min-width="120" prop="oriNo" show-overflow-tooltip />
          <el-table-column min-width="180">
            <template #header><span>品号</span></template>
            <template #default="{ row }">
              <el-select
                v-model="row.goodsCode"
                clearable
                filterable
                :loading="goodsLoading"
                placeholder="品号 / 品名"
                remote
                :remote-method="remoteGoodsSearch"
                size="small"
                style="width: 100%"
                @change="(code: string) => onGoodsChange(row, code)"
                @focus="() => ensureGoodsOptions()"
              >
                <el-option
                  v-for="g in goodsOptions"
                  :key="g.goodsCode"
                  :label="`${g.goodsCode} · ${g.goodsName}`"
                  :value="g.goodsCode"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="单位" min-width="110">
            <template #default="{ row }">
              <el-select
                v-if="isHourType(row)"
                v-model="row.unit"
                clearable
                filterable
                :loading="unitLoading"
                placeholder="选择单位"
                remote
                :remote-method="remoteUnitSearch"
                size="small"
                style="width: 100%"
                @change="() => onUnitChange(row)"
                @focus="() => ensureUnitOptions()"
              >
                <el-option
                  v-for="u in unitOptions"
                  :key="u.unitCode"
                  :label="u.unitName ? `${u.unitCode} · ${u.unitName}` : u.unitCode"
                  :value="u.unitCode"
                />
              </el-select>
              <span v-else>{{ row.unit || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="工资单位" min-width="80" prop="wageUnit" show-overflow-tooltip />
          <el-table-column align="right" min-width="110">
            <template #header><span class="od-th-req">派工数量</span></template>
            <template #default="{ row }">
              <el-input-number
                v-model="row.planQty"
                :controls="false"
                :min="0"
                :precision="4"
                size="small"
                @change="() => recalcItemWage(row)"
              />
            </template>
          </el-table-column>
          <el-table-column align="right" label="完工数量" min-width="90">
            <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
          </el-table-column>
          <el-table-column label="分配方式" min-width="130" prop="assignType" show-overflow-tooltip />
          <el-table-column align="right" label="表单数量" min-width="90">
            <template #default="{ row }">{{ formatNum(row.srcBillQty) }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.itemRemark" size="small" />
            </template>
          </el-table-column>
          <el-table-column align="right" label="流水号" min-width="80">
            <template #default="{ row }">{{ row.flowNo || 0 }}</template>
          </el-table-column>
          <el-table-column label="加工说明" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.madeDesc" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="计划完工日期" min-width="140">
            <template #default="{ row }">
              <el-date-picker
                v-model="row.planDate"
                clearable
                size="small"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </template>
          </el-table-column>
          <el-table-column label="最后完工日期" min-width="120">
            <template #default="{ row }">{{ row.fnDate || '—' }}</template>
          </el-table-column>
          <el-table-column align="right" label="工序单价" min-width="100">
            <template #default="{ row }">
              <el-input-number
                v-model="row.prcUp"
                :controls="false"
                :min="0"
                :precision="4"
                size="small"
                @change="() => recalcItemWage(row)"
              />
            </template>
          </el-table-column>
          <el-table-column align="right" label="计件金额" min-width="100">
            <template #default="{ row }">{{ formatNum(row.wageAmt) }}</template>
          </el-table-column>
          <el-table-column label="客制批号" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.cstlotNo" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="品名" min-width="140" prop="goodsName" show-overflow-tooltip />
          <el-table-column align="center" label="参与人数" width="80">
            <template #default="{ row }">{{ workerCountOf(row) }}</template>
          </el-table-column>
        </el-table>
      </section>

      <section class="od-link-panel od-link-panel--workers">
        <div class="od-link-panel__head">
          <h3>人员明细</h3>
          <div class="od-link-panel__meta">
            <template v-if="selectedItem">
              <el-tag effect="light" round size="small" type="success">
                序号 {{ selectedItem.sNo }} · {{ selectedItem.pwSortName || '派工' }}
              </el-tag>
              <span>{{ filteredWorkers.length }} 人</span>
            </template>
            <span v-else class="od-link-panel__hint">请先选择上方派工行</span>
          </div>
        </div>
        <el-table
          ref="workerTableRef"
          border
          :data="filteredWorkers"
          highlight-current-row
          max-height="280"
          size="small"
          stripe
          @current-change="onWorkerSelect"
          @row-click="onWorkerSelect"
        >
          <el-table-column label="实际生产部门代号" min-width="140" prop="deptCode" show-overflow-tooltip />
          <el-table-column label="实际生产部门名称" min-width="130" prop="deptName" show-overflow-tooltip />
          <el-table-column min-width="160">
            <template #header><span class="od-th-req">工号</span></template>
            <template #default="{ row }">
              <el-select
                v-model="row.empNo"
                clearable
                filterable
                :loading="empLoading"
                placeholder="工号 / 姓名"
                remote
                :remote-method="remoteEmpSearch"
                size="small"
                style="width: 100%"
                @change="(empNo: string) => onEmpChange(row, empNo)"
                @focus="() => ensureEmpOptions()"
              >
                <el-option
                  v-for="e in empOptions"
                  :key="e.empNo"
                  :label="`${e.empNo} · ${e.empName}`"
                  :value="e.empNo"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="姓名" min-width="90" prop="empName" />
          <el-table-column align="right" min-width="110">
            <template #header><span class="od-th-req">派工数量</span></template>
            <template #default="{ row }">
              <el-input-number
                v-model="row.planQty"
                :controls="false"
                :min="0"
                :precision="4"
                size="small"
                @change="() => syncWageQty(row)"
              />
            </template>
          </el-table-column>
          <el-table-column align="right" label="完工数量" min-width="90">
            <template #default="{ row }">{{ formatNum(row.fnQty) }}</template>
          </el-table-column>
          <el-table-column align="right" label="计件数量" min-width="110">
            <template #default="{ row }">
              <el-input-number v-model="row.wageQty" :controls="false" :min="0" :precision="4" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="加工单元代号" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.workGpCode" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="加工单元名称" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.workGpName" size="small" />
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-if="selectedItem && filteredWorkers.length === 0"
          description="该派工行暂无人员，点击「添加人员」"
          :image-size="56"
        />
      </section>
    </div>

    <template #footer>
      <div class="od-create-drawer__footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button :loading="saving" type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  getNextOwtNo,
  getOtherDispatchActiveDepts,
  getOtherDispatchDeptOptions,
  getOtherDispatchDetail,
  getOtherDispatchEmployees,
  getOtherDispatchGoodsOptions,
  getOtherDispatchTypeOptions,
  getOtherDispatchUnitOptions,
  submitOtherDispatch,
  updateOtherDispatch,
  type DeptOption,
  type DispatchTypeOption,
  type EmpOption,
  type GoodsOption,
  type OtherDispatchItemRow,
  type OtherDispatchWorkerRow,
  type UnitOption,
} from '/@/api/nonProd/otherDispatch'

const props = defineProps<{
  modelValue: boolean
  /** 传入单号则为编辑模式 */
  editOwtNo?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: [owtNo: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => Boolean(props.editOwtNo))

/** 与 SF fn_getbasedatadesc('assigntype') / ERP 一致；新建默认「按个人实时分配」，不手改 */
const DEFAULT_ASSIGN = { code: '1', label: '按个人实时分配' }

const pieceTypeOptions = [
  { code: '2', label: '个人计件' },
  { code: '1', label: '团体计件' },
]

/** 工时报工：可选手动选单位、自行设工序单价与派工数量 */
const HOUR_TYPE_CODE = '1001'
const HOUR_TYPE_NAME = '工时报工'

const DRAWER_MIN = 480
const DRAWER_DEFAULT = 780
const DRAWER_KEY = 'od-create-drawer-width'

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
const itemTableRef = ref<{ setCurrentRow?: (row?: OtherDispatchItemRow) => void } | null>(null)
const workerTableRef = ref<{ setCurrentRow?: (row?: OtherDispatchWorkerRow) => void } | null>(null)
const depts = ref<DeptOption[]>([])
const typeOptions = ref<DispatchTypeOption[]>([])
const empOptions = ref<EmpOption[]>([])
const goodsOptions = ref<GoodsOption[]>([])
const unitOptions = ref<UnitOption[]>([])
const empLoading = ref(false)
const goodsLoading = ref(false)
const unitLoading = ref(false)
const saving = ref(false)
const loadingEdit = ref(false)
const selectedItem = ref<OtherDispatchItemRow | null>(null)
const selectedWorker = ref<OtherDispatchWorkerRow | null>(null)

const todayStr = () => new Date().toISOString().slice(0, 10)

const emptyForm = () => {
  const owtDate = todayStr()
  return {
    owtNo: '',
    owtDate,
    /** ERP 新建时计划完工日期默认等于派工日期 */
    planDate: owtDate,
    deptId: undefined as number | undefined,
    deptName: '',
    remark: '',
    auditStatus: '未审核',
    items: [] as OtherDispatchItemRow[],
    workers: [] as OtherDispatchWorkerRow[],
  }
}

const form = reactive(emptyForm())

const rules: FormRules = {
  owtDate: [{ required: true, message: '请选择派工日期', trigger: 'change' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
}

const isWorkerOfItem = (item: OtherDispatchItemRow, worker: OtherDispatchWorkerRow) => {
  if (Number(item.sNo) !== Number(worker.sNo)) return false
  const a = String(item.owtNo || '').trim()
  const b = String(worker.owtNo || '').trim()
  if (a && b && a !== b) return false
  return true
}

const filteredWorkers = computed(() => {
  if (!selectedItem.value) return []
  return form.workers.filter((w) => isWorkerOfItem(selectedItem.value!, w))
})

const workerCountOf = (item: OtherDispatchItemRow) =>
  form.workers.filter((w) => isWorkerOfItem(item, w)).length

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
    document.body.classList.remove('od-drawer-resizing')
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    try {
      sessionStorage.setItem(DRAWER_KEY, String(drawerWidth.value))
    } catch {
      // ignore
    }
  }
  document.body.classList.add('od-drawer-resizing')
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const loadDepts = async () => {
  try {
    const rows = await getOtherDispatchActiveDepts()
    if (rows.length) {
      depts.value = rows
      return
    }
  } catch (e: any) {
    console.warn('[other-dispatch] active-depts failed', e)
  }
  try {
    depts.value = await getOtherDispatchDeptOptions()
  } catch (e: any) {
    depts.value = []
    ElMessage.error(e?.message || '部门加载失败')
  }
}

const loadTypeOptions = async () => {
  try {
    typeOptions.value = await getOtherDispatchTypeOptions()
  } catch {
    typeOptions.value = []
  }
}

const refreshOwtNo = async () => {
  if (isEdit.value) return
  if (!form.deptId || !form.owtDate) {
    form.owtNo = ''
    return
  }
  try {
    form.owtNo = await getNextOwtNo(form.deptId, form.owtDate)
  } catch {
    form.owtNo = ''
  }
}

const onOwtDateChange = async () => {
  // 计划完工日期为空时跟随派工日期（与 ERP 默认一致）
  if (!form.planDate) form.planDate = form.owtDate
  for (const item of form.items) {
    if (!item.planDate) item.planDate = form.planDate || form.owtDate || ''
  }
  await refreshOwtNo()
}

const onDeptChange = async (deptId: number) => {
  const d = depts.value.find((x) => x.deptId === deptId)
  form.deptName = d?.deptName || ''
  empOptions.value = []
  await refreshOwtNo()
  await ensureEmpOptions()
}

const onItemSelect = (row: OtherDispatchItemRow | undefined) => {
  if (!row) return
  selectedItem.value = row
  selectedWorker.value = null
  nextTick(() => itemTableRef.value?.setCurrentRow?.(row))
}

const onWorkerSelect = (row: OtherDispatchWorkerRow | undefined) => {
  if (!row) return
  selectedWorker.value = row
}

const selectFirstItem = () => {
  const first = form.items[0] || null
  selectedItem.value = first
  selectedWorker.value = null
  nextTick(() => itemTableRef.value?.setCurrentRow?.(first || undefined))
}

const nextSNo = () => {
  if (!form.items.length) return 1
  return Math.max(...form.items.map((i) => Number(i.sNo) || 0)) + 1
}

const createEmptyItem = (): OtherDispatchItemRow => ({
  owtNo: form.owtNo || '',
  sNo: nextSNo(),
  pwSortCode: '',
  pwSortName: '',
  controlModeCode: '',
  controlAttr: '',
  receiptCode: '',
  receiptName: '',
  oriNo: '',
  oriSNo: 0,
  pieceTypeCode: '2',
  pieceType: '个人计件',
  assignTypeCode: DEFAULT_ASSIGN.code,
  assignType: DEFAULT_ASSIGN.label,
  unit: '',
  wageUnit: '',
  planQty: 0,
  fnQty: 0,
  prcUp: 0,
  srcBillQty: 0,
  wageAmt: 0,
  goodsId: 0,
  goodsCode: '',
  goodsName: '',
  cstlotNo: '',
  madeDesc: '',
  flowNo: 0,
  planDate: form.planDate || form.owtDate || '',
  fnDate: '',
  itemRemark: '',
})

const addItem = () => {
  const row = createEmptyItem()
  form.items.push(row)
  selectedItem.value = row
  selectedWorker.value = null
  nextTick(() => itemTableRef.value?.setCurrentRow?.(row))
}

const removeSelectedItem = () => {
  if (!selectedItem.value) return
  const sNo = selectedItem.value.sNo
  const idx = form.items.findIndex((i) => i === selectedItem.value || i.sNo === sNo)
  if (idx < 0) return
  form.items.splice(idx, 1)
  form.workers = form.workers.filter((w) => Number(w.sNo) !== Number(sNo))
  selectFirstItem()
}

const createEmptyWorker = (item: OtherDispatchItemRow): OtherDispatchWorkerRow => {
  const dept = depts.value.find((d) => d.deptId === form.deptId)
  return {
    owtNo: form.owtNo || '',
    sNo: item.sNo,
    deptId: form.deptId || 0,
    deptCode: dept?.deptCode || '',
    deptName: form.deptName || dept?.deptName || '',
    empNo: '',
    empName: '',
    planQty: Number(item.planQty) || 0,
    fnQty: 0,
    wageQty: Number(item.planQty) || 0,
    workGpCode: '',
    workGpName: '',
  }
}

const addWorker = () => {
  if (!selectedItem.value) {
    ElMessage.warning('请先选择派工明细行')
    return
  }
  const row = createEmptyWorker(selectedItem.value)
  form.workers.push(row)
  selectedWorker.value = row
  nextTick(() => workerTableRef.value?.setCurrentRow?.(row))
}

const removeSelectedWorker = () => {
  if (!selectedWorker.value) return
  const idx = form.workers.findIndex((w) => w === selectedWorker.value)
  if (idx >= 0) form.workers.splice(idx, 1)
  selectedWorker.value = null
}

const isHourType = (row: OtherDispatchItemRow) =>
  row.pwSortCode === HOUR_TYPE_CODE || row.pwSortName === HOUR_TYPE_NAME

const onPwSortChange = (row: OtherDispatchItemRow, code: string) => {
  const t = typeOptions.value.find((x) => x.code === code)
  row.pwSortCode = code
  row.pwSortName = t?.name || ''
  row.pieceTypeCode = t?.pieceTypeCode || '2'
  row.pieceType = t?.pieceType || '个人计件'
  row.controlModeCode = t?.controlModeCode || '1'
  row.controlAttr = t?.controlAttr || '无关联'
  row.assignTypeCode = DEFAULT_ASSIGN.code
  row.assignType = DEFAULT_ASSIGN.label
  // 非工时报工：单位由品号带出，切换类型时若已选品号则重刷单位
  if (!isHourType(row) && row.goodsCode) {
    const g = goodsOptions.value.find((x) => x.goodsCode === row.goodsCode)
    if (g?.unitCode) {
      row.unit = g.unitCode
      row.wageUnit = g.unitCode
    }
  }
}

const onPieceTypeChange = (row: OtherDispatchItemRow, code: string) => {
  const p = pieceTypeOptions.find((x) => x.code === code)
  row.pieceTypeCode = code
  row.pieceType = p?.label || ''
}

const formatNum = (v: number | undefined) => {
  if (v == null || Number.isNaN(v)) return '0'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

const onUnitChange = (row: OtherDispatchItemRow) => {
  row.wageUnit = row.unit || ''
}

const syncWageQty = (row: OtherDispatchWorkerRow) => {
  // 与 ERP 一致：计件数量默认跟随派工数量
  row.wageQty = Number(row.planQty) || 0
}

const recalcItemWage = (row: OtherDispatchItemRow) => {
  const qty = Number(row.planQty) || 0
  const up = Number(row.prcUp) || 0
  row.wageAmt = Math.round(qty * up * 1e6) / 1e6
  // 仅一人且分配方式为按个人实时分配时，人员派工数量跟随明细
  if (row.assignTypeCode === '1') {
    const workers = form.workers.filter((w) => isWorkerOfItem(row, w))
    if (workers.length === 1) {
      workers[0].planQty = qty
      workers[0].wageQty = qty
    }
  }
}

const ensureEmpOptions = async (keyword = '') => {
  empLoading.value = true
  try {
    empOptions.value = await getOtherDispatchEmployees(form.deptId, keyword || undefined)
  } catch {
    empOptions.value = []
  } finally {
    empLoading.value = false
  }
}

let empSearchTimer: ReturnType<typeof setTimeout> | null = null
const remoteEmpSearch = (keyword: string) => {
  if (empSearchTimer) clearTimeout(empSearchTimer)
  empSearchTimer = setTimeout(() => {
    ensureEmpOptions(keyword)
  }, 250)
}

const onEmpChange = (row: OtherDispatchWorkerRow, empNo: string) => {
  const emp = empOptions.value.find((e) => e.empNo === empNo)
  row.empNo = empNo || ''
  row.empName = emp?.empName || ''
  row.deptId = emp?.deptId || form.deptId || 0
  row.deptCode = emp?.deptCode || depts.value.find((d) => d.deptId === row.deptId)?.deptCode || ''
  row.deptName = emp?.deptName || form.deptName || ''
  row.sNo = selectedItem.value?.sNo || row.sNo
}

const ensureGoodsOptions = async (keyword = '') => {
  goodsLoading.value = true
  try {
    goodsOptions.value = await getOtherDispatchGoodsOptions(keyword || undefined)
  } catch {
    goodsOptions.value = []
  } finally {
    goodsLoading.value = false
  }
}

let goodsSearchTimer: ReturnType<typeof setTimeout> | null = null
const remoteGoodsSearch = (keyword: string) => {
  if (goodsSearchTimer) clearTimeout(goodsSearchTimer)
  goodsSearchTimer = setTimeout(() => {
    ensureGoodsOptions(keyword)
  }, 250)
}

const onGoodsChange = (row: OtherDispatchItemRow, code: string) => {
  if (!code) {
    row.goodsId = 0
    row.goodsCode = ''
    row.goodsName = ''
    if (!isHourType(row)) {
      row.unit = ''
      row.wageUnit = ''
    }
    return
  }
  const g = goodsOptions.value.find((x) => x.goodsCode === code)
  row.goodsId = g?.goodsId || 0
  row.goodsCode = code
  row.goodsName = g?.goodsName || ''
  // 非工时报工：单位随品号标准单位带出；工时报工可自选单位，不覆盖已选手动单位
  if (!isHourType(row) || !row.unit) {
    row.unit = g?.unitCode || row.unit || ''
    row.wageUnit = row.unit
  }
}

const ensureUnitOptions = async (keyword = '') => {
  unitLoading.value = true
  try {
    unitOptions.value = await getOtherDispatchUnitOptions(keyword || undefined)
  } catch {
    unitOptions.value = []
  } finally {
    unitLoading.value = false
  }
}

let unitSearchTimer: ReturnType<typeof setTimeout> | null = null
const remoteUnitSearch = (keyword: string) => {
  if (unitSearchTimer) clearTimeout(unitSearchTimer)
  unitSearchTimer = setTimeout(() => {
    ensureUnitOptions(keyword)
  }, 250)
}

const handleSave = async () => {
  await formRef.value?.validate()
  if (!form.items.length) {
    ElMessage.warning('请至少添加一条派工明细')
    return
  }
  for (const item of form.items) {
    if (!item.pwSortCode) {
      ElMessage.warning(`序号 ${item.sNo}：请选择派工类型代号`)
      return
    }
    if (item.planQty == null || Number(item.planQty) <= 0) {
      ElMessage.warning(`序号 ${item.sNo}：请填写派工数量`)
      return
    }
    if (!item.pieceTypeCode) {
      ElMessage.warning(`序号 ${item.sNo}：请选择计件类型`)
      return
    }
    item.assignTypeCode = item.assignTypeCode || DEFAULT_ASSIGN.code
    item.assignType = item.assignType || DEFAULT_ASSIGN.label
    const workers = form.workers.filter((w) => isWorkerOfItem(item, w))
    if (!workers.length) {
      ElMessage.warning(`序号 ${item.sNo}：请至少添加一名人员`)
      return
    }
    for (const w of workers) {
      if (!w.empNo) {
        ElMessage.warning(`序号 ${item.sNo}：人员明细请选择工号`)
        return
      }
      if (w.planQty == null || Number(w.planQty) <= 0) {
        ElMessage.warning(`序号 ${item.sNo}：人员「${w.empName || w.empNo}」请填写派工数量`)
        return
      }
    }
  }
  saving.value = true
  try {
    const payload = {
      owtNo: form.owtNo,
      owtDate: form.owtDate,
      planDate: form.planDate || form.owtDate || undefined,
      deptId: form.deptId,
      deptName: form.deptName,
      remark: form.remark,
      auditStatus: '未审核',
      items: form.items.map((i) => ({
        ...i,
        owtNo: form.owtNo,
        assignTypeCode: i.assignTypeCode || '1',
        assignType: i.assignType || '按个人实时分配',
        planDate: i.planDate || form.planDate || form.owtDate || '',
        fnQty: Number(i.fnQty) || 0,
        srcBillQty: Number(i.srcBillQty) || 0,
      })),
      workers: form.workers.map((w) => ({
        ...w,
        owtNo: form.owtNo,
        deptId: w.deptId || form.deptId || 0,
        deptName: w.deptName || form.deptName || '',
        fnQty: Number(w.fnQty) || 0,
        wageQty: w.wageQty ?? w.planQty ?? 0,
      })),
    }
    const res = isEdit.value ? await updateOtherDispatch(payload) : await submitOtherDispatch(payload)
    const owtNo = res.data || form.owtNo
    ElMessage.success(`保存成功：${owtNo}`)
    visible.value = false
    emit('saved', owtNo)
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const loadEdit = async (owtNo: string) => {
  loadingEdit.value = true
  try {
    const data = await getOtherDispatchDetail(owtNo)
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
    form.owtNo = data.owtNo
    form.owtDate = data.owtDate
    form.planDate = data.planDate || ''
    form.deptId = data.deptId || undefined
    form.deptName = data.deptName || ''
    form.remark = data.remark || ''
    form.auditStatus = '未审核'
    form.items = data.items || []
    form.workers = data.workers || []
    await Promise.all([ensureEmpOptions(), ensureGoodsOptions(), ensureUnitOptions()])
    // 编辑回显时补齐已选员工 / 品号 / 单位到下拉选项
    for (const w of form.workers) {
      if (w.empNo && !empOptions.value.some((e) => e.empNo === w.empNo)) {
        empOptions.value.push({
          empNo: w.empNo,
          empName: w.empName,
          deptId: w.deptId,
          deptCode: w.deptCode,
          deptName: w.deptName,
        })
      }
    }
    for (const item of form.items) {
      if (item.goodsCode && !goodsOptions.value.some((g) => g.goodsCode === item.goodsCode)) {
        goodsOptions.value.unshift({
          goodsId: item.goodsId || 0,
          goodsCode: item.goodsCode,
          goodsName: item.goodsName || '',
          unitCode: item.unit || '',
          unitName: '',
        })
      }
      if (item.unit && !unitOptions.value.some((u) => u.unitCode === item.unit)) {
        unitOptions.value.unshift({ unitCode: item.unit, unitName: item.wageUnit || item.unit })
      }
      if (!item.assignTypeCode) {
        item.assignTypeCode = DEFAULT_ASSIGN.code
        item.assignType = DEFAULT_ASSIGN.label
      }
    }
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
  selectedWorker.value = null
  empOptions.value = []
  goodsOptions.value = []
  unitOptions.value = []
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
    await Promise.all([loadDepts(), loadTypeOptions()])
    if (props.editOwtNo) {
      await loadEdit(props.editOwtNo)
    }
  }
)
</script>

<style lang="scss" scoped>
.od-create {
  padding: 4px 8px 16px;
}

.od-create__form {
  :deep(.el-form-item__label) {
    white-space: nowrap;
  }
}

.od-create__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
}

.od-create__tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.od-link-panel {
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

.od-create-drawer {
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

.od-th-req {
  color: #c45656;
  white-space: nowrap;
}
</style>

<style lang="scss">
body.od-drawer-resizing {
  cursor: col-resize !important;
  user-select: none !important;

  * {
    cursor: col-resize !important;
    user-select: none !important;
  }
}
</style>
