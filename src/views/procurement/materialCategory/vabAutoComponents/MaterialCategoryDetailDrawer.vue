<template>
  <el-drawer
    v-model="visible"
    append-to-body
    class="material-category-drawer"
    destroy-on-close
    direction="rtl"
    size="600px"
    :with-header="false"
    @closed="handleClosed"
  >
    <div v-if="detail" class="drawer-inner">
      <header class="drawer-topbar">
        <div class="drawer-topbar-title">
          分类详情 — {{ display(detail.categoryName) }}
        </div>
        <el-button circle :icon="Close" size="small" text @click="visible = false" />
      </header>

      <section class="drawer-hero">
        <div class="hero-icon">
          <el-icon :size="28"><box /></el-icon>
        </div>
        <div class="hero-main">
          <div class="hero-name">{{ display(detail.categoryName) }}</div>
          <div class="hero-meta">
            <span>类别编码：{{ display(detail.categoryCode) }}</span>
            <span class="dot">·</span>
            <span>上级类别：{{ detail.parentName || '顶级' }}</span>
          </div>
        </div>
        <el-tag effect="light" round :type="isEnabled ? 'success' : 'danger'">
          {{ isEnabled ? '启用' : '停用' }}
        </el-tag>
      </section>

      <el-tabs v-model="activeTab" class="drawer-tabs">
        <el-tab-pane name="basic">
          <template #label>
            <span class="tab-label">
              <el-icon><info-filled /></el-icon>
              基础信息
            </span>
          </template>
          <el-descriptions border class="detail-desc" :column="2">
            <el-descriptions-item label="类别名称">{{ display(detail.categoryName) }}</el-descriptions-item>
            <el-descriptions-item label="类别编码">{{ display(detail.categoryCode) }}</el-descriptions-item>
            <el-descriptions-item label="上级类别">{{ detail.parentName || '顶级' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag effect="light" size="small" :type="isEnabled ? 'success' : 'danger'">
                {{ isEnabled ? '启用' : '停用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="物料代码">{{ display(detail.stkCode) }}</el-descriptions-item>
            <el-descriptions-item label="采购工段">{{ display(detail.sectionCode) }}</el-descriptions-item>
            <el-descriptions-item label="开票名称">{{ display(detail.invoiceName) }}</el-descriptions-item>
            <el-descriptions-item label="开票单位">{{ display(detail.invoiceUnit) }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ display(detail.remark) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane name="quality">
          <template #label>
            <span class="tab-label">
              <el-icon><circle-check-filled /></el-icon>
              质量与天数
            </span>
          </template>
          <el-descriptions border class="detail-desc" :column="2">
            <el-descriptions-item label="检验方式">{{ qcModeLabel(detail.qcMode) }}</el-descriptions-item>
            <el-descriptions-item label="是否必须品管">
              <el-tag effect="plain" size="small" :type="isYes(detail.mustQc) ? 'warning' : 'info'">
                {{ isYes(detail.mustQc) ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="采购前置天数">{{ dayText(detail.daysBefPur) }}</el-descriptions-item>
            <el-descriptions-item label="标准检验天数">{{ dayText(detail.daysOfChk) }}</el-descriptions-item>
            <el-descriptions-item label="到货前置天数">{{ dayText(detail.leadDays) }}</el-descriptions-item>
            <el-descriptions-item label="物料流程前置">{{ dayText(detail.applyLeadDays) }}</el-descriptions-item>
            <el-descriptions-item label="是否线边仓">
              <el-tag effect="plain" size="small" :type="isYes(detail.edgeWarehouse) ? 'success' : 'info'">
                {{ isYes(detail.edgeWarehouse) ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="排序">{{ detail.sort ?? 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane name="rules">
          <template #label>
            <span class="tab-label">
              <el-icon><document /></el-icon>
              编码与规格规则
            </span>
          </template>
          <el-descriptions border class="detail-desc" :column="2">
            <el-descriptions-item label="材料成本属性">
              {{ detail.costType === '0' ? '间接材料' : '直接材料' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料编码方式">
              {{ detail.codeGenMode === '2' ? '自动编码' : '手动编码' }}
            </el-descriptions-item>
            <el-descriptions-item label="名字编码方式">
              <span class="accent">{{ detail.nameCodeMode || '手动' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="名字公式">{{ display(detail.nameFormula) }}</el-descriptions-item>
            <el-descriptions-item label="材料名称产生方式">
              {{ detail.nameGenMode === '2' ? '自动产生' : '手工录入' }}
            </el-descriptions-item>
            <el-descriptions-item label="规格描述编码方式">
              <span class="accent">{{ detail.specCodeMode || '手动' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="规格描述公式">{{ display(detail.specFormula) }}</el-descriptions-item>
            <el-descriptions-item label="规格描述产生方式">
              {{ detail.specGenMode === '2' ? '自动产生' : detail.specDescMode || '手工录入' }}
            </el-descriptions-item>
            <el-descriptions-item label="是否重算">
              {{ isYes(detail.ifRecalc) ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="生产入库">{{ detail.prodInStk ?? 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>

      <footer class="drawer-footer">
        <el-button @click="emit('add-child', detail)">添加子类</el-button>
        <el-button type="primary" @click="emit('edit', detail)">编辑</el-button>
      </footer>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { Box, CircleCheckFilled, Close, Document, InfoFilled } from '@element-plus/icons-vue'
import { getDetail } from '/@/api/procurement/materialCategory'

defineOptions({
  name: 'MaterialCategoryDetailDrawer',
})

const emit = defineEmits<{
  edit: [row: any]
  'add-child': [row: any]
  closed: []
}>()

const visible = ref(false)
const activeTab = ref('basic')
const detail = ref<any>(null)

const display = (v: any) => {
  if (v === undefined || v === null || String(v).trim() === '') return '-'
  return String(v)
}

const isYes = (v: any) => v === '是' || v === 1 || v === '1' || v === true

const isEnabled = computed(() => Number(detail.value?.status) === 1)

const qcModeLabel = (val: any) => {
  const map: Record<string, string> = { '1': '免检', '2': '全检', '3': '抽检' }
  return map[String(val)] || display(val)
}

const dayText = (v: any) => `${Number(v ?? 0)} 天`

const open = async (row: any) => {
  if (!row) return
  activeTab.value = 'basic'
  detail.value = { ...row }
  visible.value = true
  if (row.id) {
    try {
      const full = await getDetail(row.id)
      if (full?.id) detail.value = { ...row, ...full }
    } catch {
      /* 列表行数据已够用，详情失败不阻断 */
    }
  }
}

const updateRow = (row: any) => {
  if (!visible.value || !row) return
  open(row)
}

const handleClosed = () => {
  detail.value = null
  emit('closed')
}

defineExpose({ open, updateRow, close: () => { visible.value = false } })
</script>

<style lang="scss">
.material-category-drawer {
  .el-drawer__body {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: linear-gradient(180deg, #f7f9fc 0%, #fff 180px);
  }
}
</style>

<style lang="scss" scoped>
.drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.drawer-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.drawer-topbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.drawer-hero {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 20px 12px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.04);
}

.hero-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  flex-shrink: 0;
}

.hero-main {
  flex: 1;
  min-width: 0;
}

.hero-name {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  line-height: 1.3;
  margin-bottom: 6px;
}

.hero-meta {
  font-size: 13px;
  color: #909399;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;

  .dot {
    opacity: 0.6;
  }
}

.drawer-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px;

  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding-bottom: 12px;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.detail-desc {
  width: 100%;

  :deep(.el-descriptions__label) {
    width: 118px;
    color: #909399;
    font-weight: 500;
    background: #fafbfc;
  }

  :deep(.el-descriptions__content) {
    color: #303133;
    font-weight: 500;
    min-width: 0;
    word-break: break-all;
  }
}

.accent {
  color: #409eff;
}

.drawer-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}
</style>
