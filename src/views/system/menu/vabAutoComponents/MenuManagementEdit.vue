<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body :title="title" width="640px" @close="close">
    <el-form ref="formRef" label-width="100px" :model="form" :rules="rules">
      <el-form-item label="菜单类型" prop="category">
        <el-radio-group v-model="form.category">
          <el-radio :value="1">菜单</el-radio>
          <el-radio :value="2">按钮</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="上级菜单" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          check-strictly
          clearable
          :data="parentTree"
          :disabled="!!lockParent"
          default-expand-all
          filterable
          node-key="id"
          :props="{ label: 'name', value: 'id', children: 'children', disabled: 'disabled' }"
          placeholder="不选则为顶级菜单"
          render-after-expand
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="菜单名称" prop="name">
        <el-input v-model.trim="form.name" clearable maxlength="50" placeholder="显示名称" />
      </el-form-item>
      <el-form-item label="菜单编号" prop="code">
        <el-input v-model.trim="form.code" clearable maxlength="50" placeholder="唯一编号，如 menu_user" />
      </el-form-item>
      <el-form-item label="菜单别名" prop="alias">
        <el-input v-model.trim="form.alias" clearable maxlength="50" placeholder="权限标识，如 user" />
      </el-form-item>
      <el-form-item v-if="form.category === 1" label="路由地址" prop="path">
        <el-input v-model.trim="form.path" clearable placeholder="如 /system/userManagement/index" />
      </el-form-item>
      <el-form-item v-if="form.category === 1" label="组件路径" prop="component">
        <el-input
          v-model.trim="form.component"
          clearable
          placeholder="如 views/system/userManagement/index（对应 src/views，勿加 .vue）"
        />
      </el-form-item>
      <el-form-item label="菜单图标" prop="source">
        <div class="icon-field">
          <el-popover v-model:visible="iconPickerVisible" :width="320" placement="bottom-start">
            <template #reference>
              <el-input v-model.trim="form.source" clearable placeholder="iconfont 类名或选择图标">
                <template #prefix>
                  <i v-if="isIconfont(form.source)" :class="form.source" class="icon-preview" />
                  <vab-icon v-else-if="form.source" :icon="form.source" />
                </template>
              </el-input>
            </template>
            <vab-icon-selector @handle-icon="handleIcon" />
          </el-popover>
          <span v-if="isIconfont(form.source)" class="icon-hint">BladeX iconfont</span>
        </div>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :max="9999" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item v-if="form.category === 1" label="是否缓存" prop="isOpen">
        <el-radio-group v-model="form.isOpen">
          <el-radio :value="1">否</el-radio>
          <el-radio :value="2">是</el-radio>
        </el-radio-group>
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
import { getList, getMenu, update } from '/@/api/system/menu'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'MenuManagementEdit',
})

const emit = defineEmits(['fetch-data'])

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false)
const title = ref('')
const saving = ref(false)
const lockParent = ref(false)
const iconPickerVisible = ref(false)
const parentTree = ref<any[]>([])

const defaultForm = () => ({
  id: '',
  parentId: undefined as string | undefined,
  name: '',
  code: '',
  alias: '',
  path: '',
  component: '',
  source: '',
  sort: 0,
  category: 1,
  action: 0,
  isOpen: 1,
  remark: '',
})

const form = reactive<any>(defaultForm())

const rules = computed<FormRules>(() => {
  const base: FormRules = {
    category: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    code: [{ required: true, message: '请输入菜单编号', trigger: 'blur' }],
    alias: [{ required: true, message: '请输入菜单别名', trigger: 'blur' }],
    sort: [{ required: true, message: '请输入排序', trigger: 'change' }],
  }
  if (form.category === 1) {
    base.path = [{ required: true, message: '请输入路由地址', trigger: 'blur' }]
  }
  return base
})

const isIconfont = (icon?: string) => {
  if (!icon) return false
  return /iconfont|iconicon_|icon-/i.test(icon)
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

const loadParentTree = async (selfId?: string) => {
  const { data }: any = await getList()
  parentTree.value = buildParentTree(data?.list || [], selfId)
}

const handleIcon = (item: string) => {
  form.source = item
  iconPickerVisible.value = false
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    parentId:
      data.parentId === 0 || data.parentId === '0' || !data.parentId
        ? undefined
        : String(data.parentId),
    name: data.name || data.meta?.title || '',
    code: data.code || '',
    alias: data.alias || '',
    path: data.path || '',
    component: data.component || '',
    source: data.source || data.meta?.icon || '',
    sort: Number(data.sort ?? 0),
    category: Number(data.category ?? 1),
    action: Number(data.action ?? 0),
    isOpen: Number(data.isOpen ?? 1),
    remark: data.remark || '',
  })
}

/**
 * @param row 有 id → 编辑；仅 parentId → 新增子菜单；空 → 新增顶级
 */
const showEdit = async (row?: any) => {
  Object.assign(form, defaultForm())
  lockParent.value = false
  dialogFormVisible.value = true
  await nextTick()

  if (row?.id) {
    title.value = '编辑菜单'
    form.id = String(row.id)
    fillForm(await loadEditDetail(getMenu, row))
    await loadParentTree(String(row.id))
    return
  }

  title.value = row?.parentId ? '添加子菜单' : '添加菜单'
  if (row?.parentId != null && row.parentId !== '' && row.parentId !== 0 && row.parentId !== '0') {
    form.parentId = String(row.parentId)
    lockParent.value = !!row.lockParent
  }
  await loadParentTree()
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
    const { msg, success }: any = await update({ ...form })
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

<style lang="scss" scoped>
.icon-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;

  .el-input {
    width: 100%;
  }
}

.icon-preview {
  font-size: 16px;
  line-height: 1;
}

.icon-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
