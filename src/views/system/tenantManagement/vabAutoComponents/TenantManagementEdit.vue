<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body class="tenant-edit-dialog" :title="title" width="640px" @close="handleClose">
    <el-form ref="formRef" class="tenant-edit-form" label-position="top" :model="form" :rules="validationRules" @submit.prevent>
      <el-row :gutter="16">
        <el-col v-if="isEditMode" :md="12" :span="24">
          <el-form-item label="租户编码" prop="tenantId">
            <el-input v-model.trim="form.tenantId" disabled />
          </el-form-item>
        </el-col>
        <el-col :md="isEditMode ? 12 : 24" :span="24">
          <el-form-item label="租户名称" prop="tenantName">
            <el-input
              v-model.trim="form.tenantName"
              clearable
              maxlength="100"
              placeholder="请输入租户名称"
              @blur="validateField('tenantName')"
            />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="联系人" prop="linkman">
            <el-input v-model.trim="form.linkman" clearable maxlength="50" placeholder="请输入联系人姓名" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="联系电话" prop="contactNumber">
            <el-input v-model.trim="form.contactNumber" clearable maxlength="20" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="联系地址" prop="address">
            <el-input v-model.trim="form.address" clearable maxlength="200" placeholder="请输入联系地址" type="textarea" :rows="2" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="绑定域名" prop="domainUrl">
            <el-input v-model.trim="form.domainUrl" clearable maxlength="200" placeholder="请输入租户域名（可选）" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="系统背景" prop="backgroundUrl">
            <div class="bg-row">
              <div class="bg-uploader">
                <el-upload
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  :disabled="bgUploading"
                  :http-request="handleBackgroundUpload"
                  :show-file-list="false"
                >
                  <div class="bg-preview-wrapper" :class="{ 'is-uploading': bgUploading }">
                    <img
                      v-if="bgDisplayUrl && !bgUploading"
                      alt="系统背景"
                      class="bg-preview"
                      :src="bgDisplayUrl"
                      @error="handleBgPreviewError"
                    />
                    <div v-else class="bg-upload-placeholder">
                      <el-icon v-if="bgUploading" class="is-loading bg-upload-icon"><Loading /></el-icon>
                      <el-icon v-else class="bg-upload-icon"><Plus /></el-icon>
                      <span>{{ bgUploading ? '上传中...' : '图片上传' }}</span>
                    </div>
                  </div>
                </el-upload>
                <button v-if="form.backgroundUrl || bgLocalPreview" class="remove-bg-btn" type="button" @click="removeBackground">
                  <el-icon><Close /></el-icon>
                </button>
              </div>
              <!-- <div class="bg-meta">
                <p class="bg-tip">图片上传至 MinIO，租户表仅保存外链 URL（backgroundUrl）</p>
                <p v-if="form.backgroundUrl && !String(form.backgroundUrl).startsWith('data:')" class="bg-url" :title="form.backgroundUrl">
                  {{ form.backgroundUrl }}
                </p>
                <el-button v-if="form.backgroundUrl || bgLocalPreview" link type="danger" @click="removeBackground">移除背景</el-button>
              </div> -->
            </div>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="过期时间" prop="expireTime">
            <el-date-picker
              v-model="form.expireTime"
              type="datetime"
              placeholder="选择过期时间（可选）"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="isSaving" type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import { Close, Loading, Plus } from '@element-plus/icons-vue'
import type { FormInstance, UploadRequestOptions } from 'element-plus'
import { doEdit, getTenantDetail, uploadTenantBackground } from '/@/api/tenantManagement'
import { $baseMessage } from '/@/hooks'
import { loadEditDetail } from '/@/utils/formDialog'
import { toOssPreviewUrl } from '/@/utils/ossUrl'

defineOptions({
  name: 'TenantManagementEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const formRef = ref<FormInstance>()
const bgUploading = ref(false)
const bgLocalPreview = ref('')
const bgPreviewBroken = ref(false)

const form = reactive<any>({
  id: '',
  tenantId: '',
  tenantName: '',
  linkman: '',
  contactNumber: '',
  address: '',
  domainUrl: '',
  backgroundUrl: '',
  expireTime: '',
  status: 1,
})

const isEditMode = computed(() => !!form.id)

const title = computed(() => (isEditMode.value ? '编辑租户' : '添加租户'))

const bgDisplayUrl = computed(() => {
  if (bgLocalPreview.value) return bgLocalPreview.value
  return toOssPreviewUrl(form.backgroundUrl)
})

const validationRules = computed(() => ({
  tenantName: [
    { required: true, message: '租户名称不能为空', trigger: 'blur' },
    { min: 2, max: 100, message: '租户名称长度为2-100个字符', trigger: 'blur' },
  ],
  linkman: [{ required: true, message: '联系人不能为空', trigger: 'blur' }],
  contactNumber: [{ pattern: /^1[3-9]\d{9}$|^$/, message: '请输入正确的手机号码', trigger: 'blur' }],
}))

const validateField = (field: string) => {
  formRef.value?.validateField(field)
}

const revokeLocalPreview = () => {
  if (bgLocalPreview.value && bgLocalPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(bgLocalPreview.value)
  }
  bgLocalPreview.value = ''
}

const resetForm = () => {
  revokeLocalPreview()
  bgPreviewBroken.value = false
  Object.assign(form, {
    id: '',
    tenantId: '',
    tenantName: '',
    linkman: '',
    contactNumber: '',
    address: '',
    domainUrl: '',
    backgroundUrl: '',
    expireTime: '',
    status: 1,
  })
  formRef.value?.resetFields()
}

const fillForm = (data: any) => {
  const expire = data.expireTime || data.endTime || ''
  let expireTime = ''
  if (expire) {
    const s = String(expire).replace('T', ' ')
    expireTime = s.length >= 19 ? s.slice(0, 19) : s
  }
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    tenantId: data.tenantId || data.tenantCode || data.code || '',
    tenantName: data.tenantName || data.name || '',
    linkman: data.linkman || data.linkMan || data.contactName || '',
    contactNumber: data.contactNumber || data.contactPhone || data.phone || '',
    address: data.address || '',
    domainUrl: data.domainUrl || data.tenantDomain || data.domain || '',
    backgroundUrl: data.backgroundUrl || '',
    expireTime,
    status: data.status ?? 1,
  })
}

const showEdit = async (row?: any) => {
  resetForm()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getTenantDetail, row))
  }
  dialogFormVisible.value = true
}

defineExpose({ showEdit })

const handleBackgroundUpload = async (options: UploadRequestOptions) => {
  const file = options.file as File
  if (!file.type.startsWith('image/')) {
    $baseMessage('只能上传图片文件', 'error', 'hey')
    return
  }
  if (file.size / 1024 / 1024 >= 5) {
    $baseMessage('图片大小不能超过 5MB', 'error', 'hey')
    return
  }

  revokeLocalPreview()
  bgLocalPreview.value = URL.createObjectURL(file)
  bgPreviewBroken.value = false

  bgUploading.value = true
  try {
    const { url } = await uploadTenantBackground(file)
    form.backgroundUrl = url
    $baseMessage('背景图上传成功', 'success', 'hey')
    options.onSuccess?.({ link: url } as any)
  } catch (e: any) {
    form.backgroundUrl = ''
    revokeLocalPreview()
    $baseMessage(e?.message || e?.msg || '背景图上传失败', 'error', 'hey')
    options.onError?.(e as any)
  } finally {
    bgUploading.value = false
  }
}

const handleBgPreviewError = () => {
  if (bgLocalPreview.value) {
    bgPreviewBroken.value = true
    return
  }
  if (form.backgroundUrl) {
    const proxied = toOssPreviewUrl(form.backgroundUrl)
    if (proxied && proxied !== form.backgroundUrl && !String(bgDisplayUrl.value).startsWith('/oss-minio/')) {
      bgLocalPreview.value = proxied
      return
    }
    bgPreviewBroken.value = true
  }
}

const removeBackground = () => {
  form.backgroundUrl = ''
  revokeLocalPreview()
  bgPreviewBroken.value = false
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  isSaving.value = true
  try {
    await doEdit(form)
    dialogFormVisible.value = false
    $baseMessage('保存成功', 'success', 'hey')
    emit('fetch-data')
  } catch (e: any) {
    $baseMessage(e?.message || e?.msg || '保存失败', 'error', 'hey')
  } finally {
    isSaving.value = false
  }
}

const handleClose = () => {
  dialogFormVisible.value = false
  revokeLocalPreview()
}
</script>

<style lang="scss" scoped>
.tenant-edit-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}

.bg-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.bg-uploader {
  position: relative;
  flex-shrink: 0;
}

.bg-preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 112px;
  overflow: hidden;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-uploading {
    pointer-events: none;
    opacity: 0.85;
  }
}

.bg-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bg-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  .bg-upload-icon {
    font-size: 28px;
  }
}

.remove-bg-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--el-color-danger);
  color: #fff;
  cursor: pointer;
}

.bg-meta {
  min-width: 0;
  flex: 1;
}

.bg-tip {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.bg-url {
  margin: 6px 0 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-color-primary);
}
</style>
