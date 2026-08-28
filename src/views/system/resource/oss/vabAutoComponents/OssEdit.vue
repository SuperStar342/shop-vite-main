<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body class="oss-edit-dialog" :title="title" width="720px" @close="handleClose">
    <el-form ref="formRef" class="oss-edit-form" label-position="top" :model="form" :rules="validationRules" @submit.prevent>
      <el-row :gutter="16">
        <el-col :md="12" :span="24">
          <el-form-item label="存储类型" prop="category">
            <el-select v-model="form.category" placeholder="请选择存储类型">
              <!-- 与 BladeX OssEnum / OssBuildRule 一致：1阿里 2腾讯 3七牛 4华为 5MinIO 6本地 7S3 -->
              <el-option label="阿里云OSS" :value="1" />
              <el-option label="腾讯云COS" :value="2" />
              <el-option label="七牛云" :value="3" />
              <el-option label="华为云OBS" :value="4" />
              <el-option label="MinIO" :value="5" />
              <el-option label="本地存储" :value="6" />
              <el-option label="亚马逊S3" :value="7" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="资源编号" prop="ossCode">
            <el-input v-model.trim="form.ossCode" clearable maxlength="50" placeholder="请输入资源编号" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="资源地址" prop="endpoint">
            <el-input v-model.trim="form.endpoint" clearable maxlength="200" placeholder="请输入资源地址" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="外网资源地址">
            <el-input v-model.trim="form.transformEndpoint" clearable maxlength="200" placeholder="请输入外网资源地址（可选）" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="AccessKey" prop="accessKey">
            <el-input
              v-model.trim="form.accessKey"
              clearable
              maxlength="100"
              :placeholder="isEditMode ? '不修改请留空（勿保存脱敏值）' : '请输入 AccessKey'"
            />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="SecretKey" prop="secretKey">
            <el-input
              v-model.trim="form.secretKey"
              clearable
              maxlength="100"
              :placeholder="isEditMode ? '不修改请留空（勿保存脱敏值）' : '请输入 SecretKey'"
              show-password
            />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="空间名" prop="bucketName">
            <el-input v-model.trim="form.bucketName" clearable maxlength="100" placeholder="请输入空间名" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="地域">
            <el-input v-model.trim="form.region" clearable maxlength="50" placeholder="请输入地域（可选）" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="应用ID">
            <el-input v-model.trim="form.appId" clearable maxlength="50" placeholder="请输入应用ID（腾讯云COS需要）" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="状态">
            <el-radio-group v-model="form.status">
              <el-radio :value="2">已启用</el-radio>
              <el-radio :value="1">已停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model.trim="form.remark" clearable maxlength="200" placeholder="请输入备注（可选）" :rows="2" type="textarea" />
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
import type { FormInstance } from 'element-plus'
import { doOssEnable, doOssSubmit, getOssDetail, getOssList } from '/@/api/resource'
import { $baseMessage } from '/@/hooks'
import { loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'OssEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<any>({
  id: '',
  category: '',
  ossCode: '',
  endpoint: '',
  transformEndpoint: '',
  accessKey: '',
  secretKey: '',
  bucketName: '',
  appId: '',
  region: '',
  remark: '',
  status: 1,
})

const isEditMode = computed(() => !!form.id)

const title = computed(() => (isEditMode.value ? '编辑对象存储' : '添加对象存储'))

const STATUS_ENABLED = 2
const STATUS_DISABLED = 1

const validationRules = computed(() => ({
  category: [{ required: true, message: '请选择存储类型', trigger: 'change' }],
  ossCode: [{ required: true, message: '资源编号不能为空', trigger: 'blur' }],
  endpoint: [{ required: true, message: '资源地址不能为空', trigger: 'blur' }],
  // 编辑时详情返回的是脱敏密钥，允许留空表示不改；新建必须填写
  accessKey: isEditMode.value
    ? []
    : [{ required: true, message: 'AccessKey不能为空', trigger: 'blur' }],
  secretKey: isEditMode.value
    ? []
    : [{ required: true, message: 'SecretKey不能为空', trigger: 'blur' }],
  bucketName: [{ required: true, message: '空间名不能为空', trigger: 'blur' }],
}))

const resetForm = () => {
  Object.assign(form, {
    id: '',
    category: '',
    ossCode: '',
    endpoint: '',
    transformEndpoint: '',
    accessKey: '',
    secretKey: '',
    bucketName: '',
    appId: '',
    region: '',
    remark: '',
    status: 1,
  })
  formRef.value?.resetFields()
}

const isMaskedSecret = (val: any) => typeof val === 'string' && val.includes('*')

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    category: data.category != null ? Number(data.category) : '',
    ossCode: data.ossCode || '',
    endpoint: data.endpoint || '',
    transformEndpoint: data.transformEndpoint || '',
    // 详情里的密钥已被脱敏，不能回填/再提交，否则会写坏配置
    accessKey: isMaskedSecret(data.accessKey) ? '' : data.accessKey || '',
    secretKey: isMaskedSecret(data.secretKey) ? '' : data.secretKey || '',
    bucketName: data.bucketName || '',
    appId: data.appId || '',
    region: data.region || '',
    remark: data.remark || '',
    status: data.status != null ? Number(data.status) : 1,
  })
}

const showEdit = async (row?: any) => {
  resetForm()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getOssDetail, row))
  }
  dialogFormVisible.value = true
}

defineExpose({ showEdit })

const resolveOssIdAfterSave = async () => {
  if (form.id) return String(form.id)
  const { data } = await getOssList({ ossCode: form.ossCode, pageNo: 1, pageSize: 5 })
  const hit = (data?.list || []).find((row: any) => String(row.ossCode) === String(form.ossCode))
  return hit?.id != null ? String(hit.id) : ''
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  isSaving.value = true
  try {
    await doOssSubmit(form)
    // 启用须走 /oss/enable：会停用其他配置并清缓存；新建也要调
    if (form.status === STATUS_ENABLED) {
      const id = await resolveOssIdAfterSave()
      if (id) await doOssEnable(id)
    }
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
}
</script>

<style lang="scss" scoped>
.oss-edit-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
