<template>
  <div class="api-scope-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加接口权限</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.resourceCode" clearable placeholder="权限编号" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.scopeName" clearable placeholder="权限名称" />
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
      <el-table-column v-if="visible('scopeName')" align="center" label="权限名称" min-width="140" prop="scopeName" show-overflow-tooltip />
      <el-table-column v-if="visible('resourceCode')" align="center" label="权限编号" min-width="160" prop="resourceCode" show-overflow-tooltip />
      <el-table-column v-if="visible('scopePath')" align="center" label="权限路径" min-width="200" prop="scopePath" show-overflow-tooltip />
      <el-table-column align="center" label="接口类型" min-width="120">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.scopeTypeName || scopeTypeLabel(row.scopeType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="visible('remark')" align="center" label="备注" min-width="140" prop="remark" show-overflow-tooltip />
      <el-table-column align="center" label="操作" width="140">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="handleRowDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无接口权限规则" />
      </template>
    </el-table>

    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />

    <api-scope-edit ref="editRef" :scope-type-options="scopeTypeOptions" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doDeleteApiScope, getApiScopeList, getScopeTypeDict } from '/@/api/permission'
import { useListColumns } from '/@/hooks/useListColumns'

defineOptions({
  name: 'ApiScope',
})

const { visible } = useListColumns('ApiScope')

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const total = ref(0)
const selectRows = ref<any[]>([])
const scopeTypeOptions = ref<{ label: string; value: number }[]>([])

const queryForm = reactive({
  pageNo: 1,
  pageSize: 20,
  resourceCode: '',
  scopeName: '',
})

const scopeTypeLabel = (type?: number) => {
  const hit = scopeTypeOptions.value.find((o) => o.value === Number(type))
  return hit?.label || (type != null ? String(type) : '-')
}

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const getRowId = (row: any) => (row?.id != null && row.id !== '' ? String(row.id) : '')

const runDelete = async (ids: string) => {
  const idSet = new Set(String(ids).split(',').map((s) => s.trim()).filter(Boolean))
  const { msg, success }: any = await doDeleteApiScope({ ids })
  if (success === false) throw new Error(msg || '删除失败')
  const before = list.value.length
  list.value = list.value.filter((item) => !idSet.has(getRowId(item)))
  total.value = Math.max(0, Number(total.value) - (before - list.value.length))
  selectRows.value = selectRows.value.filter((item) => !idSet.has(getRowId(item)))
  tableRef.value?.clearSelection?.()
  $baseMessage(msg || '删除成功', 'success', 'hey')
}

const handleAdd = () => editRef.value?.showEdit()
const handleEdit = (row: any) => editRef.value?.showEdit(row)

const handleRowDelete = (row: any) => {
  const id = getRowId(row)
  if (!id) return $baseMessage('无法获取ID', 'warning', 'hey')
  ElMessageBox.confirm('确定删除该接口权限？', '提示', { type: 'warning' })
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
  if (!selectRows.value.length) return $baseMessage('您未选中任何行', 'warning', 'hey')
  const ids = selectRows.value.map(getRowId).filter(Boolean).join(',')
  if (!ids) return $baseMessage('选中数据缺少ID', 'warning', 'hey')
  ElMessageBox.confirm('确定删除选中接口权限？', '提示', { type: 'warning' })
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
    const { data } = await getApiScopeList(queryForm)
    list.value = data.list || []
    total.value = data.total || 0
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
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
const resetQueryForm = () => {
  queryForm.resourceCode = ''
  queryForm.scopeName = ''
  queryForm.pageNo = 1
  fetchData()
}

onBeforeMount(async () => {
  try {
    scopeTypeOptions.value = await getScopeTypeDict('api_scope_type')
  } catch {
    scopeTypeOptions.value = []
  }
  fetchData()
})
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';
</style>
