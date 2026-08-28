<template>
  <div class="menu-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd()">添加菜单</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
<!--        <el-button :loading="syncLoading" type="warning" @click="handleSync">从路由导入库表</el-button>-->
        <el-button :icon="expandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ expandAll ? '全部折叠' : '全部展开' }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.name" clearable placeholder="菜单名称" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.code" clearable placeholder="菜单编号" />
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
      class="menu-table"
      :data="list"
      :default-expand-all="expandAll"
      :indent="28"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column v-if="visible('name')" label="菜单名称" min-width="280" prop="name" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="menu-name-cell">
            <span class="menu-icon-box" :class="{ 'is-empty': !menuIcon(row) }">
              <i v-if="isIconfont(menuIcon(row))" :class="menuIcon(row)" />
              <vab-icon v-else-if="menuIcon(row)" :icon="menuIcon(row)" />
              <el-icon v-else :size="14"><menu /></el-icon>
            </span>
            <span class="menu-title">{{ row.name || row.meta?.title || '-' }}</span>
            <el-tag
              v-if="(row.childCount || row.children?.length) > 0"
              class="child-tag"
              effect="plain"
              round
              size="small"
              type="info"
            >
              {{ row.childCount || row.children.length }} 子项
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column align="center" label="图标" width="80">
        <template #default="{ row }">
          <span class="source-icon">
            <i v-if="isIconfont(menuIcon(row))" :class="menuIcon(row)" />
            <vab-icon v-else-if="menuIcon(row)" :icon="menuIcon(row)" />
            <span v-else class="text-muted">-</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('code')" align="center" label="编号" min-width="120" prop="code" show-overflow-tooltip />
      <el-table-column v-if="visible('path')" align="center" label="路由" min-width="140" prop="path" show-overflow-tooltip />
      <el-table-column v-if="visible('component')" align="center" label="组件" min-width="140" prop="component" show-overflow-tooltip />
      <el-table-column align="center" label="类型" width="90">
        <template #default="{ row }">
          <el-tag effect="light" round size="small" :type="menuTypeMeta(row).type">
            {{ menuTypeMeta(row).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('sort')" align="center" label="排序" prop="sort" width="70" />
      <el-table-column align="center" fixed="right" label="操作" width="200">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="Number(row.category) !== 2"
              link
              type="success"
              @click="handleAdd(row)"
            >
              子项
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无菜单数据" />
      </template>
    </el-table>

    <menu-management-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Expand, Fold, Menu, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { remove, getList } from '/@/api/system/menu'
import { $baseMessage } from '/@/hooks'
import { useListColumns } from '/@/hooks/useListColumns'
import { removeFromTree, toIdSet } from '/@/utils/listMutate'
import MenuManagementEdit from './vabAutoComponents/MenuManagementEdit.vue'

defineOptions({
  name: 'MenuManagement',
})

const { visible } = useListColumns('MenuManagement')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const syncLoading = ref(false)
const expandAll = ref(true)
const selectRows = ref<any[]>([])
const queryForm = reactive({
  name: '',
  code: '',
})

const setSelectRows = (rows: any[]) => {
  selectRows.value = rows
}

const hasChildNodes = (row: any) => !!(row?.hasChildren || (row?.children && row.children.length))

const isIconfont = (icon?: string) => {
  if (!icon) return false
  return /iconfont|iconicon_|icon-/i.test(icon)
}

const menuIcon = (row: any) => row?.source || row?.meta?.icon || ''

const menuTypeMeta = (row: any) => {
  const category = Number(row?.category)
  if (category === 2 || String(row?.categoryName || '').includes('按钮')) {
    return { label: '按钮', type: 'warning' as const }
  }
  return { label: row?.categoryName || '菜单', type: 'success' as const }
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

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data }: any = await getList({
      name: queryForm.name || undefined,
      code: queryForm.code || undefined,
    })
    list.value = data?.list || []
    if (expandAll.value) {
      nextTick(() => {
        walkRows(list.value, (row) => {
          tableRef.value?.toggleRowExpansion(row, true)
        })
      })
    }
  } finally {
    listLoading.value = false
  }
}

const queryData = () => {
  fetchData()
}

const resetQueryForm = () => {
  queryForm.name = ''
  queryForm.code = ''
  fetchData()
}

/** 添加顶级 / 在某菜单下添加子项 */
const handleAdd = (parentRow?: any) => {
  if (parentRow?.id) {
    editRef.value.showEdit({
      parentId: parentRow.id,
      lockParent: true,
    })
  } else {
    editRef.value.showEdit()
  }
}

const handleEdit = (row: any) => {
  editRef.value.showEdit(row)
}

const handleDelete = (row: any) => {
  if (!row?.id) return
  if (hasChildNodes(row)) {
    $baseMessage('请先删除子节点', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm(`确定删除菜单「${row.name || row.meta?.title || row.id}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const { msg, success }: any = await remove({ ids: row.id })
      if (success === false) throw new Error(msg || '删除失败')
      list.value = removeFromTree(list.value, toIdSet(row.id))
      selectRows.value = selectRows.value.filter((r) => String(r.id) !== String(row.id))
      tableRef.value?.clearSelection?.()
      $baseMessage(msg || '删除成功', 'success', 'hey')
    } catch (e: any) {
      $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
    }
  })
}

/** 批量删除：仅允许叶子节点；父子同选时需先删子再删父 */
const handleBatchDelete = () => {
  if (!selectRows.value.length) {
    $baseMessage('您未选中任何行', 'warning', 'hey')
    return
  }
  const withChildren = selectRows.value.filter(hasChildNodes)
  if (withChildren.length) {
    const names = withChildren
      .slice(0, 3)
      .map((r) => r.name || r.meta?.title || r.id)
      .join('、')
    $baseMessage(
      `请先删除子节点后再删父菜单（含未展开子项）：${names}${withChildren.length > 3 ? ' 等' : ''}`,
      'warning',
      'hey'
    )
    return
  }
  const ids = selectRows.value
    .map((item) => item.id)
    .filter(Boolean)
    .join(',')
  if (!ids) {
    $baseMessage('选中数据缺少菜单 ID，请刷新后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm(`确定删除选中的 ${selectRows.value.length} 个菜单吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const { msg, success }: any = await remove({ ids })
        if (success === false) throw new Error(msg || '删除失败')
        list.value = removeFromTree(list.value, toIdSet(ids))
        selectRows.value = []
        tableRef.value?.clearSelection?.()
        $baseMessage(msg || '删除成功', 'success', 'hey')
      } catch (e: any) {
        $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
      }
    })
    .catch(() => {})
}

// /** 把前端 router 菜单写入数据库（初始化/对齐用，不是日常查询） */
// const handleSync = async () => {
//   try {
//     await ElMessageBox.confirm(
//       '将把前端工程里配置的路由菜单写入数据库 blade_menu（已存在则按编号更新）。写入后本页列表会显示库表数据。是否继续？',
//       '从路由导入库表',
//       { type: 'warning', confirmButtonText: '导入', cancelButtonText: '取消' }
//     )
//   } catch {
//     return
//   }
//   syncLoading.value = true
//   try {
//     const res: any = await syncCurrentMenusToBackend()
//     $baseMessage(res?.msg || '导入完成', 'success', 'hey')
//     await fetchData()
//   } catch (e: any) {
//     $baseMessage(e?.message || e?.msg || '导入失败', 'error', 'hey')
//   } finally {
//     syncLoading.value = false
//   }
// }

onActivated(() => {
  tableRef.value?.doLayout()
})

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

.menu-management-container {
  .menu-table {
    width: 100%;

    :deep(.el-table__header th) {
      background: var(--el-fill-color-light);
      font-weight: 600;
    }

    :deep(.el-table__expand-icon) {
      width: 20px;
      height: 20px;
      margin-right: 6px;
      border-radius: 4px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  .menu-name-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    min-width: 0;
    vertical-align: middle;
  }

  .menu-icon-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-size: 14px;

    &.is-empty {
      border-style: dashed;
      border-color: var(--el-border-color);
      background: var(--el-fill-color-light);
      color: var(--el-text-color-placeholder);
    }
  }

  .menu-title {
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .child-tag {
    flex-shrink: 0;
  }

  .source-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: var(--el-color-primary);
  }

  .text-muted {
    color: var(--el-text-color-placeholder);
  }
}
</style>
