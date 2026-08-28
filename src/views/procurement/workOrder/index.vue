<template>
  <div class="work-order-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.woNo" clearable placeholder="工单号，多个用逗号" style="width: 200px" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.moNo" clearable placeholder="制令号，多个用逗号" style="width: 200px" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifOpen" clearable placeholder="是否已开令" style="width: 120px">
              <el-option label="是" value="1" />
              <el-option label="否" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.cFlag" clearable placeholder="审核状态" style="width: 120px">
              <el-option label="未审核" value="0" />
              <el-option label="已审核" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifClose" clearable placeholder="结案状态" style="width: 120px">
              <el-option label="未结案" value="0" />
              <el-option label="已结案" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.ifCancel" clearable placeholder="是否作废" style="width: 120px">
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
          <el-form-item>
            <el-button plain type="success" @click="goQuickDispatch">快捷派工</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div v-if="selectedWo" class="wo-summary">
      <div class="wo-summary__id">
        <span class="label">当前工单</span>
        <strong>{{ selectedWo.woNo }}</strong>
      </div>
      <div class="wo-summary__tags">
        <el-tag effect="plain" size="small" :type="tagType(selectedWo.cFlag, '已审核')">{{ selectedWo.cFlag || '-' }}</el-tag>
        <el-tag effect="plain" size="small" :type="tagType(selectedWo.ifPick, '已领料')">{{ selectedWo.ifPick || '-' }}</el-tag>
        <el-tag effect="plain" size="small" :type="tagType(selectedWo.ifProEnd, '已完成')">{{ selectedWo.ifProEnd || '-' }}</el-tag>
        <el-tag effect="plain" size="small" :type="tagType(selectedWo.ifClose, '已结案')">{{ selectedWo.ifClose || '-' }}</el-tag>
        <el-tag effect="plain" size="small" type="info">{{ selectedWo.ifWt || '未派工' }}</el-tag>
      </div>
      <div class="wo-summary__meta">
        <span>{{ selectedWo.orgName || selectedWo.mkCode }}</span>
        <span>{{ selectedWo.wsName || selectedWo.wsCode }}</span>
        <span v-if="selectedWo.moNo">制令 {{ selectedWo.moNo }}</span>
      </div>
    </div>

    <div class="pane-stack">
      <div class="pane pane-master" :style="{ flex: `${paneRatios[0]} 1 0px` }">
        <div ref="masterWrapRef" class="vtable-wrap">
          <list-table
            ref="masterTableRef"
            :height="masterHeight"
            :options="masterOptions"
            :records="masterList"
            @on-click-cell="(args: any) => { onCopyTrack(args, masterTableRef); handleMasterClick(args) }"
            @on-context-menu-cell="(args: any) => onCopyContextMenu(args, masterTableRef)"
            @on-initialized="() => masterLayout.handleTableReady()"
            @on-selected-cell="(args: any) => onCopyTrack(args, masterTableRef)"
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

      <div class="resize-grip" @mousedown="(e: MouseEvent) => startPaneResize(e, 0)" />

      <div class="pane pane-mid" :style="{ flex: `${paneRatios[1]} 1 0px` }">
        <el-tabs v-model="activeTab" class="mid-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="工单明细" name="items" />
          <el-tab-pane label="按品号汇总工单明细" name="itemsByGoods" />
          <el-tab-pane label="工单用料状况" name="pick" />
          <el-tab-pane label="按品号汇总用料状况" name="pickByGoods" />
          <el-tab-pane label="工单制程工艺清单" name="bor" />
          <el-tab-pane label="工单裁板明细" name="cut" />
          <el-tab-pane label="工单开料明细" name="wcs" />
        </el-tabs>
        <div ref="midWrapRef" class="vtable-wrap">
          <list-table
            :key="`mid-${activeTab}`"
            ref="midTableRef"
            :height="midHeight"
            :options="midOptions"
            :records="midList"
            @on-click-cell="(args: any) => onCopyTrack(args, midTableRef)"
            @on-context-menu-cell="(args: any) => onCopyContextMenu(args, midTableRef)"
            @on-initialized="() => midLayout.handleTableReady()"
            @on-selected-cell="(args: any) => onCopyTrack(args, midTableRef)"
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
  getWoBorItems,
  getWoCutItems,
  getWoItems,
  getWoItemsByGoods,
  getWoList,
  getWoPickItems,
  getWoPickItemsByGoods,
  getWoWcsItems,
} from '/@/api/procurement/workOrder'
import { useVTableLayout } from '/@/hooks/useVTableLayout'
import { sortNewestFirst } from '/@/utils/bladeAdapter'
import { getVTableInstance, handleVTableContextMenuCell, trackVTableCellForCopy } from '/@/utils/tableCopy'

defineOptions({ name: 'WorkOrderManagement' })

const masterTableRef = ref<any>(null)
const midTableRef = ref<any>(null)
const masterWrapRef = ref<HTMLElement | null>(null)
const midWrapRef = ref<HTMLElement | null>(null)

const masterLayout = useVTableLayout(masterTableRef, masterWrapRef, { minHeight: 120 })
const midLayout = useVTableLayout(midTableRef, midWrapRef, { minHeight: 100 })

const masterHeight = computed(() => Math.max(120, masterLayout.tableHeight.value || 120))
const midHeight = computed(() => Math.max(100, midLayout.tableHeight.value || 100))

const listLoading = ref(false)
const midLoading = ref(false)
const masterList = ref<any[]>([])
const midList = ref<any[]>([])
const total = ref(0)
const activeTab = ref('items')
const selectedWo = ref<any>(null)

const queryForm = reactive({
  pageNo: 1,
  pageSize: 100,
  woNo: '',
  moNo: '',
  ifOpen: '',
  cFlag: '',
  ifClose: '',
  ifCancel: '',
})


const paneRatios = reactive([5, 4])
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
  const sum = r0 + r1
  const newR0 = Math.max(minRatio, Math.min(sum - minRatio, r0 + Math.round(dy / 40)))
  paneRatios[idx] = newR0
  paneRatios[idx + 1] = sum - newR0
}

const stopPaneResize = () => {
  paneResizing.value = -1
  document.removeEventListener('mousemove', onPaneResize)
  document.removeEventListener('mouseup', stopPaneResize)
  masterLayout.syncSize(0)
  midLayout.syncSize(0)
  masterLayout.syncSize(80)
  midLayout.syncSize(80)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPaneResize)
  document.removeEventListener('mouseup', stopPaneResize)
})

const baseTableOpts = {
  hover: { highlightMode: 'row' as const },
  select: { highlightMode: 'cell' as const },
  keyboardOptions: { copySelected: true },
  columnResizeMode: 'all' as const,
  dragHeaderMode: 'column' as const,
  widthMode: 'standard' as const,
  autoFillWidth: false,
  defaultColWidth: 110,
  defaultRowHeight: 28,
  defaultHeaderRowHeight: 30,
  theme: {
    headerStyle: {
      bgColor: '#eef5fb',
      fontSize: 12,
      fontWeight: 'bold',
      color: '#4a5d73',
      borderColor: '#d9e4ef',
      padding: [4, 8, 4, 8],
    },
    bodyStyle: {
      fontSize: 12,
      color: '#303133',
      borderColor: '#e8eef4',
      padding: [2, 8, 2, 8],
    },
    frameStyle: { borderColor: '#d9e4ef' },
    selectionStyle: { cellBgColor: 'rgba(46, 125, 90, 0.18)', cellBorderColor: '#2e7d5a', cellBorderLineWidth: 2 },
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

const tagType = (val: string, positive: string) => {
  if (!val) return 'info'
  if (val === positive || val === '是') return 'success'
  if (val.includes('未') || val === '否') return 'warning'
  return 'info'
}

const masterOptions = computed(() => ({
  ...baseTableOpts,
  frozenColCount: 2,
  columns: [
    col('woNo', '工单号', 130),
    col('mkCode', '组织代号', 80),
    col('orgName', '组织名称', 110),
    col('wsCode', '车间代号', 80),
    col('wsName', '车间名称', 120),
    col('deptId', '部门代号', 90),
    col('deptName', '部门名称', 120),
    col('planStDate', '计划开工日期', 130),
    col('planEndDate', '计划完工日期', 130),
    col('actStDate', '实际开工日期', 130),
    col('actEndDate', '实际完工日期', 130),
    col('oriType', '来源类型', 110),
    col('remark', '备注', 140),
    col('ifOpen', '是否已开令', 90),
    col('openerId', '开令人代号', 100),
    col('opener', '开令人', 90),
    col('openDate', '开令日期', 130),
    col('ifPick', '领料状态', 90),
    col('ifProEnd', '生产完成状态', 110),
    col('cFlag', '审核状态', 90),
    col('creator', '建立人', 90),
    col('approver', '审核人', 90),
    col('ifClose', '结案状态', 90),
    col('closer', '结案人', 90),
    col('closeDate', '结案操作日期', 130),
    col('ifCancel', '是否已作废', 90),
    col('printCount', '打印次数', 80),
    col('ifWt', '派工状态', 90),
    col('actCloseDate', '实际结案日期', 130),
    col('styleCode', '生产款式', 120),
    col('moNo', '制令号', 120),
    col('ordNo', '订单号', 120),
    col('fabricNo', '面料编号', 120),
    col('qty', '数量', 80),
    col('custOrdNo', '客户订单号', 130),
    col('clrName', '颜色', 100),
    col('stkInDate', '入库完成日期', 130),
    col('ordCloseDate', '订单结案日期', 130),
    col('ifStkIn', '已入库', 80),
    col('stkInQty', '已入库数量', 100),
    col('ordUnShipQty', '订单未出数', 100),
    col('stdAttr', '标准属性', 120),
    col('builtStkInQty', '已建入库数', 100),
  ],
  emptyTip: emptyTip('暂无工单数据'),
}))

const itemColumns = [
  col('showSeqNo', '排序号', 80),
  col('moNo', '制令号', 120),
  col('goodsCode', '品号', 150),
  col('goodsName', '品名', 160),
  col('stdAttr', '标准属性', 120),
  col('sizeDesc', '规格尺寸', 140),
  col('goodsRemark', '货品备注', 120),
  col('mainMatCode', '主材代号', 120),
  col('mainMatName', '主材名称', 140),
  col('partAttrDesc', '部位属性描述', 120),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('moveType', '移转方式', 100),
  col('woQty', '工单数量', 90),
  col('fnQty', '完工数', 80),
  col('stkInQty', '入库数', 80),
  col('unitCode', '单位', 70),
]

const itemByGoodsColumns = [
  col('goodsCode', '品号', 150),
  col('goodsName', '品名', 160),
  col('stdAttr', '标准属性', 120),
  col('sizeDesc', '规格尺寸', 140),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('woQty', '工单数量', 90),
  col('fnQty', '完工数', 80),
  col('lossQty', '损耗数', 80),
  col('scrapQty', '报废数', 80),
  col('repairQty', '返修数', 80),
  col('stkInQty', '入库数', 80),
  col('unitCode', '单位', 70),
]

const pickColumns = [
  col('showSeqNo', '排序号', 80),
  col('moNo', '制令号', 120),
  col('pGoodsCode', '成品品号', 140),
  col('pGoodsName', '成品品名', 140),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('subGoodsCode', '材料品号', 140),
  col('subGoodsName', '材料品名', 150),
  col('subSizeDesc', '规格尺寸', 130),
  col('unitCode', '单位', 70),
  col('unitQty', '单位用量', 90),
  col('qty', '应领数', 90),
  col('pickedQty', '已领数', 90),
  col('waitPickQty', '待领数', 90),
  col('unPickQty', '未领数', 90),
  col('netPickQty', '净领数', 90),
  col('lossQty', '损耗数', 80),
  col('scrapQty', '报废数', 80),
  col('moveType', '移转方式', 100),
  col('prcCode', '工艺代号', 90),
]

const pickByGoodsColumns = [
  col('subGoodsCode', '材料品号', 150),
  col('subGoodsName', '材料品名', 160),
  col('subSizeDesc', '规格尺寸', 140),
  col('unitCode', '单位', 70),
  col('qty', '应领数', 90),
  col('pickedQty', '已领数', 90),
  col('waitPickQty', '待领数', 90),
  col('unPickQty', '未领数', 90),
  col('netPickQty', '净领数', 90),
  col('lossQty', '损耗数', 80),
  col('scrapQty', '报废数', 80),
]

const borColumns = [
  col('workSNo', '工序序号', 90),
  col('moNo', '制令号', 120),
  col('goodsCode', '品号', 140),
  col('goodsName', '品名', 150),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('prcCode', '工艺代号', 90),
  col('wtQty', '派工数', 90),
  col('fnQty', '完工数', 80),
  col('timeUnit', '时间单位', 90),
  col('readyTime', '准备工时', 90),
  col('machiningTime', '加工工时', 90),
  col('moveTime', '移转工时', 90),
  col('machiningUp', '加工单价', 90),
  col('machiningTimes', '加工次数', 90),
  col('machiningDesc', '加工说明', 140),
  col('moveBatch', '移转批量', 90),
  col('prcGrpCode', '工艺组', 90),
]

const cutColumns = [
  col('showSeqNo', '排序号', 80),
  col('moNo', '制令号', 120),
  col('pGoodsCode', '成品品号', 140),
  col('pGoodsName', '成品品名', 140),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('cutPtId', '裁板件号', 110),
  col('cutPtDesc', '裁板描述', 140),
  col('len', '长', 70),
  col('width', '宽', 70),
  col('height', '高', 70),
  col('ptQty', '件数', 80),
  col('cutedQty', '已裁数', 80),
  col('rmGoodsCode', '原料品号', 130),
  col('rmGoodsName', '原料品名', 140),
  col('rmUnitCode', '原料单位', 90),
  col('rmUnitQty', '原料用量', 90),
]

const wcsColumns = [
  col('showSeqNo', '排序号', 80),
  col('moNo', '制令号', 120),
  col('pGoodsCode', '成品品号', 140),
  col('pGoodsName', '成品品名', 140),
  col('mrCode', '制程代号', 90),
  col('mrName', '制程名称', 120),
  col('wcsPtId', '开料件号', 110),
  col('wcsPtDesc', '开料描述', 140),
  col('rmGoodsCode', '原料品号', 130),
  col('rmGoodsName', '原料品名', 140),
  col('rmUnitCode', '原料单位', 90),
  col('rmUnitQty', '原料用量', 90),
  col('len', '长', 70),
  col('width', '宽', 70),
  col('height', '高', 70),
  col('ptQty', '件数', 80),
  col('wcsedQty', '已开数', 80),
  col('remark', '备注', 140),
]

const midOptions = computed(() => {
  const map: Record<string, any[]> = {
    items: itemColumns,
    itemsByGoods: itemByGoodsColumns,
    pick: pickColumns,
    pickByGoods: pickByGoodsColumns,
    bor: borColumns,
    cut: cutColumns,
    wcs: wcsColumns,
  }
  return {
    ...baseTableOpts,
    columns: map[activeTab.value] || itemColumns,
    emptyTip: emptyTip(
      midLoading.value ? '加载中…' : selectedWo.value ? '暂无数据' : '请先选择上方工单'
    ),
  }
})

const getRecord = (tableRefObj: any, args: any, list: any[]) => {
  const vtable = tableRefObj.value?.vTableInstance
  if (!vtable || args.col === undefined || args.row === undefined) return null
  return vtable.getCellOriginRecord?.(args.col, args.row) || list[args.row - (vtable.columnHeaderLevelCount ?? 1)] || null
}

const onCopyContextMenu = (args: any, tableRefObj: any) => {
  handleVTableContextMenuCell(args, () => getVTableInstance(tableRefObj))
}

const onCopyTrack = (args: any, tableRefObj: any) => {
  trackVTableCellForCopy(args, () => getVTableInstance(tableRefObj))
}

const fetchMaster = async () => {
  listLoading.value = true
  try {
    const { data } = await getWoList(queryForm)
    masterList.value = sortNewestFirst(data.list || [], 'woNo')
    total.value = data.total || 0
    selectedWo.value = null
    midList.value = []
  } catch (e: any) {
    masterList.value = []
    total.value = 0
    $baseMessage(e?.message || '加载工单失败', 'error', 'hey')
  } finally {
    listLoading.value = false
    masterLayout.handleTableReady()
    midLayout.handleTableReady()
  }
}

const loadMid = async () => {
  midList.value = []
  const woNo = selectedWo.value?.woNo
  if (!woNo) return
  midLoading.value = true
  try {
    const tab = activeTab.value
    if (tab === 'items') midList.value = await getWoItems(woNo)
    else if (tab === 'itemsByGoods') midList.value = await getWoItemsByGoods(woNo)
    else if (tab === 'pick') midList.value = await getWoPickItems(woNo)
    else if (tab === 'pickByGoods') midList.value = await getWoPickItemsByGoods(woNo)
    else if (tab === 'bor') midList.value = await getWoBorItems(woNo)
    else if (tab === 'cut') midList.value = await getWoCutItems(woNo)
    else if (tab === 'wcs') midList.value = await getWoWcsItems(woNo)
    else midList.value = []
  } catch (e: any) {
    midList.value = []
    $baseMessage(e?.message || '加载页签数据失败', 'error', 'hey')
  } finally {
    midLoading.value = false
    midLayout.syncSize(0)
    midLayout.syncSize(80)
  }
}

const handleMasterClick = (args: any) => {
  const record = getRecord(masterTableRef, args, masterList.value)
  if (!record?.woNo) return
  selectedWo.value = record
  loadMid()
}

const handleTabChange = () => {
  loadMid()
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchMaster()
}

const router = useRouter()
const goQuickDispatch = () => {
  const moNo = selectedWo.value?.moNo || queryForm.moNo
  const woNo = selectedWo.value?.woNo || queryForm.woNo
  router.push({
    path: '/procurement/quickDispatch/index',
    query: {
      ...(moNo ? { moNo } : {}),
      ...(woNo ? { woNo } : {}),
    },
  })
}

const resetQuery = () => {
  queryForm.woNo = ''
  queryForm.moNo = ''
  queryForm.ifOpen = ''
  queryForm.cFlag = ''
  queryForm.ifClose = ''
  queryForm.ifCancel = ''
  queryForm.pageNo = 1
  fetchMaster()
}

onBeforeMount(() => fetchMaster())
</script>

<style lang="scss" scoped>
.work-order-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wo-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 8px 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f3faf6 0%, #f7fafc 100%);
  border: 1px solid #d8ebe0;

  &__id {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;

    .label {
      font-size: 12px;
      color: #7a8b7f;
    }

    strong {
      font-size: 15px;
      color: #2e7d5a;
      letter-spacing: 0.02em;
    }
  }

  &__tags {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__meta {
    margin-left: auto;
    display: inline-flex;
    gap: 12px;
    font-size: 12px;
    color: #5f6f66;
  }
}

.pane-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #d9e4ef;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.resize-grip {
  flex-shrink: 0;
  height: 10px;
  cursor: row-resize;
  background: transparent;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: #c5d4c9;
  }

  &:hover {
    background: rgba(46, 125, 90, 0.06);
    &::after {
      background: #2e7d5a;
      width: 72px;
    }
  }
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
  :deep(.el-tabs__item.is-active) {
    color: #2e7d5a;
  }
  :deep(.el-tabs__active-bar) {
    background-color: #2e7d5a;
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
