<template>
  <div class="dictionary-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加字典分类</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.key" clearable placeholder="请输入字典名称" />
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

    <el-table
      ref="tableRef"
      v-loading="listLoading"
      border
      :data="list"
      :max-height="tableMaxHeight"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column align="center" label="序号" width="55">
        <template #default="{ $index }">
          {{ $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column v-if="visible('code')" align="left" label="字典编码" min-width="160" prop="code" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="code-cell">
            <span class="code-text">{{ row.code || '-' }}</span>
            <el-button class="copy-btn" :icon="DocumentCopy" link title="复制编码" type="primary" @click.stop="handleCopyCode(row)" />
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('dictValue')" align="center" label="字典名称" min-width="120" prop="dictValue" show-overflow-tooltip />
      <el-table-column v-if="visible('sort')" align="center" label="排序" prop="sort" width="80" />
      <el-table-column align="center" label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            active-text="启用"
            :active-value="1"
            :before-change="() => beforeToggleField(row, 'status')"
            :disabled="!!row._statusLoading"
            inactive-text="禁用"
            :inactive-value="0"
            inline-prompt
            :loading="!!row._statusLoading"
          />
        </template>
      </el-table-column>
      <el-table-column align="center" label="是否封存" width="100">
        <template #default="{ row }">
          <el-switch
            v-model="row.isSealed"
            active-text="是"
            :active-value="1"
            :before-change="() => beforeToggleField(row, 'isSealed')"
            :disabled="!!row._sealLoading"
            inactive-text="否"
            :inactive-value="0"
            inline-prompt
            :loading="!!row._sealLoading"
          />
        </template>
      </el-table-column>
      <el-table-column v-if="visible('remark')" align="center" label="备注" min-width="120" prop="remark" show-overflow-tooltip />
      <el-table-column align="center" fixed="right" label="操作" width="180">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleConfig(row)">配置</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无数据" />
      </template>
    </el-table>

    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />

    <dictionary-management-edit ref="editRef" @fetch-data="fetchData" />
    <dictionary-config ref="configRef" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, DocumentCopy, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import DictionaryConfig from './vabAutoComponents/DictionaryConfig.vue'
import DictionaryManagementEdit from './vabAutoComponents/DictionaryManagementEdit.vue'
import { DICT_API_KEY, bizDictApi, systemDictApi, type DictApi } from '/@/api/dictionaryManagement'
import { useListColumns } from '/@/hooks/useListColumns'
import handleClipboard from '/@/utils/clipboard'
import { removeFromList, toIdSet } from '/@/utils/listMutate'

defineOptions({
  name: 'DictionaryManagement',
})

const route = useRoute()
const listPageCode = computed(() =>
  route.meta.dictBiz ? 'BizDictionaryManagement' : 'DictionaryManagement'
)
const { visible } = useListColumns(listPageCode)
const dictApi = computed<DictApi>(() => (route.meta.dictBiz ? bizDictApi : systemDictApi))
provide(
  DICT_API_KEY,
  new Proxy({} as DictApi, {
    get(_target, prop) {
      const api = dictApi.value as any
      const value = api[prop]
      return typeof value === 'function' ? value.bind(api) : value
    },
  })
)

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const configRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)

const total = ref(0)
const selectRows = ref<any[]>([])
const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  key: '',
})

/** 按视口计算表格高度，保证分页条始终可见、当前页数据可完整滚动查看 */
const { height: windowHeight } = useWindowSize()
const tableMaxHeight = computed(() => {
  // 顶栏/标签/查询区/分页/内边距约占用 280px，小屏再收一点
  const reserve = windowHeight.value < 768 ? 240 : 280
  return Math.max(240, windowHeight.value - reserve)
})

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const handleAdd = () => {
  editRef.value.showEdit()
}

const handleEdit = (row: any) => {
  editRef.value.showEdit(row)
}

/** 复制字典编码到剪贴板（带成功/失败提示） */
const handleCopyCode = (row: any) => {
  const code = String(row?.code || '').trim()
  if (!code) {
    $baseMessage('暂无字典编码可复制', 'warning', 'hey')
    return
  }
  handleClipboard(code)
}

/**
 * 切换 status / isSealed
 * 使用 before-change：成功才允许开关变位
 */
const beforeToggleField = (row: any, field: 'status' | 'isSealed') => {
  if (!row?.id) return false
  const loadingKey = field === 'status' ? '_statusLoading' : '_sealLoading'
  if (row[loadingKey]) return false

  const current = Number(row[field] ?? (field === 'status' ? 1 : 0))
  const next = current === 1 ? 0 : 1

  return new Promise<boolean>((resolve) => {
    row[loadingKey] = true
    dictApi.value
      .doEdit({
        id: row.id,
        parentId: 0,
        code: row.code,
        dictKey: '-1',
        dictValue: row.dictValue || row.dictName || row.label,
        sort: row.sort ?? 0,
        remark: row.remark || '',
        isSealed: field === 'isSealed' ? next : Number(row.isSealed ?? 0),
        status: field === 'status' ? next : Number(row.status ?? 1),
        isParent: true,
      })
      .then(({ msg, success }: any) => {
        if (success === false) throw new Error(msg || '更新失败')
        const tip = field === 'status' ? (next === 1 ? '已启用' : '已禁用') : next === 1 ? '已封存' : '已取消封存'
        $baseMessage(msg || tip, 'success', 'hey')
        resolve(true)
      })
      .catch((e: any) => {
        $baseMessage(e?.message || e?.msg || '状态更新失败', 'error', 'hey')
        resolve(false)
      })
      .finally(() => {
        row[loadingKey] = false
      })
  })
}

const handleConfig = (row: any) => {
  configRef.value.showConfig(row)
}

const removeLocalRows = (ids: string | number) => {
  const idSet = toIdSet(ids)
  const before = list.value.length
  list.value = removeFromList(list.value, idSet)
  total.value = Math.max(0, Number(total.value) - (before - list.value.length))
  selectRows.value = selectRows.value.filter((r) => !idSet.has(String(r.id)))
}

const handleDelete = (row: any) => {
  if (!row.id) {
    $baseMessage('无法获取字典 ID，请刷新后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('确定删除当前字典分类吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await dictApi.value.doDelete({ ids: row.id })
        if (success === false) throw new Error(msg || '删除失败')
        removeLocalRows(row.id)
        $baseMessage(msg || '删除成功', 'success', 'hey')
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const handleBatchDelete = () => {
  if (!selectRows.value.length) {
    $baseMessage('请先选择要删除的数据', 'warning', 'hey')
    return
  }
  const ids = selectRows.value.map((r) => r.id).filter(Boolean).join(',')
  if (!ids) {
    $baseMessage('选中数据缺少 ID，请刷新后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('确定删除选中的字典分类吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await dictApi.value.doDelete({ ids })
        if (success === false) throw new Error(msg || '删除失败')
        removeLocalRows(ids)
        $baseMessage(msg || '删除成功', 'success', 'hey')
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await dictApi.value.getList({
      pageNo: queryForm.pageNo,
      pageSize: queryForm.pageSize,
      key: queryForm.key || undefined,
      dictValue: queryForm.key || undefined,
    })
    list.value = data.list || []
    total.value = Number(data.total || 0)
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载字典失败', 'error', 'hey')
  } finally {
    listLoading.value = false
    await nextTick()
    tableRef.value?.doLayout()
  }
}

const handleSizeChange = (value: number) => {
  queryForm.pageSize = value
  fetchData()
}

const handleCurrentChange = (value: number) => {
  queryForm.pageNo = value
  fetchData()
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchData()
}

const resetQueryForm = () => {
  queryForm.key = ''
  queryForm.pageNo = 1
  fetchData()
}

onActivated(() => {
  tableRef.value?.doLayout()
})

watch(
  () => route.meta.dictBiz,
  () => {
    queryForm.pageNo = 1
    queryForm.key = ''
    fetchData()
  }
)

watch(tableMaxHeight, async () => {
  await nextTick()
  tableRef.value?.doLayout()
})

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

.dictionary-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }

  .code-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    vertical-align: middle;
  }

  .code-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 2px;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    :deep(.vab-query-form) {
      .el-form-item {
        margin-right: 8px;
      }
    }

    :deep(.el-table) {
      width: 100%;
    }
  }
}
</style>
