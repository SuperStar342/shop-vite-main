<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body class="sms-edit-dialog" :title="title" width="720px" @close="handleClose">
    <el-form ref="formRef" class="sms-edit-form" label-position="top" :model="form" :rules="validationRules" @submit.prevent>
      <el-row :gutter="16">
        <el-col :md="12" :span="24">
          <el-form-item label="短信类型" prop="category">
            <el-select v-model="form.category" placeholder="请选择短信类型">
              <el-option label="阿里云短信" :value="1" />
              <el-option label="腾讯云短信" :value="2" />
              <el-option label="七牛云短信" :value="3" />
              <el-option label="云片短信" :value="4" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="资源编号" prop="smsCode">
            <el-input v-model.trim="form.smsCode" clearable maxlength="50" placeholder="请输入资源编号" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="模板ID" prop="templateId">
            <el-input v-model.trim="form.templateId" clearable maxlength="100" placeholder="请输入模板ID" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="短信签名" prop="signName">
            <el-input v-model.trim="form.signName" clearable maxlength="50" placeholder="请输入短信签名" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="AccessKey" prop="accessKey">
            <el-input v-model.trim="form.accessKey" clearable maxlength="100" placeholder="请输入AccessKey" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="SecretKey" prop="secretKey">
            <el-input v-model.trim="form.secretKey" clearable maxlength="100" placeholder="请输入SecretKey" show-password />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="地域ID">
            <el-input v-model.trim="form.regionId" clearable maxlength="50" placeholder="请输入地域ID（可选）" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="应用ID">
            <el-input v-model.trim="form.appId" clearable maxlength="50" placeholder="请输入应用ID（可选）" />
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
            <el-input v-model.trim="form.remark" clearable maxlength="200" placeholder="请输入备注（可选）" type="textarea" :rows="2" />
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
import { doSmsEnable, doSmsSubmit, getSmsDetail } from '/@/api/resource'
import { $baseMessage } from '/@/hooks'
import { loadEditDetail } from '/@/utils/formDialog'

const STATUS_ENABLED = 2

defineOptions({
  name: 'SmsEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<any>({
  id: '',
  smsCode: '',
  templateId: '',
  category: '',
  accessKey: '',
  secretKey: '',
  regionId: '',
  appId: '',
  signName: '',
  remark: '',
  status: 1,
})

const isEditMode = computed(() => !!form.id)

const title = computed(() => (isEditMode.value ? '编辑短信配置' : '添加短信配置'))

const validationRules = computed(() => ({
  category: [{ required: true, message: '请选择短信类型', trigger: 'change' }],
  smsCode: [{ required: true, message: '资源编号不能为空', trigger: 'blur' }],
  templateId: [{ required: true, message: '模板ID不能为空', trigger: 'blur' }],
  signName: [{ required: true, message: '短信签名不能为空', trigger: 'blur' }],
  accessKey: [{ required: true, message: 'AccessKey不能为空', trigger: 'blur' }],
  secretKey: [{ required: true, message: 'SecretKey不能为空', trigger: 'blur' }],
}))

const resetForm = () => {
  Object.assign(form, {
    id: '',
    smsCode: '',
    templateId: '',
    category: '',
    accessKey: '',
    secretKey: '',
    regionId: '',
    appId: '',
    signName: '',
    remark: '',
    status: 1,
  })
  formRef.value?.resetFields()
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    smsCode: data.smsCode || '',
    templateId: data.templateId || '',
    category: data.category != null ? Number(data.category) : '',
    accessKey: data.accessKey || '',
    secretKey: data.secretKey || '',
    regionId: data.regionId || '',
    appId: data.appId || '',
    signName: data.signName || '',
    remark: data.remark || '',
    status: data.status != null ? Number(data.status) : 1,
  })
}

const showEdit = async (row?: any) => {
  resetForm()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getSmsDetail, row))
  }
  dialogFormVisible.value = true
}

defineExpose({ showEdit })

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  isSaving.value = true
  try {
    const savedId = form.id
    await doSmsSubmit(form)
    if (form.status === STATUS_ENABLED && savedId) {
      await doSmsEnable(savedId)
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
.sms-edit-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
