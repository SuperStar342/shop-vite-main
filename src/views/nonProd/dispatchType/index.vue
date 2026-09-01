<template>
  <div class="dt-page auto-height-container">
    <header class="dt-crumb">
      <span>派工类型管理</span>
      <el-icon><ArrowRight /></el-icon>
      <strong>{{ formModeTitle }}</strong>
    </header>

    <div class="dt-body">
      <!-- 左侧：添加/编辑表单（还原第 1 张） -->
      <aside class="dt-form-card">
        <h2 class="dt-form-card__title">{{ formModeTitle }}</h2>

        <el-form ref="formRef" class="dt-form" label-position="top" :model="form" :rules="rules">
          <section class="dt-section">
            <h3>基本信息</h3>
            <el-form-item label="派工类型代码" prop="code">
              <el-input v-model.trim="form.code" :disabled="isEdit" maxlength="10" placeholder="请输入派工类型代码" />
            </el-form-item>
            <el-form-item label="派工类型名称" prop="name">
              <el-input v-model.trim="form.name" maxlength="100" placeholder="请输入派工类型名称" />
            </el-form-item>
            <el-form-item label="是否启用">
              <el-switch v-model="form.ifUse" active-text="启用" active-value="是" inactive-text="停用" inactive-value="否" />
            </el-form-item>
            <el-form-item label="计件类型" prop="pieceType">
              <el-radio-group v-model="form.pieceType">
                <el-radio value="团体计件">团体计件</el-radio>
                <el-radio value="个人计件">个人计件</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="控制属性" prop="controlAttr">
              <el-radio-group v-model="form.controlAttr" class="dt-control-radios">
                <el-radio value="无关联">无关联</el-radio>
                <el-radio value="只关联单据">只关联单据</el-radio>
                <el-radio value="关联货品">关联货品</el-radio>
                <el-radio value="关联单据+货品">关联单据+货品</el-radio>
              </el-radio-group>
            </el-form-item>
          </section>

          <section class="dt-section">
            <h3>派工单据选项</h3>
            <el-form-item label="关联单据">
              <div class="dt-inline">
                <el-input v-model.trim="form.linkNo" clearable placeholder="关联单据代码" />
                <el-checkbox v-model="canRepeatBool" class="dt-inline__check">单据是否可重复派工</el-checkbox>
              </div>
            </el-form-item>
            <el-form-item label="关联表">
              <el-input v-model.trim="form.linkTableName" clearable placeholder="关联表名" />
            </el-form-item>
            <el-form-item label="货品ID字段名">
              <el-input v-model.trim="form.goodsField" clearable placeholder="如 fGoodsID" />
            </el-form-item>
            <el-form-item label="定制批号字段名">
              <el-input v-model.trim="form.cstlotNoField" clearable placeholder="如 fCstLotNo" />
            </el-form-item>
            <el-form-item label="货品单位字段名">
              <div class="dt-inline">
                <el-input v-model.trim="form.unitField" clearable placeholder="如 fUnitName" />
                <el-checkbox v-model="qtyLimitedBool" class="dt-inline__check">是否控制派工数量</el-checkbox>
              </div>
            </el-form-item>
            <el-form-item label="计件数量字段名">
              <el-input v-model.trim="form.qtyField" clearable placeholder="如 fWOQty" />
            </el-form-item>
            <el-form-item label="货品计件单位属性">
              <el-select v-model="form.goodsUnitProp" clearable placeholder="请选择" style="width: 100%">
                <el-option label="标准单位" value="标准单位" />
                <el-option label="库存单位" value="库存单位" />
                <el-option label="辅助单位" value="辅助单位" />
              </el-select>
            </el-form-item>
            <el-form-item label="工号">
              <el-input v-model.trim="form.empList" clearable placeholder="加工人员代号，逗号分隔" />
            </el-form-item>
            <el-form-item label="加工人员姓名">
              <el-input v-model.trim="form.empListName" clearable placeholder="加工人员姓名" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="form.remark"
                :autosize="{ minRows: 2, maxRows: 4 }"
                maxlength="200"
                placeholder="请输入备注"
                show-word-limit
                type="textarea"
              />
            </el-form-item>
          </section>

          <div class="dt-form__footer">
            <el-button @click="resetForm">重置</el-button>
            <el-button :loading="saving" type="primary" @click="saveForm">保存</el-button>
          </div>
        </el-form>
      </aside>

      <!-- 右侧：列表 -->
      <section class="dt-list-card">
        <div class="dt-query">
          <el-form inline :model="queryForm" @submit.prevent>
            <el-form-item>
              <el-input v-model.trim="queryForm.code" clearable placeholder="派工类型代码" style="width: 140px" />
            </el-form-item>
            <el-form-item>
              <el-input v-model.trim="queryForm.name" clearable placeholder="派工类型名称" style="width: 140px" />
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryForm.ifUse" clearable placeholder="是否启用" style="width: 120px">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button :icon="Search" :loading="loading" type="primary" @click="queryData">查询</el-button>
              <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
              <el-button link type="primary" @click="showMoreCols = !showMoreCols">
                {{ showMoreCols ? '收起' : '展开' }}
                <el-icon class="el-icon--right"><component :is="showMoreCols ? ArrowUp : ArrowDown" /></el-icon>
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="dt-toolbar">
          <div class="dt-toolbar__left">
            <el-button :icon="Plus" type="primary" @click="startCreate">新增</el-button>
            <el-button :disabled="!currentRow" type="success" @click="startEdit(currentRow!)">修改</el-button>
            <el-button :disabled="!selected.length" :icon="Delete" type="danger" @click="handleBatchDelete">删除</el-button>
            <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
          </div>
        </div>

        <div class="dt-table-wrap">
          <el-table
            v-loading="loading"
            border
            class="dt-table"
            :data="list"
            height="100%"
            highlight-current-row
            stripe
            @current-change="(row: DispatchTypeRow | undefined) => (currentRow = row || null)"
            @row-click="(row: DispatchTypeRow) => startEdit(row)"
            @selection-change="(rows: DispatchTypeRow[]) => (selected = rows)"
          >
            <el-table-column type="selection" width="44" />
            <el-table-column label="序号" type="index" width="58" />
            <el-table-column fixed label="派工类型代码" min-width="120" prop="code" />
            <el-table-column fixed label="派工类型名称" min-width="140" prop="name" show-overflow-tooltip />
            <el-table-column label="计件类型" min-width="100" prop="pieceType" />
            <el-table-column label="控制属性" min-width="130" prop="controlAttr" show-overflow-tooltip />
            <el-table-column label="是否启用" min-width="90" prop="ifUse">
              <template #default="{ row }">
                <el-tag effect="light" round size="small" :type="row.ifUse === '是' ? 'primary' : 'info'">
                  {{ row.ifUse === '是' ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建人" min-width="90" prop="creator" />
            <el-table-column label="创建日期" min-width="160" prop="createDate" />

            <template v-if="showMoreCols">
              <el-table-column label="关联单据代码" min-width="120" prop="linkNo" />
              <el-table-column label="单据简称" min-width="110" prop="docShortName" show-overflow-tooltip />
              <el-table-column label="关联表备注" min-width="140" prop="linkTableRemark" show-overflow-tooltip />
              <el-table-column label="关联表" min-width="100" prop="linkTableName" />
              <el-table-column label="货品ID字段名" min-width="120" prop="goodsField" />
              <el-table-column label="货品ID字段描述" min-width="120" prop="goodsFieldDesc" />
              <el-table-column label="货品单位字段名" min-width="120" prop="unitField" />
              <el-table-column label="关联单位字段描述" min-width="130" prop="unitFieldDesc" />
              <el-table-column label="计件数量字段名" min-width="120" prop="qtyField" />
              <el-table-column label="计件数量字段描述" min-width="130" prop="qtyFieldDesc" />
              <el-table-column label="定制批号字段名" min-width="120" prop="cstlotNoField" />
              <el-table-column label="货品计件单位属性" min-width="130" prop="goodsUnitProp" />
              <el-table-column label="单据是否可重复派工" min-width="140" prop="canRepeat" />
              <el-table-column label="是否控制派工数量" min-width="130" prop="ifQtyLimited" />
              <el-table-column label="审核状态" min-width="90" prop="auditStatus" />
              <el-table-column label="审核人" min-width="90" prop="approver" />
              <el-table-column label="建立人代号" min-width="110" prop="creatorCode" />
              <el-table-column label="修改人代号" min-width="110" prop="modifierCode" />
              <el-table-column label="修改人" min-width="90" prop="modifier" />
              <el-table-column label="修改日期" min-width="160" prop="modifyDate" />
              <el-table-column label="加工人员列表" min-width="130" prop="empList" show-overflow-tooltip />
              <el-table-column label="加工人员姓名" min-width="130" prop="empListName" show-overflow-tooltip />
            </template>

            <el-table-column fixed="right" label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="startEdit(row)">修改</el-button>
                <el-button link type="danger" @click.stop="handleDelete([row.code])">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <footer class="dt-pager">
          <vab-pagination
            :current-page="queryForm.pageNo"
            :page-size="queryForm.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            @current-change="(p: number) => { queryForm.pageNo = p; fetchList() }"
            @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchList() }"
          />
        </footer>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowDown, ArrowRight, ArrowUp, Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  deleteDispatchType,
  getDispatchTypeList,
  submitDispatchType,
  type DispatchTypeRow,
} from '/@/api/nonProd/dispatchType'

defineOptions({
  name: 'DispatchTypeSetting',
})

const loading = ref(false)
const saving = ref(false)
const list = ref<DispatchTypeRow[]>([])
const total = ref(0)
const selected = ref<DispatchTypeRow[]>([])
const currentRow = ref<DispatchTypeRow | null>(null)
const isEdit = ref(false)
const showMoreCols = ref(true)
const formRef = ref<FormInstance>()

const queryForm = reactive({
  code: '',
  name: '',
  ifUse: '' as string,
  pageNo: 1,
  pageSize: 10,
})

const emptyForm = (): DispatchTypeRow => ({
  id: '',
  code: '',
  name: '',
  quickQuery: '',
  pieceTypeCode: '2',
  pieceType: '团体计件',
  controlModeCode: '1',
  controlAttr: '无关联',
  linkNo: '',
  docShortName: '',
  linkTableName: '',
  linkTableRemark: '',
  keyField: '',
  noField: '',
  goodsField: '',
  goodsFieldDesc: '',
  unitField: '',
  unitFieldDesc: '',
  qtyField: '',
  qtyFieldDesc: '',
  cstlotNoField: '',
  goodsUnitPropCode: '',
  goodsUnitProp: '标准单位',
  canRepeat: '否',
  ifQtyLimited: '否',
  ifUse: '是',
  auditFlag: '0',
  auditStatus: '',
  approver: '',
  approverId: '',
  appDate: '',
  creator: '',
  creatorCode: '',
  createDate: '',
  modifier: '',
  modifierCode: '',
  modifyDate: '',
  empList: '',
  empListName: '',
  attachment: 0,
  remark: '',
})

const form = reactive<DispatchTypeRow>(emptyForm())

const formModeTitle = computed(() => (isEdit.value ? '修改派工类型' : '添加派工类型'))

const canRepeatBool = computed({
  get: () => form.canRepeat === '是',
  set: (v: boolean) => {
    form.canRepeat = v ? '是' : '否'
  },
})

const qtyLimitedBool = computed({
  get: () => form.ifQtyLimited === '是',
  set: (v: boolean) => {
    form.ifQtyLimited = v ? '是' : '否'
  },
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入派工类型代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入派工类型名称', trigger: 'blur' }],
  pieceType: [{ required: true, message: '请选择计件类型', trigger: 'change' }],
  controlAttr: [{ required: true, message: '请选择控制属性', trigger: 'change' }],
}

const assignForm = (row: DispatchTypeRow) => {
  Object.assign(form, emptyForm(), { ...row })
}

const startCreate = () => {
  isEdit.value = false
  currentRow.value = null
  assignForm(emptyForm())
  formRef.value?.clearValidate()
}

const startEdit = (row: DispatchTypeRow) => {
  isEdit.value = true
  currentRow.value = row
  assignForm(row)
  formRef.value?.clearValidate()
}

const resetForm = () => {
  if (isEdit.value && currentRow.value) {
    assignForm(currentRow.value)
  } else {
    assignForm(emptyForm())
  }
  formRef.value?.clearValidate()
}

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await getDispatchTypeList({ ...queryForm })
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e: any) {
    list.value = []
    total.value = 0
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchList()
}

const resetQuery = () => {
  queryForm.code = ''
  queryForm.name = ''
  queryForm.ifUse = ''
  queryData()
}

const saveForm = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    await submitDispatchType({ ...form })
    ElMessage.success('保存成功')
    await fetchList()
    if (!isEdit.value) {
      startCreate()
    } else {
      const latest = list.value.find((r) => r.code === form.code)
      if (latest) startEdit(latest)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (codes: string[]) => {
  if (!codes.length) return
  await ElMessageBox.confirm(`确认删除选中的 ${codes.length} 条类型？`, '提示', { type: 'warning' })
  try {
    await deleteDispatchType(codes)
    ElMessage.success('删除成功')
    if (isEdit.value && codes.includes(form.code)) startCreate()
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleBatchDelete = () => handleDelete(selected.value.map((r) => r.code))

onMounted(() => {
  fetchList()
  startCreate()
})
</script>

<style lang="scss" scoped>
.dt-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%);
}

.dt-crumb {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: #64748b;

  strong {
    font-weight: 600;
    color: #1e293b;
  }
}

.dt-body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(360px, 420px) 1fr;
  gap: 12px;
  min-height: 0;
}

.dt-form-card,
.dt-list-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.dt-form-card {
  padding: 16px 18px 12px;
  overflow: auto;
}

.dt-form-card__title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 650;
  color: #0f172a;
}

.dt-section {
  margin-bottom: 8px;

  h3 {
    margin: 0 0 10px;
    padding-left: 8px;
    font-size: 13px;
    font-weight: 650;
    color: #334155;
    border-left: 3px solid var(--el-color-primary);
  }
}

.dt-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 4px;
    font-weight: 500;
    color: #475569;
  }
}

.dt-control-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.dt-inline {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;

  .el-input {
    flex: 1;
  }
}

.dt-inline__check {
  flex-shrink: 0;
  white-space: nowrap;
}

.dt-form__footer {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 8px 0 4px;
  border-top: 1px solid #f1f5f9;
}

.dt-list-card {
  padding: 12px 12px 8px;
}

.dt-query {
  margin-bottom: 8px;
}

.dt-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dt-toolbar__left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dt-table-wrap {
  flex: 1;
  min-height: 280px;
}

.dt-table {
  --el-table-header-bg-color: #f8fafc;

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.dt-pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

@media (width <= 1100px) {
  .dt-body {
    grid-template-columns: 1fr;
  }

  .dt-form-card {
    max-height: 48vh;
  }
}
</style>
