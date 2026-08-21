<template>
  <div class="role-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd()">添加角色</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
        <el-button :icon="expandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ expandAll ? '全部折叠' : '全部展开' }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.roleName" clearable placeholder="角色名称" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">查询</el-button>
            <el-button :icon="Refresh" @click="resetQueryForm">重置</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-right-panel>
    </vab-query-form>

    <el-table
      ref="tableRef"
      v-loading="listLoading"
      border
      class="role-table"
      :data="list"
      :default-expand-all="expandAll"
      :indent="22"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="42" />
      <el-table-column v-if="visible('roleName')" align="left" label="角色名称" min-width="240">
        <template #default="{ row }">
          <span class="role-name-cell">
            <el-icon class="role-icon" :class="{ 'is-root': isTopRole(row.parentId) }">
              <UserFilled />
            </el-icon>
            <span class="role-name-text" :title="displayRoleName(row)">{{ displayRoleName(row) }}</span>
            <el-tag v-if="row.hasChildren" class="child-tag" size="small" type="info">
              {{ countChildren(row) }} 个子角色
            </el-tag>
          </span>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('tenantName')" align="center" label="所属租户" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.tenantName || row.tenantId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="visible('roleAlias')"
        align="center"
        label="角色别名"
        min-width="120"
        prop="roleAlias"
        show-overflow-tooltip
      />
      <el-table-column v-if="visible('parentName')" align="center" label="上级角色" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag v-if="isTopRole(row.parentId)" size="small" type="info">顶级</el-tag>
          <span v-else>{{ row.parentName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('sort')" align="center" label="排序" prop="sort" width="80" />
      <el-table-column align="center" fixed="right" label="操作" width="260">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="success" @click="handleAdd(row)">子角色</el-button>
            <el-button link type="warning" @click="handlePermissionConfig(row)">权限</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无角色数据" />
      </template>
    </el-table>

    <RoleManagementEdit ref="editRef" @fetch-data="fetchData" />
    <RolePermissionConfig ref="permissionConfigRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Expand, Fold, Plus, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doDelete, getList } from '/@/api/roleManagement'
import { useListColumns } from '/@/hooks/useListColumns'
import { removeFromTree, toIdSet } from '/@/utils/listMutate'
import RoleManagementEdit from './vabAutoComponents/RoleManagementEdit.vue'
import RolePermissionConfig from './vabAutoComponents/RolePermissionConfig.vue'

defineOptions({
  name: 'RoleManagement',
})

const { visible } = useListColumns('RoleManagement')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const permissionConfigRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const expandAll = ref(true)
const selectRows = ref<any[]>([])
const queryForm = reactive({
  roleName: '',
})

const isTopRole = (parentId: any) => !parentId || parentId === '0' || parentId === 0

const displayRoleName = (row: any) => {
  const name = String(row?.roleName || row?.title || row?.label || row?.roleAlias || '').trim()
  return name || '-'
}

const countChildren = (row: any): number => {
  if (!Array.isArray(row?.children) || !row.children.length) return 0
  return row.children.reduce((sum: number, c: any) => sum + 1 + countChildren(c), 0)
}

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const walkRows = (rows: any[], fn: (row: any) => void) => {
  rows.forEach((row) => {
    fn(row)
    if (row.children?.length) walkRows(row.children, fn)
  })
}

const toggleExpandAll = () => {
  expandAll.value = !expandAll.value
  nextTick(() => {
    walkRows(list.value, (row) => {
      tableRef.value?.toggleRowExpansion(row, expandAll.value)
    })
  })
}

const handleAdd = (parentRow?: any) => {
  if (parentRow?.id) {
    editRef.value?.showEdit({
      parentId: String(parentRow.id),
      parentName: parentRow.roleName || '',
    })
  } else {
    editRef.value?.showEdit({})
  }
}

const handleEdit = (row: any) => {
  editRef.value?.showEdit(row)
}

const handlePermissionConfig = (row: any) => {
  if (!row?.id) {
    $baseMessage('无法获取角色信息', 'warning', 'hey')
    return
  }
  permissionConfigRef.value?.showConfig(row)
}

const handleDelete = (row: any) => {
  if (!row?.id) return
  if (row.hasChildren) {
    $baseMessage('该角色下还有子角色，请先删除子角色', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm(`确定删除角色「${displayRoleName(row)}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await doDelete({ ids: row.id })
        if (success === false) throw new Error(msg || '删除失败')
        list.value = removeFromTree(list.value, toIdSet(row.id))
        selectRows.value = selectRows.value.filter((r) => String(r.id) !== String(row.id))
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
  if (selectRows.value.some((item) => item.hasChildren)) {
    $baseMessage('选中项中包含有子角色的角色，无法删除', 'warning', 'hey')
    return
  }
  const ids = selectRows.value
    .map((item) => item.id)
    .filter(Boolean)
    .join(',')
  ElMessageBox.confirm('确定删除选中角色吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await doDelete({ ids })
        if (success === false) throw new Error(msg || '删除失败')
        list.value = removeFromTree(list.value, toIdSet(ids))
        selectRows.value = []
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
    const { data } = await getList(queryForm)
    list.value = data.list || []
    selectRows.value = []
    await nextTick()
    if (expandAll.value) {
      walkRows(list.value, (row) => tableRef.value?.toggleRowExpansion(row, true))
    }
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || e?.msg || '加载角色失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const queryData = () => fetchData()

const resetQueryForm = () => {
  queryForm.roleName = ''
  fetchData()
}

onActivated(() => {
  tableRef.value?.doLayout()
})
onBeforeMount(() => fetchData())
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

.role-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }

  .role-table {
    :deep(.el-table__body td.el-table__cell:nth-child(2) > .cell) {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
    }

    :deep(.el-table__indent) {
      flex-shrink: 0;
      order: 1;
    }

    :deep(.el-table__placeholder) {
      flex-shrink: 0;
      order: 2;
      width: 20px;
      height: 20px;
      margin-right: 6px;
    }

    :deep(.el-table__expand-icon) {
      flex-shrink: 0;
      order: 2;
      width: 20px;
      height: 20px;
      margin-right: 6px;
      border-radius: 4px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    :deep(.role-name-cell) {
      order: 3;
      min-width: 0;
    }
  }
}

.role-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  vertical-align: middle;
}

.role-icon {
  flex-shrink: 0;
  color: #909399;

  &.is-root {
    color: var(--el-color-primary);
  }
}

.role-name-text {
  flex: 0 1 auto;
  min-width: 2em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.child-tag {
  flex-shrink: 0;
  margin-left: 4px;
}
</style>
