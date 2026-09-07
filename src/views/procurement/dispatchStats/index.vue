<template>
  <div v-table-copy class="ds-page auto-height-container">
    <header class="ds-hero">
      <div>
        <h1>人员派工报工统计</h1>
        <p>派工 · 报工 · 完成率 · 计件工资，一屏掌握生产效率</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" plain @click="reload">刷新数据</el-button>
    </header>

    <section class="ds-filter">
      <el-form inline :model="queryForm" @submit.prevent>
        <el-form-item label="统计时间">
          <el-date-picker
            v-model="dateRange"
            end-placeholder="结束"
            range-separator="至"
            start-placeholder="开始"
            style="width: 260px"
            type="daterange"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="车间">
          <el-select v-model="queryForm.wsName" clearable placeholder="全部" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option v-for="w in workshopOptions" :key="w" :label="w" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item label="班组">
          <el-select v-model="queryForm.workGpName" clearable placeholder="全部" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option v-for="g in groupOptions" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="人员">
          <el-input v-model.trim="queryForm.empKeyword" clearable placeholder="姓名" style="width: 110px" @keyup.enter="reload" />
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

    <section class="ds-charts">
      <article class="ds-panel ds-panel--trend">
        <header class="ds-panel__head">
          <strong>派工 / 报工趋势</strong>
          <em>工时 & 完成率</em>
        </header>
        <vab-chart class="ds-chart" :option="trendOption" />
      </article>
      <article class="ds-panel ds-panel--pie">
        <header class="ds-panel__head">
          <strong>工序报工工时分布</strong>
          <em>占比</em>
        </header>
        <vab-chart class="ds-chart" :option="pieOption" />
      </article>
      <article class="ds-panel ds-panel--wage">
        <header class="ds-panel__head">
          <strong>计件工资趋势</strong>
          <em>日汇总</em>
        </header>
        <vab-chart class="ds-chart" :option="wageOption" />
      </article>
    </section>

    <section class="ds-tables">
      <article class="ds-panel">
        <header class="ds-panel__head">
          <strong>人员效率 TOP5</strong>
          <el-button link type="primary" @click="openMore('emp')">查看全部</el-button>
        </header>
        <el-table :data="payload?.empTop || []" height="260" size="small" stripe>
          <el-table-column align="center" label="排名" width="56">
            <template #default="{ row }">
              <span class="ds-rank" :class="`is-${row.rank}`">{{ row.rank }}</span>
            </template>
          </el-table-column>
          <el-table-column label="人员" min-width="72" prop="empName" />
          <el-table-column align="right" label="派工工时" min-width="80" prop="dispatchHours" />
          <el-table-column align="right" label="报工工时" min-width="80" prop="reportHours" />
          <el-table-column label="完成率" min-width="120">
            <template #default="{ row }">
              <div class="ds-rate">
                <el-progress :percentage="row.rate" :stroke-width="8" :show-text="false" />
                <em>{{ row.rate }}%</em>
              </div>
            </template>
          </el-table-column>
          <el-table-column align="right" label="工资" min-width="80">
            <template #default="{ row }">¥{{ row.wage }}</template>
          </el-table-column>
        </el-table>
      </article>

      <article class="ds-panel">
        <header class="ds-panel__head">
          <strong>工序完成率排行</strong>
          <el-button link type="primary" @click="openMore('prc')">查看全部</el-button>
        </header>
        <el-table :data="payload?.prcTop || []" height="260" size="small" stripe>
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
                <el-progress :percentage="row.rate" :stroke-width="8" :show-text="false" status="success" />
                <em>{{ row.rate }}%</em>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </article>

      <article class="ds-panel">
        <header class="ds-panel__head">
          <strong>未报工明细 TOP5</strong>
          <el-button link type="primary" @click="openMore('unreported')">查看全部</el-button>
        </header>
        <el-table :data="payload?.unreportedTop || []" height="260" size="small" stripe>
          <el-table-column label="工单号" min-width="130" prop="woNo" show-overflow-tooltip />
          <el-table-column label="工序" min-width="64" prop="prcName" />
          <el-table-column label="人员" min-width="64" prop="empName" />
          <el-table-column align="right" label="未报工时" min-width="80" prop="unreportedHours" />
          <el-table-column align="right" label="未报工资" min-width="80">
            <template #default="{ row }">¥{{ row.unreportedWage }}</template>
          </el-table-column>
        </el-table>
      </article>
    </section>

    <footer class="ds-foot">
      <span>{{ payload?.formulaHint }}</span>
      <span class="ds-foot__time">
        <el-icon><Clock /></el-icon>
        数据刷新时间 {{ payload?.refreshedAt || '—' }}
      </span>
    </footer>

    <el-drawer v-model="moreVisible" destroy-on-close size="520px" :title="moreTitle">
      <el-table v-if="moreType === 'emp'" :data="payload?.empTop || []" height="100%">
        <el-table-column label="排名" prop="rank" width="60" />
        <el-table-column label="人员" prop="empName" />
        <el-table-column align="right" label="派工" prop="dispatchHours" />
        <el-table-column align="right" label="报工" prop="reportHours" />
        <el-table-column align="right" label="完成率%">
          <template #default="{ row }">{{ row.rate }}</template>
        </el-table-column>
        <el-table-column align="right" label="工资">
          <template #default="{ row }">¥{{ row.wage }}</template>
        </el-table-column>
      </el-table>
      <el-table v-else-if="moreType === 'prc'" :data="payload?.prcTop || []" height="100%">
        <el-table-column label="排名" prop="rank" width="60" />
        <el-table-column label="工序" prop="prcName" />
        <el-table-column align="right" label="报工工时" prop="reportHours" />
        <el-table-column align="right" label="完成率%">
          <template #default="{ row }">{{ row.rate }}</template>
        </el-table-column>
      </el-table>
      <el-table v-else :data="payload?.unreportedTop || []" height="100%">
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
  Refresh,
  Timer,
  TrendCharts,
  User,
  Warning,
} from '@element-plus/icons-vue'
import type { DispatchStatsKpi, DispatchStatsPayload } from '/@/api/procurement/dispatchStats'
import { getDispatchStats } from '/@/api/procurement/dispatchStats'
import { $baseMessage } from '/@/hooks'

defineOptions({ name: 'DispatchStats' })

const workshopOptions = ['木工车间', '海绵车间', '缝纫车间', '包装车间']
const groupOptions = ['一组', '二组', '三组']
const processOptions = ['缝纫', '裁剪', '组装', '包装', '检验']

const loading = ref(false)
const payload = ref<DispatchStatsPayload | null>(null)
const dateRange = ref<[string, string]>(['2025-05-20', '2025-05-26'])
const queryForm = reactive({
  wsName: '',
  workGpName: '',
  empKeyword: '',
  prcName: '',
})

const moreVisible = ref(false)
const moreType = ref<'emp' | 'prc' | 'unreported'>('emp')
const moreTitle = computed(() => {
  if (moreType.value === 'emp') return '人员效率明细'
  if (moreType.value === 'prc') return '工序完成率明细'
  return '未报工明细'
})

const kpiIcon = (key: string) => {
  const map: Record<string, any> = {
    workers: User,
    dispatchH: Timer,
    reportH: Histogram,
    rate: TrendCharts,
    wage: Coin,
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
    grid: { top: 36, right: 48, bottom: 28, left: 44 },
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
        min: 70,
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
  return {
    ...anim,
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'],
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} h（{d}%）' },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'middle',
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['38%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: { show: true, fontSize: 12, fontWeight: 600 },
        },
        data: list.map((p) => ({ name: p.name, value: p.hours })),
      },
    ],
    graphic: [
      {
        type: 'group',
        left: '30%',
        top: '44%',
        children: [
          {
            type: 'text',
            style: {
              text: `${total.toLocaleString()} h`,
              fill: '#1e293b',
              fontSize: 18,
              fontWeight: 700,
              textAlign: 'center',
            },
            left: 'center',
          },
          {
            type: 'text',
            top: 24,
            style: {
              text: '报工工时',
              fill: '#94a3b8',
              fontSize: 12,
              textAlign: 'center',
            },
            left: 'center',
          },
        ],
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
    grid: { top: 24, right: 16, bottom: 28, left: 52 },
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

const reload = async () => {
  loading.value = true
  try {
    payload.value = await getDispatchStats({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      wsName: queryForm.wsName || undefined,
      workGpName: queryForm.workGpName || undefined,
      empKeyword: queryForm.empKeyword || undefined,
      prcName: queryForm.prcName || undefined,
    })
  } catch (e: any) {
    payload.value = null
    $baseMessage(e?.message || '加载统计失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  dateRange.value = ['2025-05-20', '2025-05-26']
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

const onExport = () => {
  $baseMessage('导出功能预留：后端就绪后对接 Excel 下载', 'info', 'hey')
}

onMounted(() => reload())
</script>

<style lang="scss" scoped>
.ds-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding-bottom: 10px;
  background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fa 140px, #f5f7fa 100%);
}

.ds-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  animation: ds-fade-up 0.45s ease both;

  h1 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #1a3a52;
    letter-spacing: 0.02em;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #7a8b9a;
  }
}

.ds-filter {
  padding: 12px 14px 2px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  animation: ds-fade-up 0.5s ease 0.04s both;

  :deep(.el-form-item) {
    margin-bottom: 10px;
  }
}

.ds-kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.ds-kpi {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  animation: ds-fade-up 0.5s ease both;
  animation-delay: var(--delay, 0ms);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgb(26 111 181 / 10%);
    border-color: #cfe0f0;
  }

  &__icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-size: 20px;
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
      font-size: 20px;
      font-weight: 700;
      color: #1a3a52;
      font-variant-numeric: tabular-nums;
      line-height: 1.15;
    }

    span {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      margin-top: 6px;
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

.ds-charts,
.ds-tables {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ds-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 10px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e8eef4;
  box-shadow: 0 2px 10px rgb(26 58 82 / 4%);
  animation: ds-fade-up 0.55s ease 0.12s both;
  transition: box-shadow 0.25s ease, transform 0.25s ease;

  &:hover {
    box-shadow: 0 8px 22px rgb(26 111 181 / 8%);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    strong {
      font-size: 14px;
      color: #1a3a52;
    }

    em {
      font-style: normal;
      font-size: 12px;
      color: #94a3b8;
    }
  }
}

.ds-chart {
  height: 260px;
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
  padding: 8px 4px 0;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .ds-charts,
  .ds-tables {
    grid-template-columns: 1fr;
  }

  .ds-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
