<template>
  <div class="up-page auto-height-container">
    <header class="up-hero">
      <div class="up-hero__text">
        <p class="up-hero__eyebrow">非生产派工</p>
        <h1>单价设置</h1>
        <p class="up-hero__desc">维护零星、返修、样品等非生产派工的计件单价与改价权限，字段与现场单据对齐。</p>
      </div>
      <div class="up-hero__stats">
        <div class="up-stat">
          <span class="up-stat__label">条目</span>
          <strong>{{ total }}</strong>
        </div>
        <div class="up-stat">
          <span class="up-stat__label">可改价</span>
          <strong>{{ editableCount }}</strong>
        </div>
        <div class="up-stat">
          <span class="up-stat__label">类型</span>
          <strong>{{ typeStats.length }}</strong>
        </div>
      </div>
    </header>

    <section class="up-types">
      <button
        class="up-type"
        :class="{ active: !queryForm.dispatchTypeCode }"
        type="button"
        @click="selectType('')"
      >
        <span class="up-type__name">全部类型</span>
        <span class="up-type__meta">{{ totalAll }} 条</span>
      </button>
      <button
        v-for="t in typeStats"
        :key="t.code"
        class="up-type"
        :class="{ active: queryForm.dispatchTypeCode === t.code }"
        type="button"
        @click="selectType(t.code)"
      >
        <span class="up-type__code">{{ t.code }}</span>
        <span class="up-type__name">{{ t.name }}</span>
        <span class="up-type__meta">{{ t.count }} 条 · 均价 {{ t.avgPrice }}</span>
      </button>
    </section>

    <section class="up-toolbar">
      <el-form inline :model="queryForm" @submit.prevent>
        <el-form-item>
          <el-input
            v-model.trim="queryForm.keyword"
            clearable
            placeholder="搜索类型 / 品号 / 品名"
            style="width: 220px"
            @keyup.enter="queryData"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryForm.pieceType" clearable placeholder="计件类型" style="width: 130px">
            <el-option label="个人计件" value="个人计件" />
            <el-option label="班组计件" value="班组计件" />
            <el-option label="不计件" value="不计件" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryForm.allowEditPrice" clearable placeholder="可否改价" style="width: 120px">
            <el-option label="是" value="是" />
            <el-option label="否" value="否" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" :loading="loading" type="primary" @click="queryData">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="up-toolbar__actions">
        <el-button :icon="Plus" type="primary" @click="openCreate">新增</el-button>
        <el-button :disabled="!selected.length" :icon="Delete" type="danger" @click="handleBatchDelete">删除</el-button>
      </div>
    </section>

    <section class="up-table-wrap">
      <el-table
        v-loading="loading"
        border
        class="up-table"
        :data="list"
        height="100%"
        highlight-current-row
        stripe
        @selection-change="(rows: UnitPriceRow[]) => (selected = rows)"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column fixed label="派工类型代号" min-width="110" prop="dispatchTypeCode" />
        <el-table-column fixed label="派工类型名称" min-width="120" prop="dispatchTypeName" show-overflow-tooltip />
        <el-table-column label="计件类型" min-width="100" prop="pieceType">
          <template #default="{ row }">
            <el-tag effect="plain" round size="small" :type="pieceTagType(row.pieceType)">{{ row.pieceType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="控制属性" min-width="100" prop="controlAttr" show-overflow-tooltip />
        <el-table-column label="单据名称" min-width="110" prop="docName" show-overflow-tooltip />
        <el-table-column label="品号" min-width="110" prop="goodsCode" show-overflow-tooltip />
        <el-table-column label="品名" min-width="200" prop="goodsName" show-overflow-tooltip />
        <el-table-column label="标准属性" min-width="90" prop="stdAttr" show-overflow-tooltip />
        <el-table-column label="单位名称" min-width="80" prop="unitName" />
        <el-table-column align="right" label="起始批量" min-width="90" prop="ratioQty" />
        <el-table-column align="right" label="计件单价" min-width="110" prop="piecePrice">
          <template #default="{ row }">
            <span class="up-price" :class="{ locked: row.allowEditPrice !== '是' }">{{ formatPrice(row.piecePrice) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="120" prop="remark" show-overflow-tooltip />
        <el-table-column label="单位" min-width="70" prop="unitCode" />
        <el-table-column label="外卖品定制编号" min-width="130" prop="resourceFixedCode" show-overflow-tooltip />
        <el-table-column label="修改日期" min-width="160" prop="modifyDate" />
        <el-table-column label="修改人" min-width="90" prop="modifier" />
        <el-table-column label="修改人代号" min-width="110" prop="modifierCode" />
        <el-table-column label="是否允许修改单价" min-width="140" prop="allowEditPrice">
          <template #default="{ row }">
            <el-tag effect="light" round size="small" :type="row.allowEditPrice === '是' ? 'success' : 'info'">
              {{ row.allowEditPrice }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="建立日期" min-width="160" prop="createDate" />
        <el-table-column label="建立人" min-width="90" prop="creator" />
        <el-table-column label="建立人代号" min-width="110" prop="creatorCode" />
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">{{ row.allowEditPrice === '是' ? '改价' : '查看' }}</el-button>
            <el-button link type="danger" @click="handleDelete([row.id])">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <footer class="up-pager">
      <vab-pagination
        :current-page="queryForm.pageNo"
        :page-size="queryForm.pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        @current-change="(p: number) => { queryForm.pageNo = p; fetchList() }"
        @size-change="(s: number) => { queryForm.pageSize = s; queryForm.pageNo = 1; fetchList() }"
      />
    </footer>

    <el-drawer
      v-model="drawerVisible"
      append-to-body
      class="up-drawer"
      destroy-on-close
      size="460px"
      :title="editing ? (editing.id ? '调整单价' : '新增单价') : '详情'"
    >
      <el-form v-if="form" label-position="top" :model="form">
        <div class="up-drawer__grid">
          <el-form-item label="派工类型代号">
            <el-input v-model="form.dispatchTypeCode" :disabled="!!editing?.id" />
          </el-form-item>
          <el-form-item label="派工类型名称">
            <el-input v-model="form.dispatchTypeName" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="计件类型">
            <el-select v-model="form.pieceType" :disabled="!!editing?.id && !canEdit" style="width: 100%">
              <el-option label="个人计件" value="个人计件" />
              <el-option label="班组计件" value="班组计件" />
              <el-option label="不计件" value="不计件" />
            </el-select>
          </el-form-item>
          <el-form-item label="控制属性">
            <el-input v-model="form.controlAttr" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item class="span-2" label="单据名称">
            <el-input v-model="form.docName" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="品号">
            <el-input v-model="form.goodsCode" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="品名">
            <el-input v-model="form.goodsName" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="标准属性">
            <el-input v-model="form.stdAttr" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="单位名称">
            <el-input v-model="form.unitName" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="单位">
            <el-input v-model="form.unitCode" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item label="起始批量">
            <el-input-number v-model="form.ratioQty" :disabled="!!editing?.id && !canEdit" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="计件单价">
            <el-input-number
              v-model="form.piecePrice"
              :disabled="!!editing?.id && !canEdit"
              :min="0"
              :precision="2"
              :step="0.1"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="是否允许修改单价">
            <el-switch
              v-model="form.allowEditPrice"
              active-text="是"
              active-value="是"
              :disabled="!!editing?.id && form.allowEditPrice === '否' && !canEdit"
              inactive-text="否"
              inactive-value="否"
            />
          </el-form-item>
          <el-form-item class="span-2" label="外卖品定制编号">
            <el-input v-model="form.resourceFixedCode" :disabled="!!editing?.id && !canEdit" />
          </el-form-item>
          <el-form-item class="span-2" label="备注">
            <el-input v-model="form.remark" :disabled="!!editing?.id && !canEdit" :rows="2" type="textarea" />
          </el-form-item>
        </div>
        <div v-if="editing?.id" class="up-drawer__meta">
          <div>修改：{{ editing.modifier }}（{{ editing.modifierCode }}）· {{ editing.modifyDate }}</div>
          <div>建立：{{ editing.creator }}（{{ editing.creatorCode }}）· {{ editing.createDate }}</div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button v-if="!editing?.id || canEdit" :loading="saving" type="primary" @click="saveForm">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  createUnitPrice,
  deleteUnitPrice,
  getUnitPriceList,
  getUnitPriceTypeStats,
  updateUnitPrice,
  type UnitPriceRow,
} from '/@/api/nonProd/unitPrice'

defineOptions({ name: 'UnitPriceSetting' })

const loading = ref(false)
const saving = ref(false)
const list = ref<UnitPriceRow[]>([])
const selected = ref<UnitPriceRow[]>([])
const total = ref(0)
const totalAll = ref(0)
const typeStats = ref<{ code: string; name: string; count: number; avgPrice: number }[]>([])
const editableCount = ref(0)

const queryForm = reactive({
  keyword: '',
  dispatchTypeCode: '',
  pieceType: '',
  allowEditPrice: '',
  pageNo: 1,
  pageSize: 50,
})

const drawerVisible = ref(false)
const editing = ref<UnitPriceRow | null>(null)
const form = ref<Partial<UnitPriceRow> | null>(null)

const canEdit = computed(() => !editing.value?.id || editing.value.allowEditPrice === '是')

const formatPrice = (v: number) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 2 })
}

const pieceTagType = (t: string) => {
  if (t === '个人计件') return 'warning'
  if (t === '班组计件') return 'success'
  return 'info'
}

const fetchStats = async () => {
  const [{ data: types }, all] = await Promise.all([
    getUnitPriceTypeStats(),
    getUnitPriceList({ pageNo: 1, pageSize: 9999 }),
  ])
  typeStats.value = types
  totalAll.value = types.reduce((s, i) => s + i.count, 0)
  editableCount.value = (all.data.list || []).filter((r) => r.allowEditPrice === '是').length
}

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await getUnitPriceList({ ...queryForm })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (e: any) {
    list.value = []
    total.value = 0
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchList()
}

const resetQuery = () => {
  queryForm.keyword = ''
  queryForm.dispatchTypeCode = ''
  queryForm.pieceType = ''
  queryForm.allowEditPrice = ''
  queryForm.pageNo = 1
  fetchList()
}

const selectType = (code: string) => {
  queryForm.dispatchTypeCode = code
  queryData()
}

const blankForm = (): Partial<UnitPriceRow> => ({
  dispatchTypeCode: '1002',
  dispatchTypeName: '零星种派工',
  pieceType: '个人计件',
  controlAttr: '关联物品',
  docName: '',
  goodsCode: '',
  goodsName: '',
  stdAttr: '',
  unitName: '套',
  ratioQty: 0,
  piecePrice: 0,
  remark: '',
  unitCode: 'SET',
  resourceFixedCode: '',
  allowEditPrice: '是',
})

const openCreate = () => {
  editing.value = null
  form.value = blankForm()
  drawerVisible.value = true
}

const openEdit = (row: UnitPriceRow) => {
  editing.value = { ...row }
  form.value = { ...row }
  drawerVisible.value = true
}

const saveForm = async () => {
  if (!form.value) return
  if (!form.value.goodsCode || !form.value.goodsName) {
    $baseMessage('请填写品号与品名', 'warning', 'hey')
    return
  }
  saving.value = true
  try {
    if (editing.value?.id) {
      await updateUnitPrice(editing.value.id, {
        piecePrice: Number(form.value.piecePrice) || 0,
        remark: form.value.remark || '',
        allowEditPrice: form.value.allowEditPrice as any,
        ratioQty: Number(form.value.ratioQty) || 0,
      })
      $baseMessage('已保存', 'success', 'hey')
    } else {
      await createUnitPrice({
        dispatchTypeCode: form.value.dispatchTypeCode || '',
        dispatchTypeName: form.value.dispatchTypeName || '',
        pieceType: (form.value.pieceType as any) || '个人计件',
        controlAttr: form.value.controlAttr || '',
        docName: form.value.docName || '',
        goodsCode: form.value.goodsCode || '',
        goodsName: form.value.goodsName || '',
        stdAttr: form.value.stdAttr || '',
        unitName: form.value.unitName || '',
        ratioQty: Number(form.value.ratioQty) || 0,
        piecePrice: Number(form.value.piecePrice) || 0,
        remark: form.value.remark || '',
        unitCode: form.value.unitCode || '',
        resourceFixedCode: form.value.resourceFixedCode || '',
        allowEditPrice: (form.value.allowEditPrice as any) || '是',
      })
      $baseMessage('已新增', 'success', 'hey')
    }
    drawerVisible.value = false
    await Promise.all([fetchList(), fetchStats()])
  } catch (e: any) {
    $baseMessage(e?.message || '保存失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (ids: string[]) => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条记录吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteUnitPrice(ids)
    $baseMessage('已删除', 'success', 'hey')
    await Promise.all([fetchList(), fetchStats()])
  } catch (e: any) {
    $baseMessage(e?.message || '删除失败', 'error', 'hey')
  }
}

const handleBatchDelete = () => handleDelete(selected.value.map((r) => r.id))

onMounted(async () => {
  await Promise.all([fetchList(), fetchStats()])
})
</script>

<style lang="scss" scoped>
.up-page {
  --up-ink: #1c2b2a;
  --up-muted: #5f736f;
  --up-line: #d7e2df;
  --up-accent: #0f766e;
  --up-accent-soft: #ccfbf1;
  --up-surface: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 4px 2px 0;
  background:
    radial-gradient(1200px 420px at 8% -10%, rgba(15, 118, 110, 0.12), transparent 60%),
    radial-gradient(900px 360px at 100% 0%, rgba(245, 158, 11, 0.08), transparent 55%),
    linear-gradient(180deg, #f3f7f6 0%, #eef3f2 100%);
}

.up-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--up-line);
  border-radius: 14px;
  background: var(--up-surface);
  box-shadow: 0 10px 28px rgba(28, 43, 42, 0.05);
}

.up-hero__eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--up-accent);
  font-weight: 700;
}

.up-hero h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  color: var(--up-ink);
  font-weight: 760;
  letter-spacing: -0.02em;
}

.up-hero__desc {
  margin: 8px 0 0;
  max-width: 560px;
  font-size: 13px;
  color: var(--up-muted);
  line-height: 1.55;
}

.up-hero__stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.up-stat {
  min-width: 88px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(160deg, #fff, var(--up-accent-soft));
  border: 1px solid #b6e2d8;
  text-align: right;
}

.up-stat__label {
  display: block;
  font-size: 12px;
  color: var(--up-muted);
}

.up-stat strong {
  font-size: 22px;
  color: var(--up-ink);
  font-variant-numeric: tabular-nums;
}

.up-types {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.up-type {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 148px;
  padding: 10px 12px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  text-align: left;

  &:hover {
    border-color: #99c9c0;
    transform: translateY(-1px);
  }

  &.active {
    border-color: var(--up-accent);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
    background: #f0fdfa;
  }
}

.up-type__code {
  font-size: 11px;
  color: var(--up-accent);
  font-weight: 700;
}

.up-type__name {
  font-size: 13px;
  color: var(--up-ink);
  font-weight: 650;
}

.up-type__meta {
  font-size: 12px;
  color: var(--up-muted);
}

.up-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: #fff;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.up-toolbar__actions {
  display: flex;
  gap: 8px;
}

.up-table-wrap {
  flex: 1;
  min-height: 280px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.up-table {
  :deep(.el-table__header th) {
    background: #f4f8f7 !important;
    color: #3d524e;
    font-weight: 650;
  }

  :deep(.el-table__body tr.current-row > td) {
    background: #ecfdf8 !important;
  }
}

.up-price {
  display: inline-block;
  min-width: 52px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  &.locked {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.up-pager {
  display: flex;
  justify-content: flex-end;
}
</style>

<style lang="scss">
.up-drawer {
  .el-drawer__body {
    padding-top: 8px;
  }
}

.up-drawer__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;

  .span-2 {
    grid-column: 1 / -1;
  }
}

.up-drawer__meta {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f5f7f7;
  color: #667874;
  font-size: 12px;
  line-height: 1.7;
}
</style>
