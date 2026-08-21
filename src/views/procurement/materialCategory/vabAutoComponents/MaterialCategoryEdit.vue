<template>
  <vab-dialog v-model="dialogFormVisible" append-to-body class="material-category-edit" :title="title" width="800px" destroy-on-close :loading="dialogLoading" @closed="handleClosed">
    <el-form ref="formRef" label-position="top" :model="form" :rules="rules" @submit.prevent>
      <el-row :gutter="16">
        <el-col :md="12" :span="24">
          <el-form-item label="所属类别" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              check-strictly
              clearable
              :data="parentTree"
              default-expand-all
              filterable
              node-key="id"
              :props="{ label: 'categoryName', children: 'children' }"
              placeholder="不选则为顶级"
              render-after-expand
              style="width: 100%"
              :disabled="isEditMode"
            />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="材料类别代码" prop="categoryCode">
            <div class="code-row">
              <el-input v-model.trim="form.categoryCode" clearable maxlength="50" placeholder="类别代码" :disabled="isEditMode" />
              <el-button v-if="!isEditMode" @click="handleGenCode">产生编码</el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="材料类别名称" prop="categoryName">
            <el-input v-model.trim="form.categoryName" clearable maxlength="100" placeholder="请输入类别名称" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="采购额定天数" prop="daysBefPur">
            <el-input-number v-model="form.daysBefPur" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="标准检验天数" prop="daysOfChk">
            <el-input-number v-model="form.daysOfChk" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="检验方式" prop="qcMode">
            <el-select v-model="form.qcMode" style="width: 100%">
              <el-option label="免检" value="1" />
              <el-option label="全检" value="2" />
              <el-option label="抽检" value="3" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="是否启用" prop="status">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="材料成本属性" prop="costType">
            <el-radio-group v-model="form.costType">
              <el-radio value="1">直接材料</el-radio>
              <el-radio value="0">间接材料</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="材料编码方式" prop="codeGenMode">
            <el-radio-group v-model="form.codeGenMode">
              <el-radio value="1">手动编码</el-radio>
              <el-radio value="2">自动编码</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="材料名称产生方式" prop="nameGenMode">
            <el-radio-group v-model="form.nameGenMode">
              <el-radio value="1">手工录入</el-radio>
              <el-radio value="2">自动产生</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :md="12" :span="24">
          <el-form-item label="规格描述产生方式" prop="specGenMode">
            <el-radio-group v-model="form.specGenMode">
              <el-radio value="1">手工录入</el-radio>
              <el-radio value="2">自动产生</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model.trim="form.remark" clearable maxlength="200" type="textarea" :rows="2" placeholder="备注（可选）" />
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
import type { FormInstance, FormRules } from 'element-plus'
import { doEdit, genCategoryCode, getCategoryTree, getDetail } from '/@/api/procurement/materialCategory'
import { afterSaveFail, afterSaveSuccess, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'MaterialCategoryEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const dialogLoading = ref(false)
const formRef = ref<FormInstance>()
const parentTree = ref<any[]>([])

const form = reactive({
  id: '',
  categoryName: '',
  categoryCode: '',
  parentId: '' as string | number | undefined,
  sort: 0,
  status: 1,
  remark: '',
  qcMode: '2',
  daysOfChk: 0,
  daysBefPur: 0,
  costType: '1',
  codeGenMode: '1',
  nameGenMode: '1',
  specGenMode: '1',
})

const isEditMode = computed(() => !!form.id)
const title = computed(() => (isEditMode.value ? '修改物料类别' : '新增物料类别'))

const rules: FormRules = {
  categoryName: [{ required: true, message: '类别名称不能为空', trigger: 'blur' }],
  categoryCode: [{ required: true, message: '类别代码不能为空', trigger: 'blur' }],
  costType: [{ required: true, message: '请选择材料成本属性', trigger: 'change' }],
  codeGenMode: [{ required: true, message: '请选择材料编码方式', trigger: 'change' }],
  nameGenMode: [{ required: true, message: '请选择材料名称产生方式', trigger: 'change' }],
  specGenMode: [{ required: true, message: '请选择规格描述产生方式', trigger: 'change' }],
}

const defaultForm = {
  id: '',
  categoryName: '',
  categoryCode: '',
  parentId: undefined as string | number | undefined,
  sort: 0,
  status: 1,
  remark: '',
  qcMode: '2',
  daysOfChk: 0,
  daysBefPur: 0,
  costType: '1',
  codeGenMode: '1',
  nameGenMode: '1',
  specGenMode: '1',
}

const resetForm = () => {
  Object.assign(form, defaultForm)
  formRef.value?.clearValidate()
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    categoryName: data.categoryName || '',
    categoryCode: data.categoryCode || '',
    parentId: data.parentId && String(data.parentId) !== '0' ? String(data.parentId) : undefined,
    sort: data.sort ?? 0,
    status: data.status ?? 1,
    remark: data.remark || '',
    qcMode: data.qcMode != null ? String(data.qcMode) : '2',
    daysOfChk: Number(data.daysOfChk ?? 0),
    daysBefPur: Number(data.daysBefPur ?? 0),
    costType: data.costType != null ? String(data.costType) : '1',
    codeGenMode: String(data.codeGenMode || '1'),
    nameGenMode: String(data.nameGenMode || '1'),
    specGenMode: String(data.specGenMode || '1'),
  })
}

const showEdit = async (row?: any) => {
  // 先重置表单数据（避免旧数据闪现）
  Object.assign(form, defaultForm)
  // 打开对话框（destroy-on-close 确保每次都是全新的表单 DOM）
  dialogFormVisible.value = true
  dialogLoading.value = true

  // 等待 DOM 渲染完成后清除校验状态
  await nextTick()
  formRef.value?.clearValidate()

  // 加载上级类别树
  try {
    parentTree.value = await getCategoryTree()
  } catch {
    parentTree.value = []
  }

  // 编辑模式：加载详情并填充表单
  if (row?.id) {
    try {
      const detail = await loadEditDetail(getDetail, row)
      fillForm({ ...detail, id: row.id, parentId: detail.parentId ?? row.parentId })
    } catch {
      // 加载失败时至少保留 id
      form.id = String(row.id)
    }
  } else if (row?.parentId) {
    // 新增子类别：预填父级
    form.parentId = String(row.parentId)
  }

  dialogLoading.value = false
}

defineExpose({ showEdit })

const handleGenCode = async () => {
  try {
    const code = await genCategoryCode(form.parentId || 0)
    if (code) form.categoryCode = code
  } catch (e: any) {
    $baseMessage(e?.message || '产生编码失败', 'error', 'hey')
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }
  isSaving.value = true
  try {
    const { msg, success }: any = await doEdit({ ...form })
    if (success === false) {
      afterSaveFail(msg)
      return
    }
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

const handleClosed = () => {
  // destroy-on-close 会自动销毁 DOM，这里重置状态即可
  parentTree.value = []
  dialogLoading.value = false
}
</script>

<style lang="scss" scoped>
.code-row {
  display: flex;
  gap: 8px;
  width: 100%;

  .el-input {
    flex: 1;
  }
}
</style>
