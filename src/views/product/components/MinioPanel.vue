<template>
  <div class="minio-panel" :class="{ 'is-collapsed': collapsed }">
    <div class="minio-panel__header" @click="collapsed = !collapsed">
      <div class="minio-panel__title">
        <el-icon><FolderOpened /></el-icon>
        <span>MinIO 文件管理</span>
      </div>
      <el-icon class="minio-panel__toggle">
        <component :is="collapsed ? ArrowUp : ArrowDown" />
      </el-icon>
    </div>

    <div v-show="!collapsed" class="minio-panel__body">
      <el-tabs v-model="tab" stretch>
        <el-tab-pane label="上传文件" name="upload" />
        <el-tab-pane label="我的文件" name="files" />
        <el-tab-pane label="文件夹" name="folder" />
      </el-tabs>

      <el-upload
        v-if="tab === 'upload'"
        class="minio-upload"
        drag
        action="#"
        multiple
        :show-file-list="false"
        :http-request="handleUpload"
        accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.glb,.gltf,.usdz"
      >
        <el-icon class="minio-upload__icon"><UploadFilled /></el-icon>
        <div class="minio-upload__text">拖拽文件到此处，或点击上传</div>
        <div class="minio-upload__tip">支持 JPG / PNG / MP4 / GLB / USDZ，单文件 ≤ 100MB</div>
      </el-upload>

      <div v-else class="minio-empty">近期上传的文件会显示在此</div>

      <ul v-if="files.length" class="minio-list">
        <li v-for="(f, idx) in files" :key="f.uid" class="minio-list__item">
          <el-icon class="minio-list__icon"><Document /></el-icon>
          <div class="minio-list__meta">
            <a class="minio-list__name" :href="f.link" target="_blank" :title="f.name">{{ f.name }}</a>
            <span class="minio-list__size">{{ f.sizeLabel }}</span>
          </div>
          <el-button link type="primary" size="small" @click="emitUse(f)">选用</el-button>
          <el-button link type="danger" size="small" @click="files.splice(idx, 1)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, Delete, Document, FolderOpened, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { uploadAttachFile } from '/@/api/resource'

type MinioFile = {
  uid: string
  name: string
  link: string
  size: number
  sizeLabel: string
  kind: 'image' | 'video' | 'model' | 'other'
}

const emit = defineEmits<{
  (e: 'use', payload: { link: string; kind: MinioFile['kind']; name: string }): void
}>()

const collapsed = ref(false)
const tab = ref('upload')
const files = ref<MinioFile[]>([])

function formatSize(size: number) {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function detectKind(file: File): MinioFile['kind'] {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/.test(name)) return 'image'
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return 'video'
  if (/\.(glb|gltf|usdz)$/.test(name)) return 'model'
  return 'other'
}

async function handleUpload(opts: any) {
  const file: File = opts.file
  if (file.size / 1024 / 1024 > 100) {
    ElMessage.error('单文件不能超过 100MB')
    opts.onError?.(new Error('too large'))
    return
  }
  try {
    const res: any = await uploadAttachFile(file)
    const link = res?.link || res?.url || ''
    if (!link) throw new Error('上传失败，未返回地址')
    const item: MinioFile = {
      uid: `${Date.now()}_${file.name}`,
      name: file.name,
      link,
      size: file.size,
      sizeLabel: formatSize(file.size),
      kind: detectKind(file),
    }
    files.value.unshift(item)
    tab.value = 'files'
    ElMessage.success('上传成功')
    emit('use', { link: item.link, kind: item.kind, name: item.name })
    opts.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
    opts.onError?.(e)
  }
}

function emitUse(f: MinioFile) {
  emit('use', { link: f.link, kind: f.kind, name: f.name })
  ElMessage.success(`已选用 ${f.name}`)
}
</script>

<style lang="scss" scoped>
.minio-panel {
  position: fixed;
  left: 88px;
  bottom: 24px;
  z-index: 1200;
  width: 320px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 35, 80, 0.16);
  border: 1px solid #e8edf5;
  overflow: hidden;

  &.is-collapsed {
    width: 220px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: linear-gradient(135deg, #1f3a68 0%, #2f5f9e 100%);
    color: #fff;
    cursor: pointer;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  &__body {
    padding: 8px 12px 12px;
  }
}

.minio-upload {
  width: 100%;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    padding: 18px 12px;
    border-radius: 10px;
    border-color: #c9d7ef;
    background: #f7faff;
  }

  &__icon {
    font-size: 28px;
    color: #409eff;
  }

  &__text {
    margin-top: 6px;
    font-size: 13px;
    color: #303133;
  }

  &__tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
}

.minio-empty {
  padding: 18px 0;
  text-align: center;
  color: #909399;
  font-size: 12px;
}

.minio-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  max-height: 160px;
  overflow: auto;

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0;
    border-bottom: 1px dashed #eef2f7;
  }

  &__icon {
    color: #409eff;
  }

  &__meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: 12px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;
  }

  &__size {
    font-size: 11px;
    color: #909399;
  }
}
</style>
