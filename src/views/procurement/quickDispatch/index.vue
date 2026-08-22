<template>
  <div class="qd-page auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.moNo" clearable placeholder="制令号" style="width: 168px" @keyup.enter="loadPreview" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.woNo" clearable placeholder="工单号" style="width: 148px" @keyup.enter="loadPreview" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.goodsName" clearable placeholder="品名" style="width: 140px" @keyup.enter="loadPreview" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.prcName" clearable placeholder="工序" style="width: 120px" @keyup.enter="loadPreview" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.dispatchStatus" clearable placeholder="派工状态" style="width: 120px">
              <el-option label="未派工" value="未派工" />
              <el-option label="部分派工" value="部分派工" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="loading" type="primary" @click="loadPreview">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div class="qd-context">
      <div class="qd-context__main">
        <div class="qd-context__title">
          <span class="label">快捷派工</span>
          <strong>{{ contextTitle }}</strong>
          <el-tag v-if="contextTag" effect="plain" size="small" type="success">{{ contextTag }}</el-tag>
        </div>
        <div class="qd-context__meta">
          <span>可派工单 {{ filteredWorkOrders.length }}</span>
          <span>已选工序 {{ selectedLeaves.length }}</span>
          <span>参与人员 {{ pickedWorkers.length }}</span>
        </div>
      </div>
      <div class="qd-context__progress">
        <div class="qd-context__progress-head">
          <span>本次完成度</span>
          <b>{{ wizardPercent }}%</b>
        </div>
        <el-progress color="#2e7d5a" :percentage="wizardPercent" :show-text="false" :stroke-width="10" />
      </div>
    </div>

    <nav aria-label="派工步骤" class="qd-steps">
      <button
        v-for="(step, idx) in stepItems"
        :key="step.key"
        class="qd-steps__item"
        :class="{ 'is-done': currentStep > idx, 'is-current': currentStep === idx }"
        type="button"
      >
        <i>{{ idx + 1 }}</i>
        <span>{{ step.label }}</span>
        <em v-if="idx < stepItems.length - 1" />
      </button>
    </nav>

    <div class="qd-main">
      <!-- 左：工单×工序树 -->
      <section class="qd-panel qd-panel--tree">
        <header class="qd-panel__head">
          <strong>1. 选择工单与工序</strong>
          <el-checkbox v-model="mergeSameProcess" size="small">同工序合并预览</el-checkbox>
        </header>
        <div class="qd-panel__toolbar">
          <el-input
            v-model.trim="treeKeyword"
            clearable
            placeholder="树内筛选；工单号回车可全库查询"
            size="small"
            @clear="onTreeKeywordClear"
            @keyup.enter="searchFromTree"
          />
        </div>
        <div v-loading="loading" class="qd-panel__body">
          <el-tree
            :key="treeReloadKey"
            ref="treeRef"
            :filter-node-method="filterTreeNode"
            lazy
            :load="loadTreeNode"
            node-key="id"
            :props="{ label: 'label', children: 'children', isLeaf: 'isLeaf' }"
            show-checkbox
            @check="onTreeCheck"
          >
            <template #default="{ data }">
              <div class="tree-node" :class="`is-${data.nodeType}`">
                <div class="tree-node__main">
                  <span class="tree-node__label">{{ data.label }}</span>
                  <span v-if="data.subLabel" class="tree-node__sub">{{ data.subLabel }}</span>
                </div>
                <div class="tree-node__qty">
                  <em v-if="data.nodeType === 'wo'">{{ data.dispatchStatus }}</em>
                  <b>{{ fmtNum(data.remainQty) }}</b>
                  <small>/ {{ fmtNum(data.planQty) }}</small>
                </div>
              </div>
            </template>
          </el-tree>
          <el-empty v-if="!filteredWorkOrders.length && !loading" description="暂无可派工工单" />
        </div>
        <footer class="qd-panel__foot">
          <span>已选 {{ selectedWoCount }} 张工单 · {{ selectedLeaves.length }} 道工序</span>
          <el-button link type="primary" @click="clearTreeSelection">清空</el-button>
        </footer>
      </section>

      <!-- 中：人员与比例 -->
      <section class="qd-panel qd-panel--people">
        <header class="qd-panel__head">
          <strong>2. 分配人员与比例</strong>
          <el-button :disabled="!selectedLeaves.length" :icon="Plus" size="small" type="primary" @click="openEmpDialog">
            选择人员
          </el-button>
        </header>
        <div class="qd-panel__toolbar qd-panel__toolbar--wrap">
          <el-radio-group v-model="assignScope" size="small">
            <el-radio-button value="unified">按工序统一分配</el-radio-button>
            <el-radio-button value="byWo">按工单分别查看</el-radio-button>
          </el-radio-group>
          <el-radio-group v-model="allocMode" size="small" @change="applyAlloc">
            <el-radio-button value="equal">平均</el-radio-button>
            <el-radio-button value="ratio">比例</el-radio-button>
            <el-radio-button value="manual">手动</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="activeTaskHint" class="qd-active-task">
          <span>{{ activeTaskHint.title }}</span>
          <em>{{ activeTaskHint.desc }}</em>
        </div>

        <div class="qd-panel__body qd-people-list">
          <article v-for="w in pickedWorkers" :key="w.empNo" class="worker-row">
            <el-avatar class="worker-row__avatar" :size="40">{{ (w.empName || '?').slice(0, 1) }}</el-avatar>
            <div class="worker-row__info">
              <strong>{{ w.empName || w.empNo }}</strong>
              <span>{{ w.empNo }} · {{ w.deptName || '车间' }}</span>
              <div class="worker-row__load">
                <span>本次占比</span>
                <el-progress :percentage="workerShare(w)" :show-text="false" :stroke-width="6" />
                <em>{{ workerShare(w) }}%</em>
              </div>
            </div>
            <div class="worker-row__alloc">
              <div class="worker-row__ratio">
                <span>比例</span>
                <el-slider
                  v-model="w.ratio"
                  :disabled="allocMode === 'equal' || allocMode === 'manual'"
                  :max="100"
                  :min="0"
                  :show-tooltip="true"
                  @input="onRatioChange"
                  @change="onRatioChange"
                />
                <b>{{ Math.round(num(w.ratio)) }}%</b>
              </div>
              <div class="worker-row__qty">
                <span>数量</span>
                <el-input-number
                  v-model="w.planQty"
                  controls-position="right"
                  :disabled="allocMode !== 'manual'"
                  :min="0"
                  :precision="2"
                  :step="1"
                  @change="onPlanQtyChange"
                />
              </div>
            </div>
            <el-button class="worker-row__remove" link type="danger" @click="removeWorker(w.empNo)">移除</el-button>
          </article>
          <el-empty v-if="!pickedWorkers.length" description="选择人员后设置比例或数量" />
        </div>

        <div class="qd-templates">
          <button class="tpl" type="button" @click="applyTemplate('equal')">平均分配</button>
          <button class="tpl" type="button" @click="applyTemplate('senior')">熟练优先 7:3</button>
          <button class="tpl" type="button" @click="applyTemplate('train')">带教 5:5</button>
        </div>

        <footer class="qd-panel__foot qd-alloc-foot">
          <span>比例合计 <b :class="{ 'is-bad': ratioSum > 100.5 && pickedWorkers.length > 0 }">{{ ratioSum }}%</b></span>
          <span>基准上限 {{ fmtNum(allocCap) }}</span>
          <span>基准已分 {{ fmtNum(pickedSum) }}</span>
          <span>预计派量 {{ fmtNum(assignedTotalQty) }}</span>
        </footer>
      </section>

      <!-- 右：预览 -->
      <section class="qd-panel qd-panel--preview">
        <header class="qd-panel__head">
          <strong>3. 确认派工内容</strong>
          <el-radio-group v-model="previewTab" size="small">
            <el-radio-button value="process">按工序</el-radio-button>
            <el-radio-button value="wo">按工单</el-radio-button>
          </el-radio-group>
        </header>

        <div class="qd-kpi">
          <div>
            <em>已选工序</em>
            <strong>{{ dispatchSummary.prcCount }}</strong>
          </div>
          <div>
            <em>计划派量</em>
            <strong>{{ fmtNum(dispatchSummary.totalQty) }}</strong>
          </div>
          <div>
            <em>涉及工单</em>
            <strong>{{ dispatchSummary.woCount }}</strong>
          </div>
        </div>

        <div class="qd-panel__body qd-preview-list">
          <article v-for="card in previewCards" :key="card.key" class="preview-card">
            <header>
              <div>
                <span class="preview-card__code">{{ card.code }}</span>
                <strong>{{ card.name }}</strong>
              </div>
              <b>{{ fmtNum(card.qty) }}</b>
            </header>
            <p v-if="card.woText" class="preview-card__wo">{{ card.woText }}</p>
            <p v-if="card.wageBrief" class="preview-card__wage">
              {{ card.wageBrief }}
              <template v-if="num(card.estWage) > 0"> · 预估工费 {{ fmtNum(card.estWage) }}</template>
            </p>
            <ul>
              <li v-for="w in card.workers" :key="w.empNo">
                <span>{{ w.empName || w.empNo }}</span>
                <em>{{ w.ratio }}%</em>
                <b>{{ fmtNum(w.planQty) }}</b>
              </li>
              <li v-if="!card.workers.length" class="is-empty">尚未分配人员</li>
            </ul>
          </article>
          <el-empty v-if="!previewCards.length" description="勾选工序后显示派工预览" />
        </div>

        <aside class="qd-summary-box">
          <header>本次派工汇总</header>
          <dl>
            <div><dt>派工任务</dt><dd>{{ dispatchSummary.taskCount }}</dd></div>
            <div><dt>涉及工单</dt><dd>{{ dispatchSummary.woCount }}</dd></div>
            <div><dt>涉及工序</dt><dd>{{ dispatchSummary.prcCount }}</dd></div>
            <div><dt>参与人员</dt><dd>{{ dispatchSummary.workerCount }}</dd></div>
            <div class="is-total"><dt>派工总量</dt><dd>{{ fmtNum(dispatchSummary.totalQty) }}</dd></div>
            <div v-if="dispatchSummary.estWageTotal > 0">
              <dt>预估工费</dt>
              <dd>{{ fmtNum(dispatchSummary.estWageTotal) }}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>

    <footer class="qd-footer">
      <div class="qd-footer__hint">
        {{
          canSubmit
            ? `将生成 1 张派工单，覆盖 ${dispatchSummary.woCount} 张工单、${dispatchSummary.prcCount} 道工序`
            : '请选择有剩余量的工序，并完成人员数量分配'
        }}
      </div>
      <div class="qd-footer__actions">
        <el-button @click="clearAll">取消</el-button>
        <el-button :disabled="!canSubmit" :loading="saving" type="primary" @click="submit">确认派工</el-button>
      </div>
    </footer>

    <el-dialog
      v-model="empDialog"
      class="emp-picker-dialog"
      title="选择人员"
      width="1100px"
      append-to-body
      destroy-on-close
      @opened="onEmpDialogOpen"
    >
      <div class="emp-picker">
        <aside class="emp-picker__depts">
          <button
            class="emp-picker__dept-item"
            :class="{ 'is-active': empNavKey === 'all' }"
            type="button"
            @click="selectEmpNav('all')"
          >
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
              <button class="emp-tray-card__remove" type="button" title="移除" @click="removeEmpDraft(row.empNo)">
                ×
              </button>
            </article>
            <el-empty v-if="!empDraft.length" :image-size="56" description="勾选左侧人员" />
          </el-scrollbar>
        </aside>
      </div>

      <template #footer>
        <el-button @click="empDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmEmployees">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  getQuickDispatchDeptSuggest,
  getQuickDispatchEmployees,
  getQuickDispatchPreview,
  getQuickDispatchProcesses,
  submitQuickDispatch,
} from '/@/api/procurement/quickDispatch'
import { filterDeptsByKeyword, filterEmpsByKeyword, isPinyinLikeKeyword } from '/@/utils/empMatch'
import { fmtNum, num } from '/@/utils/dispatchAlloc'
import { borLineKey, borWageBrief, estimateBorWage, summarizeBorWageFields } from '/@/utils/dispatchBor'

defineOptions({ name: 'QuickDispatch' })

const route = useRoute()
const treeRef = ref<any>(null)
const empTableRef = ref<any>(null)

const stepItems = [
  { key: 'pick', label: '选择工单与工序' },
  { key: 'alloc', label: '分配人员与比例' },
  { key: 'confirm', label: '确认派工内容' },
  { key: 'done', label: '派工完成' },
]

const queryForm = reactive({
  moNo: '',
  woNo: '',
  goodsName: '',
  prcName: '',
  dispatchStatus: '',
})

const loading = ref(false)
const saving = ref(false)
const empLoading = ref(false)
const empDialog = ref(false)
const onlyDept = ref(true)
const mergeSameProcess = ref(true)
const assignScope = ref<'unified' | 'byWo'>('unified')
const allocMode = ref<'equal' | 'ratio' | 'manual'>('equal')
const previewTab = ref<'process' | 'wo'>('process')
const treeKeyword = ref('')
const empKeyword = ref('')
const empDeptId = ref<number | string | undefined>()
const empNavKey = ref<'all' | 'workshop' | string>('all')
const empDeptList = ref<any[]>([])
const empPageNo = ref(1)
const empPageSize = ref(20)
const empSelecting = ref(false)

const allWorkOrders = ref<any[]>([])
/** 已懒加载的工单工序缓存：woNo -> lines */
const linesByWo = ref<Record<string, any[]>>({})
const checkedLeafIds = ref<string[]>([])
const employees = ref<any[]>([])
const empDraft = ref<any[]>([])
const pickedWorkers = ref<any[]>([])
/** 查询变更时强制重建树，避免 lazy 节点残留 */
const treeReloadKey = ref(0)

const lineKey = borLineKey

const filteredWorkOrders = computed(() => {
  const status = queryForm.dispatchStatus
  const goods = queryForm.goodsName.trim().toLowerCase()
  const prc = queryForm.prcName.trim().toLowerCase()
  return allWorkOrders.value.filter((wo) => {
    if (status && wo.dispatchStatus !== status) return false
    if (goods && !(wo.goodsName || '').toLowerCase().includes(goods)) return false
    if (!prc) return true
    const lines = linesByWo.value[wo.woNo]
    if (!lines) return true
    return lines.some((line) =>
      `${line.prcName || ''}${line.prcCode || ''}${line.mrName || ''}`.toLowerCase().includes(prc)
    )
  })
})

const mapWoToNode = (wo: any) => ({
  id: `wo:${wo.woNo}`,
  nodeType: 'wo',
  label: wo.woNo,
  subLabel: wo.goodsName || '',
  planQty: wo.planQty || wo.woQty,
  remainQty: wo.remainQty,
  dispatchStatus: wo.dispatchStatus,
  wo,
  isLeaf: false,
})

const mapLineToNode = (line: any) => ({
  id: lineKey(line),
  nodeType: 'prc',
  label: `${line.prcCode || ''} ${line.prcName || ''}`.trim(),
  subLabel: [line.mrName, borWageBrief(line)].filter(Boolean).join(' · '),
  planQty: line.woQty,
  remainQty: line.remainQty,
  disabled: num(line.remainQty) <= 0,
  isLeaf: true,
  line,
})

const loadTreeNode = async (node: any, resolve: (data: any[]) => void) => {
  if (node.level === 0) {
    resolve(filteredWorkOrders.value.map(mapWoToNode))
    return
  }
  const data = node.data
  if (!data || data.nodeType !== 'wo') {
    resolve([])
    return
  }
  const woNo = data.wo?.woNo || String(data.id || '').replace(/^wo:/, '')
  if (!woNo) {
    resolve([])
    return
  }
  try {
    let lines = linesByWo.value[woNo]
    if (!lines) {
      lines = await getQuickDispatchProcesses({
        woNo,
        moNo: queryForm.moNo || data.wo?.moNo,
      })
      linesByWo.value = { ...linesByWo.value, [woNo]: lines || [] }
    }
    const prc = queryForm.prcName.trim().toLowerCase()
    resolve(
      (lines || [])
        .filter((line: any) => {
          if (num(line.remainQty) <= 0) return false
          if (!prc) return true
          return `${line.prcName || ''}${line.prcCode || ''}${line.mrName || ''}`.toLowerCase().includes(prc)
        })
        .map(mapLineToNode)
    )
  } catch (e: any) {
    $baseMessage(e?.message || '加载工序失败', 'error', 'hey')
    resolve([])
  }
}

const selectedLeaves = computed(() => {
  const map = new Map<string, any>()
  for (const lines of Object.values(linesByWo.value)) {
    for (const line of lines) {
      if (num(line.remainQty) <= 0) continue
      const node = mapLineToNode(line)
      map.set(node.id, node)
    }
  }
  return checkedLeafIds.value.map((id) => map.get(id)).filter(Boolean)
})

const selectedLines = computed(() => selectedLeaves.value.map((n) => n.line))

const selectedWoCount = computed(() => new Set(selectedLines.value.map((l) => l.woNo)).size)

const contextTitle = computed(() => {
  if (queryForm.moNo) return `制令 ${queryForm.moNo}`
  if (selectedLines.value.length === 1) return selectedLines.value[0].woNo
  if (selectedWoCount.value === 1) return selectedLines.value[0]?.woNo || '批量派工'
  return selectedWoCount.value > 0 ? `已选 ${selectedWoCount.value} 张工单` : '待派工工单'
})

const contextTag = computed(() => {
  if (!selectedLines.value.length) return filteredWorkOrders.value.length ? '待选择' : ''
  return '派工中'
})

const allocCap = computed(() => {
  if (!selectedLines.value.length) return 0
  return Math.min(...selectedLines.value.map((l) => num(l.remainQty)))
})

const totalRemainQty = computed(() =>
  selectedLines.value.reduce((s, l) => s + num(l.remainQty), 0)
)

const pickedSum = computed(() => pickedWorkers.value.reduce((s, w) => s + num(w.planQty), 0))
const ratioSum = computed(() => pickedWorkers.value.reduce((s, w) => s + num(w.ratio), 0))

/** 按当前基准已分数量，把某工序剩余量缩放到应派合计，再按工人 planQty 占比拆分 */
const workersForRemain = (remain: number) => {
  const lineRemain = num(remain)
  const list = pickedWorkers.value
  const baseSum = pickedSum.value
  const cap = allocCap.value
  if (!list.length || lineRemain <= 0 || baseSum <= 0) {
    return [] as { empNo: string; empName: string; ratio: number; planQty: number }[]
  }

  const scale = cap > 0 ? baseSum / cap : 1
  const target = Math.min(lineRemain, Math.max(0, lineRemain * scale))
  if (target <= 0) return []

  const weights = list.map((w) => num(w.planQty))
  const weightSum = weights.reduce((s, n) => s + n, 0) || 1

  const preferInteger = Math.abs(target - Math.round(target)) < 0.000001
  if (preferInteger) {
    const intTotal = Math.round(target)
    const parts = list.map((w, i) => {
      const exact = (intTotal * weights[i]) / weightSum
      const floor = Math.floor(exact)
      return { w, floor, frac: exact - floor }
    })
    let left = intTotal - parts.reduce((s, p) => s + p.floor, 0)
    parts
      .slice()
      .sort((a, b) => b.frac - a.frac)
      .forEach((p) => {
        if (left > 0) {
          p.floor += 1
          left -= 1
        }
      })
    return parts
      .filter((p) => p.floor > 0)
      .map((p) => ({
        empNo: p.w.empNo,
        empName: p.w.empName,
        ratio: num(p.w.ratio),
        planQty: p.floor,
      }))
  }

  let assigned = 0
  return list
    .map((w, i) => {
      let planQty = 0
      if (i === list.length - 1) planQty = Number((target - assigned).toFixed(2))
      else {
        planQty = Number(((target * weights[i]) / weightSum).toFixed(2))
        assigned += planQty
      }
      return { empNo: w.empNo, empName: w.empName, ratio: num(w.ratio), planQty }
    })
    .filter((w) => num(w.planQty) > 0)
}

const cardWageMeta = (leaves: any[]) => {
  const lines = leaves.map((l) => l.line).filter(Boolean)
  if (!lines.length) return { wageBrief: '', estWage: 0 }
  const qtyMap = new Map<string, number>()
  for (const leaf of leaves) {
    const remain = num(leaf.line.remainQty)
    const q = workersForRemain(remain).reduce((s, w) => s + num(w.planQty), 0)
    qtyMap.set(lineKey(leaf.line), q)
  }
  if (lines.length === 1) {
    const line = lines[0]
    const qty = qtyMap.get(lineKey(line)) || 0
    return {
      wageBrief: borWageBrief(line),
      estWage: estimateBorWage(line, qty),
    }
  }
  const wage = summarizeBorWageFields(lines)
  const totalQty = [...qtyMap.values()].reduce((s, q) => s + num(q), 0)
  return {
    wageBrief: `${wage.wageTypeText} · 单价 ${wage.upText} · 工时 ${wage.timeText}`,
    estWage: wage.estWageByQty(qtyMap, totalQty),
  }
}

const assignedTotalQty = computed(() =>
  selectedLines.value.reduce((s, line) => {
    return s + workersForRemain(num(line.remainQty)).reduce((a, w) => a + num(w.planQty), 0)
  }, 0)
)

const buildSubmitItems = () =>
  selectedLines.value
    .map((row) => {
      const workers = workersForRemain(num(row.remainQty)).map((w) => ({
        empNo: w.empNo,
        planQty: num(w.planQty),
      }))
      return {
        woNo: row.woNo,
        moNo: row.moNo,
        mrCode: row.mrCode,
        prcCode: row.prcCode,
        goodsId: row.goodsId,
        woBorSno: row.woBorSno,
        workers,
      }
    })
    .filter((item) => item.workers.length > 0)

const activeTaskHint = computed(() => {
  if (!selectedLeaves.value.length) return null
  const multi = selectedLeaves.value.length > 1
  const uneven = multi && Math.abs(totalRemainQty.value - allocCap.value * selectedLeaves.value.length) > 0.000001
  if (assignScope.value === 'unified' && mergeSameProcess.value) {
    const first = selectedLeaves.value[0]
    return {
      title: `${first.line.prcCode || ''} ${first.line.prcName || ''}`.trim() || '已选工序',
      desc: uneven
        ? `统一比例 · ${selectedLeaves.value.length} 道工序按各自剩余量拆分（合计 ${fmtNum(totalRemainQty.value)}）`
        : `统一分配 · 覆盖 ${selectedWoCount.value} 张工单 · 单工序 ${fmtNum(allocCap.value)}`,
    }
  }
  return {
    title: `已选 ${selectedLeaves.value.length} 道工序`,
    desc: uneven
      ? `相同比例写入各工序，数量=各工序剩余可派量（合计 ${fmtNum(totalRemainQty.value)}）`
      : `工人数量按相同比例写入每道工序（单工序 ${fmtNum(allocCap.value)}）`,
  }
})

const previewCards = computed(() => {
  if (previewTab.value === 'wo') {
    const byWo = new Map<string, any[]>()
    for (const leaf of selectedLeaves.value) {
      const list = byWo.get(leaf.line.woNo) || []
      list.push(leaf)
      byWo.set(leaf.line.woNo, list)
    }
    return [...byWo.entries()].map(([woNo, leaves]) => {
      const workerMap = new Map<string, any>()
      let qty = 0
      for (const leaf of leaves) {
        for (const w of workersForRemain(num(leaf.line.remainQty))) {
          qty += num(w.planQty)
          const prev = workerMap.get(w.empNo)
          if (prev) prev.planQty = num(prev.planQty) + num(w.planQty)
          else workerMap.set(w.empNo, { ...w })
        }
      }
      return {
        key: woNo,
        code: woNo,
        name: leaves[0]?.line?.goodsName || '工单',
        qty,
        woText: `${leaves.length} 道工序`,
        workers: [...workerMap.values()],
        ...cardWageMeta(leaves),
      }
    })
  }

  if (mergeSameProcess.value) {
    const grouped = new Map<string, any[]>()
    for (const leaf of selectedLeaves.value) {
      const key = `${leaf.line.mrCode || ''}|${leaf.line.prcCode || ''}`
      const list = grouped.get(key) || []
      list.push(leaf)
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([key, leaves], idx) => {
      const sample = leaves[0].line
      const woNos = [...new Set(leaves.map((l) => l.line.woNo))]
      const workerMap = new Map<string, any>()
      let qty = 0
      for (const leaf of leaves) {
        for (const w of workersForRemain(num(leaf.line.remainQty))) {
          qty += num(w.planQty)
          const prev = workerMap.get(w.empNo)
          if (prev) prev.planQty = num(prev.planQty) + num(w.planQty)
          else workerMap.set(w.empNo, { ...w })
        }
      }
      return {
        key: key || `g-${idx}`,
        code: sample.prcCode || `TASK-${idx + 1}`,
        name: sample.prcName || sample.prcCode,
        qty,
        woText: `关联工单 ${woNos.join('、')}`,
        workers: [...workerMap.values()],
        ...cardWageMeta(leaves),
      }
    })
  }

  return selectedLeaves.value.map((leaf, idx) => {
    const remain = num(leaf.line.remainQty)
    const workers = workersForRemain(remain)
    const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
    return {
      key: leaf.id,
      code: leaf.line.prcCode || `TASK-${idx + 1}`,
      name: leaf.line.prcName || leaf.line.prcCode,
      qty,
      woText: `工单 ${leaf.line.woNo}`,
      workers,
      ...cardWageMeta([leaf]),
    }
  })
})

const dispatchSummary = computed(() => ({
  taskCount: previewCards.value.length,
  woCount: selectedWoCount.value,
  prcCount: selectedLeaves.value.length,
  workerCount: pickedWorkers.value.length,
  totalQty: assignedTotalQty.value,
  estWageTotal: previewCards.value.reduce((s, c) => s + num(c.estWage), 0),
}))

const canSubmit = computed(() => {
  if (!selectedLeaves.value.length || !pickedWorkers.value.length) return false
  if (allocCap.value <= 0) return false
  if (pickedSum.value <= 0) return false
  if (pickedSum.value - allocCap.value > 0.000001) return false
  // 比例模式：允许合计 ≤100（单人可只派一部分）；超过 100 不可提交
  if (allocMode.value === 'ratio' && ratioSum.value - 100 > 0.5) return false
  if (allocMode.value === 'ratio' && ratioSum.value <= 0) return false
  return pickedWorkers.value.every((w) => num(w.planQty) > 0)
})

const currentStep = computed(() => {
  if (!selectedLeaves.value.length) return 0
  if (!pickedWorkers.value.length || pickedSum.value <= 0) return 1
  return 2
})

const wizardPercent = computed(() => {
  let p = 0
  if (filteredWorkOrders.value.length) p += 10
  if (selectedLeaves.value.length) p += 30
  if (pickedWorkers.value.length) p += 30
  if (canSubmit.value) p += 30
  return Math.min(100, p)
})

watch(treeKeyword, (val) => {
  treeRef.value?.filter(val)
})

watch(
  () => [queryForm.dispatchStatus, queryForm.goodsName, queryForm.prcName],
  () => {
    treeReloadKey.value += 1
  }
)

const filterTreeNode = (value: string, data: any) => {
  if (!value) return true
  const kw = value.toLowerCase()
  return `${data.label || ''}${data.subLabel || ''}`.toLowerCase().includes(kw)
}

/** 树内回车：像工单号则走服务端查询（默认列表只有 TOP200，历史工单不在其中） */
const searchFromTree = () => {
  const kw = treeKeyword.value.trim()
  if (!kw) return
  const looksLikeWo = /^W\d+/i.test(kw) || /W\d{6,}/i.test(kw)
  const looksLikeMo = !looksLikeWo && kw.length >= 6
  if (looksLikeWo) {
    queryForm.woNo = kw
    queryForm.moNo = ''
    loadPreview()
    return
  }
  if (looksLikeMo) {
    queryForm.moNo = kw
    queryForm.woNo = ''
    loadPreview()
    return
  }
  treeRef.value?.filter(kw)
}

const onTreeKeywordClear = () => {
  treeRef.value?.filter('')
}

const onTreeCheck = (_data: any, ctx: any) => {
  const keys: string[] = ctx?.checkedKeys || []
  checkedLeafIds.value = keys.filter((k) => !String(k).startsWith('wo:'))
  applyAlloc()
}

const clearTreeSelection = () => {
  treeRef.value?.setCheckedKeys([])
  checkedLeafIds.value = []
}

const redistributeByRatio = () => {
  const total = num(allocCap.value)
  const list = pickedWorkers.value
  if (!list.length || total <= 0) return

  // 比例按「占基准上限的百分比」：单人拉到 50% = 派上限的一半（不能用 ratio/sumRatio，否则单人永远 100%）
  const preferInteger = Math.abs(total - Math.round(total)) < 0.000001
  if (preferInteger) {
    const intTotal = Math.round(total)
    const parts = list.map((w) => {
      const exact = (intTotal * num(w.ratio)) / 100
      const floor = Math.floor(exact)
      return { w, floor, frac: exact - floor }
    })
    const ratioTotal = list.reduce((s, w) => s + num(w.ratio), 0)
    const targetSum = Math.min(intTotal, Math.round((intTotal * ratioTotal) / 100))
    let remain = targetSum - parts.reduce((s, p) => s + p.floor, 0)
    parts
      .slice()
      .sort((a, b) => b.frac - a.frac)
      .forEach((p) => {
        if (remain > 0) {
          p.floor += 1
          remain -= 1
        }
      })
    parts.forEach((p) => {
      p.w.planQty = p.floor
    })
    return
  }

  list.forEach((w) => {
    w.planQty = Number(((total * num(w.ratio)) / 100).toFixed(2))
  })
}

const workerShare = (w: any) => {
  const cap = allocCap.value
  if (cap <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((num(w.planQty) / cap) * 100)))
}

const syncRatioFromQty = () => {
  const list = pickedWorkers.value
  if (!list.length) return
  const cap = allocCap.value
  // 单人：比例 = 数量占基准上限的百分比，便于切换到「比例」模式继续调
  if (list.length === 1 && cap > 0) {
    list[0].ratio = Math.min(100, Math.max(0, Math.round((num(list[0].planQty) / cap) * 100)))
    return
  }
  const sum = list.reduce((s, w) => s + num(w.planQty), 0)
  if (sum <= 0) {
    list.forEach((w) => {
      w.ratio = 0
    })
    return
  }
  let assigned = 0
  list.forEach((w, i) => {
    if (i === list.length - 1) {
      w.ratio = Math.max(0, 100 - assigned)
    } else {
      const r = Math.round((num(w.planQty) / sum) * 100)
      w.ratio = r
      assigned += r
    }
  })
}

const applyEqual = () => {
  const n = pickedWorkers.value.length
  if (!n) return
  const eachRatio = Math.floor(100 / n)
  pickedWorkers.value.forEach((w, i) => {
    w.ratio = i === n - 1 ? 100 - eachRatio * (n - 1) : eachRatio
  })
  redistributeByRatio()
}

const applyAlloc = () => {
  if (!pickedWorkers.value.length) return
  if (allocMode.value === 'equal') applyEqual()
  else if (allocMode.value === 'ratio') redistributeByRatio()
  else syncRatioFromQty()
}

const onRatioChange = () => {
  if (allocMode.value === 'ratio') redistributeByRatio()
}

const onPlanQtyChange = () => {
  if (allocMode.value === 'manual') syncRatioFromQty()
}

const applyTemplate = (type: string) => {
  if (!pickedWorkers.value.length) {
    $baseMessage('请先选择人员', 'warning', 'hey')
    return
  }
  allocMode.value = 'ratio'
  const n = pickedWorkers.value.length
  if (type === 'equal' || n === 1) {
    applyEqual()
    return
  }
  if (type === 'senior') {
    pickedWorkers.value[0].ratio = 70
    const rest = 30
    const others = n - 1
    const each = Math.floor(rest / others)
    pickedWorkers.value.slice(1).forEach((w, i) => {
      w.ratio = i === others - 1 ? rest - each * (others - 1) : each
    })
  } else if (type === 'train') {
    if (n === 2) {
      pickedWorkers.value[0].ratio = 50
      pickedWorkers.value[1].ratio = 50
    } else applyEqual()
  }
  redistributeByRatio()
}

const removeWorker = (empNo: string) => {
  pickedWorkers.value = pickedWorkers.value.filter((w) => w.empNo !== empNo)
  applyAlloc()
}

const openEmpDialog = () => {
  if (!selectedLeaves.value.length) {
    $baseMessage('请先勾选工序', 'warning', 'hey')
    return
  }
  empDialog.value = true
}

const empInitial = (name: string) => String(name || '?').trim().slice(0, 1) || '?'

const pagedEmployees = computed(() => {
  const start = (empPageNo.value - 1) * empPageSize.value
  return employees.value.slice(start, start + empPageSize.value)
})

const empRowClassName = ({ row }: { row: any }) =>
  empDraft.value.some((d) => d.empNo === row.empNo) ? 'is-emp-selected' : ''

const preferredDeptId = computed(() => {
  const woNo = selectedLines.value[0]?.woNo
  return allWorkOrders.value.find((w) => w.woNo === woNo)?.deptId
})

const resolveEmpDeptId = () => {
  if (empNavKey.value === 'workshop') return preferredDeptId.value
  if (empNavKey.value !== 'all' && empDeptId.value != null && empDeptId.value !== '') return empDeptId.value
  return undefined
}

const selectEmpNav = (key: string, dept?: any) => {
  empNavKey.value = key
  if (key === 'all') {
    empDeptId.value = undefined
    onlyDept.value = false
  } else if (key === 'workshop') {
    empDeptId.value = preferredDeptId.value
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
    if (preferredDeptId.value == null) {
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
  // 取消勾选 → 取消左侧「本车间」选中，回到全部部门
  if (empNavKey.value === 'workshop') selectEmpNav('all')
}

const fetchEmpSuggestions = async (query: string, cb: (results: any[]) => void) => {
  const kw = String(query || '').trim()
  if (!kw) return cb([])
  try {
    const pinyinKw = isPinyinLikeKeyword(kw)
    const [deptsRaw, empsRaw] = await Promise.all([
      // 拼音时也拉部门列表，再用全拼严格过滤（避免无 keyword 时刷出一堆无关部门）
      getQuickDispatchDeptSuggest({ keyword: pinyinKw ? undefined : kw }),
      getQuickDispatchEmployees({
        deptId: resolveEmpDeptId(),
        keyword: pinyinKw ? undefined : kw,
      }),
    ])
    const depts = filterDeptsByKeyword(deptsRaw || [], kw)
    const emps = filterEmpsByKeyword(empsRaw || [], kw)
    const deptItems = depts.slice(0, 6).map((r: any) => ({
      type: 'dept',
      value: r.deptName || r.deptCode || String(r.deptId || ''),
      sub: r.deptCode || String(r.deptId || ''),
      deptId: r.deptId,
      deptCode: r.deptCode,
      deptName: r.deptName,
    }))
    const empItems = emps.slice(0, 8).map((r: any) => ({
      type: 'emp',
      value: r.empName || r.empNo,
      sub: `${r.empNo || ''} · ${r.deptName || '-'}`,
      empNo: r.empNo,
      empName: r.empName,
      deptId: r.deptId,
      deptName: r.deptName,
    }))
    cb([...deptItems, ...empItems])
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
  // 选中人员时，左侧同步到其所在部门
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
      // 纯拼音：不传 keyword，避免库端中文名匹配失败
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

const onEmpDialogOpen = async () => {
  empPageNo.value = 1
  empNavKey.value = onlyDept.value && preferredDeptId.value != null ? 'workshop' : 'all'
  empDeptId.value = empNavKey.value === 'workshop' ? preferredDeptId.value : undefined
  empDraft.value = pickedWorkers.value.map((w) => ({
    empNo: w.empNo,
    empName: w.empName,
    deptName: w.deptName,
  }))
  if (!empDeptList.value.length) await loadEmpDepts()
  await loadEmployees()
}

watch([empPageNo, empPageSize], () => {
  if (empDialog.value) syncEmpTableSelection()
})

const confirmEmployees = () => {
  const prev = new Map(pickedWorkers.value.map((w) => [w.empNo, w]))
  pickedWorkers.value = empDraft.value.map((r) => {
    const old = prev.get(r.empNo)
    return {
      empNo: r.empNo,
      empName: r.empName,
      deptName: r.deptName,
      ratio: old?.ratio ?? 0,
      planQty: old?.planQty ?? 0,
    }
  })
  applyAlloc()
  empDialog.value = false
}

const loadPreview = async () => {
  loading.value = true
  try {
    const data = await getQuickDispatchPreview({
      moNo: queryForm.moNo,
      woNo: queryForm.woNo,
    })
    allWorkOrders.value = (data.workOrders || []).filter((w: any) => num(w.remainQty) > 0)
    linesByWo.value = {}
    checkedLeafIds.value = []
    treeReloadKey.value += 1
    applyAlloc()
  } catch (e: any) {
    allWorkOrders.value = []
    linesByWo.value = {}
    treeReloadKey.value += 1
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const clearAll = () => {
  clearTreeSelection()
  pickedWorkers.value = []
}

const resetQuery = () => {
  queryForm.moNo = ''
  queryForm.woNo = ''
  queryForm.goodsName = ''
  queryForm.prcName = ''
  queryForm.dispatchStatus = ''
  treeKeyword.value = ''
  clearAll()
  loadPreview()
}

const submit = async () => {
  if (!canSubmit.value) {
    $baseMessage('请完成工序选择与人员分配', 'warning', 'hey')
    return
  }
  const mo =
    queryForm.moNo ||
    selectedLines.value[0]?.moNo ||
    allWorkOrders.value.find((w) => w.woNo === selectedLines.value[0]?.woNo)?.moNo
  if (!mo) {
    $baseMessage('缺少制令号，无法生成派工单', 'warning', 'hey')
    return
  }
  saving.value = true
  try {
    const woNos = [...new Set(selectedLines.value.map((l) => l.woNo))]
    const items = buildSubmitItems()
    if (!items.length) {
      $baseMessage('没有可提交的工序分配', 'warning', 'hey')
      return
    }
    const result = await submitQuickDispatch({
      moNo: mo,
      woNos,
      processes: selectedLines.value.map((row) => ({
        woNo: row.woNo,
        mrCode: row.mrCode,
        prcCode: row.prcCode,
        goodsId: row.goodsId,
        woBorSno: row.woBorSno,
      })),
      workers: pickedWorkers.value.map((w) => ({ empNo: w.empNo, planQty: num(w.planQty) })),
      items,
    })
    $baseMessage(`已生成派工单 ${result?.wtNo || ''}`, 'success', 'hey')
    clearAll()
    await loadPreview()
  } catch (e: any) {
    $baseMessage(e?.message || '生成派工单失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const q = route.query || {}
  if (q.moNo) queryForm.moNo = String(q.moNo)
  if (q.woNo) queryForm.woNo = String(q.woNo)
  loadPreview()
})
</script>

<style lang="scss" scoped>
.qd-page {
  --qd-green: #2e7d5a;
  --qd-green-soft: #e8f4ec;
  --qd-ink: #1f2d26;
  --qd-muted: #6b7c72;
  --qd-line: #d8e4dc;
  --qd-bg: #f5f8f6;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  color: var(--qd-ink);
}

.qd-context {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 14px;
  border: 1px solid var(--qd-line);
  border-radius: 10px;
  background: linear-gradient(100deg, #f3faf6 0%, #ffffff 55%, #f7fafc 100%);

  &__main {
    min-width: 0;
    flex: 1;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    .label {
      font-size: 12px;
      color: var(--qd-muted);
    }

    strong {
      font-size: 16px;
      color: var(--qd-green);
    }
  }

  &__meta {
    margin-top: 4px;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--qd-muted);
  }

  &__progress {
    width: min(280px, 36vw);
    flex-shrink: 0;
  }

  &__progress-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--qd-muted);

    b {
      color: var(--qd-green);
      font-variant-numeric: tabular-nums;
    }
  }
}

.qd-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 4px 2px 2px;

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    background: transparent;
    padding: 8px 4px 14px;
    color: #8a9b90;
    cursor: default;

    i {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-style: normal;
      font-size: 12px;
      background: #dce8e0;
      color: #3f5348;
    }

    span {
      font-size: 13px;
    }

    em {
      position: absolute;
      right: -12%;
      top: 18px;
      width: 24%;
      border-top: 2px solid #dce8e0;
    }

    &.is-done,
    &.is-current {
      color: var(--qd-green);

      i {
        background: var(--qd-green);
        color: #fff;
      }
    }

    &.is-done em {
      border-color: #9dceb3;
    }
  }
}

.qd-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.15fr 1.2fr 1fr;
  gap: 8px;
}

.qd-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--qd-line);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #e8f0eb;
    background: #f7fbf8;

    strong {
      font-size: 13px;
    }
  }

  &__toolbar {
    padding: 8px 12px 0;
    display: flex;
    gap: 8px;

    &--wrap {
      flex-wrap: wrap;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 10px;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #e8f0eb;
    font-size: 12px;
    color: var(--qd-muted);
    background: #fbfdfb;
  }
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-right: 4px;
  min-width: 0;

  &__main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: 13px;
    color: var(--qd-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    font-size: 11px;
    color: #8a9b90;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__qty {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;

    em {
      margin-right: 6px;
      font-style: normal;
      font-size: 11px;
      color: #8a9b90;
    }

    b {
      color: var(--qd-green);
      font-size: 13px;
    }

    small {
      color: #9aaba0;
      font-size: 11px;
    }
  }

  &.is-wo .tree-node__label {
    font-weight: 600;
  }
}

:deep(.el-tree-node__content) {
  height: auto;
  min-height: 36px;
  padding: 4px 0;
  align-items: flex-start;
}

.qd-active-task {
  margin: 8px 12px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--qd-green-soft);
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 13px;
    font-weight: 600;
    color: var(--qd-green);
  }

  em {
    font-style: normal;
    font-size: 12px;
    color: var(--qd-muted);
  }
}

.qd-people-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.worker-row {
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e3eee7;
  border-radius: 10px;
  background: #fbfdfa;

  &__avatar {
    background: var(--qd-green);
    color: #fff;
  }

  &__info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 13px;
    }

    > span {
      font-size: 12px;
      color: var(--qd-muted);
    }
  }

  &__load {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 6px;
    align-items: center;
    margin-top: 4px;
    font-size: 11px;
    color: #8a9b90;
  }

  &__alloc {
    width: 180px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__ratio,
  &__qty {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: var(--qd-muted);

    b {
      width: 40px;
      text-align: right;
      color: var(--qd-green);
      font-variant-numeric: tabular-nums;
    }
  }

  &__qty {
    grid-template-columns: 32px 1fr;
  }
}

.qd-templates {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 0 12px 8px;

  .tpl {
    border: 1px dashed #c5d4c9;
    background: #fff;
    border-radius: 8px;
    padding: 8px 6px;
    font-size: 12px;
    color: var(--qd-muted);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--qd-green);
      color: var(--qd-green);
      background: var(--qd-green-soft);
    }
  }
}

.qd-alloc-foot {
  b {
    color: var(--qd-green);
  }

  .is-bad {
    color: #c45656;
  }
}

.qd-kpi {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px 12px 0;

  div {
    padding: 8px;
    border-radius: 8px;
    background: var(--qd-green-soft);
    text-align: center;
  }

  em {
    display: block;
    font-style: normal;
    font-size: 11px;
    color: var(--qd-muted);
  }

  strong {
    font-size: 18px;
    color: var(--qd-green);
    font-variant-numeric: tabular-nums;
  }
}

.qd-preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-card {
  border: 1px solid #dce8e0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;

  header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;

    strong {
      display: block;
      font-size: 13px;
    }

    b {
      color: var(--qd-green);
      font-variant-numeric: tabular-nums;
    }
  }

  &__code {
    display: inline-block;
    margin-bottom: 2px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #3d8f66;
  }

  &__wo {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--qd-muted);
  }

  &__wage {
    margin: 0 0 8px;
    font-size: 11px;
    line-height: 1.45;
    color: #5a7264;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 4px;
    background: #f4f8f5;
    font-size: 12px;
    color: #5f6f66;

    em {
      font-style: normal;
      color: #8a9b90;
    }

    b {
      color: var(--qd-green);
      font-variant-numeric: tabular-nums;
    }

    &.is-empty {
      justify-content: center;
      grid-template-columns: 1fr;
      color: #9aaba0;
      background: transparent;
    }
  }
}

.qd-summary-box {
  margin: 0 12px 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cfe3d6;
  background: linear-gradient(160deg, #eef7f1 0%, #f7fbf8 100%);

  header {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--qd-green);
  }

  dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  dt {
    font-size: 12px;
    color: var(--qd-muted);
  }

  dd {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .is-total {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed #c5d4c9;

    dd {
      color: var(--qd-green);
      font-size: 20px;
    }
  }
}

.qd-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 2px 2px;

  &__hint {
    font-size: 12px;
    color: var(--qd-muted);
  }

  &__actions {
    display: inline-flex;
    gap: 8px;
  }
}

@media (max-width: 1400px) {
  .qd-main {
    grid-template-columns: 1fr 1fr;
    overflow: auto;
  }

  .qd-panel--preview {
    grid-column: 1 / -1;
  }
}

@media (max-width: 960px) {
  .qd-main {
    grid-template-columns: 1fr;
  }

  .qd-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .qd-steps__item em {
    display: none;
  }

  .worker-row {
    grid-template-columns: 40px 1fr;
  }

  .worker-row__alloc,
  .worker-row__remove {
    grid-column: 1 / -1;
  }
}
</style>

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
    --el-button-active-bg-color: #1f5c41;
    --el-button-active-border-color: #1f5c41;
  }

  .el-checkbox__input.is-checked .el-checkbox__inner,
  .el-checkbox__input.is-indeterminate .el-checkbox__inner {
    background-color: #2e7d5a;
    border-color: #2e7d5a;
  }

  .el-pagination.is-background .el-pager li.is-active {
    background-color: #2e7d5a;
  }
}

.emp-picker {
  --emp-green: #2e7d5a;
  --emp-green-soft: #e8f4ec;
  --emp-line: #dce8e0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 240px;
  gap: 0;
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
    background: #fff;
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

    .el-table {
      --el-table-header-bg-color: #f4f8f5;
      --el-table-row-hover-bg-color: #f3faf6;
    }

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
      color: #24352c;
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

  strong {
    font-size: 13px;
    color: #24352c;
  }
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
    gap: 1px;

    strong {
      font-size: 13px;
      color: #24352c;
    }

    span,
    em {
      font-size: 12px;
      color: #8a9b90;
      font-style: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__remove {
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #9aaba0;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: #f0f4f1;
      color: #c45656;
    }
  }
}

.emp-suggest-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  line-height: 1.4;

  &__tag {
    flex-shrink: 0;
    font-size: 11px;
    padding: 0 5px;
    border-radius: 3px;
    line-height: 18px;

    &.is-dept {
      color: #2e7d5a;
      background: #e8f4ec;
    }

    &.is-emp {
      color: #5f6f66;
      background: #eef1ef;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #24352c;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    flex-shrink: 0;
    font-style: normal;
    font-size: 12px;
    color: #8a9b90;
    white-space: nowrap;
  }
}
</style>
