<template>
  <el-dialog
    :model-value="modelValue"
    title="选择打印模板"
    width="760px"
    top="6vh"
    append-to-body
    destroy-on-close
    class="print-template-picker-dialog"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-loading="loading" class="picker-body">
      <el-table
        ref="tableRef"
        :data="templates"
        border
        highlight-current-row
        height="320"
        @current-change="onCurrentChange"
        @row-dblclick="handlePreview"
      >
        <el-table-column label="模板名称" min-width="180" prop="name" show-overflow-tooltip />
        <el-table-column label="模板编码" min-width="140" prop="code" show-overflow-tooltip />
        <el-table-column align="center" label="默认" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" effect="dark" round size="small" type="warning">默认</el-tag>
            <span v-else class="picker-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column align="center" label="已配置" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.hasJson" effect="light" round size="small" type="success">是</el-tag>
            <el-tag v-else effect="light" round size="small" type="info">否</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="previewLoading" :disabled="!selected" @click="handlePreview">预览</el-button>
      <el-button type="success" :loading="printLoading" :disabled="!selected" @click="handlePrint">打印</el-button>
    </template>

    <HiprintReportDialog
      v-model="previewVisible"
      :designable="false"
      :title="previewTitle"
      :report-key="String(previewId)"
      :providers="bundle.providers"
      :provider-modules="bundle.providerModules"
      :default-template="bundle.defaultTemplate"
      :print-data="printData"
      :on-load-template="loadSelectedJson"
    />
  </el-dialog>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import HiprintReportDialog from './HiprintReportDialog.vue'
import { getTemplateJson, listPageTemplates, type PagePrintTemplate } from '/@/api/print/reportCenter'
import { createPrintTemplate, initHiprint, printWithTemplate } from '/@/utils/hiprint/core'
import { getHiprintBundle } from '/@/utils/hiprint/registry'

interface Props {
  modelValue: boolean
  pageCode: string
  printData: Record<string, unknown>
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

defineOptions({ name: 'PrintTemplatePickerDialog' })

const loading = ref(false)
const templates = ref<PagePrintTemplate[]>([])
const selected = ref<PagePrintTemplate | null>(null)
const tableRef = ref<any>(null)

const bundle = ref<{ providers: any[]; providerModules: string[]; defaultTemplate: unknown }>({
  providers: [],
  providerModules: [],
  defaultTemplate: null,
})

const previewVisible = ref(false)
const previewId = ref<number | string>('')
const previewTitle = ref('预览')
const previewLoading = ref(false)
const printLoading = ref(false)

const docTypeCode = computed(() => {
  if (props.pageCode === 'procurement.instruction') return 'instruction'
  return props.pageCode
})

const loadBundle = async () => {
  if (bundle.value.providers.length) return
  bundle.value = await getHiprintBundle(docTypeCode.value)
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    templates.value = await listPageTemplates(props.pageCode)
    const def = templates.value.find((t) => t.isDefault) || templates.value[0]
    selected.value = def || null
    if (def) {
      nextTick(() => {
        tableRef.value?.setCurrentRow?.(def)
      })
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载模板列表失败')
  } finally {
    loading.value = false
  }
}

const onCurrentChange = (row: PagePrintTemplate | null) => {
  selected.value = row
}

const validateSelected = () => {
  if (!selected.value) {
    ElMessage.warning('请先选择模板')
    return false
  }
  if (!selected.value.hasJson) {
    ElMessage.warning('模板未配置')
    return false
  }
  return true
}

const loadSelectedJson = async () => {
  if (!previewId.value) return null
  const raw = await getTemplateJson(previewId.value)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

const handlePreview = async () => {
  if (!validateSelected()) return
  previewLoading.value = true
  try {
    await loadBundle()
    previewId.value = selected.value!.id
    previewTitle.value = `预览 - ${selected.value!.name}`
    previewVisible.value = true
  } finally {
    previewLoading.value = false
  }
}

const handlePrint = async () => {
  if (!validateSelected()) return
  printLoading.value = true
  try {
    await loadBundle()
    const raw = await getTemplateJson(selected.value!.id)
    if (!raw) {
      ElMessage.warning('模板未配置')
      return
    }
    const json = typeof raw === 'string' ? JSON.parse(raw) : raw
    await initHiprint(bundle.value.providers)
    const tpl = await createPrintTemplate({ template: json })
    printWithTemplate(tpl, props.printData)
    emit('update:modelValue', false)
  } catch (e: any) {
    ElMessage.error(e?.message || '打印失败')
  } finally {
    printLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      fetchTemplates()
      loadBundle()
    } else {
      previewVisible.value = false
      selected.value = null
      templates.value = []
    }
  }
)
</script>

<style lang="scss" scoped>
.print-template-picker-dialog {
  :deep(.el-dialog__body) {
    padding: 12px 20px 6px;
  }
}

.picker-body {
  min-height: 200px;
}

.picker-muted {
  color: #94a3b8;
}
</style>
