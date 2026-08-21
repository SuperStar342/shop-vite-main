<template>
  <div class="instruction-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.moNo" clearable placeholder="制令号" style="width: 160px" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.ordNo" clearable placeholder="订单号" style="width: 160px" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifOpen" clearable placeholder="是否已开令" style="width: 120px">
              <el-option label="是" value="1" />
              <el-option label="否" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifSuspend" clearable placeholder="是否暂停" style="width: 120px">
              <el-option label="是" value="1" />
              <el-option label="否" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifClose" clearable placeholder="结案状态" style="width: 120px">
              <el-option label="是" value="1" />
              <el-option label="否" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div class="pane-stack">
      <!-- 上：制令主表 -->
      <div class="pane pane-master" :style="{ flex: `${paneRatios[0]} 1 0px` }">
        <div ref="masterWrapRef" class="vtable-wrap">
          <ListTable
            ref="masterTableRef"
            :options="masterOptions"
            :records="masterList"
            :height="masterHeight"
            @on-click-cell="handleMasterClick"
            @on-initialized="() => masterLayout.handleTableReady()"
          />
        </div>
        <vab-pagination
          :current-page="queryForm.pageNo"
          :page-size="queryForm.pageSize"
          :page-sizes="[100, 200, 500, 1000]"
          :total="total"
          @current-change="(p: number) => { queryForm.pageNo = p; fetchMaster() }"
          @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchMaster() }"
        />
      </div>

      <!-- 拖拽手柄 -->
      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 0)" />

      <!-- 中：明细页签 -->
      <div class="pane pane-mid" :style="{ flex: `${paneRatios[1]} 1 0px` }">
        <el-tabs v-model="activeTab" class="mid-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="生产内容" name="content" />
          <el-tab-pane label="制令分件列表" name="parts" />
          <el-tab-pane label="制令物料清单" name="materials" />
          <el-tab-pane label="自制建议" name="make" />
          <el-tab-pane label="外协建议" name="os" />
          <el-tab-pane label="采购建议" name="pur" />
          <el-tab-pane label="制令日计划" name="day" />
          <el-tab-pane label="制令排程日计划" name="schDay" />
          <el-tab-pane label="制令生产计划" name="prodPlan" />
        </el-tabs>
        <div ref="midWrapRef" class="vtable-wrap">
          <ListTable
            ref="midTableRef"
            :key="`mid-${activeTab}`"
            :options="midOptions"
            :records="midList"
            :height="midHeight"
            @on-click-cell="handleMidClick"
            @on-initialized="() => midLayout.handleTableReady()"
          />
        </div>
      </div>

      <!-- 拖拽手柄 -->
      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 1)" />

      <!-- 下：明细子表 -->
      <div class="pane pane-detail" :style="{ flex: `${paneRatios[2]} 1 0px` }">
        <div class="pane-title">{{ detailPaneTitle }}</div>
        <div ref="detailWrapRef" class="vtable-wrap">
          <ListTable
            ref="detailTableRef"
            :options="detailOptions"
            :records="detailList"
            :height="detailHeight"
            @on-initialized="() => detailLayout.handleTableReady()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Refresh, Search } from '@element-plus/icons-vue'
import { ListTable } from '@visactor/vue-vtable'
import {
  getMoBomMrItems,
  getMoBomUsages,
  getMoDailyPlans,
  getMoDetailItems,
  getMoItems,
  getMoList,
  getMoMrPlans,
  getMoSchDailyPlans,
} from '/@/api/procurement/instruction'
import { useVTableLayout } from '/@/hooks/useVTableLayout'

defineOptions({ name: 'InstructionManagement' })

const masterTableRef = ref<any>(null)
const midTableRef = ref<any>(null)
const detailTableRef = ref<any>(null)
const masterWrapRef = ref<HTMLElement | null>(null)
const midWrapRef = ref<HTMLElement | null>(null)
const detailWrapRef = ref<HTMLElement | null>(null)

const masterLayout = useVTableLayout(masterTableRef, masterWrapRef, { minHeight: 120 })
const midLayout = useVTableLayout(midTableRef, midWrapRef, { minHeight: 100 })
const detailLayout = useVTableLayout(detailTableRef, detailWrapRef, { minHeight: 100 })

const masterHeight = computed(() => Math.max(120, masterLayout.tableHeight.value || 120))
const midHeight = computed(() => Math.max(100, midLayout.tableHeight.value || 100))
const detailHeight = computed(() => Math.max(100, detailLayout.tableHeight.value || 100))

const listLoading = ref(false)
const masterList = ref<any[]>([])
const midList = ref<any[]>([])
const detailList = ref<any[]>([])
const total = ref(0)
const activeTab = ref('content')
const selectedMo = ref<any>(null)
const selectedItem = ref<any>(null)
const midLoading = ref(false)

const queryForm = reactive({
  pageNo: 1,
  pageSize: 100,
  moNo: '',
  ordNo: '',
  ifSuspend: '',
  ifOpen: '',
  ifClose: '',
  cFlag: '',
})

// 三格面板弹性比例（拖拽调整大小）
const paneRatios = reactive([4, 3, 2])
const paneResizing = ref(-1)
const resizeStartY = ref(0)
const resizeStartRatio = ref([0, 0])

const startPaneResize = (e: MouseEvent, gripIdx: number) => {
  paneResizing.value = gripIdx
  resizeStartY.value = e.clientY
  resizeStartRatio.value = [paneRatios[gripIdx], paneRatios[gripIdx + 1]]
  document.addEventListener('mousemove', onPaneResize)
  document.addEventListener('mouseup', stopPaneResize)
  e.preventDefault()
}

const onPaneResize = (e: MouseEvent) => {
  if (paneResizing.value < 0) return
  const dy = e.clientY - resizeStartY.value
  const minRatio = 1
  const idx = paneResizing.value
  const r0 = resizeStartRatio.value[0]
  const r1 = resizeStartRatio.value[1]
  // 等比例调整：按总比例分配位移
  const total = r0 + r1
  const newR0 = Math.max(minRatio, Math.min(total - minRatio, r0 + Math.round(dy / 40)))
  const newR1 = total - newR0
  paneRatios[idx] = newR0
  paneRatios[idx + 1] = newR1
}

const stopPaneResize = () => {
  paneResizing.value = -1
  document.removeEventListener('mousemove', onPaneResize)
  document.removeEventListener('mouseup', stopPaneResize)
  masterLayout.syncSize(0)
  midLayout.syncSize(0)
  detailLayout.syncSize(0)
  masterLayout.syncSize(80)
  midLayout.syncSize(80)
  detailLayout.syncSize(80)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPaneResize)
  document.removeEventListener('mouseup', stopPaneResize)
})

const baseTableOpts = {
  hover: { highlightMode: 'row' as const },
  select: { highlightMode: 'row' as const },
  columnResizeMode: 'all' as const,
  dragHeaderMode: 'column' as const,
  widthMode: 'standard' as const,
  autoFillWidth: false,
  defaultColWidth: 110,
  defaultRowHeight: 28,
  defaultHeaderRowHeight: 30,
  theme: {
    headerStyle: {
      bgColor: '#f5f7fa',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#606266',
      borderColor: '#ebeef5',
      padding: [4, 8, 4, 8],
    },
    bodyStyle: {
      fontSize: 12,
      color: '#303133',
      borderColor: '#ebeef5',
      padding: [2, 8, 2, 8],
    },
    frameStyle: { borderColor: '#ebeef5' },
    selectionStyle: { cellBgColor: 'rgba(64, 158, 255, 0.12)' },
  },
}

const col = (field: string, title: string, width = 110) => ({
  field,
  title,
  width,
  fieldFormat: (r: any) => (r?.[field] == null || r?.[field] === '' ? '' : String(r[field])),
})

/** VTable 默认空状态图标约 100px，这里统一缩小 */
const EMPTY_TIP_SVG =
  '<svg viewBox="0 0 1194 1024" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M1038.7 367.2c13.3 23.3-16.6-40-63.1-40H219c-26.6 0-46.5 13.3-63.1 40S0 607.3 0 650.6v290a82.4 82.4 0 0 0 83 83.4h1028.7a82.3 82.3 0 0 0 83-83.4v-290c0-43.3-156-283.4-156-283.4zM730.1 667.3a136.3 136.3 0 0 1-132.7 133.3 133.4 133.4 0 0 1-132.8-133.3v-6.7a40.7 40.7 0 0 0-36.5-26.7H73l119.5-220s23.2-40 53.1-40h713.5c26.5 0 29.9 10 46.4 40l115.8 220H769.9c-26.2 0-39.8 7.6-39.8 33.3z" fill="#c0c4cc"/></svg>'

const emptyTip = (text: string) => ({
  text,
  spaceBetweenTextAndIcon: 6,
  textStyle: { fontSize: 12, color: '#909399' },
  icon: { width: 28, height: 28, image: EMPTY_TIP_SVG },
})

const masterOptions = computed(() => ({
  ...baseTableOpts,
  frozenColCount: 2,
  columns: [
    col('ifSuspend', '是否暂停', 80),
    col('moNo', '制令号', 140),
    col('ordNo', '订单号', 120),
    col('oriType', '来源类型', 90),
    col('orgName', '组织名称', 100),
    col('moLineName', '依据产线名称', 120),
    col('planStDate', '计划开工日期', 130),
    col('planEndDate', '计划完工日期', 130),
    col('actStDate', '实际开工日期', 130),
    col('actEndDate', '实际完工日期', 130),
    col('saleBindCode', '销售组合代号', 110),
    col('ifOpen', '是否已开令', 90),
    col('remark', '备注', 140),
    col('opener', '开令人', 90),
    col('openDate', '开令日期', 130),
    col('ifPick', '结料状态', 90),
    col('ifFinish', '生产完成状态', 110),
    col('cFlag', '审核状态', 90),
    col('ifClose', '结案状态', 90),
    col('creator', '建立人', 90),
    col('approver', '审核人', 90),
    col('closer', '结案人', 90),
    col('closeDate', '结案日期', 130),
    col('ifMoBomGenerated', '是否已产生制令BOM', 140),
    col('ifMoSchGenerated', '是否已产生制令排程计划', 160),
    col('actCloseDate', '实际结案日期', 130),
    col('ifStkOutLog', '是否已产生领料出库', 140),
    col('stkOutLogNo', '出库单号', 120),
    col('suspender', '挂起人', 90),
    col('suspendDate', '挂起日期', 130),
    col('edition', '版本号', 80),
    col('stkCode', '仓库代号', 90),
    col('stkName', '仓库名称', 110),
    col('oriNo', '来源单号', 120),
    col('custOrdNo', '客户订单号', 120),
    col('fgCode', '成品代号', 120),
    col('fgName', '成品名称', 140),
  ],
  emptyTip: emptyTip('暂无制令数据'),
}))

const itemColumns = [
  col('goodsType', '货品类型', 90),
  col('ordNo', '订单号', 120),
  col('custName', '客户简称', 110),
  col('custOrdNo', '客户订单号', 120),
  col('ordDate', '接单日期', 120),
  col('goodsName', '品名', 160),
  col('goodsCode', '品号', 140),
  col('stdUnit', '标准单位', 80),
  col('stdAttr', '标准属性', 120),
  col('moQty', '制令数', 90),
  col('proStkInQty', '生产入库数', 100),
  col('sizeDesc', '规格尺寸', 140),
  col('clrCode', '颜色代号', 90),
  col('rmQltCode', '材质代号', 90),
  col('rmQltName', '材质名称', 100),
  col('styleCode', '款式', 90),
  col('grpCode', '系列代号', 90),
  col('remark', '备注', 120),
  col('cstLotNo', '发货品定制批号', 130),
]

const partsColumns = [
  col('ordLineNo', '订单行号', 90),
  col('goodsType', '货品类型', 90),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('stdAttr', '标准属性', 120),
  col('cstLotNo', '发货品定制批号', 130),
  col('prodReq', '加工要求', 140),
  col('dispatchSeq', '派单序号', 90),
  col('qty', '数量', 90),
  col('unitCode', '单位', 70),
  col('invOrdNo', '在库订单号', 120),
  col('invFgCode', '在库成品代号', 130),
  col('invFgName', '在库成品名称', 140),
  col('invCstLotNo', '在库成品定制批号', 140),
  col('proStkInQty', '生产入库数', 100),
]

const materialColumns = [
  col('goodsType', '货品类型', 90),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('stdAttr', '标准属性', 120),
  col('logisticsDesc', '物流属性描述', 140),
  col('stdUnit', '标准单位', 90),
  col('grossQty', '毛需求数', 100),
  col('turnInQty', '转入数量', 90),
  col('drawQty', '抽用数量', 90),
  col('netQty', '净需求数', 100),
  col('srcName', '来源', 80),
  col('needWoQty', '需生产数', 90),
  col('woQty', '已建工单数', 100),
  col('fnQty', '已生产数', 90),
  col('needOsQty', '需补外数', 90),
  col('osPrayQty', '外协已派工数', 110),
  col('osPurQty', '托外已采购数', 110),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
]

const materialUsageColumns = [
  col('goodsType', '货品类型', 90),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('stdAttr', '标准属性', 120),
  col('unitAttrDesc', '单位属性描述', 140),
  col('spareGoodsCode', '备用物料代码', 120),
  col('sparePrcCode', '备用制程', 90),
  col('lvlCode', '等级代码', 90),
  col('unitCode', '单位', 70),
  col('netUnitQty', '单位净用量', 100),
  col('usageRate', '利用率(%)', 90),
  col('unitQty', '单位用量', 90),
  col('qty', '总用量', 90),
  col('substGoodsCode', '替换代码', 120),
  col('ifProPick', '生产需发料', 100),
  col('ifOsPick', '托外需发料', 100),
  col('mrCode', '制程代号', 90),
]

const dailyColumns = [
  col('dailySNo', '日序号', 80),
  col('ordNo', '订单号', 120),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('unitCode', '单位', 70),
  col('planDate', '计划日期', 120),
  col('planEndQty', '计划完工数', 100),
  col('moCapacity', '产能', 90),
  col('remark', '备注', 140),
]

const schDailyColumns = [
  col('dailySNo', '日序号', 80),
  col('mrSNo', '制程序号', 90),
  col('ordNo', '订单号', 120),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('unitCode', '单位', 70),
  col('stDate', '开工日期', 120),
  col('endDate', '完工日期', 120),
  col('planEndQty', '计划完工数', 100),
  col('mrCapacity', '制程产能', 90),
  col('remark', '备注', 140),
]

const prodPlanColumns = [
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 140),
  col('soonestStDate', '最早开工', 130),
  col('soonestEndDate', '最早完工', 130),
  col('latestStDate', '最迟开工', 130),
  col('latestEndDate', '最迟完工', 130),
  col('wsCode', '车间代号', 90),
  col('deptId', '部门', 90),
  col('proDeptId', '生产部门', 90),
]

const contentDetailColumns = [
  col('ordLineNo', '订单行号', 90),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 160),
  col('cstLotNo', '发货品定制批号', 130),
  col('prodReq', '加工要求', 140),
  col('dispatchSeq', '派单序号', 90),
  col('qty', '数量', 90),
  col('invOrdNo', '在库订单号', 120),
  col('invFgCode', '在库成品代号', 130),
  col('invCstLotNo', '在库成品定制批号', 140),
]

const MATERIAL_TABS = ['materials', 'make', 'os', 'pur']

const detailPaneTitle = computed(() => {
  if (activeTab.value === 'content') return '分件明细'
  if (MATERIAL_TABS.includes(activeTab.value)) return '物料BOM明细'
  return '明细'
})

const midOptions = computed(() => {
  let columns: any[] = itemColumns
  if (activeTab.value === 'parts') columns = partsColumns
  else if (MATERIAL_TABS.includes(activeTab.value)) columns = materialColumns
  else if (activeTab.value === 'day') columns = dailyColumns
  else if (activeTab.value === 'schDay') columns = schDailyColumns
  else if (activeTab.value === 'prodPlan') columns = prodPlanColumns
  return {
    ...baseTableOpts,
    columns,
    emptyTip: emptyTip(midLoading.value ? '加载中…' : selectedMo.value ? '暂无数据' : '请先选择上方制令'),
  }
})

const detailOptions = computed(() => {
  const isMaterial = MATERIAL_TABS.includes(activeTab.value)
  const columns = isMaterial ? materialUsageColumns : contentDetailColumns
  let emptyText = '暂无明细'
  if (!selectedMo.value) emptyText = '请先选择上方制令'
  else if (activeTab.value === 'content' && !selectedItem.value) emptyText = '请先选择中间「生产内容」行'
  else if (isMaterial && !selectedItem.value) emptyText = '请先选择中间物料行'
  else if (!['content', ...MATERIAL_TABS].includes(activeTab.value)) emptyText = '当前页签无下级明细'
  return {
    ...baseTableOpts,
    columns,
    emptyTip: emptyTip(emptyText),
  }
})

const getRecord = (tableRefObj: any, args: any, list: any[]) => {
  const vtable = tableRefObj.value?.vTableInstance
  if (!vtable || args.col === undefined || args.row === undefined) return null
  return vtable.getCellOriginRecord?.(args.col, args.row) || list[args.row - (vtable.columnHeaderLevelCount ?? 1)] || null
}

const srcTypeByTab = (tab: string) => {
  if (tab === 'make') return '1'
  if (tab === 'os') return '2'
  if (tab === 'pur') return '0'
  return undefined
}

const fetchMaster = async () => {
  listLoading.value = true
  try {
    const { data } = await getMoList(queryForm)
    masterList.value = data.list || []
    total.value = data.total || 0
    selectedMo.value = null
    selectedItem.value = null
    midList.value = []
    detailList.value = []
  } catch (e: any) {
    masterList.value = []
    total.value = 0
    $baseMessage(e?.message || '加载制令失败', 'error', 'hey')
  } finally {
    listLoading.value = false
    masterLayout.handleTableReady()
    midLayout.handleTableReady()
    detailLayout.handleTableReady()
  }
}

const loadMid = async () => {
  midList.value = []
  detailList.value = []
  selectedItem.value = null
  const moNo = selectedMo.value?.moNo
  if (!moNo) return
  midLoading.value = true
  try {
    const tab = activeTab.value
    if (tab === 'content') {
      midList.value = await getMoItems(moNo)
    } else if (tab === 'parts') {
      midList.value = await getMoDetailItems(moNo)
    } else if (MATERIAL_TABS.includes(tab)) {
      midList.value = await getMoBomMrItems(moNo, srcTypeByTab(tab))
    } else if (tab === 'day') {
      midList.value = await getMoDailyPlans(moNo)
    } else if (tab === 'schDay') {
      midList.value = await getMoSchDailyPlans(moNo)
    } else if (tab === 'prodPlan') {
      midList.value = await getMoMrPlans(moNo)
    } else {
      midList.value = []
    }
  } catch (e: any) {
    midList.value = []
    $baseMessage(e?.message || '加载页签数据失败', 'error', 'hey')
  } finally {
    midLoading.value = false
    midLayout.syncSize(0)
    midLayout.syncSize(80)
    detailLayout.syncSize(0)
  }
}

const loadDetail = async () => {
  detailList.value = []
  const moNo = selectedMo.value?.moNo
  if (!moNo) return
  const item = selectedItem.value
  if (!item) return
  try {
    if (activeTab.value === 'content') {
      detailList.value = await getMoDetailItems(moNo, item.ordNo, item.goodsId)
    } else if (MATERIAL_TABS.includes(activeTab.value) && item.goodsId != null) {
      detailList.value = await getMoBomUsages(moNo, item.goodsId)
    }
  } catch (e: any) {
    detailList.value = []
    $baseMessage(e?.message || '加载子明细失败', 'error', 'hey')
  }
}

const handleMasterClick = (args: any) => {
  const record = getRecord(masterTableRef, args, masterList.value)
  if (!record?.moNo) return
  selectedMo.value = record
  loadMid()
}

const handleMidClick = (args: any) => {
  const tab = activeTab.value
  if (tab !== 'content' && !MATERIAL_TABS.includes(tab)) return
  const record = getRecord(midTableRef, args, midList.value)
  if (!record) return
  selectedItem.value = record
  loadDetail()
}

const handleTabChange = () => {
  loadMid()
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchMaster()
}

const resetQuery = () => {
  queryForm.moNo = ''
  queryForm.ordNo = ''
  queryForm.ifSuspend = ''
  queryForm.ifOpen = ''
  queryForm.ifClose = ''
  queryForm.cFlag = ''
  queryForm.pageNo = 1
  fetchMaster()
}

onBeforeMount(() => fetchMaster())
</script>

<style lang="scss" scoped>
.instruction-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pane-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

// 面板间拖拽手柄
.resize-grip {
  flex-shrink: 0;
  height: 10px;
  cursor: row-resize;
  background: transparent;
  position: relative;
  transition: background 0.15s;

  // 中间横线
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: #dcdfe6;
    transition: background 0.15s, width 0.15s;
  }

  &:hover {
    background: rgba(64, 158, 255, 0.08);
    &::after {
      background: #409eff;
      width: 72px;
    }
  }
}

.pane-title {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: #fafafa;
}

.mid-tabs {
  padding: 0 8px;

  :deep(.el-tabs__header) {
    margin: 0;
  }
  :deep(.el-tabs__item) {
    font-size: 13px;
    height: 36px;
  }
  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }
}

.vtable-wrap {
  flex: 1;
  min-height: 120px;
  width: 100%;
  overflow: hidden;
  position: relative;

  :deep(canvas),
  :deep(.vtable) {
    width: 100% !important;
  }
}
</style>
