<template>
  <el-drawer
    v-model="dialogFormVisible"
    destroy-on-close
    size="640px"
    :title="title"
    @closed="handleClose"
  >
    <el-form ref="formRef" label-position="top" :model="form" :rules="rules" @submit.prevent>
      <!-- 基础信息 -->
      <div class="form-section">
        <div class="form-section-title">基础信息</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="材料编码" prop="goodsCode">
              <el-input
                v-model.trim="form.goodsCode"
                clearable
                :disabled="viewOnly || isEditMode"
                maxlength="50"
                placeholder="请输入材料编码"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料名称" prop="goodsName">
              <el-input v-model.trim="form.goodsName" clearable :disabled="viewOnly" maxlength="200" placeholder="请输入材料名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="材料类别" prop="sortCode">
              <el-select v-model="form.sortCode" clearable :disabled="viewOnly" filterable placeholder="请选择材料类别" style="width: 100%">
                <el-option
                  v-for="cat in categoryOptions"
                  :key="cat.id"
                  :label="cat.categoryCode ? `${cat.categoryName} (${cat.categoryCode})` : cat.categoryName"
                  :value="cat.categoryCode"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料类型代码" prop="goodsType">
              <el-input v-model.trim="form.goodsType" clearable :disabled="viewOnly" maxlength="5" placeholder="如：C（材料类型编码）" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 单位与品牌 -->
      <div class="form-section">
        <div class="form-section-title">单位与品牌</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="标准单位" prop="stdUnit">
              <el-input v-model.trim="form.stdUnit" clearable :disabled="viewOnly" maxlength="6" placeholder="如：PCS" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="库存单位" prop="stkUnit">
              <el-input v-model.trim="form.stkUnit" clearable :disabled="viewOnly" maxlength="6" placeholder="如：PCS" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="交易单位" prop="businessUnit">
              <el-input v-model.trim="form.businessUnit" clearable :disabled="viewOnly" maxlength="6" placeholder="如：PCS" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="品牌代码" prop="brandCode">
              <el-input v-model.trim="form.brandCode" clearable :disabled="viewOnly" maxlength="10" placeholder="请输入品牌代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格描述" prop="sizeDesc">
              <el-input v-model.trim="form.sizeDesc" clearable :disabled="viewOnly" maxlength="500" placeholder="请输入规格描述" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 编码规则：与物料类别 / 列表 / 筛选口径一致 -->
      <div class="form-section">
        <div class="form-section-title">编码与名称规则</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="材料成本属性" prop="costType">
              <el-radio-group v-model="form.costType" :disabled="viewOnly">
                <el-radio-button value="1">直接材料</el-radio-button>
                <el-radio-button value="0">间接材料</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料编码方式" prop="codeGenMode">
              <el-radio-group v-model="form.codeGenMode" :disabled="viewOnly">
                <el-radio-button value="1">手动编码</el-radio-button>
                <el-radio-button value="2">自动编码</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="材料名称产生方式" prop="nameGenMode">
              <el-radio-group v-model="form.nameGenMode" :disabled="viewOnly">
                <el-radio-button value="1">手工录入</el-radio-button>
                <el-radio-button value="2">自动产生</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格描述方式" prop="specGenMode">
              <el-radio-group v-model="form.specGenMode" :disabled="viewOnly">
                <el-radio-button value="1">手工录入</el-radio-button>
                <el-radio-button value="2">自动产生</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 其他信息 -->
      <div class="form-section">
        <div class="form-section-title">其他信息</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="别名" prop="alias">
              <el-input v-model.trim="form.alias" clearable :disabled="viewOnly" maxlength="100" placeholder="请输入别名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="快速查询" prop="quickQuery">
              <el-input v-model.trim="form.quickQuery" clearable :disabled="viewOnly" maxlength="50" placeholder="请输入快速查询码" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="form.remark" clearable :disabled="viewOnly" maxlength="500" placeholder="请输入备注" :rows="2" type="textarea" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ viewOnly ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!viewOnly" :loading="isSaving" type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { doEdit, getCategoryOptions, getDetail } from '/@/api/procurement/goodsMst'
import { afterSaveFail, loadEditDetail } from '/@/utils/formDialog'

defineOptions({
  name: 'GoodsMstEdit',
})

const emit = defineEmits(['fetch-data'])

const dialogFormVisible = ref(false)
const isSaving = ref(false)
const viewOnly = ref(false)
const formRef = ref<any>(null)
const categoryOptions = ref<any[]>([])

const defaultForm = {
  id: '',
  goodsCode: '',
  goodsName: '',
  goodsType: '',
  sortCode: '',
  stdUnit: '',
  stkUnit: '',
  businessUnit: '',
  brandCode: '',
  alias: '',
  quickQuery: '',
  remark: '',
  sizeDesc: '',
  costType: '1',
  codeGenMode: '1',
  nameGenMode: '1',
  specGenMode: '1',
}

const form = reactive({ ...defaultForm })

const isEditMode = computed(() => !!form.id)
const title = computed(() => {
  if (viewOnly.value) return '材料资料详情'
  return isEditMode.value ? '编辑材料资料' : '添加材料资料'
})

const rules: any = {
  goodsCode: [
    { required: true, message: '材料编码不能为空', trigger: 'blur' },
    { min: 1, max: 50, message: '材料编码长度1-50个字符', trigger: 'blur' },
  ],
  goodsName: [
    { required: true, message: '材料名称不能为空', trigger: 'blur' },
    { min: 1, max: 200, message: '材料名称长度1-200个字符', trigger: 'blur' },
  ],
  goodsType: [{ max: 5, message: '材料类型代码不超过5个字符', trigger: 'blur' }],
}

const loadCategories = async () => {
  try {
    categoryOptions.value = await getCategoryOptions()
  } catch {
    categoryOptions.value = []
  }
}

const fillForm = (data: any) => {
  Object.assign(form, {
    id: data.id != null ? String(data.id) : '',
    goodsCode: data.goodsCode || '',
    goodsName: data.goodsName || '',
    goodsType: data.goodsType || '',
    sortCode: data.sortCode || '',
    stdUnit: data.stdUnit || '',
    stkUnit: data.stkUnit || data.stdUnit || '',
    businessUnit: data.businessUnit || data.stdUnit || '',
    brandCode: data.brandCode || '',
    alias: data.alias || '',
    quickQuery: data.quickQuery || '',
    remark: data.remark || '',
    sizeDesc: data.sizeDesc || '',
    costType: data.costType != null && data.costType !== '' ? String(data.costType) : '1',
    codeGenMode: String(data.codeGenMode ?? '1'),
    nameGenMode: String(data.nameGenMode ?? '1'),
    specGenMode: String(data.specGenMode ?? '1'),
  })
}

const showEdit = async (row?: any, opts?: { viewOnly?: boolean }) => {
  Object.assign(form, defaultForm)
  viewOnly.value = !!opts?.viewOnly
  dialogFormVisible.value = true

  await nextTick()
  formRef.value?.clearValidate()

  // 分类选项与详情加载互不依赖，并行请求
  const [, detail] = await Promise.all([
    loadCategories(),
    row?.id ? loadEditDetail(getDetail, row) : Promise.resolve(null),
  ])
  if (detail) {
    form.id = String(row.id)
    fillForm(detail)
  }
}

defineExpose({ showEdit })

/** 提交前清理占位符，还原空值 */
const cleanDash = (v: any) => (v === '-') ? '' : v

const handleSubmit = async () => {
  const valid = await formRef.value?.validate?.().catch(() => false)
  if (!valid) {
    $baseMessage('请先完善表单信息', 'warning', 'hey')
    return
  }

  isSaving.value = true
  try {
    const payload: Record<string, any> = {
      id: form.id || undefined,
      goodsCode: form.goodsCode,
      goodsName: form.goodsName,
      goodsType: form.goodsType || '',
      sortCode: form.sortCode || '',
      stdUnit: form.stdUnit || '',
      stkUnit: form.stkUnit || form.stdUnit || '',
      businessUnit: form.businessUnit || form.stdUnit || '',
      brandCode: form.brandCode || '',
      alias: form.alias || '',
      quickQuery: form.quickQuery || '',
      remark: form.remark || '',
      sizeDesc: form.sizeDesc || '',
      costType: form.costType,
      codeGenMode: form.codeGenMode,
      nameGenMode: form.nameGenMode,
      specGenMode: form.specGenMode,
    }
    const { msg, success }: any = await doEdit(payload)
    if (success === false) {
      afterSaveFail(msg)
      return
    }
    emit('fetch-data')
    dialogFormVisible.value = false
    await nextTick()
    $baseMessage(msg || '保存成功', 'success', 'hey')
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
:deep(.el-drawer__body) {
  padding: 20px 24px;
}

.form-section {
  margin-bottom: 4px;

  & + & {
    border-top: 1px solid #ebeef5;
    padding-top: 8px;
  }
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
  line-height: 1;
}
</style>
