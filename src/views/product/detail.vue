<template>
  <div class="pg pdetail" v-loading="loading">
    <header class="pdetail__bar pg-card">
      <div class="pdetail__bar-left">
        <el-button link @click="goBack">← 返回列表</el-button>
        <div>
          <div class="pg-eyebrow">商品详情</div>
          <h1 class="pg-title">{{ product.productName || '商品详情' }}</h1>
        </div>
      </div>
      <div class="pdetail__bar-ops">
        <el-button type="primary" class="pg-btn-primary" @click="goEdit">进入工作台</el-button>
      </div>
    </header>

    <template v-if="product.id">
      <!-- 头图 + 核心信息 -->
      <section class="pg-card pdetail__hero">
        <div class="hero-media">
          <el-image
            class="hero-media__main"
            :src="activeImage || placeholder"
            fit="contain"
            :preview-src-list="galleryList"
            :initial-index="galleryIndex"
          />
          <div v-if="galleryList.length > 1" class="hero-media__thumbs">
            <button
              v-for="(url, i) in galleryList"
              :key="url + i"
              type="button"
              class="thumb"
              :class="{ on: activeImage === url }"
              @click="activeImage = url"
            >
              <el-image :src="url" fit="cover" />
            </button>
          </div>
        </div>

        <div class="hero-info">
          <div class="hero-info__tags">
            <span class="pg-tag" :class="statusCls">{{ statusLabel }}</span>
            <span class="pg-tag" :class="auditCls">{{ auditLabel }}</span>
            <span class="pg-tag" :class="product.isOnShelf === 1 ? 'ok' : 'info'">
              {{ product.isOnShelf === 1 ? '上架' : '下架' }}
            </span>
            <span v-if="product.isNew" class="pg-tag warn">新品</span>
            <span v-if="product.isHot" class="pg-tag danger">热销</span>
            <span v-if="product.isRecommended" class="pg-tag ok">推荐</span>
          </div>

          <h2 class="hero-info__name">{{ product.productName }}</h2>
          <p v-if="product.productSubtitle" class="hero-info__sub">{{ product.productSubtitle }}</p>

          <div class="hero-info__price">
            <strong>¥{{ formatNum(product.memberPrice ?? product.retailPrice) }}</strong>
            <span v-if="showOrigin" class="origin">¥{{ formatNum(product.retailPrice) }}</span>
            <span v-if="product.unit" class="unit">/ {{ product.unit }}</span>
          </div>

          <dl class="meta-grid">
            <div><dt>SPU 编码</dt><dd>{{ product.productCode || '—' }}</dd></div>
            <div><dt>品牌</dt><dd>{{ product.brand || '—' }}</dd></div>
            <div><dt>分类</dt><dd>{{ product.categoryPath || '—' }}</dd></div>
            <div><dt>类型</dt><dd>{{ typeLabel }}</dd></div>
            <div><dt>SKU 数</dt><dd>{{ specs.length }}</dd></div>
            <div><dt>总库存</dt><dd>{{ totalStock }}</dd></div>
            <div><dt>完整度</dt><dd>{{ completeness.score }}%</dd></div>
            <div><dt>更新时间</dt><dd>{{ shortTime(product.updateTime || product.createTime) }}</dd></div>
          </dl>

          <div v-if="(product.tags || []).length" class="chip-row">
            <el-tag v-for="t in product.tags" :key="t" effect="plain" size="small">{{ t }}</el-tag>
          </div>
          <div v-if="(product.applicableSpace || []).length" class="chip-row">
            <span class="chip-row__label">适用空间</span>
            <el-tag v-for="t in product.applicableSpace" :key="t" type="info" effect="plain" size="small">{{ t }}</el-tag>
          </div>
          <p v-if="product.productBrief" class="hero-info__brief">{{ product.productBrief }}</p>
        </div>
      </section>

      <!-- 媒体 -->
      <section v-if="hasMediaExtra" class="pg-card pdetail__block">
        <h3 class="block-title">媒体素材</h3>
        <div class="media-extra">
          <div v-if="product.videoUrl" class="media-extra__item">
            <div class="media-extra__label">商品视频</div>
            <video class="media-extra__video" :src="product.videoUrl" controls preload="metadata" />
          </div>
          <div v-if="product.model3dUrl" class="media-extra__item">
            <div class="media-extra__label">3D 模型</div>
            <a class="model-link" :href="product.model3dUrl" target="_blank" rel="noopener">打开 3D 资源</a>
            <div class="model-url">{{ product.model3dUrl }}</div>
          </div>
        </div>
      </section>

      <!-- 属性 -->
      <section class="pg-card pdetail__block">
        <h3 class="block-title">商品属性</h3>
        <dl class="attr-grid">
          <div v-for="item in attrRows" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value || '—' }}</dd>
          </div>
        </dl>
      </section>

      <!-- SKU -->
      <section class="pg-card pdetail__block">
        <h3 class="block-title">SKU 规格 <small>{{ specs.length }} 个</small></h3>
        <el-table v-if="specs.length" :data="specs" border size="small" empty-text="暂无规格">
          <el-table-column label="默认" width="60" align="center">
            <template #default="{ row }">
              <span v-if="row.isDefault === 1" class="pg-tag ok">默</span>
            </template>
          </el-table-column>
          <el-table-column label="规格名" min-width="100" prop="specName" />
          <el-table-column label="颜色" width="90" prop="color" />
          <el-table-column label="SKU 编码" min-width="130" prop="specCode" />
          <el-table-column label="售价" width="100" align="right">
            <template #default="{ row }">¥{{ formatNum(row.specPrice) }}</template>
          </el-table-column>
          <el-table-column label="会员价" width="100" align="right">
            <template #default="{ row }">¥{{ formatNum(row.specMemberPrice ?? row.specPrice) }}</template>
          </el-table-column>
          <el-table-column label="库存" width="80" align="center" prop="specStock" />
          <el-table-column label="尺寸(长×宽×高 mm)" min-width="160">
            <template #default="{ row }">
              {{ sizeText(row) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="72" align="center">
            <template #default="{ row }">
              {{ row.specStatus === 0 ? '禁用' : '启用' }}
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="empty-tip">暂无 SKU</div>
      </section>

      <!-- 详情文案 -->
      <section class="pg-card pdetail__block">
        <h3 class="block-title">商品详情文案</h3>
        <div v-if="product.productDescription" class="rich-html" v-html="safeHtml" />
        <div v-else class="empty-tip">暂无详情文案</div>
      </section>

      <div v-if="product.auditRemark" class="pg-card pdetail__audit">
        <strong>审核备注</strong>
        <p>{{ product.auditRemark }}</p>
        <span v-if="product.auditTime">时间 {{ shortTime(product.auditTime) }}</span>
      </div>
    </template>

    <div v-else-if="!loading" class="pg-card empty-page">商品不存在或已删除</div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AUDIT_STATUS,
  getDetail,
  PRODUCT_STATUS,
  PRODUCT_TYPE,
} from '/@/api/product'
import { calcCompleteness } from './utils/completeness'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const activeImage = ref('')
const product = reactive<any>({
  id: '',
  productName: '',
  productCode: '',
  productSubtitle: '',
  productBrief: '',
  productDescription: '',
  brand: '',
  categoryPath: '',
  retailPrice: null,
  memberPrice: null,
  unit: '',
  productType: 0,
  productStatus: 0,
  auditStatus: -1,
  auditRemark: '',
  auditTime: '',
  mainImage: '',
  detailImages: [] as string[],
  videoUrl: '',
  model3dUrl: '',
  isOnShelf: 0,
  isNew: 0,
  isHot: 0,
  isRecommended: 0,
  tags: [] as string[],
  applicableSpace: [] as string[],
  applicableScene: [] as string[],
  origin: [] as string[],
  createTime: '',
  updateTime: '',
})
const specs = ref<any[]>([])

const placeholder =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmM2VmZTgiLz48L3N2Zz4='

const galleryList = computed(() => {
  const list = [product.mainImage, ...(product.detailImages || [])].filter(Boolean)
  return Array.from(new Set(list))
})
const galleryIndex = computed(() => Math.max(0, galleryList.value.indexOf(activeImage.value)))
const hasMediaExtra = computed(() => !!(product.videoUrl || product.model3dUrl))
const completeness = computed(() => calcCompleteness({ ...product, specs: specs.value }))
const totalStock = computed(() => specs.value.reduce((sum, s) => sum + Number(s.specStock || 0), 0))
const showOrigin = computed(
  () =>
    product.retailPrice != null &&
    product.memberPrice != null &&
    Number(product.retailPrice) > Number(product.memberPrice)
)
const statusLabel = computed(() => PRODUCT_STATUS.find((i) => i.value === product.productStatus)?.label || '草稿')
const auditLabel = computed(() => AUDIT_STATUS.find((i) => i.value === product.auditStatus)?.label || '未送审')
const typeLabel = computed(() => PRODUCT_TYPE.find((i) => i.value === product.productType)?.label || '成品')
const statusCls = computed(() => ({ 1: 'ok', 0: 'info', 2: 'warn', 3: 'danger' }[product.productStatus] || 'info'))
const auditCls = computed(() => ({ 1: 'ok', 0: 'warn', 2: 'danger', [-1]: 'info' }[product.auditStatus] || 'info'))

const defaultSpec = computed(() => specs.value.find((s) => s.isDefault === 1) || specs.value[0] || {})
const attrRows = computed(() => {
  const s = defaultSpec.value
  return [
    { label: '主材质', value: s.mainMaterial },
    { label: '面料', value: s.fabricMaterial },
    { label: '填充', value: s.fillingMaterial },
    { label: '框架', value: s.frameMaterial },
    { label: '表面工艺', value: s.surfaceCraft },
    { label: '环保等级', value: s.environmentalGrade },
    { label: '风格', value: s.style },
    { label: '五金', value: s.hardware },
    { label: '产地', value: (product.origin || []).join(' / ') },
    { label: '适用场景', value: (product.applicableScene || []).join(' / ') },
  ]
})

/** 简单消毒：去掉 script，保留常见富文本标签 */
const safeHtml = computed(() => {
  const raw = String(product.productDescription || '')
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
})

const formatNum = (v: any) => (v == null || v === '' ? '0.00' : Number(v).toFixed(2))
const shortTime = (t: string) => {
  if (!t) return '—'
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(0, 16) : s
}
const sizeText = (row: any) => {
  const parts = [row.length, row.width, row.height].filter((n) => n != null && n !== '')
  return parts.length ? parts.join(' × ') : '—'
}

function goBack() {
  router.push('/product/index')
}
function goEdit() {
  if (!product.id) return
  router.push({ path: '/product/workbench', query: { id: product.id } })
}

async function load() {
  const id = route.query.id as string
  if (!id) {
    ElMessage.warning('缺少商品 ID')
    goBack()
    return
  }
  loading.value = true
  try {
    const data: any = await getDetail(id)
    Object.assign(product, {
      ...data,
      id: String(data.id || id),
      detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      applicableSpace: Array.isArray(data.applicableSpace) ? data.applicableSpace : [],
      applicableScene: Array.isArray(data.applicableScene) ? data.applicableScene : [],
      origin: Array.isArray(data.origin) ? data.origin : [],
    })
    specs.value = Array.isArray(data.specs) ? data.specs : []
    activeImage.value = galleryList.value[0] || ''
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
    product.id = ''
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.id,
  () => load()
)

onMounted(load)
</script>

<style lang="scss" scoped>
@import './styles/theme.scss';

.pdetail__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  margin-bottom: 12px;
}

.pdetail__bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.pdetail__bar-ops {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pdetail__hero {
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
  gap: 24px;
  padding: 20px;
  margin-bottom: 12px;
}

.hero-media {
  &__main {
    width: 100%;
    height: 360px;
    border-radius: 14px;
    background: var(--pg-sand);
  }

  &__thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
}

.thumb {
  width: 56px;
  height: 56px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: var(--pg-sand);

  &.on {
    border-color: var(--pg-teal);
  }

  :deep(.el-image) {
    width: 100%;
    height: 100%;
  }
}

.hero-info {
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  &__name {
    margin: 0;
    font-size: 24px;
    font-weight: 750;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  &__sub {
    margin: 6px 0 0;
    color: var(--pg-muted);
    font-size: 14px;
  }

  &__price {
    margin-top: 16px;
    display: flex;
    align-items: baseline;
    gap: 8px;

    strong {
      color: var(--pg-warm);
      font-size: 28px;
      font-weight: 800;
    }

    .origin {
      color: #c0c4cc;
      text-decoration: line-through;
      font-size: 14px;
    }

    .unit {
      color: var(--pg-muted);
      font-size: 13px;
    }
  }

  &__brief {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--pg-muted);
  }
}

.meta-grid {
  margin: 18px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;

  dt {
    font-size: 12px;
    color: var(--pg-muted);
  }

  dd {
    margin: 2px 0 0;
    font-size: 14px;
    font-weight: 600;
    word-break: break-all;
  }
}

.chip-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  &__label {
    font-size: 12px;
    color: var(--pg-muted);
    margin-right: 4px;
  }
}

.pdetail__block {
  padding: 18px 20px;
  margin-bottom: 12px;
}

.block-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;

  small {
    margin-left: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--pg-muted);
  }
}

.media-extra {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;

  &__label {
    font-size: 12px;
    color: var(--pg-muted);
    margin-bottom: 8px;
  }

  &__video {
    width: 100%;
    max-height: 320px;
    border-radius: 12px;
    background: #000;
  }
}

.model-link {
  color: var(--pg-teal);
  font-weight: 650;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.model-url {
  margin-top: 6px;
  font-size: 12px;
  color: var(--pg-muted);
  word-break: break-all;
}

.attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px 16px;

  dt {
    font-size: 12px;
    color: var(--pg-muted);
  }

  dd {
    margin: 2px 0 0;
    font-size: 14px;
    font-weight: 600;
  }
}

.rich-html {
  font-size: 14px;
  line-height: 1.7;
  color: var(--pg-ink);

  :deep(img) {
    max-width: 100%;
    border-radius: 10px;
  }

  :deep(p) {
    margin: 0 0 10px;
  }
}

.pdetail__audit {
  padding: 14px 18px;
  margin-bottom: 12px;
  border-color: #fecaca;
  background: #fef2f2;

  strong {
    color: #b91c1c;
  }

  p {
    margin: 6px 0;
  }

  span {
    font-size: 12px;
    color: var(--pg-muted);
  }
}

.empty-tip,
.empty-page {
  padding: 28px;
  text-align: center;
  color: var(--pg-muted);
}

@media (max-width: 960px) {
  .pdetail__hero {
    grid-template-columns: 1fr;
  }

  .hero-media__main {
    height: 280px;
  }
}
</style>
