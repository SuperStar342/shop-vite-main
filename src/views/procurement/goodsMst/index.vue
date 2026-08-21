<template>
  <div class="goods-mst-container auto-height-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加材料</el-button>
        <el-button :icon="Delete" :disabled="selectRows.length === 0" type="danger" @click="handleBatchDelete">
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 筛选栏：两行布局 -->
    <div class="filter-bar">
      <!-- 第一行：搜索 + 类别 + 快捷筛选 + 操作 -->
      <div class="filter-bar-row">
        <div class="filter-bar-group filter-bar-group--search">
          <span class="filter-bar-label">搜索</span>
          <el-autocomplete
            v-model.trim="queryForm.goodsCode"
            :fetch-suggestions="fetchCodeSuggestions"
            clearable
            placeholder="材料编码"
            size="default"
            style="width: 160px"
            :debounce="300"
            @select="queryData"
          />
          <el-autocomplete
            v-model.trim="queryForm.goodsName"
            :fetch-suggestions="fetchNameSuggestions"
            clearable
            placeholder="材料名称"
            size="default"
            style="width: 170px"
            :debounce="300"
            @select="queryData"
          />
        </div>

        <div class="filter-bar-group">
          <span class="filter-bar-label">类别</span>
          <el-popover v-model:visible="categoryPopoverVisible" placement="bottom-start" :width="260" trigger="click">
            <template #reference>
              <el-button size="default" class="category-picker-btn">
                {{ activeFilterLabel || '选择材料类别' }}
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </template>
            <el-input
              v-model.trim="treeFilterText"
              size="small"
              clearable
              placeholder="搜索类别"
              style="margin-bottom: 8px"
            />
            <el-tree
              ref="treeRef"
              :data="categoryTree"
              node-key="id"
              highlight-current
              :expand-on-click-node="false"
              :default-expanded-keys="defaultExpandedKeys"
              :filter-node-method="filterTreeNode"
              :props="{ label: 'categoryName', children: 'children' }"
              style="max-height: 360px; overflow: auto"
              @node-click="handleCategoryClick"
            >
              <template #default="{ data }">
                <span style="font-size: 13px">{{ data.categoryName }}</span>
              </template>
            </el-tree>
            <div style="padding-top: 6px; border-top: 1px solid #ebeef5">
              <el-button size="small" text @click="clearCategoryFilter">清除</el-button>
              <el-button size="small" text type="primary" style="float: right" @click="handleCategoryClick({ categoryCode: '3', categoryName: '全部' })">全部</el-button>
            </div>
          </el-popover>
        </div>

        <div class="filter-bar-group">
          <span class="filter-bar-label">其他</span>
          <el-input v-model.trim="queryForm.goodsType" clearable placeholder="材料类型" size="default" style="width: 120px" @keyup.enter="applySidebarFilter" @clear="applySidebarFilter" />
          <el-input v-model.trim="queryForm.brandCode" clearable placeholder="品牌" size="default" style="width: 100px" @keyup.enter="applySidebarFilter" @clear="applySidebarFilter" />
          <el-input v-model.trim="queryForm.stdUnit" clearable placeholder="单位" size="default" style="width: 90px" @keyup.enter="applySidebarFilter" @clear="applySidebarFilter" />
        </div>

        <el-button text size="default" @click="clearAllFilters">重置</el-button>
      </div>

      <!-- 第二行：属性标签筛选 -->
      <div class="filter-bar-row filter-bar-row--tags">
        <span class="filter-bar-label">属性</span>
        <el-select v-model="queryForm.costType" clearable placeholder="成本属性" size="small" style="width: 140px" @change="applySidebarFilter">
          <el-option label="直接材料" value="1" />
          <el-option label="间接材料" value="0" />
        </el-select>
        <el-select v-model="queryForm.codeGenMode" clearable placeholder="编码方式" size="small" style="width: 140px" @change="applySidebarFilter">
          <el-option label="手动编码" value="1" />
          <el-option label="自动编码" value="2" />
        </el-select>
        <el-select v-model="queryForm.nameGenMode" clearable placeholder="名称产生" size="small" style="width: 140px" @change="applySidebarFilter">
          <el-option label="手工录入" value="1" />
          <el-option label="自动产生" value="2" />
        </el-select>
        <el-select v-model="queryForm.specGenMode" clearable placeholder="规格描述" size="small" style="width: 140px" @change="applySidebarFilter">
          <el-option label="手工录入" value="1" />
          <el-option label="自动产生" value="2" />
        </el-select>
      </div>
    </div>

    <!-- 表格 -->
    <div ref="wrapperRef" class="vtable-wrapper">
      <ListTable
        ref="tableRef"
        :key="tableKey"
        :options="tableOptions"
        :records="list"
        :height="tableHeight"
        @on-checkbox-state-change="handleCheckboxStateChange"
        @on-click-cell="handleClickCell"
        @on-initialized="handleTableReady"
      />
    </div>

    <!-- 分页 -->
    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />

    <goods-mst-edit ref="editRef" @fetch-data="handleSaved" />
  </div>
</template>

<script lang="ts" setup>
import { ArrowDown, Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { ListTable } from '@visactor/vue-vtable'
import { doDelete, getCategoryTree, getList } from '/@/api/procurement/goodsMst'
import { useVTableLayout } from '/@/hooks/useVTableLayout'
import { toIdSet } from '/@/utils/listMutate'

defineOptions({
  name: 'GoodsMstManagement',
})

// ===== 状态 =====
const tableRef = ref<any>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const treeRef = ref<any>(null)
const { tableHeight, handleTableReady } = useVTableLayout(tableRef, wrapperRef)
const editRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const total = ref(0)
const selectRows = ref<any[]>([])
const tableKey = ref(0)
const categoryTree = ref<any[]>([])
const categoryFlat = ref<any[]>([])
const categoryMap = ref<Map<string, string>>(new Map()) // O(1) categoryCode → categoryName 查找
const treeFilterText = ref('')
const defaultExpandedKeys = ref<string[]>([])
const activeFilterLabel = ref('')
const categoryPopoverVisible = ref(false)

const queryForm = reactive({
  pageNo: 1,
  pageSize: 20,
  goodsCode: '',
  goodsName: '',
  categoryCode: '',
  costType: '',
  codeGenMode: '',
  nameGenMode: '',
  specGenMode: '',
  goodsType: '',
  brandCode: '',
  stdUnit: '',
})

watch(treeFilterText, (val) => {
  treeRef.value?.filter(val)
})

// 材料编码 / 材料名称输入即搜索（300ms 防抖）
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch([() => queryForm.goodsCode, () => queryForm.goodsName], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    queryForm.pageNo = 1
    fetchData()
  }, 300)
})

// 材料编码自动补全（百度式下拉建议）
const fetchCodeSuggestions = async (query: string, cb: (results: any[]) => void) => {
  if (!query) return cb([])
  try {
    const { data } = await getList({ goodsCode: query, pageNo: 1, pageSize: 10 })
    const seen = new Set<string>()
    const results = (data.list || [])
      .filter((r: any) => {
        const code = r.goodsCode || ''
        if (!code || seen.has(code)) return false
        seen.add(code)
        return true
      })
      .slice(0, 8)
      .map((r: any) => ({ value: r.goodsCode || '', label: `${r.goodsCode} — ${r.goodsName || ''}` }))
    cb(results)
  } catch {
    cb([])
  }
}

// 材料名称自动补全
const fetchNameSuggestions = async (query: string, cb: (results: any[]) => void) => {
  if (!query) return cb([])
  try {
    const { data } = await getList({ goodsName: query, pageNo: 1, pageSize: 10 })
    const seen = new Set<string>()
    const results = (data.list || [])
      .filter((r: any) => {
        const name = r.goodsName || ''
        if (!name || seen.has(name)) return false
        seen.add(name)
        return true
      })
      .slice(0, 8)
      .map((r: any) => ({ value: r.goodsName || '', label: `${r.goodsCode || ''} — ${r.goodsName}` }))
    cb(results)
  } catch {
    cb([])
  }
}

const filterTreeNode = (value: string, data: any) => {
  if (!value) return true
  const kw = value.toLowerCase()
  return String(data.categoryName || '')
    .toLowerCase()
    .includes(kw) || String(data.categoryCode || '').toLowerCase().includes(kw)
}

const flattenTree = (nodes: any[], acc: any[] = []) => {
  for (const n of nodes || []) {
    acc.push(n)
    if (Array.isArray(n.children) && n.children.length) flattenTree(n.children, acc)
  }
  return acc
}

// ===== 字段格式化 =====
const formatCostType = (val: any) => {
  const v = String(val ?? '1')
  return v === '1' ? '直接材料' : v === '0' ? '间接材料' : v
}

const formatGenMode = (val: any) => {
  const v = String(val ?? '1')
  return v === '2' ? '自动' : '手动'
}

// O(1) Map 查找替代 O(n) Array.find，避免每单元格线性扫描
const formatCategory = (record: any) => {
  return categoryMap.value.get(record.sortCode) || record.sortCode || '-'
}

// ===== VTable 列定义 =====
const tableOptions = computed(() => {
  const columns: any[] = [
    {
      field: '__checkbox__',
      cellType: 'checkbox',
      headerType: 'checkbox',
      width: 50,
      style: { textAlign: 'center' },
    },
    {
      field: 'goodsCode',
      title: '材料编码',
      width: 130,
      style: { color: '#409eff', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' },
    },
    { field: 'goodsName', title: '材料名称', width: 180 },
    {
      field: 'sortCode',
      title: '材料类别',
      width: 130,
      fieldFormat: formatCategory,
    },
    {
      field: 'goodsType',
      title: '材料类型',
      width: 90,
      fieldFormat: (record: any) => record.goodsType || '-',
      style: { textAlign: 'center' },
    },
    {
      field: 'costType',
      title: '材料成本属性',
      width: 110,
      fieldFormat: (record: any) => formatCostType(record.costType),
      style: { textAlign: 'center' },
    },
    {
      field: 'codeGenMode',
      title: '材料编码方式',
      width: 110,
      fieldFormat: (record: any) => formatGenMode(record.codeGenMode),
      style: { textAlign: 'center' },
    },
    {
      field: 'nameGenMode',
      title: '材料名称产生方式',
      width: 130,
      fieldFormat: (record: any) => formatGenMode(record.nameGenMode),
      style: { textAlign: 'center' },
    },
    {
      field: 'specGenMode',
      title: '规格描述方式',
      width: 110,
      fieldFormat: (record: any) => formatGenMode(record.specGenMode),
      style: { textAlign: 'center' },
    },
    {
      field: 'sizeDesc',
      title: '规格描述',
      width: 160,
      fieldFormat: (record: any) => record.sizeDesc || '-',
    },
    {
      field: 'stdUnit',
      title: '标准单位',
      width: 80,
      fieldFormat: (record: any) => record.stdUnit || '-',
      style: { textAlign: 'center' },
    },
    {
      field: 'stkUnit',
      title: '库存单位',
      width: 80,
      fieldFormat: (record: any) => record.stkUnit || '-',
      style: { textAlign: 'center' },
    },
    {
      field: 'businessUnit',
      title: '交易单位',
      width: 80,
      fieldFormat: (record: any) => record.businessUnit || '-',
      style: { textAlign: 'center' },
    },
    {
      field: 'brandCode',
      title: '品牌',
      width: 90,
      fieldFormat: (record: any) => record.brandCode || '-',
      style: { textAlign: 'center' },
    },
    {
      field: 'alias',
      title: '别名',
      width: 120,
      fieldFormat: (record: any) => record.alias || '-',
    },
    {
      field: 'quickQuery',
      title: '快速查询',
      width: 110,
      fieldFormat: (record: any) => record.quickQuery || '-',
    },
    {
      field: 'remark',
      title: '备注',
      width: 150,
      fieldFormat: (record: any) => record.remark || '-',
    },
    {
      field: '__op_edit__',
      title: '编辑',
      width: 70,
      fieldFormat: () => '编辑',
      style: { color: '#409eff', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 500 },
    },
    {
      field: '__op_del__',
      title: '删除',
      width: 70,
      fieldFormat: () => '删除',
      style: { color: '#f56c6c', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 500 },
    },
  ]

  return {
    columns,
    hover: { highlightMode: 'row' as const },
    select: { highlightMode: 'row' as const },
    columnResizeMode: 'all' as const,
    dragHeaderMode: 'column' as const,
    defaultColWidth: 120,
    widthMode: 'standard' as const,
    autoFillWidth: true,
    frozenColCount: 2,
    rightFrozenColCount: 2,
    theme: {
      headerStyle: { bgColor: '#f5f7fa', fontSize: 13, fontWeight: 'bold', color: '#606266', borderColor: '#ebeef5' },
      bodyStyle: { fontSize: 13, color: '#303133', borderColor: '#ebeef5' },
      frameStyle: { borderColor: '#ebeef5' },
      selectionStyle: { cellBgColor: 'rgba(64, 158, 255, 0.06)' },
    },
    emptyTip: { text: '暂无材料资料数据', position: { x: '50%', y: '50%' }, textStyle: { fontSize: 14, color: '#909399' } },
  }
})

// ===== 选中同步 =====
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

const handleClickCell = (args: any) => {
  if (args.col === undefined || args.row === undefined) return
  const field = getColumnField(args.col)

  const vtable = tableRef.value?.vTableInstance
  if (!vtable) return
  const headerCount = vtable.columnHeaderLevelCount ?? 1
  const record = list.value[args.row - headerCount]
  if (!record) return

  if (field === 'goodsCode') {
    handleView(record)
  } else if (field === '__op_edit__') {
    handleEdit(record)
  } else if (field === '__op_del__') {
    handleRowDelete(record)
  }
}

// ===== 数据操作 =====
const getRowId = (row: any) => {
  const id = row?.id
  return id === undefined || id === null || id === '' ? '' : String(id)
}

const handleSaved = async () => {
  queryForm.pageNo = 1
  await fetchData()
}

const runDelete = async (ids: string) => {
  const idSet = toIdSet(ids)
  const { msg, success }: any = await doDelete({ ids })
  if (success === false) throw new Error(msg || '删除失败')
  const before = list.value.length
  list.value = list.value.filter((item) => !idSet.has(getRowId(item)))
  total.value = Math.max(0, Number(total.value) - (before - list.value.length))
  selectRows.value = selectRows.value.filter((item) => !idSet.has(getRowId(item)))
  tableKey.value++
  $baseMessage(msg || '删除成功', 'success', 'hey')
}

const handleAdd = () => {
  editRef.value?.showEdit(undefined, { viewOnly: false })
}

const handleView = (row: any) => {
  editRef.value?.showEdit(row, { viewOnly: true })
}

const handleEdit = (row: any) => {
  editRef.value?.showEdit(row, { viewOnly: false })
}

const handleRowDelete = (row: any) => {
  const id = getRowId(row)
  if (!id) {
    $baseMessage('无法获取材料ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前材料资料吗？', '提示', {
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
  ElMessageBox.confirm('确定删除选中的材料资料吗？', '提示', {
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

// ===== 左侧筛选 =====
const handleCategoryClick = (data: any) => {
  categoryPopoverVisible.value = false
  const code = String(data?.categoryCode || '')
  // 「全部」根节点：清空类别筛选
  if (!code || code === '3' || data?.categoryName === '全部') {
    clearCategoryFilter()
    return
  }
  queryForm.categoryCode = code
  activeFilterLabel.value = `类别：${data.categoryName || code}`
  queryForm.pageNo = 1
  fetchData()
}


const clearCategoryFilter = () => {
  queryForm.categoryCode = ''
  activeFilterLabel.value = ''
  treeRef.value?.setCurrentKey?.(null)
  queryForm.pageNo = 1
  fetchData()
}


const applySidebarFilter = () => {
  queryForm.pageNo = 1
  fetchData()
}

const clearAllFilters = () => {
  queryForm.goodsCode = ''
  queryForm.goodsName = ''
  queryForm.categoryCode = ''
  queryForm.costType = ''
  queryForm.codeGenMode = ''
  queryForm.nameGenMode = ''
  queryForm.specGenMode = ''
  queryForm.goodsType = ''
  queryForm.brandCode = ''
  queryForm.stdUnit = ''
  activeFilterLabel.value = ''
  treeFilterText.value = ''
  treeRef.value?.setCurrentKey?.(null)
  queryForm.pageNo = 1
  fetchData()
}

// ===== 数据获取 =====
const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await getList(queryForm)
    list.value = data.list || []
    total.value = data.total || 0
    selectRows.value = []
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载材料资料失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const loadCategoryTree = async () => {
  try {
    const tree = await getCategoryTree()
    categoryTree.value = Array.isArray(tree) ? tree : []
    categoryFlat.value = flattenTree(categoryTree.value)
    // 构建 O(1) 查找 Map（categoryCode → categoryName）
    categoryMap.value = new Map(categoryFlat.value.map((c) => [c.categoryCode, c.categoryName]))
    // 默认展开前两层
    defaultExpandedKeys.value = categoryFlat.value
      .filter((n) => !n.parentId || String(n.parentId) === '0' || String(n.parentId) === '1')
      .map((n) => String(n.id))
      .slice(0, 8)
  } catch {
    categoryTree.value = []
    categoryFlat.value = []
    categoryMap.value = new Map()
  }
}


const queryData = () => {
  queryForm.pageNo = 1
  fetchData()
}

// ===== 分页 =====
const handleCurrentChange = (page: number) => {
  queryForm.pageNo = page
  fetchData()
}

const handleSizeChange = (size: number) => {
  queryForm.pageSize = size
  queryForm.pageNo = 1
  fetchData()
}

// 分类树和列表数据互不依赖，并行请求
onBeforeMount(() => {
  Promise.all([loadCategoryTree(), fetchData()])
})
</script>

<style lang="scss" scoped>
.goods-mst-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  animation: fadeSlideUp 0.45s ease-out both;
}

// 工具栏
.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 筛选栏
.filter-bar {
  flex-shrink: 0;
  padding: 0;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.filter-bar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  padding: 10px 16px;

  // 第二行：淡灰背景 + 上边框
  &--tags {
    background: #fafbfc;
    border-top: 1px solid #ebeef5;
    padding-top: 8px;
    padding-bottom: 8px;
  }
}

// 筛选分组
.filter-bar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-right: 1px solid #ebeef5;

  &:first-child { padding-left: 0; }

  &--search {
    flex-wrap: nowrap;
  }
}

// 分组标签
.filter-bar-label {
  font-size: 12px;
  font-weight: 500;
  color: #909399;
  flex-shrink: 0;
  user-select: none;
}

.category-picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 140px;
  justify-content: space-between;
}

.vtable-wrapper {
  flex: 1 1 auto;
  min-height: 260px;
  overflow: hidden;
  animation: fadeSlideUp 0.45s 0.1s ease-out both;
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
