<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body :title="title" width="520px" @close="close">
    <el-form ref="formRef" label-width="90px" :model="form" :rules="rules">
      <el-form-item label="上级角色" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          check-strictly
          clearable
          :data="parentTree"
          default-expand-all
          :disabled="!!lockParent"
          filterable
          node-key="id"
          placeholder="不选则为顶级角色"
          :props="{ label: 'roleName', value: 'id', children: 'children', disabled: 'disabled' }"
          render-after-expand
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="角色名称" prop="roleName">
        <el-input v-model.trim="form.roleName" clearable maxlength="50" placeholder="如：运营管理员" />
      </el-form-item>
      <el-form-item label="角色别名" prop="roleAlias">
        <el-input v-model.trim="form.roleAlias" clearable maxlength="50" placeholder="如：operator（权限标识）" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :max="9999" :min="0" style="width: 100%" />
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
import { doEdit, getList, getRoleDetail } from '/@/api/roleManagement'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'RoleManagementEdit',
})

const emit = defineEmits(['fetch-data'])

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false)
const title = ref('')
const saving = ref(false)
const lockParent = ref(false)
const parentTree = ref<any[]>([])

const form = reactive<any>({
  id: '',
  parentId: undefined as string | undefined,
  roleName: '',
  roleAlias: '',
  sort: 0,
})

const rules: FormRules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleAlias: [{ required: true, message: '请输入角色别名', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
}

/** 收集某节点及其全部子孙 id，编辑时禁止选自己/下级作为上级 */
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

const loadParentTree = async (selfId?: string) => {
  const { data } = await getList()
  parentTree.value = buildParentTree(data.list || [], selfId)
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data?.id ? String(data.id) : '',
    parentId:
      data?.parentId && String(data.parentId) !== '0' ? String(data.parentId) : undefined,
    roleName: data?.roleName || '',
    roleAlias: data?.roleAlias || data?.role || '',
    sort: Number(data?.sort ?? 0),
  })
}

/**
 * row 为空：新增顶级
 * row.parentId 无 id：在指定父下新增
 * row.id：编辑
 */
const showEdit = async (row: any = {}) => {
  dialogFormVisible.value = true
  // 仅显式带 id 才算编辑；添加子角色只传 parentId/parentName
  const editing = row?.id != null && row?.id !== ''
  lockParent.value = !editing && !!row?.parentId
  title.value = editing ? '编辑角色' : row?.parentId ? '添加子角色' : '添加角色'

  await loadParentTree(editing ? String(row.id) : undefined)

  if (editing) {
    form.id = String(row.id)
    fillForm(await loadEditDetail(getRoleDetail, row))
  } else {
    fillForm({
      parentId: row?.parentId || '0',
      parentName: row?.parentName || '',
      roleName: '',
      roleAlias: '',
      sort: 0,
    })
  }
  await nextTick()
  formRef.value?.clearValidate()
}

defineExpose({ showEdit })

const close = () => {
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
    const { msg, success }: any = await doEdit({
      id: form.id || undefined,
      parentId: form.parentId || 0,
      roleName: form.roleName,
      roleAlias: form.roleAlias,
      sort: form.sort,
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
