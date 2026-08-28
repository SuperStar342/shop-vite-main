<template>
  <div class="tenant-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加租户</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.tenantName" clearable placeholder="请输入租户名称" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.tenantCode" clearable placeholder="请输入租户ID" />
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
      <el-table-column v-if="visible('tenantId')" align="center" label="tenantId" min-width="120" prop="tenantId" show-overflow-tooltip />
      <el-table-column v-if="visible('tenantName')" align="center" label="租户名称" min-width="150" prop="tenantName" show-overflow-tooltip />
      <el-table-column v-if="visible('linkMan')" align="center" label="联系人" min-width="100" prop="linkMan" show-overflow-tooltip />
      <el-table-column v-if="visible('contactNumber')" align="center" label="联系电话" min-width="130" prop="contactNumber" show-overflow-tooltip />
      <el-table-column v-if="visible('address')" align="center" label="联系邮箱" min-width="150" prop="address" show-overflow-tooltip />
      <el-table-column align="center" label="租户域名" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="domain-cell">
            <span class="domain-text">{{ row.domainUrl || '-' }}</span>
            <el-button
              v-if="row.domainUrl"
              class="copy-btn"
              :icon="DocumentCopy"
              link
              title="复制域名"
              type="primary"
              @click.stop="handleCopyDomain(row)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('expireTime')" align="center" label="过期时间" min-width="140" prop="expireTime" show-overflow-tooltip />
      <el-table-column v-if="visible('accountNumber')" align="center" label="账户额度" min-width="140" prop="accountNumber" show-overflow-tooltip />
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
    <tenant-management-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, DocumentCopy, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doDelete, getList } from '/@/api/tenantManagement'
import { $baseMessage } from '/@/hooks'
import { useListColumns } from '/@/hooks/useListColumns'
import handleClipboard from '/@/utils/clipboard'

defineOptions({
  name: 'TenantManagement',
})

const { visible } = useListColumns('TenantManagement')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any>([])
const listLoading = ref<boolean>(true)

const total = ref<number>(0)
const selectRows = ref<any>([])
const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  tenantName: '',
  tenantCode: '',
})

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const getRowId = (row: any) => {
  const id = row?.id ?? row?.tenantId
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
    $baseMessage('无法获取租户ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前租户吗？', '提示', {
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
    .map((item: any) => getRowId(item))
    .filter(Boolean)
    .join(',')
  if (!ids) {
    $baseMessage('选中数据缺少租户ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除选中租户吗？', '提示', {
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

const handleAdd = () => {
  editRef.value.showEdit()
}

const handleEdit = (row: any = {}) => {
  editRef.value.showEdit(row)
}

const handleCopyDomain = (row: any) => {
  const domain = String(row?.domainUrl || '').trim()
  if (!domain) {
    $baseMessage('暂无域名可复制', 'warning', 'hey')
    return
  }
  handleClipboard(domain)
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
  try {
    const { data } = await getList(queryForm)
    list.value = data.list
    total.value = data.total
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载租户列表失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
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

.tenant-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }

  .domain-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
  }

  .domain-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 4px;
  }
}
</style>
