<template>
  <div class="nd-page auto-height-container">
    <header class="nd-hero">
      <div>
        <h1>普通派工</h1>
        <p>多工单选工序；单价不同按工费份额拆量；支持一键派工（默认本车间 2 人）</p>
      </div>
      <nav class="nd-steps" aria-label="派工步骤">
        <button
          v-for="(s, idx) in stepItems"
          :key="s.key"
          class="nd-steps__item"
          :class="{ 'is-done': wizardStep > idx, 'is-current': wizardStep === idx }"
          type="button"
          @click="goStep(idx)"
        >
          <i>{{ idx + 1 }}</i>
          <span>{{ s.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Step 1: 选择工单与工序 -->
    <div v-show="wizardStep === 0" class="nd-step nd-step--pick">
      <aside class="nd-wo-pane">
        <header>
          <strong>工单列表</strong>
          <em>共 {{ filteredWorkOrders.length }} 张</em>
          <el-button :icon="Refresh" link :loading="loading" @click="loadPreview" />
        </header>
        <el-input
          v-model.trim="woKeyword"
          clearable
          placeholder="工单单号 / 品名"
          size="small"
          @keyup.enter="onWoSearchEnter"
        />
        <div v-loading="loading" class="nd-wo-list">
          <label
            v-for="wo in filteredWorkOrders"
            :key="wo.woNo"
            class="nd-wo-card"
            :class="{ 'is-checked': selectedWoSet.has(wo.woNo), 'is-active': activeWoNo === wo.woNo }"
          >
            <el-checkbox :model-value="selectedWoSet.has(wo.woNo)" @change="(v: any) => toggleWo(wo, !!v)" @click.stop />
            <div class="nd-wo-card__body" @click="activeWoNo = wo.woNo">
              <div class="nd-wo-card__top">
                <b>{{ wo.woNo }}</b>
                <el-tag v-if="selectedWoSet.has(wo.woNo)" effect="plain" size="small" type="success">已选</el-tag>
              </div>
              <p>{{ wo.goodsName || '-' }}</p>
              <div class="nd-wo-card__meta">
                <span>{{ wo.dispatchStatus || '未派工' }}</span>
                <em>{{ fmtNum(wo.remainQty) }} / {{ fmtNum(wo.planQty || wo.woQty) }}</em>
              </div>
            </div>
          </label>
          <el-empty v-if="!filteredWorkOrders.length && !loading" description="暂无可派工单" />
        </div>
      </aside>

      <section class="nd-prc-pane">
        <header class="nd-prc-pane__head">
          <div>
            已选 <b>{{ selectedWoNos.length }}</b> 张工单
            <b>{{ selectedLines.length }}</b> 个工序
            共 <b>{{ selectedTaskCount }}</b> 个派工任务
          </div>
          <el-checkbox v-model="mergeSameProcess">同工序合并派工</el-checkbox>
        </header>

        <el-tabs v-model="pickTab">
          <el-tab-pane label="当前工单" name="current" />
          <el-tab-pane label="批量工序" name="batch" />
          <el-tab-pane :label="`已选任务 (${selectedTaskCount})`" name="picked" />
        </el-tabs>

        <div v-loading="prcLoading" class="nd-prc-pane__body">
          <template v-if="pickTab === 'current'">
            <el-table
              ref="currentTableRef"
              :key="activeWoNo"
              :data="activeWoLines"
              border
              height="100%"
              row-key="__key"
              @selection-change="onCurrentLineSelection"
            >
              <el-table-column type="selection" width="46" :selectable="(row: any) => num(row.remainQty) > 0" />
              <el-table-column label="工序编号/名称" min-width="160">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="加工次数" width="80" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningTimes) }}</template>
              </el-table-column>
              <el-table-column label="未派工/计划" width="130" align="right">
                <template #default="{ row }">{{ fmtNum(row.remainQty) }} / {{ fmtNum(row.woQty) }}</template>
              </el-table-column>
            </el-table>
          </template>

          <template v-else-if="pickTab === 'batch'">
            <el-table :data="batchProcessGroups" border height="100%" row-key="key" @expand-change="() => {}">
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="nd-expand">
                    <div
                      v-for="line in row.lines"
                      :key="lineKey(line)"
                      class="nd-expand__row"
                    >
                      <el-checkbox
                        :model-value="checkedLeafIds.includes(lineKey(line))"
                        @change="(v: any) => setLineChecked(line, !!v)"
                      >
                        {{ line.woNo }}
                      </el-checkbox>
                      <span class="nd-expand__meta">
                        未派 {{ fmtNum(line.remainQty) }}/{{ fmtNum(line.woQty) }}
                        · {{ wageTypeLabel(line.pWageType) }}
                        · 单价 {{ fmtNum(line.machiningUp) }}
                        · 工时 {{ fmtTime(line.machiningTime, line.timeUnit) }}
                        · 次数 {{ fmtNum(line.machiningTimes) }}
                      </span>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column width="52">
                <template #default="{ row }">
                  <el-checkbox
                    :indeterminate="row.coverCount > 0 && row.coverCount < row.lines.length"
                    :model-value="row.coverCount === row.lines.length && row.lines.length > 0"
                    @change="(v: any) => toggleGroup(row, !!v)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="工序编号/名称" min-width="160">
                <template #default="{ row }">
                  {{ row.prcCode }} {{ row.prcName }}
                  <el-tag
                    class="nd-cover-tag"
                    effect="plain"
                    size="small"
                    :type="row.coverCount === selectedWoNos.length ? 'success' : row.coverCount > 0 ? 'warning' : 'danger'"
                  >
                    {{ row.coverCount }}/{{ selectedWoNos.length || 0 }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ row.wageTypeText }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="110" align="right">
                <template #default="{ row }">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed" class="nd-mixed">各工单不同</small>
                </template>
              </el-table-column>
              <el-table-column label="加工工时" width="110" align="right">
                <template #default="{ row }">{{ row.timeText }}</template>
              </el-table-column>
              <el-table-column label="包含工单数" width="100" align="center">
                <template #default="{ row }">{{ row.lines.length }}</template>
              </el-table-column>
              <el-table-column label="未派工/计划" width="140" align="right">
                <template #default="{ row }">{{ fmtNum(row.remainSum) }} / {{ fmtNum(row.planSum) }}</template>
              </el-table-column>
            </el-table>
            <div class="nd-legend">
              <span><i class="is-all" />所有已选工单都包含此工序</span>
              <span><i class="is-part" />部分工单包含此工序</span>
            </div>
          </template>

          <template v-else>
            <el-table :data="selectedLines" border height="100%">
              <el-table-column label="工单" width="130" prop="woNo" />
              <el-table-column label="工序" min-width="150">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="未派工" width="90" align="right">
                <template #default="{ row }">{{ fmtNum(row.remainQty) }}</template>
              </el-table-column>
              <el-table-column label="预估工费" width="100" align="right">
                <template #default="{ row }">{{ fmtNum(num(row.machiningUp) * num(row.remainQty)) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button link type="danger" @click="setLineChecked(row, false)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>

        <footer class="nd-prc-pane__foot">
          <span>已选 {{ selectedWoNos.length }} 张工单 · {{ selectedLines.length }} 道工序</span>
          <div>
            <el-button @click="clearSelection">清空</el-button>
            <el-button :loading="oneClickLoading" :disabled="!selectedWoNos.length" @click="oneClickDispatch">
              一键派工
            </el-button>
            <el-button type="primary" :disabled="!selectedLines.length" @click="wizardStep = 1">
              下一步：选择人员
            </el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 2: 指派人员与数量 -->
    <div v-show="wizardStep === 1" class="nd-step nd-step--assign">
      <aside class="nd-side-summary">
        <header>已选工单</header>
        <ul>
          <li v-for="(woNo, i) in selectedWoNos" :key="woNo" :style="{ '--c': woColors[i % woColors.length] }">
            <i />{{ woNo }}
          </li>
        </ul>
        <dl>
          <div><dt>工单</dt><dd>{{ selectedWoNos.length }}</dd></div>
          <div><dt>工序</dt><dd>{{ selectedLines.length }}</dd></div>
          <div><dt>总量</dt><dd>{{ fmtNum(totalRemainQty) }}</dd></div>
          <div><dt>预估工费</dt><dd>{{ fmtNum(estimatedWageTotal) }}</dd></div>
        </dl>
      </aside>

      <section class="nd-assign-pane">
        <header class="nd-assign-pane__head">
          <div class="nd-assign-pane__head-left">
            <el-radio-group v-model="assignView" size="small">
              <el-radio-button value="wo">按工单查看</el-radio-button>
              <el-radio-button value="process">按工序汇总查看</el-radio-button>
            </el-radio-group>
            <span class="nd-hint">比例与数量联动：改比例自动算数量，改数量自动回写比例</span>
          </div>
          <div class="nd-assign-pane__head-right">
            <span class="nd-hint">
              {{
                mergeSameProcess
                  ? '同工序合并：按工费份额拆到各工单（单价不同更公平）'
                  : '各工序独立指派'
              }}
            </span>
            <el-button size="small" type="primary" plain :loading="oneClickLoading" @click="oneClickDispatch">
              一键派工
            </el-button>
            <el-button size="small" type="primary" plain @click="applyEqualAll">全部平均</el-button>
          </div>
        </header>

        <el-table :data="assignTableRows" border height="100%" row-key="rowKey" :span-method="assignSpanMethod">
          <el-table-column label="工单 / 工序" min-width="180">
            <template #default="{ row }">
              <template v-if="row.kind === 'wo-head'">
                <b class="nd-wo-head">{{ row.woNo }}</b>
                <em>{{ fmtNum(row.assignedQty) }} / {{ fmtNum(row.remainQty) }}</em>
              </template>
              <template v-else>
                <div class="nd-prc-cell">
                  <span>{{ row.prcCode }} {{ row.prcName }}</span>
                  <small v-if="row.woText">{{ row.woText }}</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="工序类型" min-width="100" prop="mrName" show-overflow-tooltip />
          <el-table-column label="计薪" width="72" align="center">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.wageTypeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="加工单价" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <div class="nd-up-cell">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed">各工单单价不同，按工费份额拆量</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="加工工时" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.timeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="未派数量" width="90" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ fmtNum(row.remainQty) }}</template>
            </template>
          </el-table-column>
          <el-table-column label="精细化指派（人员 / 比例 / 数量）" min-width="380">
            <template #default="{ row }">
              <div v-if="row.kind !== 'wo-head'" class="nd-fine">
                <article v-for="w in row.workers" :key="w.empNo" class="nd-fine__card">
                  <div class="nd-fine__who">
                    <em>{{ (w.empName || '?').slice(0, 1) }}</em>
                    <div>
                      <strong>{{ w.empName || w.empNo }}</strong>
                      <span>{{ w.empNo }}</span>
                    </div>
                    <button
                      v-if="row.editable"
                      class="nd-fine__remove"
                      type="button"
                      title="移除"
                      @click="removeWorker(row.taskKey, w.empNo)"
                    >
                      ×
                    </button>
                  </div>
                  <div class="nd-fine__fields">
                    <label>
                      比例%
                      <el-input-number
                        v-model="w.ratio"
                        controls-position="right"
                        :disabled="!row.editable"
                        :max="100"
                        :min="0"
                        :precision="0"
                        :step="1"
                        @change="onWorkerRatioChange(row.taskKey)"
                      />
                    </label>
                    <label>
                      数量
                      <el-input-number
                        v-model="w.planQty"
                        controls-position="right"
                        :disabled="!row.editable"
                        :max="num(row.remainQty)"
                        :min="0"
                        :precision="2"
                        :step="1"
                        @change="onWorkerQtyChange(row.taskKey)"
                      />
                    </label>
                  </div>
                </article>
                <div v-if="row.editable" class="nd-fine__actions">
                  <el-button :icon="Plus" size="small" type="primary" @click="openEmpFor(row.taskKey)">加人</el-button>
                  <el-button size="small" :disabled="!row.workers.length" @click="applyEqualTask(row.taskKey)">本行平均</el-button>
                </div>
                <span v-if="!row.workers.length && !row.editable" class="nd-muted">由汇总行分配后按未派量比例拆分</span>
                <p v-if="row.editable && row.overAssign" class="nd-fine__warn">已分 {{ fmtNum(row.assignedQty) }} 超出未派 {{ fmtNum(row.remainQty) }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="已分/未派" width="120" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <b :class="{ 'is-ok': num(row.assignedQty) > 0, 'is-bad': row.overAssign }">{{ fmtNum(row.assignedQty) }}</b>
                / {{ fmtNum(row.remainQty) }}
              </template>
            </template>
          </el-table-column>
          <el-table-column label="预估工费" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <b class="is-ok">{{ fmtNum(row.estWage) }}</b>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <footer>
          <span>
            已分配任务 {{ assignedTaskCount }}/{{ assignRows.length }} · 数量
            {{ fmtNum(assignedTotalQty) }}/{{ fmtNum(totalRemainQty) }}
            · 预估工费 {{ fmtNum(estimatedWageTotal) }}
            <em v-if="hasOverAssign" class="is-bad"> · 存在超量分配</em>
          </span>
          <div>
            <el-button @click="wizardStep = 0">上一步</el-button>
            <el-button type="primary" :disabled="!canGoConfirm" @click="wizardStep = 2">确认派工</el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 3: 确认 -->
    <div v-show="wizardStep === 2" class="nd-step nd-step--confirm">
      <section class="nd-confirm">
        <header>
          <strong>确认派工内容</strong>
          <el-tag effect="plain" type="success">将生成 1 张派工单</el-tag>
        </header>
        <div class="nd-kpi">
          <div><em>工单</em><b>{{ selectedWoNos.length }}</b></div>
          <div><em>工序行</em><b>{{ selectedLines.length }}</b></div>
          <div><em>人员</em><b>{{ uniqueWorkerCount }}</b></div>
          <div><em>派量</em><b>{{ fmtNum(assignedTotalQty) }}</b></div>
          <div><em>预估工费</em><b>{{ fmtNum(estimatedWageTotal) }}</b></div>
        </div>
        <el-table :data="confirmItems" border max-height="420">
          <el-table-column label="工单" width="120" prop="woNo" />
          <el-table-column label="工序" min-width="140">
            <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
          </el-table-column>
          <el-table-column label="计薪" width="72" align="center" prop="wageTypeText" />
          <el-table-column label="加工单价" width="90" align="right">
            <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
          </el-table-column>
          <el-table-column label="加工工时" width="100" align="right" prop="timeText" />
          <el-table-column label="人员分配" min-width="200">
            <template #default="{ row }">
              <span v-for="w in row.workers" :key="w.empNo" class="nd-chip nd-chip--sm">
                {{ w.empName || w.empNo }} {{ fmtNum(w.planQty) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="派量" width="90" align="right">
            <template #default="{ row }">{{ fmtNum(row.qty) }}</template>
          </el-table-column>
          <el-table-column label="预估工费" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.estWage) }}</template>
          </el-table-column>
        </el-table>
        <footer>
          <el-button @click="wizardStep = 1">上一步</el-button>
          <el-button type="primary" :loading="saving" :disabled="!canSubmit" @click="submit">提交派工</el-button>
        </footer>
      </section>
    </div>

    <EmpPickerDialog
      v-model="empDialog"
      :preferred-dept-id="preferredDeptId"
      :selected="empDialogSelected"
      @confirm="onEmpConfirm"
    />
  </div>
</template>

<script lang="ts" setup>
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  getQuickDispatchEmployees,
  getQuickDispatchPreview,
  getQuickDispatchProcesses,
  submitQuickDispatch,
} from '/@/api/procurement/quickDispatch'
import { fmtNum, num, splitWorkersByWage, type AllocWorker } from '/@/utils/dispatchAlloc'
import EmpPickerDialog from './EmpPickerDialog.vue'

defineOptions({ name: 'NormalDispatch' })

const route = useRoute()

const stepItems = [
  { key: 'pick', label: '选择工单与工序' },
  { key: 'assign', label: '指派人员与数量' },
  { key: 'confirm', label: '确认派工' },
]

const woColors = ['#3b82f6', '#2e7d5a', '#ea580c', '#7c3aed', '#0891b2']

const wizardStep = ref(0)
const loading = ref(false)
const prcLoading = ref(false)
const saving = ref(false)
const oneClickLoading = ref(false)
const mergeSameProcess = ref(true)
const pickTab = ref<'current' | 'batch' | 'picked'>('batch')
const assignView = ref<'wo' | 'process'>('process')
/** 防止比例↔数量联动时互相触发 */
const allocSyncing = ref(false)
const woKeyword = ref('')
const queryWoNo = ref('')
const queryMoNo = ref('')
const activeWoNo = ref('')
const allWorkOrders = ref<any[]>([])
const linesByWo = ref<Record<string, any[]>>({})
const selectedWoSet = ref<Set<string>>(new Set())
const checkedLeafIds = ref<string[]>([])
/** taskKey → workers（合并时为工序键，非合并为行键） */
const assignMap = ref<Record<string, AllocWorker[]>>({})
const empDialog = ref(false)
const editingTaskKey = ref('')
const currentTableRef = ref<any>(null)
const syncingCurrentTable = ref(false)

const lineKey = (row: any) =>
  `${row.woNo}|${row.mrCode || ''}|${row.prcCode || ''}|${row.goodsId || ''}|${row.woBorSno || ''}`

const processKey = (row: any) => `${row.mrCode || ''}|${row.prcCode || ''}`

const taskKeyOf = (line: any) => (mergeSameProcess.value ? processKey(line) : lineKey(line))

/** SF 常见：1 计时 / 2 计件 */
const wageTypeLabel = (v: any) => {
  const t = String(v ?? '').trim()
  if (t === '1') return '计时'
  if (t === '2') return '计件'
  return t || '-'
}

const fmtTime = (time: any, unit?: any) => {
  const t = num(time)
  if (t <= 0) return '-'
  const u = String(unit || '').trim()
  return u ? `${fmtNum(t)}${u}` : fmtNum(t)
}

const uniqueTexts = (values: string[]) => [...new Set(values.filter(Boolean))]

const summarizeWageFields = (lines: any[]) => {
  const ups = uniqueTexts(lines.map((l) => fmtNum(l.machiningUp)))
  const types = uniqueTexts(lines.map((l) => wageTypeLabel(l.pWageType)))
  const times = uniqueTexts(lines.map((l) => fmtTime(l.machiningTime, l.timeUnit)))
  const upMixed = ups.length > 1
  return {
    wageTypeText: types.length <= 1 ? types[0] || '-' : types.join('/'),
    upText: upMixed ? `${ups[0]}~${ups[ups.length - 1]}` : ups[0] || '0',
    upMixed,
    timeText: times.length <= 1 ? times[0] || '-' : '多项',
    /** 按各工单行各自单价×数量汇总，避免合并均价失真 */
    estWageByQty: (qtyByLineKey: Map<string, number> | null, fallbackQty: number) => {
      if (qtyByLineKey) {
        return lines.reduce((s, l) => s + num(l.machiningUp) * num(qtyByLineKey.get(lineKey(l)) || 0), 0)
      }
      // 未分配时按未派量估算
      if (lines.length === 1) return num(lines[0].machiningUp) * fallbackQty
      return lines.reduce((s, l) => s + num(l.machiningUp) * num(l.remainQty), 0)
    },
  }
}

const selectedWoNos = computed(() => [...selectedWoSet.value])

const filteredWorkOrders = computed(() => {
  const kw = woKeyword.value.trim().toLowerCase()
  return allWorkOrders.value.filter((wo) => {
    if (!kw) return true
    return `${wo.woNo || ''}${wo.goodsName || ''}${wo.moNo || ''}`.toLowerCase().includes(kw)
  })
})

const activeWoLines = computed(() => {
  const woNo = activeWoNo.value || selectedWoNos.value[0]
  if (!woNo) return []
  return (linesByWo.value[woNo] || [])
    .filter((l) => num(l.remainQty) > 0)
    .map((l) => ({ ...l, __key: lineKey(l) }))
})

const selectedLines = computed(() => {
  const map = new Map<string, any>()
  for (const lines of Object.values(linesByWo.value)) {
    for (const line of lines || []) {
      if (num(line.remainQty) <= 0) continue
      map.set(lineKey(line), line)
    }
  }
  return checkedLeafIds.value.map((id) => map.get(id)).filter(Boolean)
})

const selectedTaskCount = computed(() => {
  if (!mergeSameProcess.value) return selectedLines.value.length
  return new Set(selectedLines.value.map(processKey)).size
})

const totalRemainQty = computed(() => selectedLines.value.reduce((s, l) => s + num(l.remainQty), 0))

const preferredDeptId = computed(() => {
  const woNo = selectedLines.value[0]?.woNo || selectedWoNos.value[0]
  return allWorkOrders.value.find((w) => w.woNo === woNo)?.deptId
})

/** 批量工序分组（来自已选工单的全部待派工序） */
const batchProcessGroups = computed(() => {
  const groups = new Map<string, any>()
  for (const woNo of selectedWoNos.value) {
    for (const line of linesByWo.value[woNo] || []) {
      if (num(line.remainQty) <= 0) continue
      const key = processKey(line)
      const g = groups.get(key) || {
        key,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        mrName: line.mrName,
        prcName: line.prcName,
        lines: [] as any[],
        remainSum: 0,
        planSum: 0,
        coverCount: 0,
      }
      g.lines.push(line)
      g.remainSum += num(line.remainQty)
      g.planSum += num(line.woQty)
      groups.set(key, g)
    }
  }
  for (const g of groups.values()) {
    g.coverCount = g.lines.filter((l: any) => checkedLeafIds.value.includes(lineKey(l))).length
    Object.assign(g, summarizeWageFields(g.lines))
  }
  return [...groups.values()].sort((a, b) => String(a.prcCode).localeCompare(String(b.prcCode)))
})

/** 可编辑任务行（合并或逐行） */
const assignRows = computed(() => {
  if (mergeSameProcess.value) {
    const grouped = new Map<string, any[]>()
    for (const line of selectedLines.value) {
      const key = processKey(line)
      const list = grouped.get(key) || []
      list.push(line)
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([key, lines]) => {
      const sample = lines[0]
      const remainQty = lines.reduce((s, l) => s + num(l.remainQty), 0)
      const planQty = lines.reduce((s, l) => s + num(l.woQty), 0)
      const workers = assignMap.value[key] || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      const wage = summarizeWageFields(lines)
      const split = splitWorkersByWage(workers, lines)
      const qtyMap = new Map(split.map(({ line, workers: ws }) => [lineKey(line), ws.reduce((s, w) => s + num(w.planQty), 0)]))
      const estWage = assignedQty > 0 ? wage.estWageByQty(qtyMap, assignedQty) : wage.estWageByQty(null, remainQty)
      return {
        kind: 'task',
        rowKey: key,
        taskKey: key,
        editable: true,
        prcCode: sample.prcCode,
        prcName: sample.prcName,
        mrName: sample.mrName,
        woText: `关联 ${[...new Set(lines.map((l) => l.woNo))].join('、')}`,
        remainQty,
        planQty,
        assignedQty,
        overAssign: assignedQty - remainQty > 0.000001,
        workers,
        lines,
        ...wage,
        estWage,
      }
    })
  }
  return selectedLines.value.map((line) => {
    const key = lineKey(line)
    const workers = assignMap.value[key] || []
    const remainQty = num(line.remainQty)
    const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
    const wage = summarizeWageFields([line])
    const qty = assignedQty > 0 ? assignedQty : remainQty
    return {
      kind: 'task',
      rowKey: key,
      taskKey: key,
      editable: true,
      prcCode: line.prcCode,
      prcName: line.prcName,
      mrName: line.mrName,
      woText: line.woNo,
      remainQty,
      planQty: num(line.woQty),
      assignedQty,
      overAssign: assignedQty - remainQty > 0.000001,
      workers,
      lines: [line],
      ...wage,
      estWage: num(line.machiningUp) * qty,
    }
  })
})

const lineSplitMap = computed(() => {
  const map = new Map<string, AllocWorker[]>()
  for (const row of assignRows.value) {
    const splits = splitWorkersByWage(row.workers, row.lines)
    for (const { line, workers } of splits) {
      map.set(lineKey(line), workers)
    }
  }
  return map
})

const assignTableRows = computed(() => {
  if (assignView.value === 'process' || !mergeSameProcess.value) {
    return assignRows.value
  }
  // 按工单查看：展示拆分后的人员（只读），编辑仍在汇总
  const rows: any[] = []
  const byWo = new Map<string, any[]>()
  for (const line of selectedLines.value) {
    const list = byWo.get(line.woNo) || []
    list.push(line)
    byWo.set(line.woNo, list)
  }
  for (const [woNo, lines] of byWo) {
    let remain = 0
    let assigned = 0
    const children = lines.map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      remain += num(line.remainQty)
      assigned += assignedQty
      const wage = summarizeWageFields([line])
      const qty = assignedQty > 0 ? assignedQty : num(line.remainQty)
      return {
        kind: 'line',
        rowKey: lineKey(line),
        taskKey: taskKeyOf(line),
        editable: !mergeSameProcess.value,
        woNo,
        prcCode: line.prcCode,
        prcName: line.prcName,
        mrName: line.mrName,
        remainQty: num(line.remainQty),
        planQty: num(line.woQty),
        assignedQty,
        overAssign: assignedQty - num(line.remainQty) > 0.000001,
        workers,
        lines: [line],
        ...wage,
        estWage: num(line.machiningUp) * qty,
      }
    })
    rows.push({
      kind: 'wo-head',
      rowKey: `wo:${woNo}`,
      woNo,
      remainQty: remain,
      assignedQty: assigned,
    })
    rows.push(...children)
  }
  return rows
})

const assignSpanMethod = ({ row, columnIndex }: any) => {
  if (row.kind === 'wo-head') {
    if (columnIndex === 0) return [1, 9]
    return [0, 0]
  }
  return [1, 1]
}

const assignedTaskCount = computed(() => assignRows.value.filter((r) => num(r.assignedQty) > 0).length)

const assignedTotalQty = computed(() =>
  [...lineSplitMap.value.values()].reduce((s, ws) => s + ws.reduce((a, w) => a + num(w.planQty), 0), 0)
)

const hasOverAssign = computed(() => assignRows.value.some((r) => r.overAssign))

const uniqueWorkerCount = computed(() => {
  const set = new Set<string>()
  for (const ws of Object.values(assignMap.value)) {
    for (const w of ws || []) set.add(w.empNo)
  }
  return set.size
})

const estimatedWageTotal = computed(() => {
  // 有已分数量时按已分量×各行单价；否则按未派量估算
  let total = 0
  for (const line of selectedLines.value) {
    const workers = lineSplitMap.value.get(lineKey(line)) || []
    const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
    total += num(line.machiningUp) * (qty > 0 ? qty : num(line.remainQty))
  }
  return total
})

const confirmItems = computed(() =>
  selectedLines.value
    .map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
      return {
        woNo: line.woNo,
        prcCode: line.prcCode,
        prcName: line.prcName,
        wageTypeText: wageTypeLabel(line.pWageType),
        machiningUp: num(line.machiningUp),
        timeText: fmtTime(line.machiningTime, line.timeUnit),
        workers,
        qty,
        estWage: num(line.machiningUp) * qty,
      }
    })
    .filter((r) => r.workers.length)
)

const canGoConfirm = computed(
  () => assignedTaskCount.value > 0 && assignedTotalQty.value > 0 && !hasOverAssign.value
)

const canSubmit = computed(() => confirmItems.value.length > 0 && !hasOverAssign.value)

const empDialogSelected = computed(() => {
  const list = assignMap.value[editingTaskKey.value] || []
  return list.map((w) => ({ empNo: w.empNo, empName: w.empName, deptName: w.deptName }))
})

const goStep = (idx: number) => {
  if (idx === 0) wizardStep.value = 0
  else if (idx === 1 && selectedLines.value.length) wizardStep.value = 1
  else if (idx === 2 && canGoConfirm.value) wizardStep.value = 2
}

const ensureWoLines = async (wo: any) => {
  const woNo = wo.woNo
  if (linesByWo.value[woNo]) return
  const lines = await getQuickDispatchProcesses({ woNo, moNo: queryMoNo.value || wo.moNo })
  linesByWo.value = { ...linesByWo.value, [woNo]: lines || [] }
}

const toggleWo = async (wo: any, checked: boolean) => {
  const next = new Set(selectedWoSet.value)
  if (checked) {
    next.add(wo.woNo)
    selectedWoSet.value = next
    activeWoNo.value = wo.woNo
    prcLoading.value = true
    try {
      await ensureWoLines(wo)
    } catch (e: any) {
      $baseMessage(e?.message || '加载工序失败', 'error', 'hey')
    } finally {
      prcLoading.value = false
    }
  } else {
    next.delete(wo.woNo)
    selectedWoSet.value = next
    const drop = new Set((linesByWo.value[wo.woNo] || []).map(lineKey))
    checkedLeafIds.value = checkedLeafIds.value.filter((id) => !drop.has(id))
    if (activeWoNo.value === wo.woNo) activeWoNo.value = selectedWoNos.value[0] || ''
  }
}

const setLineChecked = (line: any, checked: boolean) => {
  const id = lineKey(line)
  const set = new Set(checkedLeafIds.value)
  if (checked) set.add(id)
  else set.delete(id)
  checkedLeafIds.value = [...set]
}

const toggleGroup = (group: any, checked: boolean) => {
  const set = new Set(checkedLeafIds.value)
  for (const line of group.lines) {
    const id = lineKey(line)
    if (checked) set.add(id)
    else set.delete(id)
  }
  checkedLeafIds.value = [...set]
}

const onCurrentLineSelection = (rows: any[]) => {
  if (syncingCurrentTable.value) return
  const woNo = activeWoNo.value
  if (!woNo) return
  const other = checkedLeafIds.value.filter((id) => !String(id).startsWith(`${woNo}|`))
  const cur = (rows || []).map((r) => lineKey(r))
  checkedLeafIds.value = [...other, ...cur]
}

const syncCurrentTableSelection = async () => {
  await nextTick()
  const table = currentTableRef.value
  if (!table || pickTab.value !== 'current') return
  syncingCurrentTable.value = true
  table.clearSelection()
  const keep = new Set(checkedLeafIds.value)
  activeWoLines.value.forEach((row) => {
    if (keep.has(row.__key)) table.toggleRowSelection(row, true)
  })
  await nextTick()
  syncingCurrentTable.value = false
}

watch([activeWoNo, pickTab, () => checkedLeafIds.value.join('|')], () => {
  if (pickTab.value === 'current') syncCurrentTableSelection()
})

const clearSelection = () => {
  checkedLeafIds.value = []
  selectedWoSet.value = new Set()
  assignMap.value = {}
}

const openEmpFor = (taskKey: string) => {
  editingTaskKey.value = taskKey
  empDialog.value = true
}

const taskCap = (taskKey: string) => {
  const row = assignRows.value.find((r) => r.taskKey === taskKey)
  return num(row?.remainQty)
}

const touchTask = (taskKey: string) => {
  assignMap.value = { ...assignMap.value, [taskKey]: [...(assignMap.value[taskKey] || [])] }
}

/** 比例 = 占本行未派量的百分比 */
const redistributeTaskByRatio = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length || cap <= 0) return
  const preferInteger = Math.abs(cap - Math.round(cap)) < 0.000001
  if (preferInteger) {
    const intCap = Math.round(cap)
    const parts = list.map((w) => {
      const exact = (intCap * num(w.ratio)) / 100
      const floor = Math.floor(exact)
      return { w, floor, frac: exact - floor }
    })
    const ratioTotal = list.reduce((s, w) => s + num(w.ratio), 0)
    const targetSum = Math.min(intCap, Math.round((intCap * ratioTotal) / 100))
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
  } else {
    list.forEach((w) => {
      w.planQty = Number(((cap * num(w.ratio)) / 100).toFixed(2))
    })
  }
  touchTask(taskKey)
}

const syncTaskRatioFromQty = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length) return
  if (list.length === 1 && cap > 0) {
    list[0].ratio = Math.min(100, Math.max(0, Math.round((num(list[0].planQty) / cap) * 100)))
    touchTask(taskKey)
    return
  }
  const sum = list.reduce((s, w) => s + num(w.planQty), 0)
  if (sum <= 0) {
    list.forEach((w) => {
      w.ratio = 0
    })
    touchTask(taskKey)
    return
  }
  let assigned = 0
  list.forEach((w, i) => {
    if (i === list.length - 1) w.ratio = Math.max(0, 100 - assigned)
    else {
      const r = Math.round((num(w.planQty) / sum) * 100)
      w.ratio = r
      assigned += r
    }
  })
  touchTask(taskKey)
}

const applyEqualTask = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const n = list.length
  if (!n) return
  const each = Math.floor(100 / n)
  list.forEach((w, i) => {
    w.ratio = i === n - 1 ? 100 - each * (n - 1) : each
  })
  redistributeTaskByRatio(taskKey)
}

const applyEqualAll = () => {
  for (const row of assignRows.value) {
    if (row.workers?.length) applyEqualTask(row.taskKey)
  }
}

/** 一键派工：默认本车间 2 人，工序未选则全选已选工单待派工序，按工费公平均分 */
const ONE_CLICK_EMP_COUNT = 2

const selectAllLinesForSelectedWos = async () => {
  prcLoading.value = true
  try {
    for (const woNo of selectedWoNos.value) {
      const wo = allWorkOrders.value.find((w) => w.woNo === woNo)
      if (wo) await ensureWoLines(wo)
    }
    const ids: string[] = []
    for (const woNo of selectedWoNos.value) {
      for (const line of linesByWo.value[woNo] || []) {
        if (num(line.remainQty) > 0) ids.push(lineKey(line))
      }
    }
    checkedLeafIds.value = ids
  } finally {
    prcLoading.value = false
  }
}

const oneClickDispatch = async () => {
  if (!selectedWoNos.value.length) {
    $baseMessage('请先勾选工单', 'warning', 'hey')
    return
  }
  oneClickLoading.value = true
  try {
    if (!selectedLines.value.length) await selectAllLinesForSelectedWos()
    await nextTick()
    if (!selectedLines.value.length) {
      $baseMessage('所选工单没有可派工序', 'warning', 'hey')
      return
    }

    const deptId = preferredDeptId.value
    const rows = await getQuickDispatchEmployees({
      deptId: deptId != null && deptId !== '' ? deptId : undefined,
    })
    const emps = (rows || []).filter((r: any) => r?.empNo).slice(0, ONE_CLICK_EMP_COUNT)
    if (!emps.length) {
      $baseMessage(deptId != null ? '本车间暂无人员，请手动选人' : '暂无人员可分配，请手动选人', 'warning', 'hey')
      wizardStep.value = 1
      return
    }
    if (emps.length < ONE_CLICK_EMP_COUNT) {
      $baseMessage(`本车间仅 ${emps.length} 人，已按现有人数分配`, 'warning', 'hey')
    }

    const next: Record<string, AllocWorker[]> = {}
    const n = emps.length
    const each = Math.floor(100 / n)
    for (const row of assignRows.value) {
      next[row.taskKey] = emps.map((e: any, i: number) => ({
        empNo: e.empNo,
        empName: e.empName,
        deptName: e.deptName,
        ratio: i === n - 1 ? 100 - each * (n - 1) : each,
        planQty: 0,
      }))
    }
    assignMap.value = next
    await nextTick()
    for (const row of assignRows.value) applyEqualTask(row.taskKey)

    if (canGoConfirm.value) {
      wizardStep.value = 2
      $baseMessage(`一键派工完成（${emps.map((e: any) => e.empName || e.empNo).join('、')}），请确认提交`, 'success', 'hey')
    } else {
      wizardStep.value = 1
      $baseMessage('已自动分配，请检查数量后确认', 'success', 'hey')
    }
  } catch (e: any) {
    $baseMessage(e?.message || '一键派工失败', 'error', 'hey')
  } finally {
    oneClickLoading.value = false
  }
}

/** 改比例 → 重算数量 */
const onWorkerRatioChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    redistributeTaskByRatio(taskKey)
  } finally {
    allocSyncing.value = false
  }
}

/** 改数量 → 回写比例（与比例双向联动） */
const onWorkerQtyChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    syncTaskRatioFromQty(taskKey)
  } finally {
    allocSyncing.value = false
  }
}

const removeWorker = (taskKey: string, empNo: string) => {
  const list = (assignMap.value[taskKey] || []).filter((w) => w.empNo !== empNo)
  assignMap.value = { ...assignMap.value, [taskKey]: list }
  if (list.length) applyEqualTask(taskKey)
}

const onEmpConfirm = (emps: { empNo: string; empName?: string; deptName?: string }[]) => {
  const key = editingTaskKey.value
  if (!key) return
  const prev = new Map((assignMap.value[key] || []).map((w) => [w.empNo, w]))
  const n = emps.length
  assignMap.value = {
    ...assignMap.value,
    [key]: emps.map((e) => {
      const old = prev.get(e.empNo)
      return {
        empNo: e.empNo,
        empName: e.empName,
        deptName: e.deptName,
        ratio: num(old?.ratio),
        planQty: num(old?.planQty),
      }
    }),
  }
  if (!n) return
  // 新人默认并入后整体平均，保证比例与数量联动一致
  applyEqualTask(key)
}

const loadPreview = async () => {
  loading.value = true
  try {
    const data = await getQuickDispatchPreview({
      moNo: queryMoNo.value,
      woNo: queryWoNo.value,
    })
    allWorkOrders.value = (data.workOrders || []).filter((w: any) => num(w.remainQty) > 0)
    if (!activeWoNo.value && allWorkOrders.value[0]) activeWoNo.value = allWorkOrders.value[0].woNo
  } catch (e: any) {
    allWorkOrders.value = []
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const onWoSearchEnter = () => {
  const kw = woKeyword.value.trim()
  if (/^W\d+/i.test(kw)) {
    queryWoNo.value = kw
    queryMoNo.value = ''
    loadPreview()
  }
}

const submit = async () => {
  if (!canSubmit.value) return
  const mo =
    queryMoNo.value ||
    selectedLines.value[0]?.moNo ||
    allWorkOrders.value.find((w) => w.woNo === selectedLines.value[0]?.woNo)?.moNo
  if (!mo) {
    $baseMessage('缺少制令号，无法生成派工单', 'warning', 'hey')
    return
  }
  const items = selectedLines.value
    .map((line) => {
      const workers = (lineSplitMap.value.get(lineKey(line)) || []).map((w) => ({
        empNo: w.empNo,
        planQty: num(w.planQty),
      }))
      return {
        woNo: line.woNo,
        moNo: line.moNo,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        goodsId: line.goodsId,
        woBorSno: line.woBorSno,
        workers,
      }
    })
    .filter((it) => it.workers.length)
  if (!items.length) {
    $baseMessage('没有可提交的工序分配', 'warning', 'hey')
    return
  }
  const workerAgg = new Map<string, number>()
  for (const it of items) {
    for (const w of it.workers) {
      workerAgg.set(w.empNo, (workerAgg.get(w.empNo) || 0) + num(w.planQty))
    }
  }
  saving.value = true
  try {
    const result = await submitQuickDispatch({
      moNo: mo,
      woNos: [...new Set(items.map((i) => i.woNo))],
      processes: items.map((i) => ({
        woNo: i.woNo,
        mrCode: i.mrCode,
        prcCode: i.prcCode,
        goodsId: i.goodsId,
        woBorSno: i.woBorSno,
      })),
      workers: [...workerAgg.entries()].map(([empNo, planQty]) => ({ empNo, planQty })),
      items,
    })
    $baseMessage(`已生成派工单 ${result?.wtNo || ''}`, 'success', 'hey')
    clearSelection()
    assignMap.value = {}
    wizardStep.value = 0
    await loadPreview()
  } catch (e: any) {
    $baseMessage(e?.message || '生成派工单失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

watch(mergeSameProcess, () => {
  assignMap.value = {}
  if (mergeSameProcess.value) assignView.value = 'process'
})

watch(selectedLines, () => {
  // 清理已不在选中范围的分配
  const valid = new Set(assignRows.value.map((r) => r.taskKey))
  const next: Record<string, AllocWorker[]> = {}
  for (const [k, v] of Object.entries(assignMap.value)) {
    if (valid.has(k)) next[k] = v
  }
  assignMap.value = next
})

onMounted(() => {
  const q = route.query || {}
  if (q.moNo) queryMoNo.value = String(q.moNo)
  if (q.woNo) {
    queryWoNo.value = String(q.woNo)
    woKeyword.value = String(q.woNo)
  }
  loadPreview()
})
</script>

<style lang="scss" scoped>
.nd-page {
  --nd-green: #2e7d5a;
  --nd-ink: #1f2d26;
  --nd-muted: #6b7c72;
  --nd-line: #d8e4dc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  color: var(--nd-ink);
}

.nd-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: linear-gradient(100deg, #f3faf6 0%, #fff 55%, #f7fafc 100%);

  h1 {
    margin: 0;
    font-size: 18px;
    color: var(--nd-green);
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-steps {
  display: flex;
  gap: 8px;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: #8a9b90;
    cursor: pointer;

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
    }

    &.is-current,
    &.is-done {
      color: var(--nd-green);
      font-weight: 600;

      i {
        background: var(--nd-green);
        color: #fff;
      }
    }
  }
}

.nd-step--pick {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 8px;
}

.nd-wo-pane,
.nd-prc-pane,
.nd-assign-pane,
.nd-side-summary,
.nd-confirm {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.nd-wo-pane {
  padding: 10px;

  > header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    em {
      font-style: normal;
      font-size: 12px;
      color: var(--nd-muted);
    }
  }
}

.nd-wo-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-top: 8px;
}

.nd-wo-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid #e5eee8;
  border-radius: 8px;
  cursor: pointer;

  &.is-checked {
    border-color: #9dceb3;
    background: #f3faf6;
  }

  &.is-active {
    box-shadow: inset 3px 0 0 var(--nd-green);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  p {
    margin: 4px 0;
    font-size: 12px;
    color: var(--nd-muted);
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #8a9b90;

    em {
      font-style: normal;
      color: var(--nd-green);
    }
  }
}

.nd-prc-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e8f0eb;
  font-size: 13px;

  b {
    color: var(--nd-green);
    margin: 0 2px;
  }
}

.nd-prc-pane {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
  }
}

.nd-prc-pane__body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px;
}

.nd-prc-pane__foot,
.nd-assign-pane footer,
.nd-confirm footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e8f0eb;
  background: #fbfdfb;
  font-size: 12px;
  color: var(--nd-muted);
}

.nd-expand {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 12px 8px 48px;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  &__meta {
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-mixed,
.nd-up-cell small {
  display: block;
  font-size: 11px;
  color: #ea580c;
}

.nd-up-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.nd-cover-tag {
  margin-left: 6px;
}

.nd-legend {
  display: flex;
  gap: 16px;
  padding: 6px 4px 0;
  font-size: 12px;
  color: var(--nd-muted);

  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;

    &.is-all {
      background: #2e7d5a;
    }

    &.is-part {
      background: #ea580c;
    }
  }
}

.nd-step--assign {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 8px;
}

.nd-side-summary {
  padding: 12px;

  header {
    font-weight: 600;
    margin-bottom: 8px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 13px;

      i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--c);
      }
    }
  }

  dl {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    div {
      padding: 8px;
      border-radius: 8px;
      background: #f5f8f6;
    }

    dt {
      font-size: 11px;
      color: var(--nd-muted);
    }

    dd {
      margin: 2px 0 0;
      font-weight: 700;
      color: var(--nd-green);
    }
  }
}

.nd-assign-pane {
  > .nd-assign-pane__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-bottom: 1px solid #e8f0eb;
  }

  &__head-left,
  &__head-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nd-hint {
    font-size: 12px;
    color: var(--nd-muted);
  }

  :deep(.el-table) {
    flex: 1;
  }

  footer .is-bad,
  .is-bad {
    color: #c45656;
  }
}

.nd-prc-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  small {
    color: #8a9b90;
    font-size: 11px;
  }
}

.nd-fine {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;

  &__card {
    border: 1px solid #dce8e0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdfb;
  }

  &__who {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;

    em {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--nd-green);
      color: #fff;
      font-style: normal;
      font-size: 12px;
      font-weight: 700;
    }

    strong {
      display: block;
      font-size: 13px;
      line-height: 1.2;
    }

    span {
      font-size: 11px;
      color: #8a9b90;
    }
  }

  &__remove {
    border: 0;
    background: transparent;
    font-size: 18px;
    color: #a0aea6;
    cursor: pointer;
    line-height: 1;
  }

  &__fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: var(--nd-muted);
    }

    :deep(.el-input-number) {
      width: 100%;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__warn {
    margin: 0;
    font-size: 12px;
    color: #c45656;
  }
}

.nd-wo-head {
  margin-right: 10px;
  color: var(--nd-green);
}

.nd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 4px;
  border-radius: 999px;
  background: #e8f4ec;
  font-size: 12px;

  &--sm {
    border-radius: 6px;
    padding: 2px 6px;
  }
}

.nd-muted {
  color: #9aaba0;
  font-size: 12px;
}

.is-ok {
  color: var(--nd-green);
}

.nd-step--confirm {
  flex: 1;
  min-height: 0;
}

.nd-confirm {
  padding: 12px;
  gap: 12px;

  > header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.nd-kpi {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  div {
    padding: 10px;
    border-radius: 8px;
    background: #f3faf6;
  }

  em {
    display: block;
    font-style: normal;
    font-size: 12px;
    color: var(--nd-muted);
  }

  b {
    font-size: 18px;
    color: var(--nd-green);
  }
}

@media (max-width: 1100px) {
  .nd-step--pick,
  .nd-step--assign {
    grid-template-columns: 1fr;
  }

  .nd-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
