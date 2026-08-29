<template>
  <el-dialog
    v-model="visible"
    append-to-body
    class="attachment-viewer-dialog"
    destroy-on-close
    :fullscreen="fullscreen"
    :show-close="false"
    top="4vh"
    width="92vw"
    @closed="onClosed"
  >
    <template #header>
      <div class="avd-header">
        <div class="avd-title" :title="current?.name">{{ current?.name || '文件预览' }}</div>
        <div class="avd-actions">
          <el-button :disabled="!current" size="small" @click="handleDownload">下载</el-button>
          <el-button :disabled="!current" size="small" @click="handlePrint">打印</el-button>
          <el-button circle :icon="fullscreen ? Aim : FullScreen" size="small" text @click="fullscreen = !fullscreen" />
          <el-button circle :icon="Close" size="small" text @click="visible = false" />
        </div>
      </div>
    </template>

    <div class="avd-body">
      <file-viewer
        v-if="visible && (viewerFile || viewerUrl)"
        :key="viewerKey"
        ref="viewerRef"
        class="avd-viewer"
        :file="viewerFile"
        :options="viewerOptions"
        :url="viewerFile ? undefined : viewerUrl"
      />
      <el-empty v-else description="暂无可预览文件" />
    </div>

    <template #footer>
      <div class="avd-footer">
        <el-button :disabled="!hasPrev" @click="goPrev">上一个附件</el-button>
        <span class="avd-index">{{ indexLabel }}</span>
        <el-button :disabled="!hasNext" type="primary" @click="goNext">下一个附件</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Aim, Close, FullScreen } from '@element-plus/icons-vue'
import { FileViewer } from '@file-viewer/vue3-full'
import type { BizAttachment } from '/@/api/procurement/attachment'

defineOptions({ name: 'AttachmentViewerDialog' })

const props = defineProps<{
  modelValue: boolean
  list: BizAttachment[]
  currentId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'update:currentId': [string]
  download: [BizAttachment]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const fullscreen = ref(false)
const viewerRef = ref<InstanceType<typeof FileViewer> | null>(null)

const currentIndex = computed(() => {
  if (!props.currentId) return 0
  const i = props.list.findIndex((a) => a.id === props.currentId)
  return i >= 0 ? i : 0
})

const current = computed(() => props.list[currentIndex.value] || null)
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.list.length - 1)
const indexLabel = computed(() => {
  if (!props.list.length) return '0 / 0'
  return `${currentIndex.value + 1} / ${props.list.length}`
})

const viewerKey = computed(() => current.value?.id || 'empty')
const viewerFile = computed(() => current.value?.file || undefined)
const viewerUrl = computed(() => current.value?.url || '')

const viewerOptions = {
  theme: 'light' as const,
  toolbar: { position: 'bottom-right' as const },
}

const goPrev = () => {
  if (!hasPrev.value) return
  const prev = props.list[currentIndex.value - 1]
  if (prev) emit('update:currentId', prev.id)
}

const goNext = () => {
  if (!hasNext.value) return
  const next = props.list[currentIndex.value + 1]
  if (next) emit('update:currentId', next.id)
}

const handleDownload = () => {
  const api = viewerRef.value as any
  if (typeof api?.downloadOriginalFile === 'function') {
    api.downloadOriginalFile()
    return
  }
  if (current.value) emit('download', current.value)
}

const handlePrint = () => {
  const api = viewerRef.value as any
  if (typeof api?.printRenderedHtml === 'function') {
    api.printRenderedHtml()
    return
  }
  window.print()
}

const onClosed = () => {
  fullscreen.value = false
  try {
    ;(viewerRef.value as any)?.destroy?.()
  } catch {
    /* ignore */
  }
}
</script>

<style lang="scss">
.attachment-viewer-dialog {
  .el-dialog__header {
    margin: 0;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  .el-dialog__body {
    padding: 0;
    height: calc(88vh - 120px);
  }
  .el-dialog__footer {
    padding: 10px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
  &.is-fullscreen {
    .el-dialog__body {
      height: calc(100vh - 110px);
    }
  }
}
</style>

<style lang="scss" scoped>
.avd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.avd-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.avd-body {
  height: 100%;
  background: #f5f7fa;
}
.avd-viewer {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 480px;
}
.avd-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.avd-index {
  font-size: 13px;
  color: #909399;
  min-width: 64px;
  text-align: center;
}
</style>
