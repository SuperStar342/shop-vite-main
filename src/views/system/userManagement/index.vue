<template>
  <div class="user-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.username" clearable placeholder="请输入用户名" />
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

    <el-table ref="tableRef" v-loading="listLoading" border :data="list" row-key="id" @selection-change="setSelectRows">
      <el-table-column type="selection" width="40" />
      <el-table-column align="center" label="序号" width="55">
        <template #default="{ $index }">
          {{ $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="头像" width="80">
        <template #default="{ row }">
          <el-avatar :icon="UserFilled" :size="40" :src="toOssPreviewUrl(row.avatar)">
            <template #icon>
              <user-filled />
            </template>
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('username')" align="center" label="账号" min-width="120" prop="username" show-overflow-tooltip />
      <el-table-column v-if="visible('name')" align="center" label="姓名" min-width="120" prop="name" show-overflow-tooltip />
      <el-table-column v-if="visible('deptName')" align="center" label="所属部门" min-width="150" prop="deptName" show-overflow-tooltip />
      <el-table-column align="center" label="角色" min-width="155">
        <template #default="{ row }">
          <el-space wrap>
            <el-tag v-for="(item, index) in row.roles" :key="index">
              {{ item }}
            </el-tag>
          </el-space>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('email')" align="center" label="邮箱" min-width="150" prop="email" show-overflow-tooltip />
      <el-table-column v-if="visible('phone')" align="center" label="手机号" min-width="130" prop="phone" show-overflow-tooltip />
      <el-table-column v-if="visible('usertype')" align="center" label="用户平台" min-width="100" prop="usertype" show-overflow-tooltip />
      <el-table-column align="center" label="性别" min-width="80">
        <template #default="{ row }">
          {{ row.sexLabel || row.sex }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="状态" min-width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 || row.status === '已启用' ? 'success' : 'danger'">
            {{ row.statusLabel || (row.status === 1 ? '已启用' : '已停用') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('datetime')" align="center" label="修改时间" min-width="160" prop="datetime" show-overflow-tooltip />
      <el-table-column align="center" label="操作" width="140">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="handleRowDelete(row)">删除</el-button>
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
    <user-management-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import UserManagementEdit from './vabAutoComponents/UserManagementEdit.vue'
import { doDelete, getList } from '/@/api/userManagement'
import { toOssPreviewUrl } from '/@/utils/ossUrl'
import { useListColumns } from '/@/hooks/useListColumns'

defineOptions({
  name: 'UserManagement',
})

const { visible } = useListColumns('UserManagement')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any>([])
const listLoading = ref<boolean>(true)

const total = ref<number>(0)
const selectRows = ref<any>([])
const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  username: '',
})

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const getRowId = (row: any) => {
  const id = row?.id ?? row?.userId
  return id === undefined || id === null || id === '' ? '' : String(id)
}

const runDelete = async (ids: string) => {
  const idSet = new Set(
    String(ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const { msg, success }: any = await doDelete({ ids })
  if (success === false) {
    throw new Error(msg || '删除失败')
  }
  // 数据库删除成功后，直接从列表变量剔除，不再重新查询
  const before = list.value.length
  list.value = list.value.filter((item: any) => !idSet.has(getRowId(item)))
  const removed = before - list.value.length
  total.value = Math.max(0, Number(total.value) - removed)
  selectRows.value = selectRows.value.filter((item: any) => !idSet.has(getRowId(item)))
  tableRef.value?.clearSelection?.()
  $baseMessage(msg || '删除成功', 'success', 'hey')
}

const handleRowDelete = (row: any) => {
  const id = getRowId(row)
  if (!id) {
    $baseMessage('无法获取用户ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前用户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await runDelete(id)
    } catch (e: any) {
      $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
    }
  }).catch(() => {})
}

const handleBatchDelete = () => {
  if (!selectRows.value.length) {
    $baseMessage('您未选中任何行', 'warning', 'hey')
    return
  }
  const ids = selectRows.value
    .map((item: any) => getRowId(item))
    .filter(Boolean)
    .join(',')
  if (!ids) {
    $baseMessage('选中数据缺少用户ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除选中用户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await runDelete(ids)
    } catch (e: any) {
      $baseMessage(e?.message || e?.msg || '删除失败', 'error', 'hey')
    }
  }).catch(() => {})
}

const handleAdd = () => {
  editRef.value.showEdit()
}

const handleEdit = (row: any = {}) => {
  editRef.value.showEdit(row)
}

const handleSizeChange = (value: number) => {
  queryForm.pageNo = 1
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

const fetchData = async () => {
  listLoading.value = true
  const { data } = await getList(queryForm)
  list.value = data.list
  total.value = data.total
  listLoading.value = false
}

const resetQueryForm = () => {
  ;(Object.keys(queryForm) as (keyof typeof queryForm)[]).forEach((key) => {
    if (key !== 'pageNo' && key !== 'pageSize') queryForm[key] = '' as never
  })
  queryForm.pageNo = 1
  queryData()
}

onActivated(() => {
  tableRef.value?.doLayout()
})

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';

.user-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }
}
</style>
