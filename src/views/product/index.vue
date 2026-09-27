<template>
  <div class="pg plist">
    <header class="plist__head">
      <div>
        <div class="pg-eyebrow">商品库</div>
        <h1 class="pg-title">商品列表</h1>
      </div>
      <div class="plist__actions">
        <el-button v-if="creating" @click="closeCreate">返回列表</el-button>
        <el-button type="primary" class="pg-btn-primary" :icon="Plus" @click="openCreate">
          新增商品
        </el-button>
      </div>
    </header>

    <div v-if="creating" class="plist__create">
      <ProductCreate embedded @cancel="closeCreate" @saved="onCreated" />
    </div>

    <template v-else>
      <section class="pg-card query-bar">
        <el-form class="query-bar__form" inline @submit.prevent="search">
          <el-form-item>
            <el-input
              v-model.trim="query.keyword"
              clearable
              placeholder="名称 / SPU"
              style="width: 180px"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.productStatus" clearable placeholder="商品状态" style="width: 110px" @change="search">
              <el-option v-for="s in PRODUCT_STATUS" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.auditStatus" clearable placeholder="审核状态" style="width: 110px" @change="search">
              <el-option v-for="s in AUDIT_STATUS" :key="String(s.value)" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.brand" clearable filterable placeholder="品牌" style="width: 120px" @change="search">
              <el-option v-for="b in brands" :key="b" :label="b" :value="b" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input
              v-model.trim="query.categoryPath"
              clearable
              placeholder="分类"
              style="width: 140px"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="onlyMissing" @change="onMissingToggle">仅缺资料</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="pg-btn-primary" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </section>

      <section class="pg-card list-main">
        <div class="list-toolbar">
          <div class="queue-pills">
            <button
              v-for="q in pills"
              :key="q.key"
              type="button"
              class="pill"
              :class="{ active: activePill === q.key }"
              @click="applyPill(q.key)"
            >
              {{ q.label }}
              <span v-if="q.key === 'miss' && missingCount" class="pill__badge">
                {{ missingCount }}
              </span>
            </button>
          </div>
          <div class="list-toolbar__right">
            <el-button-group>
              <el-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">表格</el-button>
              <el-button :type="viewMode === 'card' ? 'primary' : 'default'" @click="viewMode = 'card'">卡片</el-button>
            </el-button-group>
            <el-dropdown v-if="selected.length" trigger="click" @command="batchCmd">
              <el-button>批量 {{ selected.length }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pass">批量通过</el-dropdown-item>
                  <el-dropdown-item command="reject">批量驳回</el-dropdown-item>
                  <el-dropdown-item command="on">批量上架</el-dropdown-item>
                  <el-dropdown-item command="off">批量下架</el-dropdown-item>
                  <el-dropdown-item command="del" divided>批量删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" v-loading="loading" class="card-grid">
          <article
            v-for="row in displayList"
            :key="row.id"
            class="p-card"
            :class="{ selected: selectedIds.has(row.id) }"
            @click="toggleSelect(row)"
          >
            <div class="p-card__cover-wrap" @click.stop="open(row)">
              <el-image class="p-card__cover" :src="row.mainImage || placeholder" fit="cover" />
              <div class="p-card__badges">
                <span v-if="row.isOnShelf === 1" class="mini-badge on">上架</span>
                <span v-else class="mini-badge off">下架</span>
                <span v-if="row.isNew" class="mini-badge">新品</span>
                <span v-if="row.isHot" class="mini-badge hot">热销</span>
                <span v-if="row.isRecommended" class="mini-badge">推荐</span>
              </div>
            </div>
            <div class="p-card__body">
              <div class="p-card__name" @click.stop="open(row)">{{ row.productName }}</div>
              <div v-if="row.productSubtitle" class="p-card__sub">{{ row.productSubtitle }}</div>
              <div class="p-card__code">
                <span>{{ row.productCode }}</span>
                <span v-if="row.brand">{{ row.brand }}</span>
              </div>
              <div v-if="row.categoryPath" class="p-card__cats">
                <el-tag
                  v-for="t in categoryTags(row.categoryPath)"
                  :key="t"
                  size="small"
                  effect="plain"
                  type="info"
                >
                  {{ t }}
                </el-tag>
              </div>
              <div class="p-card__price">
                <strong>¥{{ price(row) }}</strong>
                <span v-if="showOriginPrice(row)" class="origin">¥{{ formatNum(row.retailPrice) }}</span>
                <span v-if="row.unit" class="unit">/ {{ row.unit }}</span>
              </div>
              <div class="p-card__meta">
                <span>SKU {{ row.specCount || 0 }}</span>
                <span>库存 {{ row.specStock || 0 }}</span>
                <span>{{ typeLabel(row.productType) }}</span>
                <span class="pg-score">{{ row.completeness }}%</span>
              </div>
              <div class="p-card__media">
                <span :class="{ on: !!row.mainImage }">主图</span>
                <span :class="{ on: (row.detailImages || []).length > 0 }">
                  详情{{ (row.detailImages || []).length || '' }}
                </span>
                <span :class="{ on: !!row.videoUrl }">视频</span>
                <span :class="{ on: !!row.model3dUrl }">3D</span>
              </div>
              <div v-if="(row.tags || []).length" class="p-card__biz-tags">
                <el-tag v-for="t in row.tags.slice(0, 3)" :key="t" size="small" effect="plain">{{ t }}</el-tag>
              </div>
              <div class="p-card__tags">
                <span class="pg-tag" :class="statusClass(row.productStatus)">{{ statusLabel(row.productStatus) }}</span>
                <span class="pg-tag" :class="auditClass(row.auditStatus)">{{ auditLabel(row.auditStatus) }}</span>
              </div>
              <div class="p-card__time">更新 {{ shortTime(row.updateTime || row.createTime) }}</div>
              <div v-if="missingReasons(row).length" class="p-card__miss">
                {{ missingReasons(row).slice(0, 3).join(' · ') }}
              </div>
            </div>
          </article>
          <div v-if="!displayList.length && !loading" class="empty">没有匹配的商品</div>
        </div>

        <!-- 表格视图 -->
        <el-table
          v-else
          v-loading="loading"
          :data="displayList"
          height="100%"
          @selection-change="onSelect"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column label="商品信息" min-width="300">
            <template #default="{ row }">
              <div class="row-goods" @click="open(row)">
                <el-image class="row-goods__img" :src="row.mainImage || placeholder" fit="cover" />
                <div class="row-goods__info">
                  <div class="row-goods__name">
                    {{ row.productName }}
                    <el-tag v-if="row.isNew" size="small" type="warning" effect="plain">新品</el-tag>
                    <el-tag v-if="row.isHot" size="small" type="danger" effect="plain">热销</el-tag>
                    <el-tag v-if="row.isRecommended" size="small" type="success" effect="plain">推荐</el-tag>
                  </div>
                  <div v-if="row.productSubtitle" class="row-goods__sub">{{ row.productSubtitle }}</div>
                  <div class="row-goods__code">
                    SPU {{ row.productCode }}
                    <template v-if="row.brand"> · {{ row.brand }}</template>
                  </div>
                  <div v-if="row.categoryPath" class="row-goods__cats">
                    <el-tag
                      v-for="t in categoryTags(row.categoryPath)"
                      :key="t"
                      size="small"
                      effect="plain"
                      type="info"
                    >
                      {{ t }}
                    </el-tag>
                  </div>
                  <div v-if="missingReasons(row).length" class="row-goods__miss">
                    {{ missingReasons(row).slice(0, 3).join(' · ') }}
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="120" align="right">
            <template #default="{ row }">
              <div class="price-cell">
                <span class="price">¥{{ price(row) }}</span>
                <span v-if="showOriginPrice(row)" class="price-origin">¥{{ formatNum(row.retailPrice) }}</span>
                <span v-if="row.unit" class="price-unit">{{ row.unit }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="72" align="center">
            <template #default="{ row }">{{ typeLabel(row.productType) }}</template>
          </el-table-column>
          <el-table-column label="SKU" width="64" align="center" prop="specCount" />
          <el-table-column label="库存" width="72" align="center">
            <template #default="{ row }">
              <span :class="{ 'stock-low': Number(row.specStock) < 50 }">{{ row.specStock || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="素材" width="110" align="center">
            <template #default="{ row }">
              <div class="media-dots">
                <span :class="{ on: !!row.mainImage }" title="主图">图</span>
                <span :class="{ on: (row.detailImages || []).length > 0 }" title="详情图">详</span>
                <span :class="{ on: !!row.videoUrl }" title="视频">视</span>
                <span :class="{ on: !!row.model3dUrl }" title="3D">3D</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="完整度" width="100">
            <template #default="{ row }">
              <el-progress :percentage="row.completeness" :stroke-width="6" color="#0f766e" />
            </template>
          </el-table-column>
          <el-table-column label="上架" width="64" align="center">
            <template #default="{ row }">
              <span class="pg-tag" :class="row.isOnShelf === 1 ? 'ok' : 'info'">
                {{ row.isOnShelf === 1 ? '上架' : '下架' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <span class="pg-tag" :class="statusClass(row.productStatus)">{{ statusLabel(row.productStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="审核" width="88" align="center">
            <template #default="{ row }">
              <span class="pg-tag" :class="auditClass(row.auditStatus)">{{ auditLabel(row.auditStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="110" align="center">
            <template #default="{ row }">{{ shortTime(row.updateTime || row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="open(row)">工作台</el-button>
              <el-button v-if="row.auditStatus === 0" link type="warning" @click="openAudit(row)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="list-pager">
          <vab-pagination
            :current-page="query.pageNo"
            :page-size="query.pageSize"
            :total="total"
            @current-change="(p) => { query.pageNo = p; fetch() }"
            @size-change="(s) => { query.pageSize = s; query.pageNo = 1; fetch() }"
          />
        </div>
      </section>
    </template>

    <AuditDrawer v-model:visible="auditVisible" :product="auditRow" @done="fetch" />
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AUDIT_STATUS,
  doRemove,
  getList,
  PRODUCT_STATUS,
  PRODUCT_TYPE,
  updateAuditStatus,
  updateOnShelf,
} from '/@/api/product'
import AuditDrawer from './components/AuditDrawer.vue'
import ProductCreate from './create.vue'
import { isMissingMaterial, listMissingReasons } from './utils/completeness'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const selected = ref<any[]>([])
const viewMode = ref<'table' | 'card'>('card')
const onlyMissing = ref(false)
const activePill = ref('all')
const brands = ref(['宜家家居', '全友家居', '顾家家居', '林氏木业'])
const auditVisible = ref(false)
const auditRow = ref<any>(null)
const creating = ref(false)
const missingCount = computed(() => list.value.filter((r) => isMissingMaterial(r)).length)
const missingReasons = (row: any) => listMissingReasons(row)

const query = reactive<any>({
  pageNo: 1,
  pageSize: 12,
  keyword: '',
  brand: '',
  categoryPath: '',
  productStatus: undefined as number | undefined,
  auditStatus: undefined as number | undefined,
})

const pills = [
  { key: 'all', label: '全部' },
  { key: 'sale', label: '在售' },
  { key: 'pending', label: '待审核' },
  { key: 'draft', label: '草稿' },
  { key: 'miss', label: '缺资料' },
]

const placeholder =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMjQwIDE4MCI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNmM2VmZTgiLz48L3N2Zz4='

const selectedIds = computed(() => new Set(selected.value.map((r) => r.id)))
const displayList = computed(() => {
  if (!onlyMissing.value && activePill.value !== 'miss') return list.value
  return list.value.filter((r) => r.completeness < 70 || !r.mainImage)
})

const price = (row: any) => formatNum(row.memberPrice ?? row.retailPrice)
const formatNum = (v: any) => (v == null || v === '' ? '0.00' : Number(v).toFixed(2))
const showOriginPrice = (row: any) =>
  row.retailPrice != null &&
  row.memberPrice != null &&
  Number(row.retailPrice) > Number(row.memberPrice)
const statusLabel = (v: number) => PRODUCT_STATUS.find((i) => i.value === v)?.label || '草稿'
const auditLabel = (v: number) => AUDIT_STATUS.find((i) => i.value === v)?.label || '未送审'
const typeLabel = (v: number | null | undefined) =>
  PRODUCT_TYPE.find((i) => i.value === v)?.label || '成品'
const statusClass = (v: number) => ({ 1: 'ok', 0: 'info', 2: 'warn', 3: 'danger' }[v] || 'info')
const auditClass = (v: number) => ({ 1: 'ok', 0: 'warn', 2: 'danger', [-1]: 'info' }[v] || 'info')
const categoryTags = (path: string) =>
  String(path || '')
    .split(/[/＞>]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
const shortTime = (t: string) => {
  if (!t) return '—'
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s
}

function applyPill(key: string) {
  activePill.value = key
  onlyMissing.value = key === 'miss'
  query.productStatus = undefined
  query.auditStatus = undefined
  if (key === 'sale') query.productStatus = 1
  if (key === 'draft') query.productStatus = 0
  if (key === 'pending') query.auditStatus = 0
  query.pageNo = 1
  fetch()
}

function onMissingToggle() {
  activePill.value = onlyMissing.value ? 'miss' : 'all'
  search()
}

function search() {
  query.pageNo = 1
  fetch()
}
function reset() {
  Object.assign(query, {
    pageNo: 1,
    keyword: '',
    brand: '',
    categoryPath: '',
    productStatus: undefined,
    auditStatus: undefined,
  })
  onlyMissing.value = false
  activePill.value = 'all'
  fetch()
}

async function fetch() {
  loading.value = true
  try {
    const res: any = await getList({ ...query })
    list.value = res?.data?.list || []
    total.value = res?.data?.total || 0
    list.value.forEach((r) => {
      if (r.brand && !brands.value.includes(r.brand)) brands.value.push(r.brand)
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  creating.value = true
  router.replace({ path: '/product/index', query: { ...route.query, create: '1' } })
}
function closeCreate() {
  creating.value = false
  const q = { ...route.query }
  delete q.create
  router.replace({ path: '/product/index', query: q })
}
function onCreated() {
  closeCreate()
  fetch()
}

function onSelect(rows: any[]) {
  selected.value = rows
}
function toggleSelect(row: any) {
  const idx = selected.value.findIndex((r) => r.id === row.id)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(row)
}
function open(row: any, tab?: string) {
  router.push({ path: '/product/workbench', query: { id: row.id, ...(tab ? { tab } : {}) } })
}
function openAudit(row: any) {
  auditRow.value = row
  auditVisible.value = true
}

async function batchCmd(cmd: string) {
  const ids = selected.value.map((r) => r.id)
  try {
    if (cmd === 'pass') {
      await Promise.all(ids.map((id) => updateAuditStatus(id, 1, { autoOnShelf: true })))
      ElMessage.success('批量通过')
    } else if (cmd === 'reject') {
      const { value } = await ElMessageBox.prompt('驳回原因', '批量驳回', {
        inputValidator: (v) => !!v?.trim() || '必填',
      })
      await Promise.all(ids.map((id) => updateAuditStatus(id, 2, { auditRemark: value })))
      ElMessage.success('批量驳回')
    } else if (cmd === 'on') {
      await Promise.all(ids.map((id) => updateOnShelf(id, 1)))
      ElMessage.success('批量上架')
    } else if (cmd === 'off') {
      await Promise.all(ids.map((id) => updateOnShelf(id, 0)))
      ElMessage.success('批量下架')
    } else if (cmd === 'del') {
      await ElMessageBox.confirm(`删除 ${ids.length} 个商品？`, '确认', { type: 'warning' })
      await doRemove({ ids: ids.join(',') })
      ElMessage.success('已删除')
    }
    fetch()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '失败')
  }
}

watch(
  () => route.query,
  (q) => {
    if (q.productStatus != null) query.productStatus = Number(q.productStatus)
    if (q.auditStatus != null) query.auditStatus = Number(q.auditStatus)
    if (q.missing) {
      onlyMissing.value = true
      activePill.value = 'miss'
    }
    creating.value = q.create === '1'
    fetch()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
@import './styles/theme.scss';

.plist__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.plist__actions {
  display: flex;
  gap: 8px;
}

.query-bar {
  padding: 10px 14px 2px;
  margin-bottom: 12px;

  &__form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;

    :deep(.el-form-item) {
      margin-bottom: 8px;
      margin-right: 8px;
    }
  }
}

.plist__create {
  :deep(.create) {
    min-height: calc(100vh - 200px);
    padding: 0;
    background: transparent;
  }
}

.list-main {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 260px);
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--pg-line);
}

.list-toolbar__right {
  display: flex;
  gap: 8px;
}

.queue-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pill {
  border: 0;
  background: var(--pg-sand);
  color: var(--pg-muted);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;

  &.active {
    background: var(--pg-teal-soft);
    color: var(--pg-teal);
    font-weight: 700;
  }

  &__badge {
    margin-left: 4px;
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: #f59e0b;
    color: #fff;
    font-size: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

.card-grid {
  flex: 1;
  overflow: auto;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  align-content: start;
}

.p-card {
  border: 1px solid var(--pg-line);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover,
  &.selected {
    box-shadow: 0 12px 28px rgba(28, 25, 23, 0.1);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: var(--pg-teal);
  }

  &__cover-wrap {
    position: relative;
  }

  &__cover {
    width: 100%;
    height: 168px;
    background: var(--pg-sand);
  }

  &__badges {
    position: absolute;
    left: 8px;
    top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__body {
    padding: 12px 12px 14px;
  }

  &__name {
    font-weight: 700;
    font-size: 14px;
    line-height: 1.35;
  }

  &__sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--pg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__code {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--pg-muted);
  }

  &__cats {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__price {
    margin-top: 10px;
    display: flex;
    align-items: baseline;
    gap: 6px;

    strong {
      color: var(--pg-warm);
      font-size: 18px;
      font-weight: 800;
    }

    .origin {
      color: #c0c4cc;
      font-size: 12px;
      text-decoration: line-through;
    }

    .unit {
      font-size: 12px;
      color: var(--pg-muted);
    }
  }

  &__meta {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12px;
    color: var(--pg-muted);
  }

  &__media {
    margin-top: 8px;
    display: flex;
    gap: 6px;

    span {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 999px;
      background: #f5f5f4;
      color: #a8a29e;

      &.on {
        background: var(--pg-teal-soft);
        color: var(--pg-teal);
      }
    }
  }

  &__biz-tags {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__tags {
    margin-top: 10px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__time {
    margin-top: 8px;
    font-size: 11px;
    color: #a8a29e;
  }

  &__miss {
    margin-top: 8px;
    font-size: 11px;
    color: var(--pg-warm);
    line-height: 1.4;
  }
}

.mini-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--pg-ink);
  font-weight: 650;

  &.on {
    color: var(--pg-ok);
  }
  &.off {
    color: var(--pg-muted);
  }
  &.hot {
    color: #b91c1c;
  }
}

.row-goods {
  display: flex;
  gap: 10px;
  cursor: pointer;

  &__img {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  &__info {
    min-width: 0;
  }

  &__name {
    font-weight: 650;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  &__sub {
    margin-top: 2px;
    font-size: 12px;
    color: var(--pg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 240px;
  }

  &__code {
    margin-top: 2px;
    font-size: 12px;
    color: var(--pg-muted);
  }

  &__cats {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__miss {
    margin-top: 4px;
    font-size: 11px;
    color: var(--pg-warm);
  }
}

.price-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.price {
  color: var(--pg-warm);
  font-weight: 700;
}

.price-origin {
  color: #c0c4cc;
  font-size: 12px;
  text-decoration: line-through;
}

.price-unit {
  font-size: 11px;
  color: var(--pg-muted);
}

.stock-low {
  color: #e6a23c;
  font-weight: 700;
}

.media-dots {
  display: flex;
  justify-content: center;
  gap: 4px;

  span {
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 4px;
    background: #f5f5f4;
    color: #a8a29e;

    &.on {
      background: var(--pg-teal-soft);
      color: var(--pg-teal);
      font-weight: 650;
    }
  }
}

.list-pager {
  padding: 10px 14px;
  border-top: 1px solid var(--pg-line);
}

.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px;
  color: var(--pg-muted);
}
</style>
