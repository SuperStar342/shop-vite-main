<template>
  <vab-dialog
    v-model="dialogVisible"
    append-to-body
    class="dictionary-config-dialog"
    :title="dialogTitle"
    :width="dialogWidth"
    @close="handleClose"
  >
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加字典项</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.dictValue" clearable placeholder="字典名称" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">搜索</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" @click="resetQueryForm">清空</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-right-panel>
    </vab-query-form>

    <el-table
      ref="tableRef"
      v-loading="listLoading"
      border
      :data="list"
      :max-height="configTableMaxHeight"
      row-key="id"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column align="center" label="序号" width="55">
        <template #default="{ $index }">
          {{ $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column align="left" label="字典编号" min-width="140" prop="code" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="code-cell">
            <span class="code-text">{{ row.code || '-' }}</span>
            <el-button
              class="copy-btn"
              :icon="DocumentCopy"
              link
              title="复制编码"
              type="primary"
              @click.stop="handleCopyCode(row)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column align="center" label="字典名称" min-width="140" prop="dictValue" show-overflow-tooltip />
      <el-table-column align="center" label="字典键值" min-width="120" prop="dictKey" show-overflow-tooltip />
      <el-table-column align="center" label="排序" prop="sort" width="80" />
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
      <el-table-column align="center" label="备注" min-width="120" prop="remark" show-overflow-tooltip />
      <el-table-column align="center" fixed="right" label="操作" width="180">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleAddChild(row)">子项</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无字典项，点击「添加字典项」新增" />
      </template>
    </el-table>

    <dictionary-management-edit ref="editRef" @fetch-data="fetchData" />
  </vab-dialog>
</template>

<script lang="ts" setup>
import { Delete, DocumentCopy, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { DICT_API_KEY, systemDictApi } from '/@/api/dictionaryManagement'
import handleClipboard from '/@/utils/clipboard'
import { removeFromList, toIdSet } from '/@/utils/listMutate'
import { $baseMessage } from '/@/hooks'
import DictionaryManagementEdit from './DictionaryManagementEdit.vue'

defineOptions({
  name: 'DictionaryConfig',
})

const dictApi = inject(DICT_API_KEY, systemDictApi)
const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const list = ref<any[]>([])
const listLoading = ref(false)
const selectRows = ref<any[]>([])
const parentId = ref('')
const parentCode = ref('')
const parentLabel = ref('')

const { width: windowWidth, height: windowHeight } = useWindowSize()
const dialogWidth = computed(() => (windowWidth.value < 960 ? '96vw' : '900px'))
const configTableMaxHeight = computed(() => Math.max(220, Math.min(480, windowHeight.value - 260)))

const queryForm = reactive<any>({
  dictValue: '',
})

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const fetchData = async () => {
  if (!parentId.value) {
    list.value = []
    return
  }
  listLoading.value = true
  try {
    const { data } = await dictApi.getChildList({
      parentId: parentId.value,
      code: parentCode.value,
      dictValue: queryForm.dictValue || undefined,
    })
    list.value = data.list || []
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || e?.msg || '加载字典项失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const showConfig = (row: any) => {
  parentId.value = String(row.id || '')
  parentCode.value = row.code || ''
  parentLabel.value = row.dictValue || row.label || row.dictName || '字典'
  dialogTitle.value = `[${parentLabel.value}] 字典配置`
  dialogVisible.value = true
  queryForm.dictValue = ''
  fetchData()
}

defineExpose({ showConfig })

const handleClose = () => {
  dialogVisible.value = false
  // 关闭配置窗时不强制刷新父列表；字典分类数据未变
}

const handleAdd = () => {
  editRef.value.showEdit({
    isChild: true,
    parentId: parentId.value,
    code: parentCode.value,
    parentLabel: parentLabel.value,
    sort: 0,
    isSealed: 0,
  })
}

/** 在某个字典项下再挂子项（同 code，parentId 指向该项） */
const handleAddChild = (row: any) => {
  editRef.value.showEdit({
    isChild: true,
    parentId: row.id,
    code: row.code || parentCode.value,
    parentLabel: row.dictValue || parentLabel.value,
    sort: 0,
    isSealed: 0,
  })
}

const handleEdit = (row: any) => {
  editRef.value.showEdit({
    ...row,
    isChild: true,
    parentId: row.parentId || parentId.value,
    parentLabel: parentLabel.value,
  })
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

/** 切换 status / isSealed，成功才允许开关变位 */
const beforeToggleField = (row: any, field: 'status' | 'isSealed') => {
  if (!row?.id) return false
  const loadingKey = field === 'status' ? '_statusLoading' : '_sealLoading'
  if (row[loadingKey]) return false

  const current = Number(row[field] ?? (field === 'status' ? 1 : 0))
  const next = current === 1 ? 0 : 1

  return new Promise<boolean>((resolve) => {
    row[loadingKey] = true
    dictApi.doEdit({
      id: row.id,
      parentId: row.parentId || parentId.value,
      code: row.code || parentCode.value,
      dictKey: row.dictKey,
      dictValue: row.dictValue,
      sort: row.sort ?? 0,
      remark: row.remark || '',
      isSealed: field === 'isSealed' ? next : Number(row.isSealed ?? 0),
      status: field === 'status' ? next : Number(row.status ?? 1),
      isChild: true,
    })
      .then(({ msg, success }: any) => {
        if (success === false) throw new Error(msg || '更新失败')
        // 勿提前改 row[field]，否则与 el-switch before-change 二次切换导致看起来没变
        const tip =
          field === 'status'
            ? next === 1
              ? '已启用'
              : '已禁用'
            : next === 1
              ? '已封存'
              : '已取消封存'
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

const handleDelete = (row: any) => {
  if (!row.id) {
    $baseMessage('无法获取字典项 ID，请刷新后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('确定删除当前字典项吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await dictApi.doDelete({ ids: row.id })
        if (success === false) throw new Error(msg || '删除失败')
        const idSet = toIdSet(row.id)
        list.value = removeFromList(list.value, idSet)
        selectRows.value = selectRows.value.filter((r) => !idSet.has(String(r.id)))
        tableRef.value?.clearSelection?.()
        $baseMessage(msg || '删除成功', 'success', 'hey')
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
    .map((item: any) => item.id)
    .filter(Boolean)
    .join(',')
  if (!ids) {
    $baseMessage('选中数据缺少 ID，请刷新后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('确定删除选中的字典项吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await dictApi.doDelete({ ids })
        if (success === false) throw new Error(msg || '删除失败')
        const idSet = toIdSet(ids)
        list.value = removeFromList(list.value, idSet)
        selectRows.value = []
        tableRef.value?.clearSelection?.()
        $baseMessage(msg || '删除成功', 'success', 'hey')
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const queryData = () => {
  fetchData()
}

const resetQueryForm = () => {
  queryForm.dictValue = ''
  fetchData()
}
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

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
</style>

<style lang="scss">
.dictionary-config-dialog {
  .el-dialog__body {
    max-height: calc(100vh - 140px);
    overflow: auto;
  }

  @media (max-width: 768px) {
    .el-dialog {
      margin: 4vh auto !important;
    }
  }
}
</style>
