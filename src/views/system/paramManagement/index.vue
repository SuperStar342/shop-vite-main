<template>
  <div class="param-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加参数</el-button>
        <el-button :disabled="selectRows.length === 0" :icon="Delete" type="danger" @click="handleBatchDelete">
          批量删除
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.paramName" clearable placeholder="请输入参数名" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.paramKey" clearable placeholder="请输入参数键" />
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
      v-loading="listLoading"
      border
      :data="list"
      row-key="id"
      @selection-change="setSelectRows"
    >
      <el-table-column type="selection" width="42" />
      <el-table-column
        v-if="visible('paramName')"
        align="center"
        label="参数名"
        min-width="140"
        prop="paramName"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="visible('paramKey')"
        align="center"
        label="参数键"
        min-width="180"
        prop="paramKey"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="visible('paramValue')"
        align="center"
        label="参数值"
        min-width="180"
        prop="paramValue"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="visible('remark')"
        align="center"
        label="备注"
        min-width="160"
        prop="remark"
        show-overflow-tooltip
      />
      <el-table-column align="center" fixed="right" label="操作" width="140">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleRowDelete(row)">删除</el-button>
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

    <param-management-edit ref="editRef" @fetch-data="handleSaved" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { doDelete, getList } from '/@/api/paramManagement'
import { useListColumns } from '/@/hooks/useListColumns'

defineOptions({
  name: 'ParamManagement',
})

const { visible } = useListColumns('ParamManagement')

const editRef = ref<any>(null)
const list = ref<any[]>([])
const listLoading = ref(true)
const total = ref(0)
const selectRows = ref<any[]>([])

const queryForm = reactive({
  pageNo: 1,
  pageSize: 20,
  paramName: '',
  paramKey: '',
})

const setSelectRows = (rows: any[]) => {
  selectRows.value = rows
}

const getRowId = (row: any) => {
  const id = row?.id
  return id === undefined || id === null || id === '' ? '' : String(id)
}

const handleSaved = async () => {
  queryForm.pageNo = 1
  await fetchData()
}

const runDelete = async (ids: string) => {
  const idSet = new Set(
    String(ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const { msg, success }: any = await doDelete({ ids })
  if (success === false) throw new Error(msg || '删除失败')
  const before = list.value.length
  list.value = list.value.filter((item) => !idSet.has(getRowId(item)))
  total.value = Math.max(0, Number(total.value) - (before - list.value.length))
  selectRows.value = selectRows.value.filter((item) => !idSet.has(getRowId(item)))
  $baseMessage(msg || '删除成功', 'success', 'hey')
}

const handleAdd = () => {
  editRef.value?.showEdit()
}

const handleEdit = (row: any) => {
  editRef.value?.showEdit(row)
}

const handleRowDelete = (row: any) => {
  const id = getRowId(row)
  if (!id) {
    $baseMessage('无法获取参数ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前参数吗？', '提示', {
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
  if (!ids) {
    $baseMessage('选中数据缺少参数ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除选中参数吗？', '提示', {
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
  queryForm.paramName = ''
  queryForm.paramKey = ''
  queryForm.pageNo = 1
  fetchData()
}

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@import '/@/styles/table-op-links.scss';
</style>
