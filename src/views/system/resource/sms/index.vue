<template>
  <div class="sms-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加配置</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.smsCode" clearable placeholder="请输入资源编号" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.category" clearable placeholder="请选择短信类型">
              <el-option label="阿里云短信" :value="1" />
              <el-option label="腾讯云短信" :value="2" />
              <el-option label="七牛云短信" :value="3" />
              <el-option label="云片短信" :value="4" />
            </el-select>
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
      <el-table-column align="center" label="资源编号" min-width="120" prop="smsCode" show-overflow-tooltip />
      <el-table-column align="center" label="短信类型" min-width="120">
        <template #default="{ row }">
          <el-tag type="info">{{ row.categoryLabel || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="模板ID" min-width="150" prop="templateId" show-overflow-tooltip />
      <el-table-column align="center" label="短信签名" min-width="120" prop="signName" show-overflow-tooltip />
      <el-table-column align="center" label="地域ID" min-width="100" prop="regionId" show-overflow-tooltip />
      <el-table-column align="center" label="应用ID" min-width="100" prop="appId" show-overflow-tooltip />
      <el-table-column align="center" label="状态" min-width="140">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            active-text="启用"
            :active-value="2"
            inactive-text="停用"
            :inactive-value="1"
            inline-prompt
            :loading="row._statusLoading"
            @change="(val: number) => handleStatusChange(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column align="center" label="修改时间" min-width="160" prop="datetime" show-overflow-tooltip />
      <el-table-column align="center" label="操作" width="120">
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
    <sms-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doSmsDelete, doSmsDisable, doSmsEnable, getSmsList } from '/@/api/resource'
import { $baseMessage } from '/@/hooks'
import SmsEdit from './vabAutoComponents/SmsEdit.vue'

const STATUS_ENABLED = 2
const STATUS_DISABLED = 1

defineOptions({
  name: 'SmsManagement',
})

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const list = ref<any>([])
const listLoading = ref<boolean>(true)

const total = ref<number>(0)
const selectRows = ref<any>([])
const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  smsCode: '',
  category: '',
})

const setSelectRows = (value: any[]) => {
  selectRows.value = value
}

const getRowId = (row: any) => {
  const id = row?.id
  return id === undefined || id === null || id === '' ? '' : String(id)
}

const runDelete = async (ids: string) => {
  const idSet = new Set(
    String(ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const { msg, success }: any = await doSmsDelete({ ids })
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
    $baseMessage('无法获取ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除当前配置吗？', '提示', {
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
    $baseMessage('选中数据缺少ID，请刷新列表后重试', 'warning', 'hey')
    return
  }
  ElMessageBox.confirm('您确定要删除选中配置吗？', '提示', {
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

const handleStatusChange = async (row: any, val: number) => {
  const id = getRowId(row)
  if (!id) {
    $baseMessage('无法获取ID，请刷新列表后重试', 'warning', 'hey')
    row.status = row.status === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
    return
  }

  row._statusLoading = true
  try {
    if (val === STATUS_ENABLED) {
      await doSmsEnable(id)
      list.value.forEach((item: any) => {
        if (item.id !== row.id) {
          item.status = STATUS_DISABLED
          item.statusLabel = '已停用'
        }
      })
      row.statusLabel = '已启用'
      $baseMessage('启用成功', 'success', 'hey')
    } else {
      await doSmsDisable(id)
      row.statusLabel = '已停用'
      $baseMessage('停用成功', 'success', 'hey')
    }
  } catch (e: any) {
    row.status = val === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
    row.statusLabel = row.status === STATUS_ENABLED ? '已启用' : '已停用'
    $baseMessage(e?.message || e?.msg || '操作失败', 'error', 'hey')
  } finally {
    row._statusLoading = false
  }
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
  try {
    const { data } = await getSmsList(queryForm)
    list.value = data.list || []
    total.value = data.total
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载短信配置失败', 'error', 'hey')
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

.sms-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }
}
</style>
