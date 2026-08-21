<template>
  <vab-dialog
    v-model="dialogFormVisible"
    append-to-body
    class="user-edit-dialog"
    :title="title"
    width="760px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      class="user-edit-form"
      label-position="top"
      :model="form"
      :rules="validationRules"
      @submit.prevent
    >
      <!-- 头像 -->
      <div class="form-section avatar-section">
        <div class="form-section__title">头像</div>
        <div class="avatar-row">
          <div class="avatar-uploader">
            <el-upload
              accept="image/jpeg,image/png,image/gif,image/webp"
              :disabled="avatarUploading"
              :http-request="handleAvatarUpload"
              :show-file-list="false"
            >
              <div class="avatar-preview-wrapper" :class="{ 'is-uploading': avatarUploading }">
                <img
                  v-if="avatarDisplayUrl && !avatarUploading"
                  alt="用户头像"
                  class="avatar-preview"
                  :src="avatarDisplayUrl"
                  @error="handleAvatarPreviewError"
                />
                <div v-else class="avatar-upload-placeholder">
                  <el-icon v-if="avatarUploading" class="is-loading avatar-upload-icon"><Loading /></el-icon>
                  <el-icon v-else class="avatar-upload-icon"><Plus /></el-icon>
                  <span>{{ avatarUploading ? '上传中...' : '上传到 MinIO' }}</span>
                </div>
              </div>
            </el-upload>
            <button v-if="form.avatar || avatarLocalPreview" class="remove-avatar-btn" type="button" @click="removeAvatar">
              <el-icon><Close /></el-icon>
            </button>
          </div>
          <div class="avatar-meta">
            <p class="avatar-tip">图片将上传至 MinIO，用户表仅保存外链 URL</p>
            <p v-if="form.avatar && !String(form.avatar).startsWith('data:')" class="avatar-url" :title="form.avatar">
              {{ form.avatar }}
            </p>
            <p v-if="avatarPreviewBroken" class="avatar-tip avatar-tip--warn">
              外链无法直接访问时已走本地预览；请确认 MinIO 桶 bladex 已开放下载，并重启前端以启用 /oss-minio 代理
            </p>
            <el-button v-if="form.avatar || avatarLocalPreview" link type="danger" @click="removeAvatar">移除头像</el-button>
          </div>
        </div>
      </div>

      <!-- 账号信息 -->
      <div class="form-section">
        <div class="form-section__title">账号信息</div>
        <el-row :gutter="16">
          <el-col :md="12" :span="24">
            <el-form-item label="登录账号" prop="username">
              <el-input
                v-model.trim="form.username"
                clearable
                :disabled="isEditMode"
                maxlength="50"
                placeholder="字母、数字、下划线"
                @blur="validateField('username')"
              />
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="真实姓名" prop="name">
              <el-input
                v-model.trim="form.name"
                clearable
                maxlength="50"
                placeholder="请输入真实姓名"
                @blur="validateField('name')"
              />
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="登录密码" prop="password">
              <el-input
                v-model.trim="form.password"
                clearable
                :placeholder="isEditMode ? '留空则不修改密码；填写则为新密码' : '请输入登录密码'"
                show-password
                type="password"
                @blur="validateField('password')"
              />
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model.trim="form.confirmPassword"
                clearable
                placeholder="请再次输入密码"
                show-password
                type="password"
                @blur="validateField('confirmPassword')"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 联系方式 -->
      <div class="form-section">
        <div class="form-section__title">联系方式</div>
        <el-row :gutter="16">
          <el-col :md="12" :span="24">
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model.trim="form.email"
                clearable
                placeholder="name@example.com"
                @blur="validateField('email')"
              />
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model.trim="form.phone"
                clearable
                maxlength="11"
                placeholder="11 位手机号"
                @blur="validateField('phone')"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 组织权限 -->
      <div class="form-section">
        <div class="form-section__title">组织与权限</div>
        <el-row :gutter="16">
          <el-col :md="12" :span="24">
            <el-form-item label="所属部门" prop="deptId">
              <el-tree-select
                v-model="form.deptId"
                check-strictly
                clearable
                :data="deptTreeData"
                filterable
                placeholder="请选择部门"
                :props="{ label: 'label', value: 'value', children: 'children' }"
                :render-after-expand="false"
                @blur="validateField('deptId')"
                @change="handleDeptChange"
              />
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="所属角色" prop="roleIds">
              <el-select
                v-model="form.roleIds"
                collapse-tags
                collapse-tags-tooltip
                filterable
                multiple
                placeholder="请选择角色"
                @blur="validateField('roleIds')"
                @change="validateField('roleIds')"
              >
                <el-option
                  v-for="item in roleList"
                  :key="item.id"
                  :label="item.roleName || item.label"
                  :value="String(item.id)"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 其他 -->
      <div class="form-section">
        <div class="form-section__title">其他信息</div>
        <el-row :gutter="16">
          <el-col :md="12" :span="24">
            <el-form-item label="性别" prop="sex">
              <el-radio-group v-model="form.sex" class="radio-group">
                <el-radio-button :value="1">男</el-radio-button>
                <el-radio-button :value="2">女</el-radio-button>
                <el-radio-button :value="3">保密</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status" class="radio-group">
                <el-radio-button :value="1">已启用</el-radio-button>
                <el-radio-button :value="0">已停用</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :md="12" :span="24">
                <el-form-item label="生日" prop="birthday">
                  <el-date-picker
                    v-model="form.birthday"
                    placeholder="请选择生日"
                    style="width: 100%"
                    type="date"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    @change="validateField('birthday')"
                  />
                </el-form-item>
              </el-col>
          <el-col :md="12" :span="24">
            <el-form-item label="用户平台" prop="userType">
              <el-select v-model="form.userType" placeholder="请选择用户平台" style="width: 100%">
                <el-option :value="1" label="Web" />
                <el-option :value="2" label="App" />
                <el-option :value="3" label="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input
                v-model.trim="form.remark"
                :autosize="{ minRows: 2, maxRows: 4 }"
                maxlength="200"
                placeholder="选填备注"
                show-word-limit
                type="textarea"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="isSaving" type="primary" @click="handleSave">保存</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import { Close, Loading, Plus } from '@element-plus/icons-vue'
import type { FormInstance, UploadRequestOptions } from 'element-plus'
import { getList as getDeptList } from '/@/api/departmentManagement'
import { getList as getRoleList } from '/@/api/roleManagement'
import { doEdit, getUserDetail, uploadAvatar } from '/@/api/userManagement'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'
import { toOssPreviewUrl } from '/@/utils/ossUrl'

defineOptions({
  name: 'UserManagementEdit',
})

const emit = defineEmits(['fetch-data'])

const formRef = ref<FormInstance>()
const isSaving = ref(false)
const avatarUploading = ref(false)
const avatarLocalPreview = ref('')
const avatarPreviewBroken = ref(false)
const hasSaved = ref(false)
const title = ref('')
const dialogFormVisible = ref(false)

const form = reactive<any>({
  id: '',
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  avatar: '',
  deptId: '',
  deptName: '',
  roleIds: [] as string[],
  sex: 1,
  status: 1,
  birthday: '',
  userType: 1,
  remark: '',
})

const roleList = ref<any[]>([])
const deptTreeData = ref<any[]>([])

/** 编辑回填时的脱敏原值（未改动则不提交、不校验格式） */
const initialSensitive = reactive({ phone: '', email: '' })
const isMaskedValue = (v: string) => typeof v === 'string' && v.includes('*')

const isEditMode = computed(() => !!form.id)

/** 优先本地 blob 预览，其次走同源 MinIO 代理 */
const avatarDisplayUrl = computed(() => {
  if (avatarLocalPreview.value) return avatarLocalPreview.value
  return toOssPreviewUrl(form.avatar)
})

const revokeLocalPreview = () => {
  if (avatarLocalPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(avatarLocalPreview.value)
  }
  avatarLocalPreview.value = ''
}

const validationRules = computed(() => ({
  username: [
    { required: true, trigger: 'blur', message: '请输入登录账号' },
    { min: 2, max: 50, trigger: 'blur', message: '账号长度为 2-50 个字符' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      trigger: 'blur',
      message: '账号只能包含字母、数字和下划线',
    },
  ],
  name: [
    { required: true, trigger: 'blur', message: '请输入真实姓名' },
    { min: 2, max: 50, trigger: 'blur', message: '姓名长度为 2-50 个字符' },
  ],
  password: [
    {
      validator: (_: any, value: string, callback: (e?: Error) => void) => {
        if (!isEditMode.value && !value) {
          callback(new Error('请输入密码'))
          return
        }
        if (value && (value.length < 6 || value.length > 30)) {
          callback(new Error('密码长度为 6-30 个字符'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_: any, value: string, callback: (e?: Error) => void) => {
        if (!isEditMode.value && !value) {
          callback(new Error('请确认密码'))
          return
        }
        if ((value || form.password) && value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  email: [
    { required: true, trigger: 'blur', message: '请输入邮箱' },
    {
      validator: (_: any, value: string, callback: (e?: Error) => void) => {
        if (!value) {
          callback()
          return
        }
        // 编辑时后端返回脱敏邮箱（含 *），未改动则放行
        if (form.id && value === initialSensitive.email && isMaskedValue(value)) {
          callback()
          return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          callback(new Error('请输入有效的邮箱地址'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  phone: [
    { required: true, trigger: 'blur', message: '请输入手机号' },
    {
      validator: (_: any, value: string, callback: (e?: Error) => void) => {
        if (!value) {
          callback()
          return
        }
        // 编辑时后端返回脱敏手机号（如 138****1234），未改动则放行
        if (form.id && value === initialSensitive.phone && isMaskedValue(value)) {
          callback()
          return
        }
        if (!/^1[3-9]\d{9}$/.test(value)) {
          callback(new Error('请输入有效的 11 位手机号'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  deptId: [{ required: true, trigger: ['blur', 'change'], message: '请选择所属部门' }],
  roleIds: [
    {
      type: 'array',
      required: true,
      min: 1,
      trigger: ['blur', 'change'],
      message: '请至少选择一个角色',
    },
  ],
  birthday: [
    {
      validator: (_: any, value: string, callback: (e?: Error) => void) => {
        if (!value) {
          callback()
          return
        }
        const birthDate = new Date(value)
        const now = new Date()
        const age = now.getFullYear() - birthDate.getFullYear()
        const monthDiff = now.getMonth() - birthDate.getMonth()
        const dayDiff = now.getDate() - birthDate.getDate()
        
        if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
          callback(new Error('必须年满18岁'))
          return
        }
        callback()
      },
      trigger: ['change', 'blur'],
    },
  ],
}))

const validateField = (prop: string) => {
  formRef.value?.validateField(prop)
}

const flattenRoles = (nodes: any[] = [], acc: any[] = []) => {
  nodes.forEach((n) => {
    acc.push(n)
    if (Array.isArray(n.children) && n.children.length) flattenRoles(n.children, acc)
  })
  return acc
}

const resetForm = () => {
  Object.assign(form, {
    id: '',
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    avatar: '',
    deptId: '',
    deptName: '',
    roleIds: [],
    sex: 1,
    status: 1,
    birthday: '',
    userType: 1,
    remark: '',
  })
  initialSensitive.phone = ''
  initialSensitive.email = ''
  revokeLocalPreview()
  avatarPreviewBroken.value = false
}

const fetchRoles = async () => {
  const { data }: any = await getRoleList({ pageSize: 999 })
  roleList.value = flattenRoles(data?.list || []).filter((r) => r.id)
}

const fetchDeptTree = async () => {
  const { data }: any = await getDeptList()
  deptTreeData.value = data?.list || []
}

const findDeptName = (nodes: any[], deptId: string): string => {
  for (const node of nodes) {
    if (String(node.id) === String(deptId) || String(node.value) === String(deptId)) {
      return node.label || node.name || ''
    }
    if (node.children?.length) {
      const found = findDeptName(node.children, deptId)
      if (found) return found
    }
  }
  return ''
}

const handleDeptChange = (deptId: string) => {
  form.deptName = findDeptName(deptTreeData.value, deptId)
  validateField('deptId')
}

const handleAvatarUpload = async (options: UploadRequestOptions) => {
  const file = options.file as File
  if (!file.type.startsWith('image/')) {
    $baseMessage('只能上传图片文件', 'error', 'hey')
    return
  }
  if (file.size / 1024 / 1024 >= 2) {
    $baseMessage('图片大小不能超过 2MB', 'error', 'hey')
    return
  }

  // 选图后立刻本地预览，不依赖 MinIO 外链是否可访问
  revokeLocalPreview()
  avatarLocalPreview.value = URL.createObjectURL(file)
  avatarPreviewBroken.value = false

  avatarUploading.value = true
  try {
    const { url } = await uploadAvatar(file)
    form.avatar = url
    $baseMessage('头像已上传至 MinIO', 'success', 'hey')
    options.onSuccess?.({ link: url } as any)
  } catch (e: any) {
    form.avatar = ''
    revokeLocalPreview()
    $baseMessage(e?.message || e?.msg || '头像上传失败', 'error', 'hey')
    options.onError?.(e as any)
  } finally {
    avatarUploading.value = false
  }
}

const handleAvatarPreviewError = () => {
  // 外链失败时若仍有本地 blob，继续用本地图；否则提示
  if (avatarLocalPreview.value) {
    avatarPreviewBroken.value = true
    return
  }
  if (form.avatar) {
    // 再尝试一次代理地址（已是代理则标记失败）
    const proxied = toOssPreviewUrl(form.avatar)
    if (proxied && proxied !== form.avatar && !avatarDisplayUrl.value.startsWith('/oss-minio/')) {
      avatarLocalPreview.value = proxied
      return
    }
    avatarPreviewBroken.value = true
  }
}

const removeAvatar = () => {
  form.avatar = ''
  revokeLocalPreview()
  avatarPreviewBroken.value = false
}

const fillForm = (row: any) => {
  const roleIds = Array.isArray(row.roleIds)
    ? row.roleIds.map(String)
    : String(row.roleId || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)

  Object.assign(form, {
    id: row.id ? String(row.id) : '',
    username: row.username || row.account || '',
    name: row.name || row.realName || '',
    password: '',
    confirmPassword: '',
    email: row.email || '',
    phone: row.phone || '',
    avatar: row.avatar || '',
    deptId: row.deptId ? String(String(row.deptId).split(',')[0]) : '',
    deptName: row.deptName || '',
    roleIds,
    sex: Number(row.sex) || 1,
    status: row.status === 0 || row.status === '0' ? 0 : 1,
    birthday: row.birthday || '',
    userType: Number(row.userType || row.usertype) || 1,
    remark: row.remark || '',
  })
  initialSensitive.phone = form.phone
  initialSensitive.email = form.email
  revokeLocalPreview()
  avatarPreviewBroken.value = false
}

const showEdit = async (row: any = {}) => {
  hasSaved.value = false
  resetForm()
  dialogFormVisible.value = true
  await Promise.all([fetchRoles(), fetchDeptTree()])

  await nextTick()
  if (row?.id) {
    title.value = '编辑用户'
    const detail = await loadEditDetail(getUserDetail, row)
    fillForm({ ...row, ...detail })
  } else {
    title.value = '添加用户'
  }
  formRef.value?.clearValidate()
}

defineExpose({ showEdit })

const handleClose = () => {
  formRef.value?.clearValidate()
  dialogFormVisible.value = false
  resetForm()
}

const handleSave = async () => {
  if (avatarUploading.value) {
    $baseMessage('头像正在上传，请稍候', 'warning', 'hey')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }

  if (form.avatar && String(form.avatar).startsWith('data:')) {
    $baseMessage('头像未上传到 MinIO，请重新选择头像', 'warning', 'hey')
    return
  }

  isSaving.value = true
  try {
    // 脱敏字段未改动时不提交，避免把带 * 的值写回数据库
    const phoneUnchanged =
      !!form.id && form.phone === initialSensitive.phone && isMaskedValue(form.phone)
    const emailUnchanged =
      !!form.id && form.email === initialSensitive.email && isMaskedValue(form.email)

    const { msg, success }: any = await doEdit({
      id: form.id || undefined,
      username: form.username,
      name: form.name,
      password: form.password || undefined,
      email: emailUnchanged ? undefined : form.email,
      phone: phoneUnchanged ? undefined : form.phone,
      avatar: form.avatar || undefined,
      deptId: form.deptId,
      roleIds: form.roleIds,
      sex: form.sex,
      status: form.status,
      birthday: form.birthday,
      userType: form.userType,
      remark: form.remark,
    })
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    hasSaved.value = true
    await afterSaveSuccess(dialogFormVisible, msg || '保存成功', () => emit('fetch-data'))
  } catch (error: any) {
    afterSaveFail(error, '保存失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
.user-edit-form {
  .form-section {
    margin-bottom: 12px;
    padding: 14px 16px 4px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-blank);

    & + .form-section {
      margin-top: 12px;
    }

    &__title {
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);

      &::before {
        content: '';
        display: inline-block;
        width: 3px;
        height: 12px;
        margin-right: 8px;
        border-radius: 2px;
        background: var(--el-color-primary);
        vertical-align: -1px;
      }
    }
  }

  .avatar-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 12px;
  }

  .avatar-uploader {
    position: relative;
    flex-shrink: 0;
  }

  .avatar-url {
    margin: 6px 0 0;
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--el-color-primary);
  }

  .avatar-preview-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    overflow: hidden;
    border: 1px dashed var(--el-border-color);
    border-radius: 50%;
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

  .avatar-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    .avatar-upload-icon {
      font-size: 28px;
    }
  }

  .remove-avatar-btn {
    position: absolute;
    right: -2px;
    bottom: -2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--el-color-danger);
    color: #fff;
    cursor: pointer;
  }

  .avatar-tip {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;

    &--warn {
      margin-top: 6px;
      color: var(--el-color-warning);
    }
  }

  .radio-group {
    width: 100%;

    :deep(.el-radio-button) {
      flex: 1;

      .el-radio-button__inner {
        width: 100%;
      }
    }
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 6px !important;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  :deep(.el-tree-select),
  :deep(.el-select),
  :deep(.el-date-editor) {
    width: 100%;
  }

  :deep(.el-form-item__error) {
    padding-top: 4px;
  }
}
</style>
