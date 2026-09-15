<template>
  <el-dialog
    v-if="mode === 'dialog'"
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
        <el-tab-pane v-if="designable" label="设计" name="design" />
        <el-tab-pane label="预览" name="preview" />
      </el-tabs>

      <div v-if="designable" v-show="activeTab === 'design'" class="hiprint-report-design">
        <div :id="`${uid}-providers`" class="hiprint-report-providers">
          <div v-for="module in providerModules" :key="module" :id="`${uid}-provider-${module}`" class="hiprint-report-provider-panel" />
        </div>
        <div :id="`${uid}-paper`" class="hiprint-report-paper" />
        <div :id="`${uid}-settings`" class="hiprint-report-settings" />
      </div>

      <div v-show="activeTab === 'preview'" :id="`${uid}-preview`" ref="previewRef" class="hiprint-report-preview" />
    </div>

    <template #footer>
      <template v-if="designable">
        <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
        <el-button :loading="restoring" @click="handleRestore">恢复默认</el-button>
      </template>
      <el-button :loading="printing" @click="handlePrint">打印</el-button>
      <el-button @click="() => requestClose()">关闭</el-button>
    </template>
  </el-dialog>

  <div v-else v-loading="loading" class="hiprint-report-page">
    <header class="hiprint-report-page__bar">
      <div class="hiprint-report-page__title">{{ title || '报表设计' }}</div>
      <div class="hiprint-report-page__actions">
        <template v-if="designable">
          <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
          <el-button :loading="restoring" @click="handleRestore">恢复默认</el-button>
        </template>
        <el-button :loading="printing" @click="handlePrint">打印</el-button>
        <el-button @click="() => requestClose()">返回</el-button>
      </div>
    </header>

    <div class="hiprint-report-body hiprint-report-body--page">
      <el-tabs v-model="activeTab" class="hiprint-report-tabs" @tab-change="onTabChange">
        <el-tab-pane v-if="designable" label="设计" name="design" />
        <el-tab-pane label="预览" name="preview" />
      </el-tabs>

      <div v-if="designable" v-show="activeTab === 'design'" class="hiprint-report-design">
        <div :id="`${uid}-providers`" class="hiprint-report-providers">
          <div v-for="module in providerModules" :key="module" :id="`${uid}-provider-${module}`" class="hiprint-report-provider-panel" />
        </div>
        <div :id="`${uid}-paper`" class="hiprint-report-paper" />
        <div :id="`${uid}-settings`" class="hiprint-report-settings" />
      </div>

      <div v-show="activeTab === 'preview'" :id="`${uid}-preview`" ref="previewRef" class="hiprint-report-preview" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick, onMounted, ref, watch } from 'vue'
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
  modelValue?: boolean
  title?: string
  reportKey: string
  providers: Array<{ addElementTypes: (...args: any[]) => void }>
  providerModules: string[]
  defaultTemplate: unknown
  printData: Record<string, unknown> | Record<string, unknown>[]
  designable?: boolean
  /** dialog=弹窗；page=独立标签页 */
  mode?: 'dialog' | 'page'
  onLoadTemplate?: (key: string) => Promise<unknown | null>
  onSaveTemplate?: (key: string, json: unknown) => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  designable: true,
  mode: 'dialog',
})
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'close'): void
}>()

defineOptions({ name: 'HiprintReportDialog' })

const uid = `hp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const activeTab = ref<'design' | 'preview'>(props.designable ? 'design' : 'preview')
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
    if (props.mode !== 'dialog') return
    if (!v) {
      activeTab.value = props.designable ? 'design' : 'preview'
      tpl = null
      inited = false
    }
  }
)

watch(
  () => props.reportKey,
  async (key, prev) => {
    if (props.mode !== 'page' || !key || key === prev) return
    inited = false
    tpl = null
    await handleOpened()
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

    if (props.designable) {
      await buildProviders()
      tpl = await createPrintTemplate({
        template: resolvedTemplate,
        settingContainer: `#${uid}-settings`,
      })
      designTemplate(tpl, `#${uid}-paper`)
    } else {
      tpl = await createPrintTemplate({
        template: resolvedTemplate,
      })
      activeTab.value = 'preview'
      await nextTick()
      await onTabChange('preview')
    }

    savedSnapshot = JSON.stringify(tpl.getJson() ?? {})
    inited = true
  } catch (err: any) {
    ElMessage({ message: err?.message || '初始化报表设计器失败', type: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.mode === 'page') handleOpened()
})

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

const isDirty = () => props.designable && currentJson() !== savedSnapshot

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
  emit('close')
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
    // cancelled
  }
}

const beforeClose = (done: () => void) => {
  requestClose(done)
}
</script>

<style scoped>
.hiprint-report-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  min-height: 520px;
  padding: 12px 16px 16px;
  background: #f0f2f5;
  border-radius: 10px;
}
.hiprint-report-page__bar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
}
.hiprint-report-page__title {
  font-size: 16px;
  font-weight: 650;
  color: #262626;
}
.hiprint-report-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hiprint-report-body {
  display: flex;
  flex-direction: column;
  max-height: 72vh;
  overflow: hidden;
}
.hiprint-report-body--page {
  flex: 1;
  max-height: none;
  min-height: 0;
  padding: 10px 12px 12px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
}
.hiprint-report-tabs {
  flex-shrink: 0;
}
.hiprint-report-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 600;
}
.hiprint-report-design {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 10px;
  padding-top: 8px;
}
.hiprint-report-body--page .hiprint-report-design {
  min-height: 0;
  height: 100%;
}
.hiprint-report-providers {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 10px 8px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
}
.hiprint-report-provider-panel {
  min-height: 40px;
}
.hiprint-report-provider-panel + .hiprint-report-provider-panel {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}
.hiprint-report-paper {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: #f5f7fa;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 60%);
}
.hiprint-report-settings {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 10px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
}
.hiprint-report-preview {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
  overflow: auto;
  background: #f0f2f5;
  border-radius: 10px;
}

:deep(.hp-group-title),
:deep(.hiprint-report-providers .title) {
  display: block;
  margin: 4px 4px 8px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 650;
  color: #8c8c8c;
  letter-spacing: 0.04em;
}
:deep(.hiprint-report-providers ul) {
  padding: 0;
  margin: 0 0 10px;
  list-style: none;
}
:deep(.hiprint-report-providers li) {
  margin: 0;
  list-style: none;
}

:deep(.hp-el-item),
:deep(a.ep-draggable-item) {
  display: flex !important;
  gap: 10px;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 6px;
  padding: 8px 10px !important;
  font-size: 13px;
  line-height: 1.3;
  color: #262626 !important;
  text-decoration: none !important;
  cursor: grab;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
:deep(.hp-el-item:hover),
:deep(a.ep-draggable-item:hover) {
  background: #f0f7ff;
  border-color: #91caff;
  box-shadow: 0 2px 8px rgb(64 158 255 / 12%);
}
:deep(.hp-el-item:active),
:deep(a.ep-draggable-item:active) {
  cursor: grabbing;
}
:deep(.hp-el-title) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.hp-el-icon) {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  pointer-events: none;
  border-radius: 6px;
}
:deep(.hp-el-icon.is-text) {
  background: linear-gradient(145deg, #409eff, #1d6fd8);
}
:deep(.hp-el-icon.is-text)::before {
  content: 'T';
}
:deep(.hp-el-icon.is-longtext) {
  background: linear-gradient(145deg, #36cfc9, #13a8a8);
}
:deep(.hp-el-icon.is-longtext)::before {
  content: '¶';
}
:deep(.hp-el-icon.is-table) {
  background: linear-gradient(145deg, #597ef7, #2f54eb);
}
:deep(.hp-el-icon.is-table)::before {
  content: '⊞';
  font-size: 14px;
}
:deep(.hp-el-icon.is-hline) {
  background: linear-gradient(145deg, #ffc53d, #fa8c16);
}
:deep(.hp-el-icon.is-hline)::before {
  content: '—';
}
:deep(.hp-el-icon.is-vline) {
  background: linear-gradient(145deg, #ffc53d, #d48806);
}
:deep(.hp-el-icon.is-vline)::before {
  content: '|';
}
:deep(.hp-el-icon.is-rect) {
  background: linear-gradient(145deg, #b37feb, #722ed1);
}
:deep(.hp-el-icon.is-rect)::before {
  content: '▢';
  font-size: 14px;
}
:deep(.hp-el-icon.is-barcode) {
  background: linear-gradient(145deg, #595959, #262626);
}
:deep(.hp-el-icon.is-barcode)::before {
  content: '|||';
  letter-spacing: -1px;
}
:deep(.hp-el-icon.is-qrcode) {
  background: linear-gradient(145deg, #434343, #141414);
}
:deep(.hp-el-icon.is-qrcode)::before {
  content: '▦';
  font-size: 14px;
}
:deep(.hp-el-icon.is-image) {
  background: linear-gradient(145deg, #73d13d, #389e0d);
}
:deep(.hp-el-icon.is-image)::before {
  content: '▣';
}
:deep(.hp-el-icon.is-field) {
  background: linear-gradient(145deg, #69c0ff, #1890ff);
}
:deep(.hp-el-icon.is-field)::before {
  content: 'ƒ';
  font-style: italic;
}

:deep(.hiprint-printPaper) {
  background: #fff;
}
:deep(table td) {
  writing-mode: horizontal-tb !important;
}
</style>
