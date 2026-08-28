<template>
  <div class="audit-log-container auto-height-container">
    <vab-query-form>
      <vab-query-form-top-panel>
        <el-form inline label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item label="操作人">
            <el-input v-model.trim="queryForm.userAccount" clearable placeholder="请输入操作人账号" />
          </el-form-item>
          <el-form-item label="模块">
            <el-input v-model.trim="queryForm.bizName" clearable placeholder="请输入模块名称" />
          </el-form-item>
          <el-form-item label="操作类型">
            <el-select v-model="queryForm.operationType" clearable placeholder="全部" style="width: 120px">
              <el-option label="新增" value="create" />
              <el-option label="修改" value="update" />
              <el-option label="删除" value="delete" />
              <el-option label="查询" value="query" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="queryForm.dateRange"
              end-placeholder="结束日期"
              start-placeholder="开始日期"
              type="daterange"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" @click="resetQueryForm">重置</el-button>
          </el-form-item>
          <el-form-item label="视图模式">
            <el-radio-group v-model="transposeMode" size="default" @change="() => resizeTable()">
              <el-radio-button value="auto">自动</el-radio-button>
              <el-radio-button value="normal">普通</el-radio-button>
              <el-radio-button value="transposed">转置</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </vab-query-form-top-panel>
    </vab-query-form>

    <div ref="wrapperRef" class="vtable-wrapper">
      <list-table
        ref="tableRef"
        :height="tableHeight"
        :options="tableOptions"
        :records="list"
        @on-click-cell="handleClickCell"
        @on-initialized="handleTableReady"
      />
    </div>

    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />

    <!-- 操作详情弹窗（替代原展开行） -->
    <el-dialog v-model="detailVisible" destroy-on-close title="操作详情" width="700px">
      <template v-if="currentRow">
        <el-descriptions border :column="2">
          <el-descriptions-item label="操作模块">
            {{ currentRow.bizName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getOperationTagType(currentRow.operationType)">
              {{ currentRow.operationTypeLabel }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="请求路径">
            <code>{{ currentRow.requestUri || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="请求方法">
            <el-tag effect="plain" :type="getMethodTagType(currentRow.method)">
              {{ currentRow.method || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ currentRow.userAccount || currentRow.userName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="环境">
            {{ currentRow.env || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="请求参数" :span="2">
            <pre v-if="currentRow.params" class="params-pre">{{ formatJson(currentRow.params) }}</pre>
            <span v-else class="text-muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="执行结果" :span="2">
            <pre v-if="currentRow.result" class="params-pre">{{ formatJson(currentRow.result) }}</pre>
            <span v-else class="text-muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="IP 地址">{{ currentRow.remoteIp || currentRow.ip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ currentRow.recordCost ? currentRow.recordCost + 'ms' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作时间" :span="2">
            {{ currentRow.recordTime || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Refresh, Search } from '@element-plus/icons-vue'
import { ListTable } from '@visactor/vue-vtable'
import { getList } from '/@/api/system/auditLog'
import { useListColumns } from '/@/hooks/useListColumns'
import { useVTableLayout } from '/@/hooks/useVTableLayout'

defineOptions({
  name: 'AuditLog',
})

const { visible } = useListColumns('AuditLog')

const list = ref<any>([])
const listLoading = ref<boolean>(true)
const tableRef = ref<any>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const { tableHeight, syncSize: resizeTable, handleTableReady } = useVTableLayout(tableRef, wrapperRef)
const containerWidth = ref<number>(0)
const detailVisible = ref<boolean>(false)
const currentRow = ref<any>(null)
// 视图模式：auto（自动）/ normal（普通）/ transposed（转置）
const transposeMode = ref<'auto' | 'normal' | 'transposed'>('auto')

const total = ref<number>(0)
const queryForm = reactive<any>({
  userAccount: '',
  bizName: '',
  operationType: '',
  dateRange: [],
  startTime: '',
  endTime: '',
  pageNo: 1,
  pageSize: 20,
})

// ===== 动态表格转置 =====
// 自动模式：容器宽度不足以展示所有列时自动转置
// 普通模式：强制不转置
// 转置模式：强制转置
const isTranspose = computed(() => {
  if (transposeMode.value === 'normal') return false
  if (transposeMode.value === 'transposed') return true
  // auto 模式
  if (containerWidth.value <= 0) return false
  let totalWidth = 60 // rowSeriesNumber
  if (visible('bizName')) totalWidth += 140
  if (visible('env')) totalWidth += 100
  totalWidth += 100 // operationTypeLabel
  totalWidth += 100 // method
  if (visible('requestUri')) totalWidth += 220
  if (visible('remoteIp')) totalWidth += 140
  totalWidth += 90 // recordCost
  if (visible('recordTime')) totalWidth += 170
  return containerWidth.value < totalWidth + 40
})

// ===== VTable 列定义（按 visible 过滤） =====
const tableOptions = computed(() => {
  const columns: any[] = []

  if (visible('bizName')) {
    columns.push({ field: 'bizName', title: '模块', width: 140 })
  }
  if (visible('env')) {
    columns.push({ field: 'env', title: '环境', width: 100 })
  }

  columns.push({
    field: 'operationTypeLabel',
    title: '操作类型',
    width: 100,
  })

  columns.push({
    field: 'method',
    title: '请求方法',
    width: 100,
  })

  if (visible('requestUri')) {
    columns.push({ field: 'requestUri', title: '请求路径', width: 220 })
  }
  if (visible('remoteIp')) {
    columns.push({ field: 'remoteIp', title: 'IP 地址', width: 140 })
  }

  columns.push({
    field: 'recordCost',
    title: '耗时',
    width: 90,
    fieldFormat: (record: any) => (record.recordCost ? `${record.recordCost}ms` : ''),
  })

  if (visible('recordTime')) {
    columns.push({ field: 'recordTime', title: '操作时间', width: 170 })
  }

  return {
    columns,
    rowSeriesNumber: {
      title: '序号',
      width: 60,
      style: { textAlign: 'center' },
      headerStyle: { textAlign: 'center' },
    },
    hover: { highlightMode: 'row' as const },
    select: { highlightMode: 'row' as const, disableSelect: true },
    columnResizeMode: 'all' as const,
    defaultColWidth: 120,
    widthMode: 'standard' as const,
    autoFillWidth: true,
    // 动态表格转置
    transpose: isTranspose.value,
    theme: {
      headerStyle: { bgColor: '#f5f7fa', fontSize: 13, fontWeight: 'bold', color: '#606266', borderColor: '#ebeef5' },
      bodyStyle: { fontSize: 13, color: '#303133', borderColor: '#ebeef5' },
      frameStyle: { borderColor: '#ebeef5' },
      selectionStyle: { cellBgColor: 'rgba(64, 158, 255, 0.06)' },
    },
    emptyTip: { text: '暂无数据', position: { x: '50%', y: '50%' }, textStyle: { fontSize: 14, color: '#909399' } },
  }
})

// ===== 标签颜色映射 =====
const getOperationTagType = (type: string): 'success' | 'warning' | 'danger' | 'info' | undefined => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    query: 'info',
    other: undefined,
  }
  return map[type]
}

const getMethodTagType = (method: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' | undefined => {
  const map: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'info' | undefined> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info',
  }
  return map[method?.toUpperCase()]
}

const formatJson = (data: any): string => {
  if (!data) return ''
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(data)
  }
}

// ===== 点击单元格 → 显示详情弹窗 =====
const handleClickCell = (args: any) => {
  if (isTranspose.value) {
    // 转置模式：row 对应字段行，col 对应数据列；row=0 为序号行
    if (args.row <= 0) return
    const record = list.value[args.col]
    if (record) {
      currentRow.value = record
      detailVisible.value = true
    }
  } else {
    // 普通模式：col 为 rowSeriesNumber 列时不弹窗
    if (args.col <= 0) return
    const headerCount = tableRef.value?.vTableInstance?.columnHeaderLevelCount ?? 1
    const recordIndex = args.row - headerCount
    const record = list.value[recordIndex]
    if (record) {
      currentRow.value = record
      detailVisible.value = true
    }
  }
}

// ===== 分页 =====
const handleSizeChange = (value: number) => {
  queryForm.pageSize = value
  fetchData()
}

const handleCurrentChange = (value: number) => {
  queryForm.pageNo = value
  fetchData()
}

const queryData = () => {
  if (queryForm.dateRange && queryForm.dateRange.length === 2) {
    queryForm.startTime = queryForm.dateRange[0]
    queryForm.endTime = queryForm.dateRange[1]
  } else {
    queryForm.startTime = ''
    queryForm.endTime = ''
  }
  queryForm.pageNo = 1
  fetchData()
}

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await getList(queryForm)
    list.value = data?.list || []
    total.value = Number(data?.total || 0)
  } catch (e: any) {
    list.value = []
    total.value = 0
    console.warn('[AuditLog] 加载失败', e)
  } finally {
    listLoading.value = false
    // 数据更新后确保表格重新测量尺寸
    resizeTable()
  }
}

const resetQueryForm = () => {
  ;(Object.keys(queryForm) as (keyof typeof queryForm)[]).forEach((key) => {
    if (key !== 'pageNo' && key !== 'pageSize') queryForm[key] = '' as never
  })
  queryForm.pageNo = 1
  queryData()
}

// ===== 容器宽度（转置判断） =====
let widthObserver: ResizeObserver | null = null

onMounted(() => {
  if (wrapperRef.value) {
    widthObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = Math.round(entry.contentRect.width)
      }
    })
    widthObserver.observe(wrapperRef.value)
    containerWidth.value = Math.round(wrapperRef.value.clientWidth)
  }
})

onBeforeUnmount(() => {
  widthObserver?.disconnect()
  widthObserver = null
})

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.audit-log-container {
  display: flex;
  flex-direction: column;
  min-height: 0;

  .vtable-wrapper {
    flex: 1 1 auto;
    min-height: 320px;
    overflow: hidden;
  }

  .params-pre {
    margin: 0;
    padding: 8px 12px;
    max-height: 200px;
    overflow: auto;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .text-muted {
    color: var(--el-text-color-placeholder);
  }

  :deep(.el-descriptions__label) {
    width: 100px;
    font-weight: 500;
  }
}
</style>
