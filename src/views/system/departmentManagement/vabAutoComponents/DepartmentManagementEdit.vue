<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body :title="title" width="560px">
    <el-form ref="formRef" label-width="100px" :model="form" :rules="rules">
      <el-form-item label="上级部门" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          check-strictly
          clearable
          :data="parentTree"
          :disabled="!!lockParent"
          default-expand-all
          filterable
          node-key="id"
          :props="{ label: 'label', value: 'id', children: 'children', disabled: 'disabled' }"
          placeholder="不选则为顶级部门"
          render-after-expand
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="部门名称" prop="deptName">
        <el-input v-model.trim="form.deptName" clearable maxlength="50" placeholder="如：研发中心" />
      </el-form-item>
      <el-form-item label="机构全称" prop="fullName">
        <el-input v-model.trim="form.fullName" clearable maxlength="100" placeholder="默认与部门名称相同" />
      </el-form-item>
      <el-form-item label="机构类型" prop="deptCategory">
        <el-select v-model="form.deptCategory" placeholder="请选择机构类型" style="width: 100%">
          <el-option
            v-for="item in categoryOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :max="9999" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model.trim="form.remark" clearable type="textarea" :rows="2" />
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
import { doEdit, getDeptDetail, getList, getOrgCategoryOptions } from '/@/api/departmentManagement'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'DepartmentManagementEdit',
})

const emit = defineEmits(['saved'])

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false)
const title = ref('')
const saving = ref(false)
const lockParent = ref(false)
const parentTree = ref<any[]>([])
const categoryOptions = ref<{ label: string; value: number }[]>([
  { label: '公司', value: 1 },
  { label: '部门', value: 2 },
])

const form = reactive<any>({
  id: '',
  parentId: undefined as string | undefined,
  deptName: '',
  fullName: '',
  deptCategory: 1,
  sort: 0,
  remark: '',
  _lastAutoFullName: '',
})

const rules: FormRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  fullName: [{ required: true, message: '请输入机构全称', trigger: 'blur' }],
  deptCategory: [{ required: true, message: '请选择机构类型', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
}

const collectIds = (node: any, acc: Set<string>) => {
  if (!node?.id) return
  acc.add(String(node.id))
  ;(node.children || []).forEach((c: any) => collectIds(c, acc))
}

const findNode = (nodes: any[], id: string): any => {
  for (const n of nodes || []) {
    if (String(n.id) === String(id)) return n
    const found = findNode(n.children || [], id)
    if (found) return found
  }
  return null
}

/** 禁止选自己及下级作为上级，避免成环 */
const buildParentTree = (nodes: any[], selfId?: string, banned?: Set<string>): any[] => {
  let ban = banned
  if (selfId && !ban) {
    ban = new Set<string>()
    const selfNode = findNode(nodes, selfId)
    if (selfNode) collectIds(selfNode, ban)
  }
  return (nodes || []).map((n) => ({
    ...n,
    disabled: !!ban?.has(String(n.id)),
    children: n.children?.length ? buildParentTree(n.children, selfId, ban) : undefined,
  }))
}

const loadOptions = async (selfId?: string) => {
  const [{ data }, cats] = await Promise.all([
    getList({ withUsers: false }),
    getOrgCategoryOptions().catch(() => []),
  ])
  parentTree.value = buildParentTree(data.list || [], selfId)
  if (cats?.length) categoryOptions.value = cats
}

const fillForm = (data: any, editing: boolean) => {
  const deptName = data?.deptName || data?.label || ''
  Object.assign(form, {
    id: data?.id ? String(data.id) : '',
    parentId: data?.parentId && String(data.parentId) !== '0' ? String(data.parentId) : undefined,
    deptName,
    fullName: data?.fullName || deptName,
    deptCategory: Number(data?.deptCategory ?? 1),
    sort: Number(data?.sort ?? data?.order ?? 0),
    remark: data?.remark || '',
    _lastAutoFullName: editing ? '' : deptName,
  })
}

/**
 * row 为空：新增顶级
 * row.parentId 无 id：在指定父下新增
 * row.id：编辑
 */
const showEdit = async (row: any = {}) => {
  dialogFormVisible.value = true
  const editing = !!row?.id
  lockParent.value = !editing && !!row?.parentId
  title.value = editing ? '编辑部门' : row?.parentId ? '添加子部门' : '添加部门'

  await loadOptions(editing ? String(row.id) : undefined)

  if (editing) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getDeptDetail, row), true)
  } else {
    fillForm(row, false)
  }
  await nextTick()
  formRef.value?.clearValidate()
}

const close = () => {
  dialogFormVisible.value = false
  formRef.value?.clearValidate()
  formRef.value?.resetFields()
}

defineExpose({ showEdit, close })

watch(
  () => form.deptName,
  (name) => {
    if (!form.id && (!form.fullName || form.fullName === form._lastAutoFullName)) {
      form.fullName = name
      form._lastAutoFullName = name
    }
  }
)

const save = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }
  saving.value = true
  try {
    const isEdit = !!form.id
    const { msg, data, success }: any = await doEdit({
      id: form.id || undefined,
      parentId: form.parentId || 0,
      deptName: form.deptName,
      fullName: form.fullName || form.deptName,
      deptCategory: form.deptCategory,
      sort: form.sort,
      remark: form.remark,
    })
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    await afterSaveSuccess(dialogFormVisible, msg, () => {
      // 合并表单字段：后端 submit 常只返回 true，需用表单数据做本地插入/刷新
      emit('saved', {
        isEdit,
        data: {
          ...(data && typeof data === 'object' ? data : {}),
          id: data?.id || form.id || '',
          parentId: form.parentId || 0,
          deptName: form.deptName,
          fullName: form.fullName || form.deptName,
          deptCategory: form.deptCategory,
          sort: form.sort,
          remark: form.remark || '',
          needReload: !isEdit && !(data?.id || form.id),
        },
      })
    })
  } catch (e: any) {
    afterSaveFail(e)
  } finally {
    saving.value = false
  }
}
</script>
