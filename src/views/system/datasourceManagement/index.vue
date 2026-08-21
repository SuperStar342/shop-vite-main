<template>
  <div class="datasource-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item label="名称:">
            <el-input v-model.trim="queryForm.name" clearable placeholder="请输入 名称" style="width: 220px" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" type="primary" @click="queryData">搜索</el-button>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Delete" @click="resetQuery">清空</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-button :icon="Plus" type="primary" @click="openEdit()">新增</el-button>
        <el-button :icon="Delete" :disabled="selectedIds.length === 0" type="danger" plain @click="handleBatchDelete">
          删除
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button :icon="Refresh" circle @click="fetchData" />
      </div>
    </div>

    <div v-loading="listLoading" class="card-grid">
      <el-empty v-if="!listLoading && list.length === 0" description="暂无数据源" />
      <div
        v-for="(item, index) in list"
        :key="item.id"
        class="ds-card"
        :class="{
          selected: selectedIds.includes(item.id),
          'is-connected': connStatus[item.id] === 'ok',
          'is-failed': connStatus[item.id] === 'fail',
        }"
        @click="toggleSelect(item)"
      >
        <div class="ds-card__head">
          <div class="ds-card__title">
            <el-icon
              v-if="connStatus[item.id] === 'ok'"
              class="conn-check"
              :size="18"
            >
              <CircleCheckFilled />
            </el-icon>
            <el-icon v-else-if="connStatus[item.id] === 'checking'" class="conn-loading" :size="16">
              <Loading />
            </el-icon>
            <span>{{ item.name }}</span>
          </div>
          <div class="ds-card__no">No {{ (queryForm.pageNo - 1) * queryForm.pageSize + index + 1 }}</div>
        </div>
        <div class="ds-card__body">
          <div class="ds-row">
            <span class="label">数据类型</span>
            <span class="value">{{ categoryLabel(item.category) }}</span>
          </div>
          <div class="ds-row">
            <span class="label">驱动类</span>
            <span class="value mono" :title="item.driverClass">{{ item.driverClass }}</span>
          </div>
          <div class="ds-row">
            <span class="label">连接地址</span>
            <span class="value mono" :title="item.url">{{ item.url }}</span>
          </div>
          <div class="ds-row">
            <span class="label">用户名</span>
            <span class="value">{{ item.username }}</span>
          </div>
        </div>
        <div class="ds-card__foot" @click.stop>
          <el-button link type="primary" :icon="View" @click="openView(item)">查看</el-button>
          <el-button link type="primary" :icon="EditPen" @click="openEdit(item)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(item)">删除</el-button>
        </div>
      </div>
    </div>

    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="(p: number) => { queryForm.pageNo = p; fetchData() }"
      @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchData() }"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" :disabled="viewMode">
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="请输入 名称（小写，如 sqlserver-sf）" />
        </el-form-item>
        <el-form-item label="驱动类" prop="driverClass">
          <el-select v-model="form.driverClass" placeholder="请选择 驱动类" style="width: 100%">
            <el-option v-for="opt in DRIVER_OPTIONS" :key="opt.value" :label="`${opt.label} (${opt.value})`" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="连接地址" prop="url">
          <el-input
            v-model.trim="form.url"
            placeholder="例: jdbc:sqlserver://host:1433;DatabaseName=xxx;encrypt=false;trustServerCertificate=true"
          />
        </el-form-item>
        <el-form-item label="用户名" prop="username" style="display: inline-flex; width: 48%; margin-right: 4%">
          <el-input v-model.trim="form.username" placeholder="请输入 用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password" style="display: inline-flex; width: 48%">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入 密码" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入 备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="!viewMode" :loading="testing" @click="handleTest">测试连接</el-button>
        <el-button v-if="!viewMode" :icon="CirclePlus" :loading="saving" type="primary" @click="handleSave">保存</el-button>
        <el-button :icon="CircleClose" @click="dialogVisible = false">{{ viewMode ? '关闭' : '取消' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { CircleCheckFilled, CircleClose, CirclePlus, Delete, EditPen, Loading, Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  DRIVER_OPTIONS,
  doDelete,
  doEdit,
  getList,
  testConnection,
} from '/@/api/system/datasource'

defineOptions({ name: 'DatasourceManagement' })

const listLoading = ref(false)
const saving = ref(false)
const testing = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const dialogVisible = ref(false)
const viewMode = ref(false)
const formRef = ref<FormInstance>()
/** id -> ok | fail | checking */
const connStatus = reactive<Record<string, 'ok' | 'fail' | 'checking'>>({})

const queryForm = reactive({
  pageNo: 1,
  pageSize: 12,
  name: '',
})

const form = reactive({
  id: '',
  category: 1,
  name: '',
  driverClass: '',
  url: '',
  username: '',
  password: '',
  remark: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入数据源名称', trigger: 'blur' },
    {
      pattern: /^[a-z][a-z0-9-]*$/,
      message: '须小写字母开头，仅含小写字母/数字/连字符',
      trigger: 'blur',
    },
  ],
  driverClass: [{ required: true, message: '请选择驱动类', trigger: 'change' }],
  url: [{ required: true, message: '请输入连接地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const dialogTitle = computed(() => {
  if (viewMode.value) return '查看'
  return form.id ? '编辑' : '新增'
})

const categoryLabel = (c: any) => {
  if (Number(c) === 2) return 'sharding'
  return 'jdbc'
}

const probeConnections = async (rows: any[]) => {
  Object.keys(connStatus).forEach((k) => delete connStatus[k])
  await Promise.all(
    rows.map(async (row) => {
      const id = String(row.id)
      if (!row.url || !row.username || !row.password || !row.driverClass) {
        connStatus[id] = 'fail'
        return
      }
      connStatus[id] = 'checking'
      try {
        await testConnection(row, { silent: true })
        connStatus[id] = 'ok'
      } catch {
        connStatus[id] = 'fail'
      }
    })
  )
}

const fetchData = async () => {
  listLoading.value = true
  selectedIds.value = []
  try {
    const { data } = await getList(queryForm)
    list.value = data.list || []
    total.value = data.total || 0
    // 不阻塞列表展示，异步探测连通性
    probeConnections(list.value)
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    listLoading.value = false
  }
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchData()
}

const resetQuery = () => {
  queryForm.name = ''
  queryForm.pageNo = 1
  fetchData()
}

const toggleSelect = (item: any) => {
  const id = String(item.id)
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

const resetForm = () => {
  form.id = ''
  form.category = 1
  form.name = ''
  form.driverClass = ''
  form.url = ''
  form.username = ''
  form.password = ''
  form.remark = ''
  viewMode.value = false
  formRef.value?.clearValidate()
}

const fillForm = (item: any) => {
  form.id = item.id || ''
  form.category = item.category ?? 1
  form.name = item.name || ''
  form.driverClass = item.driverClass || ''
  form.url = item.url || ''
  form.username = item.username || ''
  form.password = item.password || ''
  form.remark = item.remark || ''
}

const openEdit = (item?: any) => {
  resetForm()
  viewMode.value = false
  if (item) fillForm(item)
  dialogVisible.value = true
}

const openView = (item: any) => {
  resetForm()
  viewMode.value = true
  fillForm(item)
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    await doEdit({ ...form })
    $baseMessage('保存成功', 'success', 'hey')
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    $baseMessage(e?.message || '保存失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

const handleTest = async () => {
  await formRef.value?.validate()
  testing.value = true
  try {
    const msg = await testConnection({ ...form })
    $baseMessage(msg || '连接成功', 'success', 'hey')
  } catch (e: any) {
    $baseMessage(e?.message || '连接失败', 'error', 'hey')
  } finally {
    testing.value = false
  }
}

const handleDelete = async (item: any) => {
  try {
    await ElMessageBox.confirm(`确认删除数据源「${item.name}」？`, '提示', { type: 'warning' })
    await doDelete({ ids: item.id })
    $baseMessage('删除成功', 'success', 'hey')
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) $baseMessage(e.message, 'error', 'hey')
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个数据源？`, '提示', { type: 'warning' })
    await doDelete({ ids: selectedIds.value.join(',') })
    $baseMessage('删除成功', 'success', 'hey')
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) $baseMessage(e.message, 'error', 'hey')
  }
}

onBeforeMount(() => fetchData())
</script>

<style lang="scss" scoped>
.datasource-management-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-grid {
  flex: 1;
  min-height: 240px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  align-content: start;
  overflow: auto;
  padding-bottom: 8px;
}

.ds-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s, background 0.15s;

  &:hover {
    border-color: #c6e2ff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.12);
  }

  &.selected {
    border-color: #409eff;
    box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.25);
  }

  &.is-connected {
    border-color: #67c23a;
    background: linear-gradient(180deg, #f0f9eb 0%, #fff 48%);

    &:hover {
      border-color: #67c23a;
      box-shadow: 0 2px 12px rgba(103, 194, 58, 0.2);
    }

    &.selected {
      border-color: #67c23a;
      box-shadow: 0 0 0 1px rgba(103, 194, 58, 0.35);
    }

    .ds-card__title {
      color: #67c23a;
    }

    .ds-card__foot {
      background: #f0f9eb;
      border-top-color: #e1f3d8;
    }
  }
}

.ds-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 8px;
}

.ds-card__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.conn-check {
  color: #67c23a;
}

.conn-loading {
  color: #909399;
  animation: ds-spin 1s linear infinite;
}

@keyframes ds-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ds-card__no {
  color: #909399;
  font-size: 13px;
}

.ds-card__body {
  padding: 4px 16px 12px;
  flex: 1;
}

.ds-row {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.4;

  .label {
    flex: 0 0 72px;
    color: #909399;
  }

  .value {
    flex: 1;
    color: #303133;
    word-break: break-all;
  }

  .mono {
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
  }
}

.ds-card__foot {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-extra-light);
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}
</style>
