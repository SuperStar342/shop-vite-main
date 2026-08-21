<template>
  <div class="department-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd()">添加部门</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
        <el-button :icon="expandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ expandAll ? '全部折叠' : '全部展开' }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.deptName" clearable placeholder="部门名称" />
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
      class="dept-table"
      :data="list"
      :default-expand-all="expandAll"
      :indent="22"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="42" />
      <el-table-column v-if="visible('deptName')" align="left" label="部门名称" min-width="220">
        <template #default="{ row }">
          <span class="dept-name-cell">
            <el-icon class="dept-icon" :class="{ 'is-root': isTop(row.parentId) }">
              <OfficeBuilding />
            </el-icon>
            <span class="dept-name-text" :title="displayDeptName(row)">{{ displayDeptName(row) }}</span>
            <el-tag v-if="row.hasChildren" class="child-tag" size="small" type="info">
              {{ countChildren(row) }} 个子部门
            </el-tag>
          </span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="上级部门" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag v-if="isTop(row.parentId)" size="small" type="info">顶级</el-tag>
          <span v-else>{{ row.parentName || resolveParentName(row.parentId) }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="部门人数" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleShowUsers(row)">
            {{ row.userCount ?? 0 }} 人
          </el-button>
        </template>
      </el-table-column>
      <el-table-column align="left" label="部门成员" min-width="240">
        <template #default="{ row }">
          <div v-if="row.users?.length" class="dept-user-preview">
            <el-tooltip
              v-for="u in row.users.slice(0, 6)"
              :key="u.id"
              :content="userTooltip(u)"
              placement="top"
            >
              <el-avatar :size="28" :src="toOssPreviewUrl(u.avatar)" class="dept-user-avatar">
                {{ (u.name || u.username || '?').slice(0, 1) }}
              </el-avatar>
            </el-tooltip>
            <el-button v-if="row.users.length > 6" link type="primary" @click="handleShowUsers(row)">
              +{{ row.users.length - 6 }}
            </el-button>
          </div>
          <span v-else class="dept-user-empty">暂无成员</span>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('fullName')" align="center" label="全称" min-width="140" prop="fullName" show-overflow-tooltip />
      <el-table-column align="center" label="机构类型" min-width="100">
        <template #default="{ row }">
          <el-tag v-if="row.deptCategoryName" size="small">{{ row.deptCategoryName }}</el-tag>
          <span v-else>{{ row.deptCategory ?? '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('sort')" align="center" label="排序" prop="sort" width="70" />
      <el-table-column align="center" fixed="right" label="操作" width="220">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="success" @click="handleAdd(row)">子部门</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无部门数据" />
      </template>
    </el-table>

    <DepartmentManagementEdit ref="editRef" @saved="handleSaved" />

    <vab-dialog v-model="userDialogVisible" append-to-body :title="userDialogTitle" width="760px">
      <div v-loading="userDialogLoading">
        <el-table :data="deptUsers" border max-height="440">
          <el-table-column align="center" label="序号" type="index" width="56" />
          <el-table-column align="center" label="头像" width="70">
            <template #default="{ row }">
              <el-avatar :size="36" :src="toOssPreviewUrl(row.avatar)">
                {{ (row.name || row.username || '?').slice(0, 1) }}
              </el-avatar>
            </template>
          </el-table-column>
          <el-table-column align="center" label="姓名" min-width="100" prop="name" show-overflow-tooltip />
          <el-table-column align="center" label="账号" min-width="110" prop="username" show-overflow-tooltip />
          <el-table-column align="center" label="手机" min-width="120" prop="phone" show-overflow-tooltip />
          <el-table-column align="center" label="邮箱" min-width="140" prop="email" show-overflow-tooltip />
          <el-table-column align="center" label="角色" min-width="120" prop="roleName" show-overflow-tooltip />
          <el-table-column align="center" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 || row.status === '0' ? 'info' : 'success'" size="small">
                {{ row.statusLabel || (row.status === 0 || row.status === '0' ? '停用' : '启用') }}
              </el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="该部门暂无直属用户" />
          </template>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="userDialogVisible = false">关闭</el-button>
      </template>
    </vab-dialog>
  </div>
</template>

<script lang="ts" setup>
import {
  Delete,
  Expand,
  Fold,
  OfficeBuilding,
  Plus,
  Refresh,
  Search,
} from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doDelete, doEdit, getDeptUsers, getList } from '/@/api/departmentManagement'
import { useListColumns } from '/@/hooks/useListColumns'
import { toOssPreviewUrl } from '/@/utils/ossUrl'
import { createTreeTableSortable } from '/@/utils/treeTableSortable'
import DepartmentManagementEdit from './vabAutoComponents/DepartmentManagementEdit.vue'

defineOptions({
  name: 'DepartmentManagement',
})

const { visible } = useListColumns('DepartmentManagement')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const expandAll = ref(true)
const selectRows = ref<any[]>([])
const queryForm = reactive({ deptName: '' })

const userDialogVisible = ref(false)
const userDialogTitle = ref('')
const userDialogLoading = ref(false)
const deptUsers = ref<any[]>([])

const treeSortable = createTreeTableSortable({
  getTableEl: () => tableRef.value?.$el as HTMLElement | undefined,
  getList: () => list.value,
  setList: (next) => {
    list.value = next
  },
  onSorted: async (siblings) => {
    try {
      await Promise.all(
        siblings.map((row) =>
          doEdit({
            id: row.id,
            parentId: row.parentId,
            deptName: row.deptName,
            fullName: row.fullName || row.deptName,
            deptCategory: row.deptCategory ?? 1,
            sort: row.sort,
            remark: row.remark,
          })
        )
      )
      $baseMessage('排序已保存', 'success', 'hey')
    } catch {
      $baseMessage('排序保存失败', 'error', 'hey')
      fetchData()
    }
  },
})

const isTop = (parentId: any) => !parentId || parentId === '0' || parentId === 0

/** 部门名称展示：兼容 list/tree 不同字段，避免顶级节点空白 */
const displayDeptName = (row: any) => {
  const name = String(row?.deptName || row?.title || row?.label || row?.name || row?.fullName || '').trim()
  return name || '-'
}

const resolveParentName = (parentId: any) => {
  if (isTop(parentId)) return '顶级'
  const parent = findNode(list.value, String(parentId))
  return displayDeptName(parent) !== '-' ? displayDeptName(parent) : '未知'
}

const userTooltip = (u: any) => {
  const parts = [u.name || u.username]
  if (u.phone) parts.push(u.phone)
  if (u.email) parts.push(u.email)
  return parts.join(' · ')
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
    treeSortable.init()
  })
}

const removeFromTree = (nodes: any[], idSet: Set<string>): any[] => {
  return nodes
    .filter((n) => !idSet.has(String(n.id)))
    .map((n) => {
      if (!n.children?.length) return { ...n, hasChildren: false, children: undefined }
      const children = removeFromTree(n.children, idSet)
      return {
        ...n,
        children: children.length ? children : undefined,
        hasChildren: children.length > 0,
      }
    })
}

const findNode = (nodes: any[], id: string): any => {
  for (const n of nodes || []) {
    if (String(n.id) === String(id)) return n
    const found = findNode(n.children || [], id)
    if (found) return found
  }
  return null
}

const updateNodeInTree = (nodes: any[], id: string, patch: any): boolean => {
  for (let i = 0; i < nodes.length; i++) {
    if (String(nodes[i].id) === String(id)) {
      nodes[i] = { ...nodes[i], ...patch }
      return true
    }
    if (nodes[i].children?.length && updateNodeInTree(nodes[i].children, id, patch)) return true
  }
  return false
}

const insertChild = (parentId: string, node: any) => {
  if (isTop(parentId)) {
    list.value = [...list.value, node]
    return
  }
  const parent = findNode(list.value, parentId)
  if (!parent) {
    list.value = [...list.value, node]
    return
  }
  updateNodeInTree(list.value, parentId, {
    children: [...(parent.children || []), node],
    hasChildren: true,
  })
  list.value = [...list.value]
}

const buildLocalNode = (data: any) => {
  const parentId = data.parentId != null ? String(data.parentId) : '0'
  const parent = !isTop(parentId) ? findNode(list.value, parentId) : null
  return {
    id: String(data.id),
    parentId,
    parentName: parent?.deptName || (isTop(parentId) ? '顶级' : ''),
    deptName: data.deptName,
    fullName: data.fullName || data.deptName,
    deptCategory: data.deptCategory,
    deptCategoryName: data.deptCategoryName || '',
    sort: data.sort ?? 0,
    remark: data.remark || '',
    hasChildren: false,
    children: undefined,
    users: [],
    userCount: 0,
    label: data.deptName,
    value: String(data.id),
  }
}

const handleSaved = async (payload: { isEdit: boolean; data: any }) => {
  const data = payload?.data
  // 新增时后端常不回 id → 整表刷新；有 id 则本地插入/更新以便即时渲染
  if (!data?.id || data?.needReload) {
    await fetchData()
    return
  }
  if (payload.isEdit) {
    const parentId = String(data.parentId ?? '0')
    updateNodeInTree(list.value, String(data.id), {
      deptName: data.deptName,
      fullName: data.fullName,
      deptCategory: data.deptCategory,
      deptCategoryName: data.deptCategoryName || undefined,
      sort: data.sort,
      remark: data.remark,
      parentId,
      parentName: isTop(parentId)
        ? '顶级'
        : findNode(list.value, parentId)?.deptName || '未知',
    })
    list.value = [...list.value]
  } else {
    insertChild(String(data.parentId ?? '0'), buildLocalNode(data))
  }
  await nextTick()
  treeSortable.init()
}

const handleAdd = (parentRow?: any) => {
  if (parentRow?.id) {
    editRef.value.showEdit({ parentId: parentRow.id, parentName: parentRow.deptName })
  } else {
    editRef.value.showEdit()
  }
}

const handleEdit = (row: any) => {
  editRef.value.showEdit(row)
}

const handleShowUsers = async (row: any) => {
  if (!row?.id) return
  userDialogTitle.value = `${displayDeptName(row)}（${row.userCount ?? 0} 人）`
  userDialogVisible.value = true
  if (Array.isArray(row.users)) {
    deptUsers.value = row.users
    if (row.users.length || (row.userCount ?? 0) === 0) return
  }
  userDialogLoading.value = true
  try {
    const { data } = await getDeptUsers(String(row.id))
    deptUsers.value = data.list || []
    updateNodeInTree(list.value, String(row.id), {
      users: deptUsers.value,
      userCount: deptUsers.value.length,
    })
    list.value = [...list.value]
  } catch (e: any) {
    deptUsers.value = []
    $baseMessage(e?.message || e?.msg || '加载人员失败', 'error', 'hey')
  } finally {
    userDialogLoading.value = false
  }
}

const handleDelete = (row: any) => {
  if (!row?.id) return
  if (row.hasChildren) {
    $baseMessage('请先删除子部门后再删除该部门', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm(`确定删除部门「${displayDeptName(row)}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg }: any = await doDelete({ ids: row.id })
        list.value = removeFromTree(list.value, new Set([String(row.id)]))
        selectRows.value = selectRows.value.filter((r) => String(r.id) !== String(row.id))
        editRef.value?.close?.()
        $baseMessage(msg, 'success', 'hey')
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
    $baseMessage('选中项中包含有子部门的部门，请先删除子部门', 'warning', 'hey')
    return
  }
  const idList = selectRows.value.map((item) => String(item.id)).filter(Boolean)
  ElMessageBox.confirm('确定删除选中部门吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg }: any = await doDelete({ ids: idList.join(',') })
        list.value = removeFromTree(list.value, new Set(idList))
        selectRows.value = []
        editRef.value?.close?.()
        $baseMessage(msg, 'success', 'hey')
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await getList({ deptName: queryForm.deptName })
    list.value = data.list || []
    await nextTick()
    treeSortable.init()
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || e?.msg || '加载部门失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const queryData = () => fetchData()

const resetQueryForm = () => {
  queryForm.deptName = ''
  fetchData()
}

onActivated(() => {
  tableRef.value?.doLayout()
  nextTick(() => treeSortable.init())
})
onBeforeMount(() => fetchData())
onBeforeUnmount(() => treeSortable.destroy())
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

.department-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }

  /* 展开箭头固定在部门名称左侧：indent → expand → 名称内容 */
  .dept-table {
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

    :deep(.dept-name-cell) {
      order: 3;
      min-width: 0;
    }
  }
}

.dept-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  vertical-align: middle;
}

.dept-icon {
  flex-shrink: 0;
  color: #909399;

  &.is-root {
    color: var(--el-color-primary);
  }
}

.dept-name-text {
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

.dept-user-preview {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-height: 28px;
}

.dept-user-avatar {
  cursor: default;
  border: 1px solid var(--el-border-color-lighter);
}

.dept-user-empty {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

:deep(.el-table__body tr) {
  cursor: grab;
}

:deep(.el-table__body tr.sortable-chosen),
:deep(.el-table__body tr.sortable-drag) {
  cursor: grabbing;
}

:deep(.sortable-ghost) {
  background-color: var(--el-color-primary-light-9) !important;
  opacity: 0.75;
}

:deep(.sortable-chosen) {
  background-color: var(--el-fill-color-light) !important;
}

:deep(.sortable-drag) {
  opacity: 0.95;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
