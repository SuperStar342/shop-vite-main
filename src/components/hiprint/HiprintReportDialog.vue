<template>
  <el-dialog
    :model-value="modelValue"
    :title="title || '报表设计'"
    width="1100px"
    top="4vh"
    append-to-body
    destroy-on-close
    class="hiprint-report-dialog"
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @opened="handleOpened"
  >
    <div v-loading="loading" class="hiprint-report-body">
      <el-tabs v-model="activeTab" class="hiprint-report-tabs" @tab-change="onTabChange">
        <el-tab-pane label="设计" name="design" />
        <el-tab-pane label="预览" name="preview" />
      </el-tabs>

      <div v-show="activeTab === 'design'" class="hiprint-report-design">
        <div :id="`${uid}-providers`" class="hiprint-report-providers">
          <div v-for="module in providerModules" :key="module" :id="`${uid}-provider-${module}`" class="hiprint-report-provider-panel" />
        </div>
        <div :id="`${uid}-paper`" class="hiprint-report-paper" />
        <div :id="`${uid}-settings`" class="hiprint-report-settings" />
      </div>

      <div v-show="activeTab === 'preview'" :id="`${uid}-preview`" ref="previewRef" class="hiprint-report-preview" />
    </div>

    <template #footer>
      <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
      <el-button :loading="restoring" @click="handleRestore">恢复默认</el-button>
      <el-button :loading="printing" @click="handlePrint">打印</el-button>
      <el-button @click="requestClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick, ref, watch } from 'vue'
import {
  createPrintTemplate,
  designTemplate,
  initHiprint,
  buildProviderPanel,
  renderPreview,
  printWithTemplate,
  ensureJquery,
} from '/@/utils/hiprint/core'
import { clearLocalTemplate, resolveTemplate, saveLocalTemplate } from '/@/utils/hiprint/storage'

interface Props {
  modelValue: boolean
  title?: string
  reportKey: string
  providers: Array<{ addElementTypes: (...args: any[]) => void }>
  providerModules: string[]
  defaultTemplate: unknown
  printData: Record<string, unknown>
  onLoadTemplate?: (key: string) => Promise<unknown | null>
  onSaveTemplate?: (key: string, json: unknown) => Promise<void>
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

defineOptions({ name: 'HiprintReportDialog' })

const uid = `hp-${Date.now()}`
const activeTab = ref<'design' | 'preview'>('design')
const previewRef = ref<HTMLElement | null>(null)

let tpl: any = null
let savedSnapshot = ''
let resolvedTemplate: unknown = null
let inited = false

const saving = ref(false)
const restoring = ref(false)
const printing = ref(false)
const loading = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    if (!v) {
      activeTab.value = 'design'
      tpl = null
      inited = false
    }
  }
)

const handleOpened = async () => {
  if (inited) return
  loading.value = true
  try {
    resolvedTemplate = await resolveTemplate({
      reportKey: props.reportKey,
      defaultTemplate: props.defaultTemplate,
      onLoadTemplate: props.onLoadTemplate,
    })

    await initHiprint(props.providers)
    await nextTick()
    await buildProviders()

    tpl = await createPrintTemplate({
      template: resolvedTemplate,
      settingContainer: `#${uid}-settings`,
    })
    designTemplate(tpl, `#${uid}-paper`)
    savedSnapshot = JSON.stringify(tpl.getJson() ?? {})
    inited = true
  } catch (err: any) {
    ElMessage({ message: err?.message || '初始化报表设计器失败', type: 'error' })
  } finally {
    loading.value = false
  }
}

const buildProviders = async () => {
  const $ = await ensureJquery()
  for (const module of props.providerModules) {
    const el = document.getElementById(`${uid}-provider-${module}`)
    if (el) await buildProviderPanel($(el), module)
  }
}

const onTabChange = async (tab: any) => {
  if (!tpl) return
  if (tab === 'preview') {
    if (!previewRef.value) return
    try {
      await renderPreview(previewRef.value, tpl, props.printData)
    } catch (err: any) {
      ElMessage({ message: err?.message || '预览渲染失败', type: 'error' })
    }
  } else {
    try {
      designTemplate(tpl, `#${uid}-paper`)
    } catch (err: any) {
      ElMessage({ message: err?.message || '切换设计视图失败', type: 'error' })
    }
  }
}

const currentJson = () => {
  try {
    return JSON.stringify(tpl?.getJson() ?? {})
  } catch {
    return ''
  }
}

const isDirty = () => currentJson() !== savedSnapshot

const handleSave = async () => {
  if (!tpl) return
  saving.value = true
  try {
    const json = tpl.getJson()
    saveLocalTemplate(props.reportKey, json)
    if (props.onSaveTemplate) {
      await props.onSaveTemplate(props.reportKey, json)
    }
    savedSnapshot = JSON.stringify(json ?? {})
    ElMessage({ message: '模板已保存', type: 'success' })
  } catch (err: any) {
    ElMessage({ message: err?.message || '保存模板失败', type: 'error' })
  } finally {
    saving.value = false
  }
}

const handleRestore = async () => {
  if (!tpl) return
  try {
    await ElMessageBox.confirm('恢复默认将清除本地保存的模板，确认继续？', '提示', {
      confirmButtonText: '恢复',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  restoring.value = true
  try {
    clearLocalTemplate(props.reportKey)
    tpl = await createPrintTemplate({
      template: props.defaultTemplate,
      settingContainer: `#${uid}-settings`,
    })
    designTemplate(tpl, `#${uid}-paper`)
    savedSnapshot = JSON.stringify(tpl.getJson() ?? {})
    ElMessage({ message: '已恢复默认模板', type: 'success' })
  } catch (err: any) {
    ElMessage({ message: err?.message || '恢复默认模板失败', type: 'error' })
  } finally {
    restoring.value = false
  }
}

const handlePrint = () => {
  if (!tpl) return
  printing.value = true
  try {
    printWithTemplate(tpl, props.printData)
  } catch (err: any) {
    ElMessage({ message: err?.message || '打印失败', type: 'error' })
  } finally {
    printing.value = false
  }
}

const allowClose = (done?: (cancel?: boolean) => void) => {
  emit('update:modelValue', false)
  done?.()
}

const requestClose = async (done?: (cancel?: boolean) => void) => {
  if (!isDirty()) {
    allowClose(done)
    return
  }
  try {
    await ElMessageBox.confirm('模板已修改且未保存，确认关闭？', '提示', {
      confirmButtonText: '关闭',
      cancelButtonText: '取消',
      type: 'warning',
    })
    allowClose(done)
  } catch {
    // user cancelled, keep open
  }
}

const beforeClose = (done: () => void) => {
  requestClose(done)
}
</script>

<style scoped>
.hiprint-report-body {
  display: flex;
  flex-direction: column;
  max-height: 72vh;
  overflow: hidden;
}
.hiprint-report-tabs {
  flex-shrink: 0;
}
.hiprint-report-design {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding-top: 8px;
}
.hiprint-report-providers {
  width: 180px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 6px;
  background: #fafafa;
}
.hiprint-report-provider-panel {
  min-height: 40px;
}
.hiprint-report-paper {
  flex: 1;
  min-width: 0;
  overflow: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #f5f7fa;
}
.hiprint-report-settings {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 6px;
  background: #fafafa;
}
.hiprint-report-preview {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f0f2f5;
  border-radius: 4px;
  margin-top: 8px;
}
:deep(.hiprint-printPaper) {
  background: #fff;
}
:deep(table td) {
  writing-mode: horizontal-tb !important;
}
</style>
