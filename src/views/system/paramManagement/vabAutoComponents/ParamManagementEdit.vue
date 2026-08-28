<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body :title="title" width="560px" @close="handleClose">
    <el-form ref="formRef" label-width="90px" :model="form" :rules="rules" @submit.prevent>
      <el-form-item label="参数名" prop="paramName">
        <el-input v-model.trim="form.paramName" clearable maxlength="100" placeholder="请输入参数名" />
      </el-form-item>
      <el-form-item prop="paramKey">
        <template #label>
          <span>参数键</span>
          <el-tooltip content="参数键为系统内部唯一标识，请勿随意修改" placement="top">
            <el-icon class="form-tip-icon"><question-filled /></el-icon>
          </el-tooltip>
        </template>
        <el-input
          v-model.trim="form.paramKey"
          clearable
          :disabled="isEditMode"
          maxlength="100"
          placeholder="请输入参数键"
        />
      </el-form-item>
      <el-form-item prop="paramValue">
        <template #label>
          <span>参数值</span>
          <el-tooltip content="包含敏感关键词（security/auth/password）的配置不展示具体数值" placement="top">
            <el-icon class="form-tip-icon"><question-filled /></el-icon>
          </el-tooltip>
        </template>
        <el-input v-model="form.paramValue" clearable placeholder="请输入参数值" :rows="3" type="textarea" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model.trim="form.remark" clearable maxlength="200" placeholder="请输入备注" :rows="2" type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="isSaving" type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import { QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { doEdit, getParamDetail } from '/@/api/paramManagement'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'ParamManagementEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const formRef = ref<FormInstance>()
/** 详情返回的脱敏值，未修改则提交时不传 paramValue，避免把掩码写回库 */
const initialMaskedValue = ref<string | null>(null)

const form = reactive({
  id: '',
  paramName: '',
  paramKey: '',
  paramValue: '',
  remark: '',
})

const isEditMode = computed(() => !!form.id)
const title = computed(() => (isEditMode.value ? '编辑参数' : '添加参数'))

const rules: FormRules = {
  paramName: [
    { required: true, message: '参数名不能为空', trigger: 'blur' },
    { min: 1, max: 100, message: '参数名长度不超过100个字符', trigger: 'blur' },
  ],
  paramKey: [
    { required: true, message: '参数键不能为空', trigger: 'blur' },
    { min: 1, max: 100, message: '参数键长度不超过100个字符', trigger: 'blur' },
  ],
  paramValue: [{ required: true, message: '参数值不能为空', trigger: 'blur' }],
}

const resetForm = () => {
  initialMaskedValue.value = null
  Object.assign(form, {
    id: '',
    paramName: '',
    paramKey: '',
    paramValue: '',
    remark: '',
  })
  formRef.value?.resetFields()
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    paramName: data.paramName || '',
    paramKey: data.paramKey || '',
    paramValue: data.paramValue ?? '',
    remark: data.remark || '',
  })
  initialMaskedValue.value = form.paramValue
}

const showEdit = async (row?: any) => {
  resetForm()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getParamDetail, row))
  }
  dialogFormVisible.value = true
}

defineExpose({ showEdit })

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }

  isSaving.value = true
  try {
    const payload: Record<string, any> = {
      id: form.id || undefined,
      paramName: form.paramName,
      paramKey: form.paramKey,
      remark: form.remark,
      paramValue: form.paramValue,
    }
    // 对齐 Saber3 sensitive：脱敏值未改则不提交该字段，避免覆盖真实值
    if (isEditMode.value && initialMaskedValue.value != null && form.paramValue === initialMaskedValue.value) {
      delete payload.paramValue
    }
    const { msg, success }: any = await doEdit(payload)
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    // 先关弹窗再刷新列表，避免遮罩/时序导致列表不更新
    await afterSaveSuccess(dialogFormVisible, msg || '保存成功', () => emit('fetch-data'))
  } catch (e: any) {
    afterSaveFail(e)
  } finally {
    isSaving.value = false
  }
}

const handleClose = () => {
  dialogFormVisible.value = false
}
</script>

<style lang="scss" scoped>
.form-tip-icon {
  margin-left: 4px;
  vertical-align: middle;
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
