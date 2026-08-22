<template>
  <el-dialog
    :model-value="modelValue"
    class="emp-picker-dialog"
    title="选择人员"
    width="1100px"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @opened="onOpen"
  >
    <div class="emp-picker">
      <aside class="emp-picker__depts">
        <button class="emp-picker__dept-item" :class="{ 'is-active': empNavKey === 'all' }" type="button" @click="selectEmpNav('all')">
          <span>全部部门</span>
        </button>
        <button
          v-if="preferredDeptId != null"
          class="emp-picker__dept-item emp-picker__dept-item--workshop"
          :class="{ 'is-active': empNavKey === 'workshop' }"
          type="button"
          @click="selectEmpNav('workshop')"
        >
          <span>本车间</span>
          <em>优先</em>
        </button>
        <div class="emp-picker__dept-scroll">
          <button
            v-for="d in empDeptList"
            :key="d.deptId"
            class="emp-picker__dept-item"
            :class="{ 'is-active': empNavKey === String(d.deptId) }"
            type="button"
            @click="selectEmpNav(String(d.deptId), d)"
          >
            <span>{{ d.deptName || d.deptCode || d.deptId }}</span>
            <em v-if="d.deptCode">{{ d.deptCode }}</em>
          </button>
          <el-empty v-if="!empDeptList.length" :image-size="48" description="暂无部门" />
        </div>
        <footer class="emp-picker__dept-foot">共 {{ employees.length }} 人</footer>
      </aside>

      <section class="emp-picker__main">
        <div class="emp-picker__toolbar">
          <el-autocomplete
            v-model.trim="empKeyword"
            class="emp-picker__search"
            :debounce="300"
            :fetch-suggestions="fetchEmpSuggestions"
            clearable
            placeholder="搜索姓名 / 工号 / 部门 / 拼音"
            value-key="value"
            @clear="onEmpSearchClear"
            @keyup.enter="loadEmployees"
            @select="onEmpSuggestSelect"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #default="{ item }">
              <div class="emp-suggest-item">
                <span class="emp-suggest-item__tag" :class="item.type === 'dept' ? 'is-dept' : 'is-emp'">
                  {{ item.type === 'dept' ? '部门' : '人员' }}
                </span>
                <span class="emp-suggest-item__main">{{ item.value }}</span>
                <em class="emp-suggest-item__sub">{{ item.sub || '' }}</em>
              </div>
            </template>
          </el-autocomplete>
          <el-checkbox v-model="onlyDept" @change="onOnlyDeptChange">仅限本车间</el-checkbox>
          <el-button :loading="empLoading" type="primary" @click="loadEmployees">查询</el-button>
        </div>

        <div class="emp-picker__table">
          <el-table
            ref="empTableRef"
            v-loading="empLoading"
            border
            height="100%"
            :data="pagedEmployees"
            row-key="empNo"
            :row-class-name="empRowClassName"
            @selection-change="onEmpDraftChange"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column label="姓名" min-width="140">
              <template #default="{ row }">
                <div class="emp-name-cell">
                  <span class="emp-avatar">{{ empInitial(row.empName || row.empNo) }}</span>
                  <strong>{{ row.empName || '-' }}</strong>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="工号" min-width="120" prop="empNo" show-overflow-tooltip />
            <el-table-column label="部门" min-width="150" prop="deptName" show-overflow-tooltip />
            <template #empty>
              <el-empty description="暂无匹配人员" />
            </template>
          </el-table>
        </div>

        <div class="emp-picker__pager">
          <el-pagination
            v-model:current-page="empPageNo"
            v-model:page-size="empPageSize"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[20, 50, 100]"
            :total="employees.length"
          />
        </div>
      </section>

      <aside class="emp-picker__tray">
        <header class="emp-picker__tray-head">
          <strong>已选 {{ empDraft.length }} 人</strong>
          <el-button link type="primary" :disabled="!empDraft.length" @click="clearEmpDraft">清空</el-button>
        </header>
        <el-scrollbar class="emp-picker__tray-scroll">
          <article v-for="row in empDraft" :key="row.empNo" class="emp-tray-card">
            <span class="emp-avatar">{{ empInitial(row.empName || row.empNo) }}</span>
            <div class="emp-tray-card__info">
              <strong>{{ row.empName || row.empNo }}</strong>
              <span>{{ row.empNo }}</span>
              <em>{{ row.deptName || '-' }}</em>
            </div>
            <button class="emp-tray-card__remove" type="button" title="移除" @click="removeEmpDraft(row.empNo)">×</button>
          </article>
          <el-empty v-if="!empDraft.length" :image-size="56" description="勾选左侧人员" />
        </el-scrollbar>
      </aside>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Search } from '@element-plus/icons-vue'
import { getQuickDispatchDeptSuggest, getQuickDispatchEmployees } from '/@/api/procurement/quickDispatch'
import { filterDeptsByKeyword, filterEmpsByKeyword, isPinyinLikeKeyword } from '/@/utils/empMatch'

defineOptions({ name: 'EmpPickerDialog' })

const props = defineProps<{
  modelValue: boolean
  preferredDeptId?: number | string | null
  selected?: { empNo: string; empName?: string; deptName?: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [{ empNo: string; empName?: string; deptName?: string }[]]
}>()

const empTableRef = ref<any>(null)
const empLoading = ref(false)
const onlyDept = ref(true)
const empKeyword = ref('')
const empDeptId = ref<number | string | undefined>()
const empNavKey = ref<'all' | 'workshop' | string>('all')
const empDeptList = ref<any[]>([])
const empPageNo = ref(1)
const empPageSize = ref(20)
const empSelecting = ref(false)
const employees = ref<any[]>([])
const empDraft = ref<any[]>([])

const empInitial = (name: string) => String(name || '?').trim().slice(0, 1) || '?'

const pagedEmployees = computed(() => {
  const start = (empPageNo.value - 1) * empPageSize.value
  return employees.value.slice(start, start + empPageSize.value)
})

const empRowClassName = ({ row }: { row: any }) =>
  empDraft.value.some((d) => d.empNo === row.empNo) ? 'is-emp-selected' : ''

const resolveEmpDeptId = () => {
  if (empNavKey.value === 'workshop') return props.preferredDeptId ?? undefined
  if (empNavKey.value !== 'all' && empDeptId.value != null && empDeptId.value !== '') return empDeptId.value
  return undefined
}

const selectEmpNav = (key: string, dept?: any) => {
  empNavKey.value = key
  if (key === 'all') {
    empDeptId.value = undefined
    onlyDept.value = false
  } else if (key === 'workshop') {
    empDeptId.value = props.preferredDeptId ?? undefined
    onlyDept.value = true
  } else {
    empDeptId.value = dept?.deptId ?? key
    onlyDept.value = false
  }
  empPageNo.value = 1
  loadEmployees()
}

const onOnlyDeptChange = (checked: boolean | string | number) => {
  const on = checked === true || checked === 'true'
  if (on) {
    if (props.preferredDeptId == null) {
      onlyDept.value = false
      $baseMessage('当前工单未识别本车间，无法筛选', 'warning', 'hey')
      return
    }
    if (empNavKey.value !== 'workshop') selectEmpNav('workshop')
    else {
      empPageNo.value = 1
      loadEmployees()
    }
    return
  }
  if (empNavKey.value === 'workshop') selectEmpNav('all')
}

const fetchEmpSuggestions = async (query: string, cb: (results: any[]) => void) => {
  const kw = String(query || '').trim()
  if (!kw) return cb([])
  try {
    const pinyinKw = isPinyinLikeKeyword(kw)
    const [deptsRaw, empsRaw] = await Promise.all([
      getQuickDispatchDeptSuggest({ keyword: pinyinKw ? undefined : kw }),
      getQuickDispatchEmployees({
        deptId: resolveEmpDeptId(),
        keyword: pinyinKw ? undefined : kw,
      }),
    ])
    const depts = filterDeptsByKeyword(deptsRaw || [], kw)
    const emps = filterEmpsByKeyword(empsRaw || [], kw)
    cb([
      ...depts.slice(0, 6).map((r: any) => ({
        type: 'dept',
        value: r.deptName || r.deptCode || String(r.deptId || ''),
        sub: r.deptCode || String(r.deptId || ''),
        deptId: r.deptId,
        deptCode: r.deptCode,
        deptName: r.deptName,
      })),
      ...emps.slice(0, 8).map((r: any) => ({
        type: 'emp',
        value: r.empName || r.empNo,
        sub: `${r.empNo || ''} · ${r.deptName || '-'}`,
        empNo: r.empNo,
        empName: r.empName,
        deptId: r.deptId,
        deptName: r.deptName,
      })),
    ])
  } catch {
    cb([])
  }
}

const onEmpSuggestSelect = (item: any) => {
  if (item?.type === 'dept') {
    empKeyword.value = ''
    selectEmpNav(String(item.deptId), item)
    return
  }
  empKeyword.value = item?.empName || item?.empNo || empKeyword.value
  if (item?.deptId != null && item.deptId !== '') {
    onlyDept.value = false
    empNavKey.value = String(item.deptId)
    empDeptId.value = item.deptId
  }
  empPageNo.value = 1
  loadEmployees()
}

const onEmpSearchClear = () => {
  empKeyword.value = ''
  loadEmployees()
}

const syncEmpTableSelection = async () => {
  await nextTick()
  const table = empTableRef.value
  if (!table) return
  empSelecting.value = true
  table.clearSelection()
  const keep = new Set(empDraft.value.map((r) => r.empNo))
  pagedEmployees.value.forEach((row) => {
    if (keep.has(row.empNo)) table.toggleRowSelection(row, true)
  })
  await nextTick()
  empSelecting.value = false
}

const onEmpDraftChange = (rows: any[]) => {
  if (empSelecting.value) return
  const pageIds = new Set(pagedEmployees.value.map((r) => r.empNo))
  const selectedOnPage = new Map((rows || []).filter((r) => r?.empNo && pageIds.has(r.empNo)).map((r) => [r.empNo, r]))
  const kept = empDraft.value.filter((r) => !pageIds.has(r.empNo))
  const map = new Map<string, any>()
  kept.forEach((r) => map.set(r.empNo, r))
  selectedOnPage.forEach((r, k) => map.set(k, r))
  empDraft.value = [...map.values()]
}

const clearEmpDraft = async () => {
  empDraft.value = []
  await syncEmpTableSelection()
}

const removeEmpDraft = async (empNo: string) => {
  empDraft.value = empDraft.value.filter((r) => r.empNo !== empNo)
  await syncEmpTableSelection()
}

const loadEmpDepts = async () => {
  try {
    empDeptList.value = await getQuickDispatchDeptSuggest({})
  } catch {
    empDeptList.value = []
  }
}

const loadEmployees = async () => {
  empLoading.value = true
  try {
    const kw = String(empKeyword.value || '').trim()
    const pinyinKw = isPinyinLikeKeyword(kw)
    const rows = await getQuickDispatchEmployees({
      deptId: resolveEmpDeptId(),
      keyword: pinyinKw ? undefined : kw || undefined,
    })
    employees.value = kw ? filterEmpsByKeyword(rows || [], kw) : rows || []
    const maxPage = Math.max(1, Math.ceil(employees.value.length / empPageSize.value) || 1)
    if (empPageNo.value > maxPage) empPageNo.value = maxPage
    await syncEmpTableSelection()
  } catch (e: any) {
    employees.value = []
    $baseMessage(e?.message || '加载工人失败', 'error', 'hey')
  } finally {
    empLoading.value = false
  }
}

const onOpen = async () => {
  empPageNo.value = 1
  empNavKey.value = onlyDept.value && props.preferredDeptId != null ? 'workshop' : 'all'
  empDeptId.value = empNavKey.value === 'workshop' ? props.preferredDeptId ?? undefined : undefined
  empDraft.value = (props.selected || []).map((w) => ({
    empNo: w.empNo,
    empName: w.empName,
    deptName: w.deptName,
  }))
  if (!empDeptList.value.length) await loadEmpDepts()
  await loadEmployees()
}

const confirm = () => {
  emit(
    'confirm',
    empDraft.value.map((r) => ({
      empNo: r.empNo,
      empName: r.empName,
      deptName: r.deptName,
    }))
  )
  emit('update:modelValue', false)
}

watch(
  () => empPageNo.value,
  () => syncEmpTableSelection()
)
watch(
  () => empPageSize.value,
  () => {
    empPageNo.value = 1
    syncEmpTableSelection()
  }
)
</script>

<style lang="scss">
.emp-picker-dialog {
  .el-dialog__body {
    padding: 12px 16px 8px;
  }

  .el-dialog__footer {
    padding: 10px 16px 16px;
  }

  .el-button--primary {
    --el-button-bg-color: #2e7d5a;
    --el-button-border-color: #2e7d5a;
    --el-button-hover-bg-color: #246b4c;
    --el-button-hover-border-color: #246b4c;
  }
}

.emp-picker {
  --emp-green: #2e7d5a;
  --emp-green-soft: #e8f4ec;
  --emp-line: #dce8e0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 240px;
  height: 560px;
  border: 1px solid var(--emp-line);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;

  &__depts {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #f7faf8;
    border-right: 1px solid var(--emp-line);
  }

  &__dept-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 0 8px;
  }

  &__dept-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 10px 14px;
    border: 0;
    border-left: 3px solid transparent;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: #2a3a32;

    span {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    em {
      flex-shrink: 0;
      font-style: normal;
      font-size: 11px;
      color: #8a9b90;
    }

    &:hover {
      background: rgba(46, 125, 90, 0.06);
    }

    &.is-active {
      border-left-color: var(--emp-green);
      background: var(--emp-green-soft);
      color: var(--emp-green);
      font-weight: 600;
    }

    &--workshop em {
      color: var(--emp-green);
      background: #fff;
      border-radius: 999px;
      padding: 0 6px;
      line-height: 18px;
    }
  }

  &__dept-foot {
    padding: 8px 14px;
    border-top: 1px solid var(--emp-line);
    font-size: 12px;
    color: #7a8b7f;
  }

  &__main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid #eef2f0;
  }

  &__search {
    flex: 1;
    min-width: 180px;
  }

  &__table {
    flex: 1;
    min-height: 0;
    padding: 0 8px;

    .el-table .is-emp-selected > td {
      background: #eef7f1 !important;
    }
  }

  &__pager {
    display: flex;
    justify-content: flex-end;
    padding: 8px 12px 10px;
  }

  &__tray {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid var(--emp-line);
    background: linear-gradient(180deg, #fbfdfb 0%, #f6faf7 100%);
  }

  &__tray-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;

    strong {
      font-size: 13px;
    }
  }

  &__tray-scroll {
    flex: 1;
    min-height: 0;
    padding: 0 10px 12px;
  }
}

.emp-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.emp-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3f8f6c, #2e7d5a);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.emp-tray-card {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid #dce8e0;
  border-radius: 8px;
  background: #fff;

  &__info {
    min-width: 0;
    display: flex;
    flex-direction: column;

    strong {
      font-size: 13px;
    }

    span,
    em {
      font-size: 11px;
      color: #8a9b90;
      font-style: normal;
    }
  }

  &__remove {
    border: 0;
    background: transparent;
    font-size: 18px;
    color: #a0aea6;
    cursor: pointer;
  }
}

.emp-suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  &__tag {
    flex-shrink: 0;
    font-size: 11px;
    padding: 0 6px;
    border-radius: 4px;
    line-height: 18px;

    &.is-dept {
      background: #eef2ff;
      color: #4f6bed;
    }

    &.is-emp {
      background: #e8f4ec;
      color: #2e7d5a;
    }
  }

  &__main {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    margin-left: auto;
    font-style: normal;
    font-size: 11px;
    color: #8a9b90;
  }
}
</style>
