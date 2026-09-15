<template>
  <div class="prt-page auto-height-container">
    <header class="prt-hero">
      <div>
        <h1 class="prt-hero__title">模板列表</h1>
        <p class="prt-hero__desc">维护单据打印模板，设计布局并设置默认模板</p>
      </div>
      <el-button :icon="Plus" type="primary" @click="openCreate">新建模板</el-button>
    </header>

    <section class="prt-stats">
      <button
        v-for="(dt, idx) in docTypeList"
        :key="dt.code"
        class="prt-stat"
        :class="[`is-${statTone(idx)}`, { 'is-active': queryForm.docTypeCode === dt.code }]"
        type="button"
        @click="selectDocType(dt.code)"
      >
        <span class="prt-stat__icon">{{ statIcon(dt.code) }}</span>
        <span class="prt-stat__body">
          <span class="prt-stat__name">{{ dt.name }}</span>
          <span class="prt-stat__meta">
            {{ queryForm.docTypeCode === dt.code ? `共 ${total} 套` : '点击筛选' }}
            <template v-if="dt.defaultTemplateId"> · 已设默认</template>
          </span>
        </span>
      </button>
    </section>

    <section class="prt-card">
      <div class="prt-toolbar">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item label="单据类型">
            <el-select
              v-model="queryForm.docTypeCode"
              clearable
              placeholder="全部类型"
              style="width: 200px"
              @change="onDocTypeChange"
            >
              <el-option
                v-for="dt in docTypeList"
                :key="dt.code"
                :label="dt.name"
                :value="dt.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="prt-table-wrap">
        <el-table
          v-loading="loading"
          class="prt-table"
          :data="list"
          height="100%"
          highlight-current-row
        >
          <el-table-column label="模板名称" min-width="180" prop="name" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="prt-name">
                <span class="prt-name__text">{{ row.name }}</span>
                <el-tag v-if="isDefault(row)" class="prt-name__badge" effect="light" size="small" type="warning">
                  默认
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="编码" min-width="130" prop="code" show-overflow-tooltip>
            <template #default="{ row }">
              <code class="prt-code">{{ row.code }}</code>
            </template>
          </el-table-column>
          <el-table-column label="单据类型" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.docTypeName || docTypeName(row.docTypeCode) || row.docTypeCode }}
            </template>
          </el-table-column>
          <el-table-column align="center" label="状态" min-width="90" prop="status">
            <template #default="{ row }">
              <el-tag effect="light" round size="small" :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="160" prop="updateTime" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="prt-time">{{ row.updateTime || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" fixed="right" label="操作" width="260">
            <template #default="{ row }">
              <div class="prt-ops">
                <el-button link type="primary" @click="openDesign(row)">设计</el-button>
                <span class="prt-ops__sep" />
                <el-button link type="primary" @click="handleSetDefault(row)">设为默认</el-button>
                <span class="prt-ops__sep" />
                <el-button link type="primary" @click="handleCopy(row)">复制</el-button>
                <span class="prt-ops__sep" />
                <el-button link :type="row.status === 1 ? 'info' : 'success'" @click="handleToggleStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无模板，请先新建或切换单据类型" />
          </template>
        </el-table>
      </div>

      <footer class="prt-pager">
        <vab-pagination
          :current-page="queryForm.current"
          :page-size="queryForm.size"
          :page-sizes="[20, 50, 100]"
          :total="total"
          @current-change="(p: number) => { queryForm.current = p; fetchList() }"
          @size-change="(s: number) => { queryForm.size = s; queryForm.current = 1; fetchList() }"
        />
      </footer>
    </section>

    <el-dialog v-model="createVisible" append-to-body class="prt-dialog" title="新建模板" width="460px">
      <el-form label-width="90px" :model="createForm">
        <el-form-item label="单据类型">
          <el-select v-model="createForm.docTypeCode" disabled style="width: 100%">
            <el-option
              v-for="dt in docTypeList"
              :key="dt.code"
              :label="dt.name"
              :value="dt.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板编码">
          <el-input v-model.trim="createForm.code" maxlength="50" placeholder="请输入模板编码" />
        </el-form-item>
        <el-form-item label="模板名称">
          <el-input v-model.trim="createForm.name" maxlength="100" placeholder="请输入模板名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button :loading="creating" type="primary" @click="confirmCreate">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script lang="ts" setup>
import { Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  changeTemplateStatus,
  copyTemplate,
  listDocTypes,
  listTemplates,
  setDefaultTemplate,
  submitTemplateMeta,
  type PrintDocType,
  type PrintTemplate,
} from '/@/api/print/reportCenter'

defineOptions({ name: 'PrintReportTemplates' })

const loading = ref(false)
const list = ref<PrintTemplate[]>([])
const total = ref(0)
const docTypeList = ref<PrintDocType[]>([])

const queryForm = reactive({
  docTypeCode: '',
  current: 1,
  size: 50,
})

const currentDocType = computed(() =>
  docTypeList.value.find((dt) => dt.code === queryForm.docTypeCode)
)

const docTypeName = (code: string) =>
  docTypeList.value.find((d) => d.code === code)?.name || code

const isDefault = (row: PrintTemplate) => {
  if (!currentDocType.value?.defaultTemplateId) return false
  return Number(row.id) === Number(currentDocType.value.defaultTemplateId)
}

const STAT_TONES = ['green', 'blue', 'purple', 'orange'] as const
const statTone = (idx: number) => STAT_TONES[idx % STAT_TONES.length]

const statIcon = (code: string) => {
  if (code === 'instruction') return '制'
  if (code === 'workOrder') return '工'
  if (code === 'dispatch') return '派'
  return '报'
}

const selectDocType = (code: string) => {
  if (queryForm.docTypeCode === code) return
  queryForm.docTypeCode = code
  queryForm.current = 1
  fetchList()
}

const fetchDocTypes = async () => {
  try {
    docTypeList.value = await listDocTypes()
    if (docTypeList.value.length && !queryForm.docTypeCode) {
      queryForm.docTypeCode = docTypeList.value[0].code
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载单据类型失败')
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await listTemplates(queryForm.docTypeCode, {
      current: queryForm.current,
      size: queryForm.size,
    })
    list.value = res?.data?.list || []
    total.value = res?.data?.total || 0
  } catch (e: any) {
    list.value = []
    total.value = 0
    ElMessage.error(e?.message || '加载模板列表失败')
  } finally {
    loading.value = false
  }
}

const onDocTypeChange = () => {
  queryForm.current = 1
  fetchList()
}

const refreshAll = async () => {
  await fetchDocTypes()
  await fetchList()
}

onMounted(async () => {
  await fetchDocTypes()
  await fetchList()
})

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({
  docTypeCode: '',
  code: '',
  name: '',
})

const openCreate = () => {
  if (!queryForm.docTypeCode) {
    ElMessage.warning('请先选择单据类型')
    return
  }
  createForm.docTypeCode = queryForm.docTypeCode
  createForm.code = ''
  createForm.name = ''
  createVisible.value = true
}

const confirmCreate = async () => {
  if (!createForm.code || !createForm.name) {
    ElMessage.warning('请填写模板编码与名称')
    return
  }
  creating.value = true
  try {
    const res = await submitTemplateMeta({
      code: createForm.code,
      name: createForm.name,
      docTypeCode: createForm.docTypeCode,
    })
    const id = res?.id ?? res
    createVisible.value = false
    ElMessage.success('创建成功')
    await fetchList()
    if (id) {
      const newRow = list.value.find((r) => String(r.id) === String(id))
      if (newRow) openDesign(newRow)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

const router = useRouter()

const openDesign = (row: PrintTemplate) => {
  router.push({
    path: '/printReport/templates/design',
    query: {
      id: String(row.id),
      name: row.name,
      docTypeCode: row.docTypeCode,
    },
  })
}

const handleSetDefault = async (row: PrintTemplate) => {
  try {
    await ElMessageBox.confirm(`确定将「${row.name}」设为默认模板？`, '提示', { type: 'warning' })
    await setDefaultTemplate(row.id)
    ElMessage.success('设置成功')
    await refreshAll()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '设置失败')
    }
  }
}

const handleCopy = async (row: PrintTemplate) => {
  try {
    const { value: code } = await ElMessageBox.prompt('请输入新模板编码', '复制模板', {
      inputValue: `${row.code}_copy`,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    if (!code) return
    const { value: name } = await ElMessageBox.prompt('请输入新模板名称', '复制模板', {
      inputValue: `${row.name} 副本`,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    if (!name) return
    await copyTemplate(row.id, code, name)
    ElMessage.success('复制成功')
    await fetchList()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '复制失败')
    }
  }
}

const handleToggleStatus = async (row: PrintTemplate) => {
  const next = row.status === 1 ? 0 : 1
  const label = next === 1 ? '启用' : '停用'
  try {
    await changeTemplateStatus(row.id, next)
    ElMessage.success(`${label}成功`)
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || `${label}失败`)
  }
}
</script>

<style lang="scss" scoped>
.prt-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 16px 18px 18px;
  background: #f0f2f5;
}

.prt-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    color: #1f2937;
    letter-spacing: 0.02em;
  }

  &__desc {
    margin: 6px 0 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.prt-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.prt-stat {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    box-shadow: 0 4px 14px rgb(0 0 0 / 8%);
    transform: translateY(-1px);
  }

  &.is-active {
    border-color: #409eff;
    box-shadow: 0 0 0 1px rgb(64 158 255 / 25%), 0 4px 14px rgb(64 158 255 / 12%);
  }

  &__icon {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 42px;
    height: 42px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    border-radius: 50%;
  }

  &.is-green .prt-stat__icon {
    background: linear-gradient(145deg, #52c41a, #389e0d);
  }

  &.is-blue .prt-stat__icon {
    background: linear-gradient(145deg, #409eff, #1d6fd8);
  }

  &.is-purple .prt-stat__icon {
    background: linear-gradient(145deg, #9254de, #722ed1);
  }

  &.is-orange .prt-stat__icon {
    background: linear-gradient(145deg, #fa8c16, #d46b08);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    color: #262626;
  }

  &__meta {
    font-size: 12px;
    color: #8c8c8c;
  }
}

.prt-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
}

.prt-toolbar {
  padding: 12px 16px 4px;
  border-bottom: 1px solid #f0f0f0;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}

.prt-table-wrap {
  flex: 1;
  min-height: 280px;
  padding: 0 8px;
}

.prt-table {
  :deep(.el-table__header th) {
    font-weight: 600;
    color: #595959;
    background: #fafafa !important;
  }

  :deep(.el-table__row:hover > td) {
    background: #f5f9ff !important;
  }

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }
}

.prt-name {
  display: flex;
  gap: 8px;
  align-items: center;

  &__text {
    font-weight: 560;
    color: #262626;
  }
}

.prt-code {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #595959;
  background: #f5f5f5;
  border-radius: 4px;
}

.prt-time {
  color: #8c8c8c;
}

.prt-ops {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  justify-content: center;

  &__sep {
    width: 1px;
    height: 12px;
    margin: 0 2px;
    background: #e8e8e8;
  }
}

.prt-pager {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px 14px;
  border-top: 1px solid #f0f0f0;
}
</style>
