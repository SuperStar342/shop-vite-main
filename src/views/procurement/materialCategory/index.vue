<template>
  <div class="material-category-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd()">添加类别</el-button>
        <el-button :icon="expandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ expandAll ? '全部折叠' : '全部展开' }}
        </el-button>
        <el-button :icon="Delete" :disabled="selectRows.length === 0" type="danger" @click="handleBatchDelete">
          批量删除
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.categoryName" clearable placeholder="请输入类别名称" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.categoryCode" clearable placeholder="请输入类别编码" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" @click="resetQueryForm">重置</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-right-panel>
    </vab-query-form>

    <div ref="wrapperRef" class="vtable-wrapper" :class="{ 'has-selection': !!selectedId }">
      <ListTable
        ref="tableRef"
        :key="tableKey"
        :options="tableOptions"
        :records="list"
        :height="tableHeight"
        @on-checkbox-state-change="handleCheckboxStateChange"
        @on-click-cell="handleClickCell"
        @on-contextmenu-cell="onCopyContextMenu"
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

    <material-category-edit ref="editRef" @fetch-data="handleSaved" />
    <material-category-detail-drawer
      ref="drawerRef"
      @edit="handleEdit"
      @add-child="handleAdd"
      @closed="handleDrawerClosed"
    />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Expand, Fold, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { ListTable } from '@visactor/vue-vtable'
import { doDelete, getList } from '/@/api/procurement/materialCategory'
import { useVTableLayout } from '/@/hooks/useVTableLayout'
import { handleVTableContextMenuCell } from '/@/utils/tableCopy'
import MaterialCategoryDetailDrawer from './vabAutoComponents/MaterialCategoryDetailDrawer.vue'

defineOptions({
  name: 'MaterialCategoryManagement',
})

const tableRef = ref<any>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const { tableHeight, handleTableReady } = useVTableLayout(tableRef, wrapperRef)
const editRef = ref<any>(null)
const drawerRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const total = ref(0)
const selectRows = ref<any[]>([])
const selectedId = ref('')
const tableKey = ref(0)
const expandAll = ref(true)

const queryForm = reactive({
  pageNo: 1,
  pageSize: 20,
  categoryName: '',
  categoryCode: '',
})

const yesNo = (v: any) => (v === '是' || v === 1 || v === '1' || v === true ? '是' : '否')
const qcLabel = (v: any) => {
  const m: Record<string, string> = { '1': '免检', '2': '全检', '3': '抽检' }
  return m[String(v)] || String(v || '-')
}

const SELECTED_BG = 'rgba(64, 158, 255, 0.12)'

const tableOptions = computed(() => {
  const center = { textAlign: 'center' as const }
  const columns: any[] = [
    {
      field: '__checkbox__',
      cellType: 'checkbox',
      headerType: 'checkbox',
      width: 46,
      style: { textAlign: 'center' },
    },
    {
      field: 'categoryName',
      title: '类别名称',
      width: 200,
      tree: true,
      fieldFormat: (r: any) => r.categoryName || '-',
    },
    { field: 'categoryCode', title: '类别代码', width: 110, sort: true },
    {
      field: 'qcMode',
      title: '检验方式',
      width: 90,
      fieldFormat: (r: any) => qcLabel(r.qcMode),
      style: center,
      sort: true,
    },
    {
      field: 'leadDays',
      title: '到货前置天数',
      width: 110,
      fieldFormat: (r: any) => String(r.leadDays ?? 0),
      style: center,
      sort: true,
    },
    {
      field: 'applyLeadDays',
      title: '物料流程前置',
      width: 110,
      fieldFormat: (r: any) => String(r.applyLeadDays ?? 0),
      style: center,
      sort: true,
    },
    {
      field: 'stkCode',
      title: '物料代码',
      width: 90,
      fieldFormat: (r: any) => r.stkCode || '-',
      style: center,
      sort: true,
    },
    {
      field: 'mustQc',
      title: '是否必须品管',
      width: 110,
      fieldFormat: (r: any) => yesNo(r.mustQc),
      style: center,
    },
    {
      field: 'daysBefPur',
      title: '采购前置天数',
      width: 110,
      fieldFormat: (r: any) => String(r.daysBefPur ?? 0),
      style: center,
      sort: true,
    },
    {
      field: 'daysOfChk',
      title: '标准检验天数',
      width: 110,
      fieldFormat: (r: any) => String(r.daysOfChk ?? 0),
      style: center,
      sort: true,
    },
    {
      field: 'edgeWarehouse',
      title: '是否线边仓',
      width: 100,
      fieldFormat: (r: any) => yesNo(r.edgeWarehouse),
      style: center,
    },
    {
      field: 'nameCodeMode',
      title: '名字编码方式',
      width: 110,
      fieldFormat: (r: any) => r.nameCodeMode || '手动',
      style: { ...center, color: '#409eff' },
      sort: true,
    },
    {
      field: 'nameFormula',
      title: '名字公式',
      width: 120,
      fieldFormat: (r: any) => r.nameFormula || '-',
    },
    {
      field: 'specCodeMode',
      title: '规格描述编码方式',
      width: 130,
      fieldFormat: (r: any) => r.specCodeMode || '手动',
      style: { ...center, color: '#409eff' },
      sort: true,
    },
    {
      field: 'specFormula',
      title: '规格描述公式',
      width: 120,
      fieldFormat: (r: any) => r.specFormula || '-',
    },
    {
      field: '__op_edit__',
      title: '编辑',
      width: 64,
      fieldFormat: () => '编辑',
      style: { color: '#409eff', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 500 },
    },
    {
      field: '__op_del__',
      title: '删除',
      width: 64,
      fieldFormat: () => '删除',
      style: { color: '#f56c6c', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 500 },
    },
  ]

  return {
    columns,
    hover: { highlightMode: 'row' as const },
    select: { highlightMode: 'row' as const, disableSelect: true },
    keyboardOptions: { copySelected: true },
    columnResizeMode: 'all' as const,
    dragHeaderMode: 'column' as const,
    defaultColWidth: 100,
    widthMode: 'standard' as const,
    autoFillWidth: false,
    frozenColCount: 2,
    rightFrozenColCount: 2,
    hierarchyExpandLevel: expandAll.value ? 99 : 1,
    theme: {
      headerStyle: {
        bgColor: '#f5f7fa',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#606266',
        borderColor: '#ebeef5',
      },
      bodyStyle: {
        fontSize: 13,
        color: '#303133',
        borderColor: '#ebeef5',
        bgColor: (args: any) => {
          const record = args?.table?.getCellOriginRecord?.(args.col, args.row)
          const id = record?.id != null ? String(record.id) : ''
          if (id && id === selectedId.value) return SELECTED_BG
          return '#ffffff'
        },
      },
      frameStyle: { borderColor: '#ebeef5' },
      selectionStyle: { cellBgColor: SELECTED_BG, fontWeight: 500 },
    },
    emptyTip: {
      text: '暂无材料类别数据',
      position: { x: '50%', y: '50%' },
      textStyle: { fontSize: 14, color: '#909399' },
    },
  }
})

const onCopyContextMenu = (args: any) => {
  handleVTableContextMenuCell(args, () => tableRef.value?.vTableInstance)
}

const syncSelectedRows = () => {
  const vtable = tableRef.value?.vTableInstance
  if (!vtable) {
    selectRows.value = []
    return
  }
  const headerCount = vtable.columnHeaderLevelCount ?? 1
  const selected: any[] = []
  list.value.forEach((_item, index) => {
    const row = headerCount + index
    const state = vtable.getCellCheckboxState(0, row)
    if (state === true) selected.push(list.value[index])
  })
  selectRows.value = selected
}

const handleCheckboxStateChange = () => {
  nextTick(() => syncSelectedRows())
}

const getColumnField = (col: number): string => {
  const inst = tableRef.value?.vTableInstance
  try {
    const def = inst?.getBodyColumnDefine?.(col) || inst?.getColumnDefine?.(col)
    if (def?.field != null) return String(def.field)
  } catch {
    /* fall through */
  }
  return String(tableOptions.value?.columns?.[col]?.field ?? '')
}

const refreshSelectedStyle = () => {
  tableRef.value?.vTableInstance?.renderWithRecreateCells?.()
}

const openDetail = (record: any) => {
  selectedId.value = record?.id != null ? String(record.id) : ''
  refreshSelectedStyle()
  drawerRef.value?.open(record)
}

const getCellRecord = (args: any) => {
  const vtable = tableRef.value?.vTableInstance
  if (!vtable || args.col === undefined || args.row === undefined) return null
  return (
    vtable.getCellOriginRecord?.(args.col, args.row) ||
    list.value[args.row - (vtable.columnHeaderLevelCount ?? 1)] ||
    null
  )
}

/** 单击高亮；短间隔内再次点击同一行视为双击打开详情（避免 recreateCells 打断原生 dblclick） */
let clickTimer: ReturnType<typeof setTimeout> | null = null
let lastClickRowKey = ''

const handleClickCell = (args: any) => {
  const field = getColumnField(args.col)
  if (field === '__checkbox__') return
  const record = getCellRecord(args)
  if (!record) return

  if (field.startsWith('__op_')) {
    if (field === '__op_edit__') handleEdit(record)
    else if (field === '__op_del__') handleRowDelete(record)
    return
  }

  const id = record?.id != null ? String(record.id) : ''
  const rowKey = id || `${args.col}-${args.row}`
  const vtable = tableRef.value?.vTableInstance

  // 双击：同一行 300ms 内第二次点击
  if (clickTimer && lastClickRowKey === rowKey) {
    clearTimeout(clickTimer)
    clickTimer = null
    lastClickRowKey = ''
    vtable?.selectCell?.(args.col, args.row)
    openDetail(record)
    return
  }

  lastClickRowKey = rowKey
  selectedId.value = id
  vtable?.selectCell?.(args.col, args.row)
  // 延迟刷新高亮，给双击第二次点击留出时间
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    lastClickRowKey = ''
    refreshSelectedStyle()
  }, 300)
}

const applyHierarchyState = (nodes: any[], state: 'expand' | 'collapse') => {
  nodes.forEach((node) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      node.hierarchyState = state
      applyHierarchyState(node.children, state)
    }
  })
}

const toggleExpandAll = () => {
  expandAll.value = !expandAll.value
  applyHierarchyState(list.value, expandAll.value ? 'expand' : 'collapse')
  tableKey.value++
}

const getRowId = (row: any) => {
  const id = row?.id
  return id === undefined || id === null || id === '' ? '' : String(id)
}

const handleDrawerClosed = () => {
  selectedId.value = ''
  tableRef.value?.vTableInstance?.clearSelected?.()
  refreshSelectedStyle()
}

const handleSaved = async () => {
  selectedId.value = ''
  drawerRef.value?.close()
  queryForm.pageNo = 1
  await fetchData()
}

const runDelete = async (ids: string) => {
  const { msg, success }: any = await doDelete({ ids })
  if (success === false) throw new Error(msg || '删除失败')
  $baseMessage(msg || '删除成功', 'success', 'hey')
  if (selectedId.value && String(ids).split(',').includes(selectedId.value)) {
    drawerRef.value?.close()
    selectedId.value = ''
  }
  await fetchData()
}

const handleAdd = (parentRow?: any) => {
  if (parentRow?.id) editRef.value?.showEdit({ parentId: parentRow.id })
  else editRef.value?.showEdit()
}

const handleEdit = (row: any) => {
  editRef.value?.showEdit(row)
}

const handleRowDelete = (row: any) => {
  const id = getRowId(row)
  if (!id) {
    $baseMessage('无法获取类别ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前材料类别吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await runDelete(id)
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const handleBatchDelete = () => {
  if (!selectRows.value.length) {
    $baseMessage('您未选中任何行', 'warning', 'hey')
    return
  }
  const ids = selectRows.value
    .map((item) => getRowId(item))
    .filter(Boolean)
    .join(',')
  ElMessageBox.confirm('确定删除选中的材料类别吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await runDelete(ids)
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await getList(queryForm)
    list.value = data.list || []
    total.value = data.total || 0
    selectRows.value = []
    applyHierarchyState(list.value, expandAll.value ? 'expand' : 'collapse')
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载材料类别失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchData()
}

const resetQueryForm = () => {
  queryForm.categoryName = ''
  queryForm.categoryCode = ''
  queryForm.pageNo = 1
  fetchData()
}

const handleCurrentChange = (page: number) => {
  queryForm.pageNo = page
  fetchData()
}

const handleSizeChange = (size: number) => {
  queryForm.pageSize = size
  queryForm.pageNo = 1
  fetchData()
}

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.material-category-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  // 整体入场
  animation: fadeSlideUp 0.45s ease-out both;

  .vtable-wrapper {
    flex: 1 1 auto;
    min-height: 260px;
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fff;
    transition: box-shadow 0.2s ease;
    // 表格滞后入场
    animation: fadeSlideUp 0.45s 0.12s ease-out both;

    &.has-selection {
      box-shadow: inset 3px 0 0 #409eff;
    }
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
