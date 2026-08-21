<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body class="attach-edit-dialog" :title="title" width="640px" @close="handleClose">
    <el-form ref="formRef" class="attach-edit-form" label-position="top" :model="form" :rules="validationRules" @submit.prevent>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="附件名称" prop="name">
            <el-input v-model.trim="form.name" clearable maxlength="200" placeholder="请输入附件名称" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="附件原名" prop="originalName">
            <el-input v-model.trim="form.originalName" clearable maxlength="200" placeholder="请输入附件原名" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="扩展名" prop="extension">
            <el-input v-model.trim="form.extension" clearable maxlength="20" placeholder="请输入扩展名" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="附件大小">
            <el-input-number v-model="form.attachSize" :min="0" placeholder="请输入附件大小（字节）" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="附件地址" prop="link">
            <el-input v-model.trim="form.link" clearable maxlength="500" placeholder="请输入附件地址" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="附件域名">
            <el-input v-model.trim="form.domainUrl" clearable maxlength="200" placeholder="请输入附件域名（可选）" />
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
import { doAttachSubmit, getAttachDetail } from '/@/api/resource'
import { $baseMessage } from '/@/hooks'
import { loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'AttachEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<any>({
  id: '',
  link: '',
  domainUrl: '',
  name: '',
  originalName: '',
  extension: '',
  attachSize: '',
})

const isEditMode = computed(() => !!form.id)

const title = computed(() => (isEditMode.value ? '编辑附件' : '添加附件'))

const validationRules = computed(() => ({
  name: [{ required: true, message: '附件名称不能为空', trigger: 'blur' }],
  originalName: [{ required: true, message: '附件原名不能为空', trigger: 'blur' }],
  extension: [{ required: true, message: '扩展名不能为空', trigger: 'blur' }],
  link: [{ required: true, message: '附件地址不能为空', trigger: 'blur' }],
}))

const resetForm = () => {
  Object.assign(form, {
    id: '',
    link: '',
    domainUrl: '',
    name: '',
    originalName: '',
    extension: '',
    attachSize: '',
  })
  formRef.value?.resetFields()
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    link: data.link || '',
    domainUrl: data.domainUrl || '',
    name: data.name || '',
    originalName: data.originalName || '',
    extension: data.extension || '',
    attachSize: data.attachSize != null ? Number(data.attachSize) : '',
  })
}

const showEdit = async (row?: any) => {
  resetForm()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getAttachDetail, row))
  }
  dialogFormVisible.value = true
}

defineExpose({ showEdit })

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  isSaving.value = true
  try {
    await doAttachSubmit(form)
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
.attach-edit-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
