<template>
  <div class="print-report-templates auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-select
              v-model="queryForm.docTypeCode"
              clearable
              placeholder="选择单据类型"
              style="width: 220px"
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
            <el-button :icon="Plus" type="primary" @click="openCreate">新建</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <el-table
      v-loading="loading"
      border
      class="prt-table"
      :data="list"
      height="100%"
      highlight-current-row
      stripe
    >
      <el-table-column label="名称" min-width="180" prop="name" show-overflow-tooltip />
      <el-table-column label="编码" min-width="140" prop="code" show-overflow-tooltip />
      <el-table-column label="单据类型" min-width="140" prop="docTypeName" show-overflow-tooltip />
      <el-table-column align="center" label="状态" min-width="90" prop="status">
        <template #default="scope">
          <el-tag effect="light" round size="small" :type="(scope.row as PrintTemplate).status === 1 ? 'success' : 'info'">
            {{ (scope.row as PrintTemplate).status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="是否默认" min-width="100">
        <template #default="scope">
          <el-tag v-if="isDefault(scope.row as PrintTemplate)" effect="dark" round size="small" type="warning">默认</el-tag>
          <span v-else class="prt-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="160" prop="updateTime" show-overflow-tooltip />
      <el-table-column align="center" fixed="right" label="操作" width="240">
        <template #default="scope">
          <div class="prt-ops">
            <el-button link type="primary" @click="openDesign(scope.row as PrintTemplate)">设计</el-button>
            <el-button link type="success" @click="handleSetDefault(scope.row as PrintTemplate)">设为默认</el-button>
            <el-button link type="warning" @click="handleCopy(scope.row as PrintTemplate)">复制</el-button>
            <el-button
              link
              :type="(scope.row as PrintTemplate).status === 1 ? 'info' : 'primary'"
              @click="handleToggleStatus(scope.row as PrintTemplate)"
            >
              {{ (scope.row as PrintTemplate).status === 1 ? '停用' : '启用' }}
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无模板" />
      </template>
    </el-table>

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

    <el-dialog v-model="createVisible" append-to-body title="新建模板" width="460px">
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

    <hiprint-report-dialog
      v-model="designVisible"
      :default-template="bundle.defaultTemplate"
      :on-load-template="loadRemote"
      :on-save-template="saveRemote"
      :print-data="samplePrintData"
      :provider-modules="bundle.providerModules"
      :providers="bundle.providers"
      :report-key="String(activeTemplateId)"
      :title="designTitle"
    />
  </div>
</template>

<script lang="ts" setup>
import { Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import HiprintReportDialog from '/@/components/hiprint/HiprintReportDialog.vue'
import {
  changeTemplateStatus,
  copyTemplate,
  getTemplateJson,
  listDocTypes,
  listTemplates,
  saveTemplateJson,
  setDefaultTemplate,
  submitTemplateMeta,
  type PrintDocType,
  type PrintTemplate,
} from '/@/api/print/reportCenter'
import {
  buildInstructionPrintData,
  mapItemsToPrintRows,
} from '/@/utils/hiprint/instructionSheet'
import { getHiprintBundle } from '/@/utils/hiprint/registry'

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

const isDefault = (row: PrintTemplate) => {
  if (!currentDocType.value?.defaultTemplateId) return false
  return Number(row.id) === Number(currentDocType.value.defaultTemplateId)
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

// 新建模板
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

// 设计器
const designVisible = ref(false)
const activeTemplateId = ref<number | string>('')
const designTitle = ref('报表设计')
const bundle = reactive({
  providers: [] as any[],
  providerModules: [] as string[],
  defaultTemplate: null as unknown,
})

const makeSamplePrintData = (docTypeCode: string) => {
  if (docTypeCode === 'instruction') {
    const rows = mapItemsToPrintRows(
      [
        {
          ordNo: 'ORD-20260912-001',
          custOrdNo: 'CUST-001',
          custName: '示例客户',
          styleCode: 'STYLE-001',
          goodsName: '示例货品',
          fabricCode: 'FAB-001',
          clrCode: 'CLR-001',
          moQty: 100,
          ordDate: '2026-09-12',
        },
        {
          ordNo: 'ORD-20260912-002',
          custOrdNo: 'CUST-002',
          custName: '示例客户二',
          styleCode: 'STYLE-002',
          goodsName: '示例货品二',
          fabricCode: 'FAB-002',
          clrCode: 'CLR-002',
          moQty: 200,
          ordDate: '2026-09-12',
        },
      ],
      {}
    )
    return buildInstructionPrintData(rows)
  }
  return {}
}

const samplePrintData = computed(() => makeSamplePrintData(queryForm.docTypeCode))

const openDesign = async (row: PrintTemplate) => {
  activeTemplateId.value = row.id
  designTitle.value = `设计 - ${row.name}`
  try {
    const b = await getHiprintBundle(row.docTypeCode)
    bundle.providers = b.providers
    bundle.providerModules = b.providerModules
    bundle.defaultTemplate = b.defaultTemplate
  } catch (e: any) {
    ElMessage.error(e?.message || '加载设计器失败')
    return
  }
  designVisible.value = true
}

const loadRemote = async (key: string) => {
  const raw = await getTemplateJson(key)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

const saveRemote = async (key: string, json: unknown) => {
  await saveTemplateJson(key, json)
}

// 操作
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
.print-report-templates {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%);
}

.prt-table {
  flex: 1;
  min-height: 280px;

  :deep(.el-table__header th) {
    background: #f8fafc !important;
  }
}

.prt-ops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.prt-muted {
  color: #94a3b8;
}

.prt-pager {
  display: flex;
  justify-content: flex-end;
}
</style>
