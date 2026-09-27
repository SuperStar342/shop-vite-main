<template>
  <el-drawer
    v-model="visible"
    append-to-body
    class="attachment-drawer"
    destroy-on-close
    direction="rtl"
    size="520px"
    :with-header="false"
    @closed="handleClosed"
  >
    <div class="ad-inner">
      <header class="ad-topbar">
        <div class="ad-topbar-title">附件管理</div>
        <el-button circle :icon="Close" size="small" text @click="visible = false" />
      </header>

      <section class="ad-hero">
        <div class="ad-hero-main">
          <div class="ad-hero-id">{{ bizId || '-' }}</div>
          <div class="ad-hero-meta">
            <span>{{ subtitle || '制令附件' }}</span>
            <el-button v-if="bizId" link type="primary" @click="emit('detail')">详情</el-button>
          </div>
        </div>
      </section>

      <section class="ad-upload">
        <el-upload
          drag
          :accept="ATTACHMENT_ACCEPT"
          :before-upload="beforeUpload"
          :disabled="uploading || !bizId"
          :http-request="doUpload"
          :show-file-list="false"
          multiple
        >
          <div class="ad-upload-inner">
            <el-icon :size="36" color="#909399"><upload-filled /></el-icon>
            <div class="ad-upload-text">点击或拖拽文件到此处上传</div>
            <div class="ad-upload-tip">支持 pdf, doc, docx, xls, xlsx, ppt, jpg, png 等 单文件最大 50MB</div>
            <el-button :loading="uploading" size="small" type="primary">选择文件</el-button>
          </div>
        </el-upload>
      </section>

      <div class="ad-cats">
        <button
          v-for="c in ATTACHMENT_CATEGORIES"
          :key="c.value"
          class="ad-cat"
          :class="{ active: activeCategory === c.value }"
          type="button"
          @click="activeCategory = c.value"
        >
          {{ c.label }}({{ categoryCounts[c.value] || 0 }})
        </button>
      </div>

      <div class="ad-filters">
        <el-input
          v-model.trim="keyword"
          clearable
          placeholder="搜索附件名称"
          :prefix-icon="Search"
          @input="scheduleReload"
        />
        <el-select v-model="extFilter" clearable placeholder="全部类型" style="width: 120px" @change="reloadList">
          <el-option label="全部类型" value="" />
          <el-option v-for="t in typeOptions" :key="t" :label="t.toUpperCase()" :value="t" />
        </el-select>
      </div>

      <div v-loading="loading" class="ad-list">
        <div v-if="!list.length" class="ad-empty">
          <el-empty description="暂无附件" :image-size="72" />
        </div>
        <div
          v-for="item in list"
          :key="item.id"
          class="ad-item"
          :class="{ 'is-hover': hoverItem?.id === item.id }"
          @mouseenter="onItemEnter(item, $event)"
          @mouseleave="onItemLeave"
        >
          <div class="ad-item-icon" :class="`ext-${iconKind(item.ext)}`">
            {{ (item.ext || '?').slice(0, 4).toUpperCase() }}
          </div>
          <div class="ad-item-main">
            <div class="ad-item-name" :title="item.name">{{ item.name }}</div>
            <div class="ad-item-meta">
              <span>{{ formatFileSize(item.size) }}</span>
              <span>·</span>
              <span>{{ item.ext?.toUpperCase() || '-' }}</span>
              <span>·</span>
              <span>{{ item.uploader }}</span>
              <span>·</span>
              <span>{{ item.uploadTime }}</span>
            </div>
          </div>
          <div class="ad-item-actions" @mouseenter.stop @mousedown.stop>
            <el-tooltip content="预览" placement="top">
              <el-button circle :icon="View" size="small" text type="primary" @click.stop="openPreview(item)" />
            </el-tooltip>
            <el-tooltip content="下载" placement="top">
              <el-button circle :icon="Download" size="small" text @click.stop="downloadOne(item)" />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button circle :icon="Delete" size="small" text type="danger" @click.stop="removeOne(item)" />
            </el-tooltip>
          </div>
        </div>
      </div>

      <footer class="ad-footer">
        <div class="ad-storage-label">
          <span>存储空间</span>
          <span>{{ formatFileSize(storage.usedBytes) }} / {{ formatFileSize(storage.quotaBytes) }}</span>
        </div>
        <el-progress
          :percentage="Number(storagePercent(storage.usedBytes, storage.quotaBytes))"
          :stroke-width="8"
          :format="() => `${storagePercent(storage.usedBytes, storage.quotaBytes)}%`"
        />
      </footer>
    </div>

    <teleport to="body">
      <div
        v-if="hoverItem && hoverVisible"
        class="ad-hover-preview"
        :style="hoverPanelStyle"
        @mouseenter="onHoverPanelEnter"
        @mouseleave="onItemLeave"
      >
        <div class="ad-hover-preview__hd">
          <span class="ad-hover-preview__name" :title="hoverItem.name">{{ hoverItem.name }}</span>
          <el-button link size="small" type="primary" @click="openPreview(hoverItem)">完整预览</el-button>
        </div>
        <div class="ad-hover-preview__bd">
          <img
            v-if="hoverKind === 'image'"
            class="ad-hover-preview__img"
            :alt="hoverItem.name"
            :src="hoverResolvedUrl"
          />
          <iframe
            v-else-if="hoverKind === 'pdf'"
            class="ad-hover-preview__frame"
            :src="hoverResolvedUrl"
            title="pdf-preview"
          />
          <file-viewer
            v-else-if="hoverKind === 'office' && (hoverItem.file || hoverResolvedUrl)"
            :key="hoverItem.id"
            class="ad-hover-preview__viewer"
            :file="hoverItem.file"
            :options="hoverViewerOptions"
            :url="hoverItem.file ? undefined : hoverResolvedUrl"
          />
          <el-empty v-else description="暂不支持悬停预览" :image-size="56" />
        </div>
      </div>
    </teleport>

    <attachment-viewer-dialog
      v-model="viewerVisible"
      v-model:current-id="viewerId"
      :list="list"
      @download="downloadOne"
    />
  </el-drawer>
</template>

<script lang="ts" setup>
import { Close, Delete, Download, Search, UploadFilled, View } from '@element-plus/icons-vue'
import { FileViewer } from '@file-viewer/vue3-full'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_CATEGORIES,
  deleteAttachment,
  formatFileSize,
  getAttachmentCategoryCounts,
  getAttachmentList,
  getAttachmentStorage,
  storagePercent,
  uploadAttachment,
  type AttachmentCategory,
  type AttachmentStorageInfo,
  type BizAttachment,
} from '/@/api/procurement/attachment'
import AttachmentViewerDialog from './AttachmentViewerDialog.vue'

defineOptions({ name: 'AttachmentDrawer' })

const props = defineProps<{
  modelValue: boolean
  bizType: string
  bizId: string
  subtitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  change: [count: number]
  detail: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const uploading = ref(false)
const list = ref<BizAttachment[]>([])
const activeCategory = ref<AttachmentCategory | 'all'>('all')
const keyword = ref('')
const extFilter = ref('')
const categoryCounts = ref<Record<string, number>>({
  all: 0,
  process: 0,
  drawing: 0,
  customer: 0,
  production: 0,
  other: 0,
})
const storage = reactive<AttachmentStorageInfo>({
  usedBytes: 0,
  quotaBytes: 5 * 1024 * 1024 * 1024,
})

const viewerVisible = ref(false)
const viewerId = ref('')

const hoverItem = ref<BizAttachment | null>(null)
const hoverVisible = ref(false)
const hoverPanelStyle = ref<Record<string, string>>({})
let hoverEnterTimer: ReturnType<typeof setTimeout> | null = null
let hoverLeaveTimer: ReturnType<typeof setTimeout> | null = null

const hoverViewerOptions = {
  theme: 'light' as const,
  toolbar: { position: 'bottom-right' as const },
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

const typeOptions = computed(() => {
  const set = new Set<string>()
  for (const a of list.value) if (a.ext) set.add(a.ext)
  return [...set].sort()
})

const resolveUrl = (item: BizAttachment | null) => {
  if (!item) return ''
  const raw = item.url || ''
  if (!raw) return ''
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw
  try {
    return new URL(raw, window.location.origin).href
  } catch {
    return raw
  }
}

const hoverResolvedUrl = computed(() => resolveUrl(hoverItem.value))

const hoverKind = computed(() => {
  const e = (hoverItem.value?.ext || '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt'].includes(e)) return 'office'
  return 'other'
})

const iconKind = (ext: string) => {
  const e = (ext || '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(e)) return 'xls'
  if (['doc', 'docx'].includes(e)) return 'doc'
  if (['ppt', 'pptx'].includes(e)) return 'ppt'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e)) return 'img'
  return 'other'
}

const clearHoverTimers = () => {
  if (hoverEnterTimer) {
    clearTimeout(hoverEnterTimer)
    hoverEnterTimer = null
  }
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer)
    hoverLeaveTimer = null
  }
}

const placeHoverPanel = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  const panelW = 460
  const panelH = Math.min(560, window.innerHeight - 32)
  let left = rect.left - panelW - 12
  if (left < 12) left = Math.max(12, rect.right + 12)
  let top = rect.top - 8
  if (top + panelH > window.innerHeight - 12) top = window.innerHeight - panelH - 12
  if (top < 12) top = 12
  hoverPanelStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${panelW}px`,
    height: `${panelH}px`,
  }
}

const onItemEnter = (item: BizAttachment, e: MouseEvent) => {
  if (viewerVisible.value) return
  if (!item.file && !item.url) return
  clearHoverTimers()
  const el = e.currentTarget as HTMLElement
  hoverEnterTimer = setTimeout(() => {
    hoverItem.value = item
    placeHoverPanel(el)
    hoverVisible.value = true
  }, 280)
}

const onHoverPanelEnter = () => {
  clearHoverTimers()
}

const onItemLeave = () => {
  if (hoverEnterTimer) {
    clearTimeout(hoverEnterTimer)
    hoverEnterTimer = null
  }
  hoverLeaveTimer = setTimeout(() => {
    hoverVisible.value = false
    hoverItem.value = null
  }, 160)
}

const reloadMeta = async () => {
  if (!props.bizId) return
  const [counts, st] = await Promise.all([
    getAttachmentCategoryCounts(props.bizType, props.bizId),
    getAttachmentStorage(),
  ])
  categoryCounts.value = counts
  storage.usedBytes = st.usedBytes
  storage.quotaBytes = st.quotaBytes
  emit('change', counts.all || 0)
}

const reloadList = async () => {
  if (!props.bizId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await getAttachmentList({
      bizType: props.bizType,
      bizId: props.bizId,
      category: activeCategory.value,
      keyword: keyword.value,
      ext: extFilter.value,
    })
    await reloadMeta()
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || '加载附件失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const scheduleReload = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => reloadList(), 220)
}

watch(
  () => [props.modelValue, props.bizType, props.bizId] as const,
  ([open]) => {
    if (open && props.bizId) {
      activeCategory.value = 'all'
      keyword.value = ''
      extFilter.value = ''
      reloadList()
    }
  }
)

watch(activeCategory, () => {
  if (visible.value) reloadList()
})

watch(viewerVisible, (open) => {
  if (open) {
    clearHoverTimers()
    hoverVisible.value = false
    hoverItem.value = null
  }
})

const beforeUpload = (file: File) => {
  if (!props.bizId) {
    $baseMessage('请先选择制令', 'warning', 'hey')
    return false
  }
  if (file.size > 50 * 1024 * 1024) {
    $baseMessage('单文件最大 50MB', 'warning', 'hey')
    return false
  }
  return true
}

const doUpload = async (options: any) => {
  const file = options?.file as File
  if (!file) return
  uploading.value = true
  try {
    await uploadAttachment({
      bizType: props.bizType,
      bizId: props.bizId,
      file,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
    })
    $baseMessage('上传成功', 'success', 'hey')
    await reloadList()
    options?.onSuccess?.({})
  } catch (e: any) {
    $baseMessage(e?.message || '上传失败', 'error', 'hey')
    options?.onError?.(e)
  } finally {
    uploading.value = false
  }
}

const openPreview = (item: BizAttachment) => {
  if (!item.file && !item.url) {
    $baseMessage('该样例暂无预览源，请上传本地文件后预览', 'warning', 'hey')
    return
  }
  clearHoverTimers()
  hoverVisible.value = false
  hoverItem.value = null
  viewerId.value = item.id
  viewerVisible.value = true
}

const downloadOne = (item: BizAttachment) => {
  if (!item.url) {
    $baseMessage('文件地址为空', 'warning', 'hey')
    return
  }
  const a = document.createElement('a')
  a.href = item.url
  a.download = item.name || 'download'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const removeOne = async (item: BizAttachment) => {
  try {
    await ElMessageBox.confirm(`确定删除「${item.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteAttachment(item.id, props.bizType, props.bizId)
    $baseMessage('已删除', 'success', 'hey')
    if (viewerId.value === item.id) viewerVisible.value = false
    if (hoverItem.value?.id === item.id) {
      hoverVisible.value = false
      hoverItem.value = null
    }
    await reloadList()
  } catch (e: any) {
    $baseMessage(e?.message || '删除失败', 'error', 'hey')
  }
}

const handleClosed = () => {
  clearHoverTimers()
  hoverVisible.value = false
  hoverItem.value = null
  viewerVisible.value = false
  list.value = []
}

onBeforeUnmount(() => {
  clearHoverTimers()
})
</script>

<style lang="scss">
.attachment-drawer {
  .el-drawer__body {
    padding: 0;
    overflow: hidden;
  }
}

.ad-hover-preview {
  position: fixed;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
}

.ad-hover-preview__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.ad-hover-preview__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.ad-hover-preview__bd {
  flex: 1;
  min-height: 0;
  background: #f5f7fa;
}

.ad-hover-preview__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111;
}

.ad-hover-preview__frame,
.ad-hover-preview__viewer {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>

<style lang="scss" scoped>
.ad-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
.ad-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}
.ad-topbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.ad-hero {
  padding: 0 16px 12px;
}
.ad-hero-id {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
  letter-spacing: 0.2px;
}
.ad-hero-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}
.ad-upload {
  padding: 0 16px 12px;
  :deep(.el-upload) {
    width: 100%;
  }
  :deep(.el-upload-dragger) {
    width: 100%;
    padding: 18px 12px;
    border-radius: 8px;
    background: #fafbfc;
  }
}
.ad-upload-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ad-upload-text {
  font-size: 14px;
  color: #606266;
}
.ad-upload-tip {
  font-size: 12px;
  color: #a8abb2;
  margin-bottom: 4px;
}
.ad-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 10px;
}
.ad-cat {
  border: 1px solid #e4e7ed;
  background: #fff;
  color: #606266;
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  &.active {
    color: #409eff;
    border-color: #409eff;
    background: #ecf5ff;
  }
}
.ad-filters {
  display: flex;
  gap: 8px;
  padding: 0 16px 10px;
}
.ad-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 10px 10px;
}
.ad-empty {
  padding-top: 40px;
}
.ad-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background 0.15s;
  &:hover,
  &.is-hover {
    background: #f5f7fa;
  }
}
.ad-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  background: #909399;
  &.ext-pdf {
    background: #f56c6c;
  }
  &.ext-xls {
    background: #67c23a;
  }
  &.ext-doc {
    background: #409eff;
  }
  &.ext-ppt {
    background: #e6a23c;
  }
  &.ext-img {
    background: #9b59b6;
  }
}
.ad-item-main {
  flex: 1;
  min-width: 0;
}
.ad-item-name {
  font-size: 13px;
  font-weight: 560;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-item-meta {
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}
.ad-item-actions {
  display: flex;
  flex-shrink: 0;
  opacity: 0.85;
}
.ad-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fafafa;
}
.ad-storage-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}
</style>
