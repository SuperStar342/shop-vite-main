<template>
  <vab-dialog v-model="dialogVisible" append-to-body :title="title" width="640px" @close="handleClose">
    <el-form ref="formRef" label-width="100px" :model="form" :rules="rules" @submit.prevent>
      <el-form-item label="所属菜单" prop="menuId">
        <el-tree-select
          v-model="form.menuId"
          check-strictly
          clearable
          default-expand-all
          filterable
          :data="menuOptions"
          :loading="menusLoading"
          node-key="id"
          :props="{ label: 'label', value: 'id', children: 'children' }"
          placeholder="请选择所属菜单"
          render-after-expand
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="权限名称" prop="scopeName">
        <el-input v-model.trim="form.scopeName" clearable maxlength="50" placeholder="如：用户列表接口" />
      </el-form-item>
      <el-form-item label="权限编号" prop="resourceCode">
        <el-input v-model.trim="form.resourceCode" clearable maxlength="100" placeholder="如 blade-system:user:list" />
      </el-form-item>
      <el-form-item label="权限路径" prop="scopePath">
        <el-input v-model.trim="form.scopePath" clearable maxlength="200" placeholder="如 /blade-system/user/page" />
      </el-form-item>
      <el-form-item label="接口类型" prop="scopeType">
        <el-select v-model="form.scopeType" clearable placeholder="请选择接口类型" style="width: 100%">
          <el-option v-for="o in scopeTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model.trim="form.remark" clearable type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="saving" type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { getList, getTree } from '/@/api/menuManagement'
import { doEditApiScope, getApiScopeDetail } from '/@/api/permission'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'ApiScopeEdit',
})

const props = withDefaults(
  defineProps<{
    scopeTypeOptions?: { label: string; value: number }[]
  }>(),
  { scopeTypeOptions: () => [] }
)

const scopeTypeOptions = computed(() => props.scopeTypeOptions || [])

const emit = defineEmits(['fetch-data'])

const dialogVisible = ref(false)
const saving = ref(false)
const menusLoading = ref(false)
const formRef = ref<FormInstance>()
const menuOptions = ref<any[]>([])

const form = reactive<any>({
  id: '',
  menuId: '',
  scopeName: '',
  resourceCode: '',
  scopePath: '',
  scopeType: undefined,
  remark: '',
})

const title = computed(() => (form.id ? '编辑接口权限' : '添加接口权限'))

const rules: FormRules = {
  menuId: [{ required: true, message: '请选择所属菜单', trigger: 'change' }],
  scopeName: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  resourceCode: [{ required: true, message: '请输入权限编号', trigger: 'blur' }],
  scopePath: [{ required: true, message: '请输入权限路径', trigger: 'blur' }],
  scopeType: [{ required: true, message: '请选择接口类型', trigger: 'change' }],
}

const loadMenus = async () => {
  menusLoading.value = true
  try {
    let list: any[] = []
    try {
      const treeRes: any = await getTree()
      list = treeRes?.data?.list || []
    } catch {
      /* fall through */
    }
    if (!list.length) {
      const listRes: any = await getList()
      list = listRes?.data?.list || []
    }
    menuOptions.value = list
    if (!list.length) {
      $baseMessage('未加载到菜单树，请确认菜单管理有数据', 'warning', 'hey')
    }
  } catch (e: any) {
    menuOptions.value = []
    $baseMessage(e?.message || e?.msg || '加载菜单失败', 'error', 'hey')
  } finally {
    menusLoading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    id: '',
    menuId: '',
    scopeName: '',
    resourceCode: '',
    scopePath: '',
    scopeType: undefined,
    remark: '',
  })
  formRef.value?.clearValidate()
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    menuId: data.menuId != null ? String(data.menuId) : '',
    scopeName: data.scopeName || '',
    resourceCode: data.resourceCode || '',
    scopePath: data.scopePath || '',
    scopeType: data.scopeType != null ? Number(data.scopeType) : undefined,
    remark: data.remark || '',
  })
}

const showEdit = async (row?: any) => {
  resetForm()
  dialogVisible.value = true
  await loadMenus()
  if (row?.id) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getApiScopeDetail, row))
  }
}

defineExpose({ showEdit })

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const { msg, success }: any = await doEditApiScope(form)
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    await afterSaveSuccess(dialogVisible, msg || '保存成功', () => emit('fetch-data'))
  } catch (e: any) {
    afterSaveFail(e)
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>
