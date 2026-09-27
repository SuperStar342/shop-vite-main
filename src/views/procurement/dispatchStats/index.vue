<template>
  <div v-table-copy class="ds-page auto-height-container">
    <header class="ds-hero">
      <div>
        <h1>人员派工报工统计</h1>
        <p>生产派工 · 报工效率 · 非生产计时/计件结构</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" plain @click="reload">刷新数据</el-button>
    </header>

    <section class="ds-filter">
      <el-form inline :model="queryForm" @submit.prevent>
        <el-form-item label="统计时间">
          <div class="ds-date">
            <el-date-picker
              v-model="dateRange"
              end-placeholder="结束"
              range-separator="至"
              :shortcuts="dateShortcuts"
              start-placeholder="开始"
              style="width: 260px"
              type="daterange"
              value-format="YYYY-MM-DD"
              @change="onDateRangeChange"
            />
            <div class="ds-date__presets">
              <button
                v-for="p in datePresets"
                :key="p.key"
                class="ds-date__chip"
                :class="{ 'is-active': activeDatePreset === p.key }"
                type="button"
                @click="applyDatePreset(p.key)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="车间">
          <el-select v-model="queryForm.wsName" clearable placeholder="全部" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option v-for="w in workshopOptions" :key="w" :label="w" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item label="人员">
          <el-autocomplete
            v-model.trim="queryForm.empKeyword"
            clearable
            :debounce="280"
            :fetch-suggestions="fetchEmpSuggestions"
            placeholder="姓名 / 工号 / 拼音"
            style="width: 180px"
            value-key="value"
            @clear="onEmpSuggestClear"
            @keyup.enter="reload"
            @select="onEmpSuggestSelect"
          >
            <template #default="{ item }">
              <div class="ds-emp-suggest">
                <strong>{{ item.value }}</strong>
                <em>{{ item.sub }}</em>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        <el-form-item label="工序">
          <el-select v-model="queryForm.prcName" clearable placeholder="全部" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option v-for="p in processOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetQuery">重置</el-button>
          <el-button :loading="loading" type="primary" @click="reload">查询</el-button>
          <el-button :icon="Download" plain type="primary" @click="onExport">导出</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section v-loading="loading" class="ds-kpis">
      <article
        v-for="(card, idx) in payload?.kpis || []"
        :key="card.key"
        class="ds-kpi"
        :class="`ds-kpi--${card.key}`"
        :style="{ '--delay': `${idx * 60}ms` }"
      >
        <div class="ds-kpi__icon">
          <el-icon><component :is="kpiIcon(card.key)" /></el-icon>
        </div>
        <div class="ds-kpi__body">
          <em>{{ card.label }}</em>
          <strong>{{ card.value }}</strong>
          <span :class="trendClass(card)">
            {{ card.trend > 0 ? '↑' : '↓' }} {{ Math.abs(card.trend) }}%
            <i>{{ card.trendLabel }}</i>
          </span>
        </div>
      </article>
    </section>

    <div class="ds-main">
      <section class="ds-nonprod-summary">
        <strong>非生产工资</strong>
        <span class="is-hour">计时 ¥{{ formatMoney(payload?.nonProdHourWage) }}（{{ payload?.nonProdHourPercent ?? 0 }}%）</span>
        <span class="is-piece">计件 ¥{{ formatMoney(payload?.nonProdPieceWage) }}（{{ payload?.nonProdPiecePercent ?? 0 }}%）</span>
        <span class="is-total">合计 ¥{{ formatMoney(payload?.nonProdWageTotal) }}</span>
        <em>计时=工时报工(1001)；金额=计划量×单价</em>
      </section>

      <section class="ds-charts">
        <article class="ds-panel ds-panel--trend">
          <header class="ds-panel__head">
            <strong>派工 / 报工趋势</strong>
            <em>工时 & 完成率</em>
          </header>
          <div class="ds-chart-box">
            <vab-chart class="ds-chart" :option="trendOption" />
          </div>
        </article>
        <article class="ds-panel ds-panel--pie">
          <header class="ds-panel__head">
            <strong>工序报工工时分布</strong>
            <em>扇形占比</em>
          </header>
          <div class="ds-chart-box">
            <vab-chart class="ds-chart" :option="pieOption" />
          </div>
        </article>
        <article class="ds-panel ds-panel--wage">
          <header class="ds-panel__head">
            <strong>生产计件工资趋势</strong>
            <em>日汇总（单价×报工量）</em>
          </header>
          <div class="ds-chart-box">
            <vab-chart class="ds-chart" :option="wageOption" />
          </div>
        </article>
        <article class="ds-panel ds-panel--np-daily">
          <header class="ds-panel__head">
            <strong>非生产计时 / 计件</strong>
            <em>每日金额 · 计时占比</em>
          </header>
          <div class="ds-chart-box">
            <vab-chart class="ds-chart" :option="nonProdDailyOption" />
          </div>
        </article>
      </section>

      <section class="ds-tables">
      <article class="ds-panel">
        <header class="ds-panel__head">
          <strong>人员效率 TOP5</strong>
          <el-button link type="primary" @click="openMore('emp')">查看全部</el-button>
        </header>
        <el-table :data="payload?.empTop || []" class="ds-table" max-height="220" size="small" stripe>
          <el-table-column align="center" label="排名" width="56">
            <template #default="{ row }">
              <span class="ds-rank" :class="`is-${row.rank}`">{{ row.rank }}</span>
            </template>
          </el-table-column>
          <el-table-column label="人员" min-width="72" prop="empName" />
          <el-table-column align="right" label="派工工时" min-width="76" prop="dispatchHours" />
          <el-table-column align="right" label="报工工时" min-width="76" prop="reportHours" />
          <el-table-column label="完成率" min-width="100">
            <template #default="{ row }">
              <div class="ds-rate">
                <el-progress :percentage="Math.min(100, Number(row.rate) || 0)" :stroke-width="8" :show-text="false" />
                <em>{{ row.rate }}%</em>
              </div>
            </template>
          </el-table-column>
          <el-table-column align="right" label="计时" min-width="72">
            <template #default="{ row }">¥{{ formatMoney(row.hourWage) }}</template>
          </el-table-column>
          <el-table-column align="right" label="计件" min-width="72">
            <template #default="{ row }">¥{{ formatMoney(row.pieceWage) }}</template>
          </el-table-column>
          <el-table-column label="工资构成" min-width="120">
            <template #default="{ row }">
              <div class="ds-stack-bar" :title="`计时 ${row.hourPercent || 0}% / 计件 ${row.piecePercent || 0}%`">
                <i class="is-hour" :style="{ width: `${row.hourPercent || 0}%` }" />
                <i class="is-piece" :style="{ width: `${row.piecePercent || 0}%` }" />
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :image-size="48" description="暂无人员数据" />
          </template>
        </el-table>
      </article>

      <article class="ds-panel">
        <header class="ds-panel__head">
          <strong>工序完成率排行</strong>
          <el-button link type="primary" @click="openMore('prc')">查看全部</el-button>
        </header>
        <el-table :data="payload?.prcTop || []" class="ds-table" max-height="200" size="small" stripe>
          <el-table-column align="center" label="排名" width="56">
            <template #default="{ row }">
              <span class="ds-rank" :class="`is-${row.rank}`">{{ row.rank }}</span>
            </template>
          </el-table-column>
          <el-table-column label="工序" min-width="80" prop="prcName" />
          <el-table-column align="right" label="报工工时" min-width="88" prop="reportHours" />
          <el-table-column label="完成率" min-width="140">
            <template #default="{ row }">
              <div class="ds-rate">
                <el-progress
                  :percentage="Math.min(100, Number(row.rate) || 0)"
                  :stroke-width="8"
                  :show-text="false"
                  status="success"
                />
                <em>{{ row.rate }}%</em>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :image-size="48" description="暂无工序数据" />
          </template>
        </el-table>
      </article>

      <article class="ds-panel ds-panel--alert">
        <header class="ds-panel__head">
          <strong>未报工明细 TOP5</strong>
          <el-button link type="primary" @click="openMore('unreported')">查看全部</el-button>
        </header>
        <el-table :data="payload?.unreportedTop || []" class="ds-table" max-height="200" size="small" stripe>
          <el-table-column label="工单号" min-width="130" prop="woNo" show-overflow-tooltip />
          <el-table-column label="工序" min-width="64" prop="prcName" />
          <el-table-column label="人员" min-width="64" prop="empName" />
          <el-table-column align="right" label="未报工时" min-width="80" prop="unreportedHours" />
          <el-table-column align="right" label="未报工资" min-width="80">
            <template #default="{ row }">¥{{ row.unreportedWage }}</template>
          </el-table-column>
          <template #empty>
            <el-empty :image-size="48" description="区间内无未报工" />
          </template>
        </el-table>
      </article>
    </section>
    </div>

    <footer class="ds-foot">
      <span>{{ payload?.formulaHint }}</span>
      <span class="ds-foot__time">
        <el-icon><Clock /></el-icon>
        数据刷新时间 {{ payload?.refreshedAt || '—' }}
      </span>
    </footer>

    <el-drawer
      v-model="moreVisible"
      class="ds-drawer"
      destroy-on-close
      :size="drawerWidth"
      :title="moreTitle"
      @opened="bindDrawerResize"
      @closed="unbindDrawerResize"
    >
      <div v-if="moreType === 'emp'" class="ds-drawer__resize" title="拖拽调节宽度" @mousedown.prevent="onDrawerResizeStart" />
      <el-table v-if="moreType === 'emp'" :data="payload?.empAll || payload?.empTop || []" height="100%">
        <el-table-column label="排名" prop="rank" width="56" />
        <el-table-column label="人员" min-width="80" prop="empName" />
        <el-table-column label="工号" min-width="100" prop="empNo" show-overflow-tooltip />
        <el-table-column align="right" label="派工工时" min-width="88" prop="dispatchHours" />
        <el-table-column align="right" label="报工工时" min-width="88" prop="reportHours" />
        <el-table-column align="right" label="完成率%" min-width="80">
          <template #default="{ row }">{{ row.rate }}</template>
        </el-table-column>
        <el-table-column align="right" label="计时" min-width="88">
          <template #default="{ row }">¥{{ formatMoney(row.hourWage) }}</template>
        </el-table-column>
        <el-table-column align="right" label="计件" min-width="88">
          <template #default="{ row }">¥{{ formatMoney(row.pieceWage) }}</template>
        </el-table-column>
        <el-table-column align="right" label="合计" min-width="88">
          <template #default="{ row }">¥{{ formatMoney(row.totalWage) }}</template>
        </el-table-column>
        <el-table-column label="工资构成" min-width="180">
          <template #default="{ row }">
            <div class="ds-stack-bar is-lg" :title="`计时 ${row.hourPercent || 0}% / 计件 ${row.piecePercent || 0}%`">
              <i class="is-hour" :style="{ width: `${row.hourPercent || 0}%` }" />
              <i class="is-piece" :style="{ width: `${row.piecePercent || 0}%` }" />
              <em class="ds-stack-bar__txt">{{ row.hourPercent || 0 }}% / {{ row.piecePercent || 0 }}%</em>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-else-if="moreType === 'prc'" :data="payload?.prcAll || payload?.prcTop || []" height="100%">
        <el-table-column label="排名" prop="rank" width="60" />
        <el-table-column label="工序" prop="prcName" />
        <el-table-column align="right" label="报工工时" prop="reportHours" />
        <el-table-column align="right" label="完成率%">
          <template #default="{ row }">{{ row.rate }}</template>
        </el-table-column>
      </el-table>
      <el-table v-else :data="payload?.unreportedAll || payload?.unreportedTop || []" height="100%">
        <el-table-column label="工单号" prop="woNo" min-width="130" />
        <el-table-column label="工序" prop="prcName" />
        <el-table-column label="人员" prop="empName" />
        <el-table-column align="right" label="未报工时" prop="unreportedHours" />
        <el-table-column align="right" label="未报工资">
          <template #default="{ row }">¥{{ row.unreportedWage }}</template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import {
  Clock,
  Coin,
  Download,
  Histogram,
  Money,
  PriceTag,
  Refresh,
  Timer,
  TrendCharts,
  User,
  Warning,
} from '@element-plus/icons-vue'
import { getQuickDispatchEmployees } from '/@/api/procurement/quickDispatch'
import type { DispatchStatsKpi, DispatchStatsPayload } from '/@/api/procurement/dispatchStats'
import { getDispatchStats } from '/@/api/procurement/dispatchStats'
import { $baseMessage } from '/@/hooks'
import { filterEmpsByKeyword, isPinyinLikeKeyword } from '/@/utils/empMatch'

defineOptions({ name: 'DispatchStats' })

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

type DatePresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth'

const rangeByPreset = (key: DatePresetKey): [string, string] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  const start = new Date(today)
  if (key === 'today') {
    // start = end = today
  } else if (key === 'yesterday') {
    start.setDate(today.getDate() - 1)
    end.setDate(today.getDate() - 1)
  } else if (key === 'last7') {
    start.setDate(today.getDate() - 6)
  } else if (key === 'last30') {
    start.setDate(today.getDate() - 29)
  } else if (key === 'thisMonth') {
    start.setDate(1)
  } else if (key === 'lastMonth') {
    start.setMonth(today.getMonth() - 1, 1)
    end.setDate(0)
  }
  return [formatYmd(start), formatYmd(end)]
}

const defaultDateRange = (): [string, string] => rangeByPreset('last30')

const datePresets: { key: DatePresetKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'last7', label: '近7天' },
  { key: 'last30', label: '近30天' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
]

const toShortcutRange = (key: DatePresetKey) => {
  const [s, e] = rangeByPreset(key)
  return [new Date(`${s}T00:00:00`), new Date(`${e}T00:00:00`)] as [Date, Date]
}

const dateShortcuts = datePresets.map((p) => ({
  text: p.label,
  value: () => toShortcutRange(p.key),
}))

const matchDatePreset = (range?: [string, string] | null): DatePresetKey | '' => {
  if (!range?.[0] || !range?.[1]) return ''
  const hit = datePresets.find((p) => {
    const [s, e] = rangeByPreset(p.key)
    return s === range[0] && e === range[1]
  })
  return hit?.key || ''
}

const workshopOptions = ref<string[]>([])
const groupOptions = ref<string[]>([])
const processOptions = ref<string[]>([])

const loading = ref(false)
const payload = ref<DispatchStatsPayload | null>(null)
const dateRange = ref<[string, string]>(defaultDateRange())
const activeDatePreset = ref<DatePresetKey | ''>('last30')
const queryForm = reactive({
  wsName: '',
  workGpName: '',
  empKeyword: '',
  prcName: '',
})

const applyDatePreset = (key: DatePresetKey) => {
  dateRange.value = rangeByPreset(key)
  activeDatePreset.value = key
  reload()
}

const onDateRangeChange = () => {
  activeDatePreset.value = matchDatePreset(dateRange.value)
}

type EmpSuggestItem = {
  value: string
  sub: string
  empNo?: string
  empName?: string
}

const fetchEmpSuggestions = async (query: string, cb: (results: EmpSuggestItem[]) => void) => {
  const kw = String(query || '').trim()
  if (!kw) {
    cb([])
    return
  }
  try {
    const pinyinKw = isPinyinLikeKeyword(kw)
    const rows = await getQuickDispatchEmployees({
      keyword: pinyinKw ? undefined : kw,
    })
    const matched = filterEmpsByKeyword(rows || [], kw).slice(0, 12)
    cb(
      matched.map((r: any) => ({
        value: r.empName || r.empNo || '',
        sub: `${r.empNo || '-'} · ${r.deptName || '-'}`,
        empNo: r.empNo,
        empName: r.empName,
      }))
    )
  } catch {
    cb([])
  }
}


const onEmpSuggestSelect = (item: EmpSuggestItem) => {
  queryForm.empKeyword = item?.empName || item?.empNo || queryForm.empKeyword
  reload()
}

const onEmpSuggestClear = () => {
  queryForm.empKeyword = ''
}

const moreVisible = ref(false)
const moreType = ref<'emp' | 'prc' | 'unreported'>('emp')
const drawerWidth = ref(760)
const drawerResizing = ref(false)

const moreTitle = computed(() => {
  if (moreType.value === 'emp') {
    const n = (payload.value?.empAll || payload.value?.empTop || []).length
    return `全部派工人员（${n}）`
  }
  if (moreType.value === 'prc') return '工序完成率明细'
  return '未报工明细'
})

const onDrawerResizeStart = (e: MouseEvent) => {
  drawerResizing.value = true
  const startX = e.clientX
  const startW = drawerWidth.value
  const onMove = (ev: MouseEvent) => {
    // 抽屉从右侧打开：向左拖增大宽度
    const next = startW + (startX - ev.clientX)
    drawerWidth.value = Math.min(Math.max(next, 480), Math.floor(window.innerWidth * 0.92))
  }
  const onUp = () => {
    drawerResizing.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const bindDrawerResize = () => {
  /* opened hook 预留，宽度由 mousedown 控制 */
}

const unbindDrawerResize = () => {
  drawerResizing.value = false
}

const kpiIcon = (key: string) => {
  const map: Record<string, any> = {
    workers: User,
    dispatchH: Timer,
    reportH: Histogram,
    rate: TrendCharts,
    wage: Coin,
    avgWage: Money,
    avgPrice: PriceTag,
    pendingH: Warning,
  }
  return map[key] || TrendCharts
}

const trendClass = (card: DispatchStatsKpi) => {
  const up = card.trend > 0
  const good = card.trendPositiveWhenDown ? !up : up
  return good ? 'is-up' : 'is-down'
}

const anim = { animationDuration: 800, animationEasing: 'cubicOut' as const }

const trendOption = computed(() => {
  const list = payload.value?.trend || []
  return {
    ...anim,
    color: ['#3b82f6', '#22c55e', '#f59e0b'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { color: '#64748b', fontSize: 11 } },
    grid: { top: 36, right: 48, bottom: 36, left: 44 },
    xAxis: {
      type: 'category',
      data: list.map((d) => d.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: [
      {
        type: 'value',
        name: '工时',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' },
      },
      {
        type: 'value',
        name: '%',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8' },
      },
    ],
    series: [
      {
        name: '派工工时',
        type: 'bar',
        barMaxWidth: 18,
        data: list.map((d) => d.dispatchHours),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '报工工时',
        type: 'bar',
        barMaxWidth: 18,
        data: list.map((d) => d.reportHours),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '完成率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        data: list.map((d) => d.rate),
        lineStyle: { width: 2.5 },
      },
    ],
  }
})

const pieOption = computed(() => {
  const list = payload.value?.processDist || []
  const total = payload.value?.processTotalHours || 0
  const names = list.map((p) => p.name)
  const mid = Math.ceil(names.length / 2)
  const legendBase = {
    orient: 'vertical' as const,
    top: 'middle',
    itemWidth: 14,
    itemHeight: 14,
    itemGap: 12,
    textStyle: { color: '#475569', fontSize: 13, fontWeight: 500 },
    formatter: (name: string) => (name.length > 8 ? `${name.slice(0, 8)}…` : name),
  }
  return {
    ...anim,
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#84cc16'],
    title: {
      text: total > 0 ? `${total.toLocaleString()} h` : '',
      subtext: total > 0 ? '报工工时合计' : '',
      left: '30%',
      top: 4,
      textAlign: 'center',
      textStyle: { color: '#1e293b', fontSize: 16, fontWeight: 700 },
      subtextStyle: { color: '#94a3b8', fontSize: 12 },
    },
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} h（{d}%）' },
    legend: [
      { ...legendBase, right: 148, data: names.slice(0, mid) },
      { ...legendBase, right: 28, data: names.slice(mid) },
    ],
    series: [
      {
        type: 'pie',
        radius: '62%',
        center: ['32%', '58%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{d}%',
          color: '#334155',
          fontSize: 13,
          fontWeight: 600,
        },
        labelLine: {
          length: 10,
          length2: 6,
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(30, 64, 175, 0.25)',
          },
        },
        data: list.map((p) => ({ name: p.name, value: p.hours })),
      },
    ],
  }
})

const wageOption = computed(() => {
  const list = payload.value?.wageTrend || []
  return {
    ...anim,
    color: ['#3b82f6'],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p?.axisValue}<br/>工资：¥${Number(p?.value || 0).toLocaleString()}`
      },
    },
    grid: { top: 24, right: 16, bottom: 36, left: 52 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: list.map((d) => d.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: list.map((d) => d.wage),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.28)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' },
            ],
          },
        },
        lineStyle: { width: 2.5 },
      },
    ],
  }
})

const formatMoney = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('zh-CN')
}

const nonProdDailyOption = computed(() => {
  const list = payload.value?.nonProdDaily || []
  return {
    ...anim,
    color: ['#0ea5e9', '#f59e0b', '#64748b'],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const arr = Array.isArray(params) ? params : [params]
        const idx = arr[0]?.dataIndex ?? 0
        const row = list[idx]
        if (!row) return ''
        return [
          row.date,
          `计时：¥${formatMoney(row.hourWage)}（${row.hourPercent}%）`,
          `计件：¥${formatMoney(row.pieceWage)}（${row.piecePercent}%）`,
          `合计：¥${formatMoney(row.totalWage)}`,
        ].join('<br/>')
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: '#64748b', fontSize: 11 } },
    grid: { top: 36, right: 48, bottom: 28, left: 52 },
    xAxis: {
      type: 'category',
      data: list.map((d) => d.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', hideOverlap: true },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' },
      },
      {
        type: 'value',
        name: '%',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8' },
      },
    ],
    series: [
      {
        name: '计时工资',
        type: 'bar',
        stack: 'wage',
        barMaxWidth: 18,
        data: list.map((d) => d.hourWage),
        itemStyle: { borderRadius: [0, 0, 0, 0] },
      },
      {
        name: '计件工资',
        type: 'bar',
        stack: 'wage',
        barMaxWidth: 18,
        data: list.map((d) => d.pieceWage),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '计时占比',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 6,
        data: list.map((d) => d.hourPercent),
        lineStyle: { width: 2 },
      },
    ],
  }
})

const reload = async () => {
  loading.value = true
  try {
    let empKeyword = String(queryForm.empKeyword || '').trim()
    // 纯拼音回车查询：先解析为姓名/工号再请求后端
    if (empKeyword && isPinyinLikeKeyword(empKeyword)) {
      try {
        const rows = await getQuickDispatchEmployees({})
        const matched = filterEmpsByKeyword(rows || [], empKeyword)
        if (matched.length) {
          empKeyword = matched[0].empName || matched[0].empNo || empKeyword
          queryForm.empKeyword = empKeyword
        }
      } catch {
        /* 解析失败仍用原关键词 */
      }
    }
    const data = await getDispatchStats({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      wsName: queryForm.wsName || undefined,
      workGpName: queryForm.workGpName || undefined,
      empKeyword: empKeyword || undefined,
      prcName: queryForm.prcName || undefined,
    })
    payload.value = data
    const opts = data.filterOptions
    if (opts) {
      workshopOptions.value = opts.workshops || []
      groupOptions.value = opts.groups || []
      processOptions.value = opts.processes || []
    }
  } catch (e: any) {
    payload.value = null
    $baseMessage(e?.message || '加载统计失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}


const resetQuery = () => {
  dateRange.value = defaultDateRange()
  activeDatePreset.value = 'last30'
  queryForm.wsName = ''
  queryForm.workGpName = ''
  queryForm.empKeyword = ''
  queryForm.prcName = ''
  reload()
}

const openMore = (type: 'emp' | 'prc' | 'unreported') => {
  moreType.value = type
  moreVisible.value = true
}

const csvEscape = (v: unknown) => {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const onExport = () => {
  const data = payload.value
  if (!data) {
    $baseMessage('暂无数据可导出', 'warning', 'hey')
    return
  }
  const lines: string[] = []
  lines.push('指标,数值,环比%')
  ;(data.kpis || []).forEach((k) => {
    lines.push([csvEscape(k.label), csvEscape(k.value), csvEscape(k.trend)].join(','))
  })
  lines.push('')
  lines.push('人员排名,姓名,派工工时,报工工时,完成率%,工资')
  ;(data.empAll || data.empTop || []).forEach((r) => {
    lines.push([r.rank, csvEscape(r.empName), r.dispatchHours, r.reportHours, r.rate, r.wage].join(','))
  })
  lines.push('')
  lines.push('工序排名,工序,报工工时,完成率%')
  ;(data.prcAll || data.prcTop || []).forEach((r) => {
    lines.push([r.rank, csvEscape(r.prcName), r.reportHours, r.rate].join(','))
  })
  lines.push('')
  lines.push('工单号,工序,人员,未报工时,未报工资')
  ;(data.unreportedAll || data.unreportedTop || []).forEach((r) => {
    lines.push([csvEscape(r.woNo), csvEscape(r.prcName), csvEscape(r.empName), r.unreportedHours, r.unreportedWage].join(','))
  })
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const range = `${dateRange.value?.[0] || ''}_${dateRange.value?.[1] || ''}`
  a.href = url
  a.download = `派工报工统计_${range}.csv`
  a.click()
  URL.revokeObjectURL(url)
  $baseMessage('已导出 CSV', 'success', 'hey')
}

onMounted(() => reload())
</script>

<style lang="scss" scoped>
.ds-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 4px;
  background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fa 120px, #f5f7fa 100%);
}

.ds-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  animation: ds-fade-up 0.45s ease both;

  h1 {
    margin: 0 0 2px;
    font-size: 20px;
    font-weight: 700;
    color: #1a3a52;
    letter-spacing: 0.02em;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #7a8b9a;
  }
}

.ds-filter {
  flex-shrink: 0;
  padding: 8px 12px 0;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  animation: ds-fade-up 0.5s ease 0.04s both;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}

.ds-date {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ds-date__presets {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ds-date__chip {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d9e4ee;
  border-radius: 999px;
  background: #f7fafc;
  color: #5b6b7a;
  font-size: 12px;
  line-height: 26px;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: #9ec5e8;
    color: #1f6fb5;
    background: #eef6fc;
  }

  &.is-active {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 600;
  }
}

.ds-emp-suggest {
  display: flex;
  align-items: baseline;
  gap: 10px;
  line-height: 1.4;

  strong {
    font-weight: 600;
    color: #1f2937;
  }

  em {
    font-style: normal;
    font-size: 12px;
    color: #94a3b8;
  }
}

.ds-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  flex-shrink: 0;
}

.ds-kpi {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  animation: ds-fade-up 0.5s ease both;
  animation-delay: var(--delay, 0ms);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgb(26 111 181 / 10%);
    border-color: #cfe0f0;
  }

  &__icon {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
    font-size: 18px;
    color: #fff;
  }

  &--workers .ds-kpi__icon {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
  }
  &--dispatchH .ds-kpi__icon {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
  }
  &--reportH .ds-kpi__icon {
    background: linear-gradient(135deg, #10b981, #34d399);
  }
  &--rate .ds-kpi__icon {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
  }
  &--wage .ds-kpi__icon {
    background: linear-gradient(135deg, #ec4899, #f472b6);
  }
  &--avgWage .ds-kpi__icon {
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  }
  &--avgPrice .ds-kpi__icon {
    background: linear-gradient(135deg, #14b8a6, #2dd4bf);
  }
  &--pendingH .ds-kpi__icon {
    background: linear-gradient(135deg, #ef4444, #f87171);
  }

  &__body {
    min-width: 0;

    em {
      display: block;
      font-style: normal;
      font-size: 12px;
      color: #909399;
      margin-bottom: 4px;
    }

    strong {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #1a3a52;
      font-variant-numeric: tabular-nums;
      line-height: 1.15;
    }

    span {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;

      i {
        font-style: normal;
        font-weight: 400;
        color: #94a3b8;
        font-size: 11px;
      }

      &.is-up {
        color: #ef4444;
      }
      &.is-down {
        color: #10b981;
      }
    }
  }
}

.ds-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ds-nonprod-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f0f9ff, #fff);
  border: 1px solid #cfe8f3;

  strong {
    font-size: 13px;
    color: #0c4a6e;
  }

  em {
    margin-left: auto;
    font-style: normal;
    font-size: 11px;
    color: #94a3b8;
  }

  span {
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 26px;
    font-variant-numeric: tabular-nums;
  }

  .is-hour {
    color: #0369a1;
    background: #e0f2fe;
  }

  .is-piece {
    color: #b45309;
    background: #ffedd5;
  }

  .is-total {
    color: #0f172a;
    background: #e2e8f0;
  }
}

.ds-charts {
  flex: 1 1 auto;
  min-height: 420px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}
.ds-stack-bar {
  position: relative;
  display: flex;
  width: 100%;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;

  i {
    display: block;
    height: 100%;

    &.is-hour {
      background: linear-gradient(90deg, #0284c7, #38bdf8);
    }

    &.is-piece {
      background: linear-gradient(90deg, #d97706, #fbbf24);
    }
  }

  &.is-lg {
    height: 18px;
    border: 1px solid #cbd5e1;
    box-shadow: inset 0 1px 2px rgb(15 23 42 / 6%);
  }

  &__txt {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    text-shadow: 0 0 4px #fff, 0 0 2px #fff;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
}

.ds-drawer__resize {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background: transparent;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 1px;
    width: 3px;
    height: 48px;
    margin-top: -24px;
    border-radius: 999px;
    background: #94a3b8;
    opacity: 0.55;
  }

  &:hover::after {
    opacity: 1;
    background: #3b82f6;
  }
}

:deep(.ds-drawer.el-drawer) {
  .el-drawer__body {
    position: relative;
    overflow: hidden;
  }
}

:deep(.ds-drawer.el-drawer.resizing),
.ds-page.ds-resizing {
  user-select: none;
  cursor: col-resize;
}

.ds-tables {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ds-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 12px 10px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  animation: ds-fade-up 0.55s ease 0.12s both;
  transition: box-shadow 0.25s ease, transform 0.25s ease;

  &:hover {
    box-shadow: 0 8px 22px rgb(26 111 181 / 8%);
  }

  &--trend,
  &--pie,
  &--wage,
  &--np-daily,
  &--np-emp {
    height: 100%;
    overflow: hidden;
  }

  &--alert {
    border-color: #fde68a;
    background: linear-gradient(180deg, #fffbeb 0%, #fff 48px);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    flex-shrink: 0;

    strong {
      font-size: 13px;
      color: #1a3a52;
    }

    em {
      font-style: normal;
      font-size: 11px;
      color: #94a3b8;
    }
  }
}

.ds-chart-box {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.ds-chart {
  position: absolute !important;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;

  :deep(> div),
  :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
  }
}

.ds-table {
  width: 100%;
}

.ds-rank {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;

  &.is-1 {
    color: #fff;
    background: linear-gradient(135deg, #f59e0b, #f97316);
  }
  &.is-2 {
    color: #fff;
    background: linear-gradient(135deg, #94a3b8, #64748b);
  }
  &.is-3 {
    color: #fff;
    background: linear-gradient(135deg, #d97706, #b45309);
  }
}

.ds-rate {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-progress {
    flex: 1;
  }

  em {
    font-style: normal;
    font-size: 12px;
    color: #475569;
    font-variant-numeric: tabular-nums;
    min-width: 42px;
    text-align: right;
  }
}

.ds-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 4px 4px 0;
  font-size: 12px;
  color: #94a3b8;
  animation: ds-fade-up 0.5s ease 0.18s both;

  &__time {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
  }
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f0f7fd;
  transition: background-color 0.2s ease;
}

@keyframes ds-fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1400px) {
  .ds-kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .ds-page {
    height: auto;
    overflow: visible;
  }

  .ds-main {
    flex: none;
  }

  .ds-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ds-charts,
  .ds-tables {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .ds-charts {
    flex: none;
    min-height: 0;
    height: auto;
  }

  .ds-panel--trend,
  .ds-panel--pie,
  .ds-panel--wage,
  .ds-panel--np-daily {
    height: auto;
  }

  .ds-chart-box {
    height: 240px;
    flex: none;
  }

  .ds-chart {
    position: absolute !important;
  }

  .ds-nonprod-summary em {
    margin-left: 0;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .ds-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
