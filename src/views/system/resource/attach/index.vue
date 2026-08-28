<template>
  <div class="attach-management-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="12">
        <el-button :icon="Upload" type="primary" @click="handleUpload">上传附件</el-button>
        <el-button :icon="Delete" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="12">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model.trim="queryForm.name" clearable placeholder="请输入附件名称" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.originalName" clearable placeholder="请输入附件原名" />
          </el-form-item>
          <el-form-item>
            <el-input v-model.trim="queryForm.extension" clearable placeholder="请输入扩展名" />
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
      <el-table-column align="center" label="预览" width="72">
        <template #default="{ row }">
          <el-image
            v-if="isImageExt(row) && getAttachUrl(row)"
            class="attach-thumb"
            fit="cover"
            :preview-src-list="[getAttachUrl(row)]"
            preview-teleported
            :src="getAttachUrl(row)"
          />
          <el-icon v-else class="attach-thumb-icon" :title="getAttachExt(row) || '文件'"><document /></el-icon>
        </template>
      </el-table-column>
      <el-table-column align="center" label="附件名称" min-width="150" prop="name" show-overflow-tooltip />
      <el-table-column align="center" label="附件原名" min-width="150" prop="originalName" show-overflow-tooltip />
      <el-table-column align="center" label="扩展名" min-width="100" prop="extension" show-overflow-tooltip />
      <el-table-column align="center" label="附件大小" min-width="120">
        <template #default="{ row }">
          <span>{{ row.sizeLabel }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="附件地址" min-width="200" prop="link" show-overflow-tooltip />
      <el-table-column align="center" label="附件域名" min-width="200" prop="domainUrl" show-overflow-tooltip />
      <el-table-column align="center" label="修改时间" min-width="160" prop="datetime" show-overflow-tooltip />
      <el-table-column align="center" label="操作" width="220">
        <template #default="{ row }">
          <div class="table-op-links">
            <el-button link type="primary" @click="handlePreview(row)">预览</el-button>
            <el-button link :loading="downloadingId === getRowId(row)" type="primary" @click="handleDownload(row)">
              下载
            </el-button>
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
    <attach-edit ref="editRef" @fetch-data="fetchData" />

    <vab-dialog
      v-model="previewVisible"
      append-to-body
      class="attach-preview-dialog"
      :title="previewTitle"
      width="820px"
      @close="handlePreviewClose"
    >
      <div class="attach-preview-body">
        <el-image
          v-if="previewKind === 'image' && previewUrl"
          class="attach-preview-image"
          fit="contain"
          :preview-src-list="[previewUrl]"
          preview-teleported
          :src="previewUrl"
        />
        <iframe v-else-if="previewKind === 'pdf' && previewUrl" class="attach-preview-frame" :src="previewUrl" title="pdf-preview" />
        <video v-else-if="previewKind === 'video' && previewUrl" class="attach-preview-media" controls :src="previewUrl" />
        <audio v-else-if="previewKind === 'audio' && previewUrl" class="attach-preview-audio" controls :src="previewUrl" />
        <div v-else class="attach-preview-fallback">
          <el-icon class="attach-preview-fallback-icon"><document /></el-icon>
          <p>该文件类型暂不支持在线预览</p>
          <el-button type="primary" @click="handleDownload(previewRow)">下载文件</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="handlePreviewClose">关闭</el-button>
        <el-button :loading="!!previewRow && downloadingId === getRowId(previewRow)" type="primary" @click="handleDownload(previewRow)">
          下载
        </el-button>
      </template>
    </vab-dialog>

    <vab-dialog v-model="uploadDialogVisible" append-to-body class="attach-upload-dialog" title="上传附件" width="600px" @close="handleUploadClose">
      <el-upload
        ref="uploadRef"
        :auto-upload="true"
        class="attach-uploader"
        :drag="true"
        :http-request="handleHttpRequest"
        :limit="10"
        :multiple="true"
        :on-exceed="handleFileExceed"
        :show-file-list="true"
      >
        <el-icon class="upload-icon"><upload-filled /></el-icon>
        <div class="upload-tip">拖拽文件到此处，或<em>点击上传</em></div>
        <div class="upload-hint">支持多文件上传，单次最多上传10个文件</div>
      </el-upload>
      <template #footer>
        <el-button @click="handleUploadClose">关闭</el-button>
      </template>
    </vab-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Delete, Document, Refresh, Search, Upload, UploadFilled } from '@element-plus/icons-vue'
import type { TableInstance, UploadInstance, UploadRequestOptions } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import { doAttachDelete, getAttachList, uploadAttachFile } from '/@/api/resource'
import { $baseMessage } from '/@/hooks'
import { toOssPreviewUrl } from '/@/utils/ossUrl'
import AttachEdit from './vabAutoComponents/AttachEdit.vue'

defineOptions({
  name: 'AttachManagement',
})

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'])
const PDF_EXTS = new Set(['pdf'])

type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'other'

const tableRef = ref<TableInstance>()
const editRef = ref<any>(null)
const uploadRef = ref<UploadInstance>()
const list = ref<any>([])
const listLoading = ref<boolean>(true)

const total = ref<number>(0)
const selectRows = ref<any>([])
const uploadDialogVisible = ref(false)
const downloadingId = ref('')

const previewVisible = ref(false)
const previewUrl = ref('')
const previewTitle = ref('附件预览')
const previewKind = ref<PreviewKind>('other')
const previewRow = ref<any>(null)

const normalizeExt = (ext?: string) =>
  String(ext || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()

const getAttachExt = (row?: any) => {
  const fromField = normalizeExt(row?.extension)
  if (fromField) return fromField
  const name = String(row?.originalName || row?.name || row?.link || '')
  const match = name.match(/\.([a-z0-9]+)(?:\?|#|$)/i)
  return match ? match[1].toLowerCase() : ''
}

const isImageExt = (extOrRow?: string | any) => {
  const ext = typeof extOrRow === 'string' || extOrRow == null ? normalizeExt(extOrRow as string) : getAttachExt(extOrRow)
  return IMAGE_EXTS.has(ext)
}

const getPreviewKind = (ext?: string): PreviewKind => {
  const e = normalizeExt(ext)
  if (IMAGE_EXTS.has(e)) return 'image'
  if (PDF_EXTS.has(e)) return 'pdf'
  if (VIDEO_EXTS.has(e)) return 'video'
  if (AUDIO_EXTS.has(e)) return 'audio'
  return 'other'
}

const getAttachUrl = (row?: any) => {
  if (!row) return ''
  return toOssPreviewUrl(row.link || row.domainUrl || '')
}

const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  name: '',
  originalName: '',
  extension: '',
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
  const { msg, success }: any = await doAttachDelete({ ids })
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
  ElMessageBox.confirm('您确定要删除当前附件吗？', '提示', {
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
  ElMessageBox.confirm('您确定要删除选中附件吗？', '提示', {
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

const handleUpload = () => {
  uploadDialogVisible.value = true
}

/** 走统一 request，自动带 Blade-Auth / Tenant-Id / Authorization */
const handleHttpRequest = async (options: UploadRequestOptions) => {
  const raw = options.file as File
  try {
    await uploadAttachFile(raw)
    options.onSuccess?.({} as any)
    $baseMessage(`${raw.name} 上传成功`, 'success', 'hey')
    fetchData()
  } catch (e: any) {
    const msg = e?.message || e?.msg || '上传失败'
    options.onError?.(e as any)
    $baseMessage(`${raw.name} ${msg}`, 'error', 'hey')
  }
}

const handleFileExceed = () => {
  $baseMessage('单次最多上传 10 个文件', 'warning', 'hey')
}

const handleUploadClose = () => {
  uploadDialogVisible.value = false
  uploadRef.value?.clearFiles()
}

const handleEdit = (row: any = {}) => {
  editRef.value.showEdit(row)
}

const handlePreview = (row: any) => {
  const url = getAttachUrl(row)
  if (!url) {
    $baseMessage('附件地址为空，无法预览', 'warning', 'hey')
    return
  }
  previewRow.value = row
  previewUrl.value = url
  previewKind.value = getPreviewKind(getAttachExt(row))
  previewTitle.value = `预览 - ${row.originalName || row.name || '附件'}`
  previewVisible.value = true
}

const handlePreviewClose = () => {
  previewVisible.value = false
  previewUrl.value = ''
  previewRow.value = null
  previewKind.value = 'other'
}

const handleDownload = async (row?: any) => {
  if (!row) return
  const url = getAttachUrl(row)
  const id = getRowId(row)
  const fileName = row.originalName || row.name || 'download'
  if (!url) {
    $baseMessage('附件地址为空，无法下载', 'warning', 'hey')
    return
  }
  downloadingId.value = id
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
    $baseMessage('开始下载', 'success', 'hey')
  } catch {
    // 跨域或代理异常时回退新窗口打开
    window.open(url, '_blank')
  } finally {
    downloadingId.value = ''
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

const fetchData = async () => {
  listLoading.value = true
  try {
    const { data } = await getAttachList(queryForm)
    list.value = data.list || []
    total.value = data.total
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || e?.msg || '加载附件列表失败', 'error', 'hey')
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

.attach-management-container {
  :deep(.el-table) {
    --el-table-row-hover-bg-color: rgba(245, 247, 250, 1);
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: rgba(245, 247, 250, 1) !important;
  }
}

.attach-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: zoom-in;
}

.attach-thumb-icon {
  font-size: 22px;
  color: var(--el-text-color-secondary);
}

.attach-preview-body {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attach-preview-image {
  max-width: 100%;
  max-height: 70vh;
}

.attach-preview-frame {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.attach-preview-media {
  width: 100%;
  max-height: 70vh;
  background: #000;
  border-radius: 6px;
}

.attach-preview-audio {
  width: 100%;
}

.attach-preview-fallback {
  text-align: center;
  color: var(--el-text-color-secondary);

  p {
    margin: 12px 0 16px;
  }
}

.attach-preview-fallback-icon {
  font-size: 48px;
}

.attach-uploader {
  :deep(.el-upload) {
    width: 100%;
    height: 200px;
  }

  :deep(.el-upload-dragger) {
    width: 100%;
    height: 100%;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    background: var(--el-fill-color-light);
    transition:
      border-color 0.2s,
      background-color 0.2s;

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.is-dragover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  .upload-icon {
    font-size: 48px;
    color: var(--el-color-primary);
  }

  .upload-tip {
    margin-top: 12px;
    font-size: 14px;
    color: var(--el-text-color-primary);

    em {
      color: var(--el-color-primary);
      cursor: pointer;
    }
  }

  .upload-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
