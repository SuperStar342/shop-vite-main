<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body :title="title" width="520px" @close="onDialogClose">
    <el-form ref="formRef" label-width="90px" :model="form" :rules="rules">
      <el-form-item v-if="isChildMode" label="所属字典">
        <el-input disabled :model-value="parentLabel" />
      </el-form-item>
      <el-form-item label="字典编号" prop="code">
        <el-input
          v-model.trim="form.code"
          clearable
          :disabled="isChildMode && !!form.id"
          placeholder="如 sex / yes_no"
        />
      </el-form-item>
      <el-form-item label="字典名称" prop="dictValue">
        <el-input v-model.trim="form.dictValue" clearable placeholder="显示名称" />
      </el-form-item>
      <el-form-item v-if="isChildMode" label="字典键值" prop="dictKey">
        <el-input v-model.trim="form.dictKey" clearable placeholder="存储键值，如 1 / male" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :max="9999" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="form.status"
          active-text="启用"
          :active-value="1"
          inactive-text="禁用"
          :inactive-value="0"
          inline-prompt
        />
      </el-form-item>
      <el-form-item label="是否封存" prop="isSealed">
        <el-switch
          v-model="form.isSealed"
          active-text="是"
          :active-value="1"
          inactive-text="否"
          :inactive-value="0"
          inline-prompt
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model.trim="form.remark" clearable placeholder="选填" :rows="2" type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogFormVisible = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="save">保存</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { DICT_API_KEY, systemDictApi } from '/@/api/dictionaryManagement'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'DictionaryManagementEdit',
})

const dictApi = inject(DICT_API_KEY, systemDictApi)
const emit = defineEmits(['fetch-data'])

const formRef = ref<FormInstance>()
const saving = ref(false)
const title = ref('')
const dialogFormVisible = ref(false)
const parentLabel = ref('')
const isChildMode = ref(false)

const emptyForm = () => ({
  id: '',
  parentId: '0',
  code: '',
  dictKey: '',
  dictValue: '',
  sort: 0,
  status: 1,
  isSealed: 0,
  remark: '',
})

const form = reactive<any>(emptyForm())

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: '请输入字典编号', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  dictKey: isChildMode.value
    ? [{ required: true, message: '请输入字典键值', trigger: 'blur' }]
    : [],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
}))

const resetForm = () => {
  Object.assign(form, emptyForm())
  formRef.value?.clearValidate()
}

const resolveChildMode = (row: any) =>
  !!(row?.isChild || (row?.parentId != null && String(row.parentId) !== '0' && String(row.parentId) !== ''))

const fillForm = (data: any, childMode: boolean) => {
  const parentId =
    childMode && data?.parentId != null && String(data.parentId) !== '0'
      ? String(data.parentId)
      : childMode
        ? String(data?.parentId || '0')
        : '0'
  Object.assign(form, {
    id: data?.id != null && data.id !== '' ? String(data.id) : '',
    parentId,
    code: data?.code || '',
    dictKey: childMode ? String(data?.dictKey ?? '') : '-1',
    dictValue: data?.dictValue || data?.dictName || data?.label || data?.title || '',
    sort: Number(data?.sort ?? 0),
    status: Number(data?.status ?? 1),
    isSealed: Number(data?.isSealed ?? 0),
    remark: data?.remark || '',
  })
}

/**
 * row 为空：新增父级分类
 * row 无 id 有字段：复制 / 新增子项
 * row.id：编辑（拉详情回显）
 */
const showEdit = async (row: any = {}) => {
  resetForm()
  const editing = !!(row?.id != null && String(row.id).trim() !== '')
  isChildMode.value = resolveChildMode(row)
  parentLabel.value = row?.parentLabel || row?.parentName || ''

  if (row?.__copy) {
    title.value = isChildMode.value ? '复制字典项' : '复制字典分类'
  } else if (isChildMode.value) {
    title.value = editing ? '编辑字典项' : '添加字典项'
  } else {
    title.value = editing ? '编辑字典分类' : '添加字典分类'
  }

  if (editing) {
    form.id = String(row.id)
    // 先用列表行占位，再拉详情覆盖，避免弹窗空白
    fillForm(row, isChildMode.value)
    dialogFormVisible.value = true
    const detail = await loadEditDetail((id) => dictApi.getDetail(id), row)
    // 详情可能不带 isChild / parentLabel，保留打开时的模式与所属字典名
    fillForm(
      {
        ...detail,
        parentId: detail?.parentId ?? row.parentId,
        isChild: isChildMode.value,
      },
      isChildMode.value
    )
  } else {
    fillForm(row, isChildMode.value)
    dialogFormVisible.value = true
  }

  await nextTick()
  formRef.value?.clearValidate()
}

defineExpose({ showEdit })

const onDialogClose = () => {
  formRef.value?.clearValidate()
}

const save = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }
  saving.value = true
  try {
    const { msg, success }: any = await dictApi.doEdit({
      id: form.id || undefined,
      parentId: isChildMode.value ? form.parentId : 0,
      code: form.code,
      dictKey: isChildMode.value ? form.dictKey : '-1',
      dictValue: form.dictValue,
      sort: form.sort,
      status: form.status,
      isSealed: form.isSealed,
      remark: form.remark,
      isParent: !isChildMode.value,
    })
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    await afterSaveSuccess(dialogFormVisible, msg, () => emit('fetch-data'))
  } catch (e: any) {
    afterSaveFail(e)
  } finally {
    saving.value = false
  }
}
</script>
