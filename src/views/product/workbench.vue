<template>
  <div class="pg workbench" v-loading="loading">
    <header class="wb-hero pg-card">
      <div class="wb-hero__left">
        <el-button link @click="$router.push('/product/index')">← 返回列表</el-button>
        <el-image class="wb-hero__img" :src="form.mainImage || placeholder" fit="cover" />
        <div>
          <div class="pg-eyebrow">商品详情工作台</div>
          <h1 class="pg-title">{{ form.productName || '未命名商品' }}</h1>
          <div class="wb-hero__meta">
            <span>{{ form.productCode }}</span>
            <span class="pg-tag" :class="statusCls">{{ statusLabel }}</span>
            <span class="pg-tag" :class="auditCls">{{ auditLabel }}</span>
            <span class="pg-score">完整度 {{ completeness.score }}%</span>
          </div>
        </div>
      </div>
      <div class="wb-hero__actions">
        <el-button :loading="saving" @click="save(-1)">保存</el-button>
        <el-button v-if="form.auditStatus === 0" type="warning" @click="openAudit">审核</el-button>
        <el-button type="primary" class="pg-btn-primary" :loading="saving" @click="tab = 'audit'">提交审核</el-button>
      </div>
    </header>

    <div v-if="form.auditStatus === 2 && form.auditRemark" class="reject-banner">
      驳回原因：{{ form.auditRemark }}
    </div>

    <div class="wb-layout">
      <nav class="pg-card wb-nav">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="wb-nav__item"
          :class="{ active: tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
        <CompletenessPanel class="wb-nav__complete" :product="{ ...form, specs }" @jump="tab = $event" />
      </nav>

      <main class="pg-card wb-main">
        <!-- 基础信息 -->
        <section v-show="tab === 'base'">
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="产品名称">
                  <el-input v-model.trim="form.productName" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="SPU 编码">
                  <el-input v-model.trim="form.productCode" :disabled="!!form.id" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="品牌">
                  <el-input v-model.trim="form.brand" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="分类路径">
                  <el-input v-model.trim="form.categoryPath" placeholder="客厅家具/沙发/布艺沙发" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="副标题">
                  <el-input v-model.trim="form.productSubtitle" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="简介">
                  <el-input v-model.trim="form.productBrief" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="零售价">
                  <el-input-number v-model="form.retailPrice" :min="0" :precision="2" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="会员价">
                  <el-input-number
                    v-model="form.memberPrice"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    @change="onMemberPriceChange"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="商品类型">
                  <el-select v-model="form.productType" style="width: 100%">
                    <el-option v-for="t in PRODUCT_TYPE" :key="t.value" :label="t.label" :value="t.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <!-- 商品属性 -->
        <section v-show="tab === 'attrs'">
          <p class="section-tip">点选即可写入，并自动同步到全部 SKU。</p>
          <div class="preset-block">
            <div class="preset-block__label">主材质</div>
            <div class="chips">
              <button
                v-for="v in MAIN_MATERIAL_PRESETS"
                :key="v"
                type="button"
                class="chip"
                :class="{ on: attr.mainMaterial === v }"
                @click="pickAttr('mainMaterial', v)"
              >{{ v }}</button>
            </div>
          </div>
          <div class="preset-block">
            <div class="preset-block__label">面料</div>
            <div class="chips">
              <button
                v-for="v in FABRIC_PRESETS"
                :key="v"
                type="button"
                class="chip"
                :class="{ on: attr.fabricMaterial === v }"
                @click="pickAttr('fabricMaterial', v)"
              >{{ v }}</button>
            </div>
          </div>
          <div class="preset-block">
            <div class="preset-block__label">填充</div>
            <div class="chips">
              <button
                v-for="v in FILLING_PRESETS"
                :key="v"
                type="button"
                class="chip"
                :class="{ on: attr.fillingMaterial === v }"
                @click="pickAttr('fillingMaterial', v)"
              >{{ v }}</button>
            </div>
          </div>
          <div class="preset-block">
            <div class="preset-block__label">框架 / 表面 / 环保 / 风格</div>
            <div class="chips">
              <button
                v-for="v in FRAME_PRESETS"
                :key="'f'+v"
                type="button"
                class="chip"
                :class="{ on: attr.frameMaterial === v }"
                @click="pickAttr('frameMaterial', v)"
              >{{ v }}</button>
              <button
                v-for="v in SURFACE_PRESETS"
                :key="'s'+v"
                type="button"
                class="chip"
                :class="{ on: attr.surfaceCraft === v }"
                @click="pickAttr('surfaceCraft', v)"
              >{{ v }}</button>
              <button
                v-for="v in ENV_PRESETS"
                :key="'e'+v"
                type="button"
                class="chip"
                :class="{ on: attr.environmentalGrade === v }"
                @click="pickAttr('environmentalGrade', v)"
              >{{ v }}</button>
              <button
                v-for="v in STYLE_PRESETS"
                :key="'st'+v"
                type="button"
                class="chip"
                :class="{ on: attr.style === v }"
                @click="pickAttr('style', v)"
              >{{ v }}</button>
            </div>
          </div>
          <el-form label-position="top" class="attr-extra">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="适用空间">
                  <el-select v-model="form.applicableSpace" multiple allow-create filterable style="width: 100%">
                    <el-option v-for="s in SPACE_PRESETS" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="标签">
                  <el-select v-model="form.tags" multiple allow-create filterable style="width: 100%">
                    <el-option v-for="s in TAG_PRESETS" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <!-- SKU（列表 + 矩阵） -->
        <section v-show="tab === 'sku'" class="sku-panel">
          <div class="sku-toolbar">
            <div class="sku-toolbar__left">
              <el-button-group>
                <el-button :type="skuView === 'list' ? 'primary' : 'default'" @click="skuView = 'list'">
                  列表
                </el-button>
                <el-button :type="skuView === 'matrix' ? 'primary' : 'default'" @click="skuView = 'matrix'">
                  矩阵
                </el-button>
              </el-button-group>
              <span class="sku-toolbar__hint">
                共 {{ specs.length }} 个 SKU · 新增自动继承默认款
              </span>
            </div>
            <div class="sku-toolbar__right">
              <el-button type="primary" :icon="Plus" @click="addSpec">新增 SKU</el-button>
              <el-button @click="batchVisible = true">批量生成</el-button>
            </div>
          </div>

          <div class="sku-bulk">
            <span class="sku-bulk__label">一键统一</span>
            <el-input-number v-model="bulkPrice" :min="0" :precision="0" :step="100" controls-position="right" placeholder="售价" />
            <el-button size="small" @click="applyBulkPrice">写到全部售价</el-button>
            <el-input-number v-model="bulkStock" :min="0" :step="10" controls-position="right" placeholder="库存" />
            <el-button size="small" @click="applyBulkStock">写到全部库存</el-button>
            <el-button size="small" plain @click="fillMissingFromDefault">补齐空值（继承默认）</el-button>
          </div>

          <div v-show="skuView === 'list'">
            <el-table :data="specs" border size="small" row-key="specCode" :row-class-name="skuRowClass">
              <el-table-column label="默认" width="60" align="center">
                <template #default="{ $index }">
                  <el-radio v-model="defaultIdx" :label="$index" @change="setDefault($index)" />
                </template>
              </el-table-column>
              <el-table-column label="规格名" min-width="120">
                <template #default="{ row }">
                  <el-select
                    v-model="row.specName"
                    size="small"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="选择或输入"
                    style="width: 100%"
                  >
                    <el-option v-for="s in specNameOptions" :key="s" :label="s" :value="s" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="颜色" width="120">
                <template #default="{ row }">
                  <el-select
                    v-model="row.color"
                    size="small"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="颜色"
                    style="width: 100%"
                  >
                    <el-option v-for="s in COLOR_PRESETS" :key="s" :label="s" :value="s" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="SKU" min-width="130">
                <template #default="{ row }">
                  <el-input v-model="row.specCode" size="small" placeholder="自动" />
                </template>
              </el-table-column>
              <el-table-column label="售价" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="row.specPrice" size="small" :min="0" :precision="2" controls-position="right" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="会员价" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="row.specMemberPrice" size="small" :min="0" :precision="2" controls-position="right" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="库存" width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.specStock" size="small" :min="0" controls-position="right" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="尺寸(长宽高)" min-width="200">
                <template #default="{ row }">
                  <div class="dim">
                    <el-input-number v-model="row.length" size="small" :min="0" controls-position="right" placeholder="L" />
                    <el-input-number v-model="row.width" size="small" :min="0" controls-position="right" placeholder="W" />
                    <el-input-number v-model="row.height" size="small" :min="0" controls-position="right" placeholder="H" />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="70" fixed="right">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removeSpec($index)">删</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <SkuMatrix
            v-show="skuView === 'matrix'"
            :specs="specs"
            @batch="batchVisible = true"
            @edit="onMatrixEdit"
            @create="onMatrixCreate"
          />
        </section>

        <!-- 图片视频 / 视觉资产 -->
        <section v-show="tab === 'media'">
          <VisualAssetCenter v-model="form" />
        </section>

        <!-- 详情文案 -->
        <section v-show="tab === 'detail'">
          <el-input v-model="form.productDescription" type="textarea" :rows="14" placeholder="商品详情（可粘贴 HTML）" />
        </section>

        <!-- 审核 / 智能检查 -->
        <section v-show="tab === 'audit'">
          <SmartCheckPanel
            :product="{ ...form, specs }"
            :loading="saving"
            @jump="tab = $event"
            @cancel="tab = 'base'"
            @submit="save(0)"
          />
          <div v-if="form.auditTime" class="audit-log">
            <h4>最近审核</h4>
            <p>时间：{{ form.auditTime }}</p>
            <p>状态：{{ auditLabel }}</p>
            <p v-if="form.auditRemark">备注：{{ form.auditRemark }}</p>
          </div>
        </section>
      </main>
    </div>

    <SkuBatchGenerator
      v-model:visible="batchVisible"
      :product-code="form.productCode"
      :base-spec="specs[0]"
      :existing="specs"
      @generated="onBatchGenerated"
    />
    <AuditDrawer v-model:visible="auditVisible" :product="form" @done="reload" />
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AUDIT_STATUS, getDetail, PRODUCT_STATUS, PRODUCT_TYPE, submit } from '/@/api/product'
import { calcCompleteness } from './utils/completeness'
import {
  COLOR_PRESETS,
  ENV_PRESETS,
  FABRIC_PRESETS,
  FILLING_PRESETS,
  FRAME_PRESETS,
  MAIN_MATERIAL_PRESETS,
  SPACE_PRESETS,
  STYLE_PRESETS,
  SURFACE_PRESETS,
  TAG_PRESETS,
  retailFromMember,
  specNamePresetsFor,
} from './utils/presets'
import AuditDrawer from './components/AuditDrawer.vue'
import CompletenessPanel from './components/CompletenessPanel.vue'
import SkuBatchGenerator from './components/SkuBatchGenerator.vue'
import SkuMatrix from './components/SkuMatrix.vue'
import SmartCheckPanel from './components/SmartCheckPanel.vue'
import VisualAssetCenter from './components/VisualAssetCenter.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tab = ref(normalizeTab((route.query.tab as string) || 'base'))
const skuView = ref<'list' | 'matrix'>(route.query.tab === 'matrix' ? 'matrix' : 'list')
const specs = ref<any[]>([])
const defaultIdx = ref(0)
const focusSpecCode = ref('')
const batchVisible = ref(false)
const auditVisible = ref(false)
const bulkPrice = ref<number | null>(null)
const bulkStock = ref<number | null>(null)

const form = reactive<any>({
  id: '',
  productName: '',
  productCode: '',
  brand: '',
  categoryPath: '',
  productSubtitle: '',
  productBrief: '',
  productDescription: '',
  retailPrice: null,
  memberPrice: null,
  productType: 0,
  applicableSpace: [],
  tags: [],
  mainImage: '',
  detailImages: [],
  videoUrl: '',
  model3dUrl: '',
  productStatus: 0,
  auditStatus: -1,
  auditRemark: '',
  auditTime: '',
  isOnShelf: 0,
  isNew: 0,
  isHot: 0,
  isRecommended: 0,
  sortWeight: 0,
  unit: '件',
  minOrderQty: 1,
})

const attr = reactive({
  mainMaterial: '',
  fabricMaterial: '',
  fillingMaterial: '',
  frameMaterial: '',
  surfaceCraft: '',
  environmentalGrade: '',
  style: '',
})

const tabs = [
  { key: 'base', label: '基础信息' },
  { key: 'sku', label: 'SKU' },
  { key: 'attrs', label: '商品属性' },
  { key: 'media', label: '图片视频 / 3D' },
  { key: 'detail', label: '商品详情' },
  { key: 'audit', label: '审核记录' },
]

function normalizeTab(t: string) {
  return t === 'matrix' ? 'sku' : t
}

const placeholder =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2VmZTgiLz48L3N2Zz4='

const completeness = computed(() => calcCompleteness({ ...form, specs: specs.value }))
const statusLabel = computed(() => PRODUCT_STATUS.find((i) => i.value === form.productStatus)?.label || '草稿')
const auditLabel = computed(() => AUDIT_STATUS.find((i) => i.value === form.auditStatus)?.label || '未送审')
const statusCls = computed(() => ({ 1: 'ok', 0: 'info', 2: 'warn', 3: 'danger' }[form.productStatus] || 'info'))
const auditCls = computed(() => ({ 1: 'ok', 0: 'warn', 2: 'danger', [-1]: 'info' }[form.auditStatus] || 'info'))
const specNameOptions = computed(() => {
  const path = String(form.categoryPath || '')
  let key = 'custom'
  if (path.includes('沙发')) key = 'sofa'
  else if (path.includes('餐桌') || path.includes('桌')) key = 'table'
  else if (path.includes('椅')) key = 'chair'
  else if (path.includes('床')) key = 'bed'
  const base = specNamePresetsFor(key)
  const extra = specs.value.map((s) => s.specName).filter(Boolean)
  return Array.from(new Set([...base, ...extra]))
})

function syncAttrFromSpec() {
  const s = specs.value[0] || {}
  attr.mainMaterial = s.mainMaterial || ''
  attr.fabricMaterial = s.fabricMaterial || ''
  attr.fillingMaterial = s.fillingMaterial || ''
  attr.frameMaterial = s.frameMaterial || ''
  attr.surfaceCraft = s.surfaceCraft || ''
  attr.environmentalGrade = s.environmentalGrade || ''
  attr.style = s.style || ''
}

function applyAttrToSpecs(silent = false) {
  specs.value.forEach((s) => Object.assign(s, { ...attr }))
  if (!silent) ElMessage.success('已同步到全部 SKU')
}

function pickAttr(key: keyof typeof attr, value: string) {
  attr[key] = attr[key] === value ? '' : value
  applyAttrToSpecs(true)
}

function setDefault(idx: number) {
  specs.value.forEach((s, i) => {
    s.isDefault = i === idx ? 1 : 0
  })
}

function inheritFromDefault() {
  const base = specs.value.find((s) => s.isDefault === 1) || specs.value[0] || {}
  return {
    specName: base.specName || '标准款',
    color: '',
    specPrice: base.specPrice ?? form.memberPrice,
    specMemberPrice: base.specMemberPrice ?? form.memberPrice ?? base.specPrice,
    specStock: base.specStock ?? 50,
    length: base.length ?? null,
    width: base.width ?? null,
    height: base.height ?? null,
    mainMaterial: base.mainMaterial || attr.mainMaterial,
    fabricMaterial: base.fabricMaterial || attr.fabricMaterial,
    fillingMaterial: base.fillingMaterial || attr.fillingMaterial,
    frameMaterial: base.frameMaterial || attr.frameMaterial,
    surfaceCraft: base.surfaceCraft || attr.surfaceCraft,
    environmentalGrade: base.environmentalGrade || attr.environmentalGrade,
    style: base.style || attr.style,
  }
}

function addSpec() {
  const n = specs.value.length + 1
  const code = `${form.productCode || 'SP'}-${String(n).padStart(2, '0')}`
  specs.value.push({
    specCode: code,
    isDefault: 0,
    specStatus: 1,
    ...inheritFromDefault(),
  })
  skuView.value = 'list'
  focusSpecCode.value = code
}

function removeSpec(idx: number) {
  const wasDefault = specs.value[idx]?.isDefault === 1
  specs.value.splice(idx, 1)
  if (wasDefault && specs.value[0]) {
    defaultIdx.value = 0
    setDefault(0)
  } else if (defaultIdx.value >= specs.value.length) {
    defaultIdx.value = Math.max(0, specs.value.length - 1)
  }
}

function applyBulkPrice() {
  if (bulkPrice.value == null) {
    ElMessage.warning('请先填售价')
    return
  }
  const p = Number(bulkPrice.value)
  specs.value.forEach((s) => {
    s.specPrice = p
    s.specMemberPrice = p
  })
  form.memberPrice = p
  form.retailPrice = retailFromMember(p)
  ElMessage.success('已统一售价')
}

function applyBulkStock() {
  if (bulkStock.value == null) {
    ElMessage.warning('请先填库存')
    return
  }
  const stock = Number(bulkStock.value)
  specs.value.forEach((s) => {
    s.specStock = stock
  })
  ElMessage.success('已统一库存')
}

function fillMissingFromDefault() {
  const base = inheritFromDefault()
  const keys = [
    'specName',
    'specPrice',
    'specMemberPrice',
    'specStock',
    'length',
    'width',
    'height',
    'mainMaterial',
    'fabricMaterial',
    'fillingMaterial',
    'frameMaterial',
    'surfaceCraft',
    'environmentalGrade',
    'style',
  ] as const
  specs.value.forEach((s) => {
    keys.forEach((k) => {
      if (s[k] == null || s[k] === '') s[k] = (base as any)[k]
    })
  })
  ElMessage.success('已按默认款补齐空值')
}

function onMatrixCreate(payload: { color: string; style: string }) {
  const code = `${form.productCode || 'SP'}-${String(specs.value.length + 1).padStart(2, '0')}`
  specs.value.push({
    specCode: code,
    isDefault: 0,
    specStatus: 1,
    ...inheritFromDefault(),
    specName: payload.style,
    color: payload.color,
  })
  focusSpecCode.value = code
}

function onMatrixEdit(spec: any) {
  focusSpecCode.value = spec?.specCode || ''
  skuView.value = 'list'
}

function skuRowClass({ row }: { row: any }) {
  return row?.specCode && row.specCode === focusSpecCode.value ? 'sku-row--focus' : ''
}

function onBatchGenerated(list: any[]) {
  if (!specs.value.length && list[0]) list[0].isDefault = 1
  const base = inheritFromDefault()
  specs.value.push(
    ...list.map((s) => ({
      ...base,
      ...s,
      isDefault: s.isDefault ?? 0,
    }))
  )
  skuView.value = 'matrix'
  tab.value = 'sku'
}

async function reload() {
  const id = route.query.id as string
  if (!id) return
  loading.value = true
  try {
    const data: any = await getDetail(id)
    Object.assign(form, data)
    specs.value = Array.isArray(data.specs) ? data.specs : []
    defaultIdx.value = Math.max(0, specs.value.findIndex((s) => s.isDefault === 1))
    const d = specs.value[defaultIdx.value] || specs.value[0]
    bulkPrice.value = d?.specMemberPrice ?? d?.specPrice ?? form.memberPrice ?? null
    bulkStock.value = d?.specStock ?? 50
    syncAttrFromSpec()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save(auditStatus: number) {
  if (!form.productName || !form.productCode) {
    ElMessage.warning('请填写名称与编码')
    tab.value = 'base'
    return
  }
  if (auditStatus === 0 && !completeness.value.canSubmit) {
    ElMessage.warning('请先修复必须项')
    tab.value = 'audit'
    return
  }
  // merge attr into default spec
  if (specs.value[0]) Object.assign(specs.value[0], { ...attr })
  if (!specs.value.length) {
    specs.value = [{
      specCode: `${form.productCode}-01`,
      specName: '标准款',
      specPrice: form.memberPrice,
      specMemberPrice: form.memberPrice,
      specStock: 100,
      isDefault: 1,
      specStatus: 1,
      ...attr,
    }]
  }
  saving.value = true
  try {
    await submit({
      ...form,
      specs: specs.value,
      auditStatus: auditStatus === 0 ? 0 : form.auditStatus === 2 ? 2 : auditStatus === -1 ? (form.auditStatus === 0 ? 0 : -1) : form.auditStatus,
      productStatus: auditStatus === 0 ? 0 : form.productStatus,
    })
    if (auditStatus === 0) {
      form.auditStatus = 0
      ElMessage.success('已提交审核')
    } else {
      ElMessage.success('已保存')
    }
    await reload()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function openAudit() {
  auditVisible.value = true
}

function onMemberPriceChange(v: number | undefined) {
  form.retailPrice = retailFromMember(v)
  if (v != null && specs.value.length === 1) {
    specs.value[0].specPrice = v
    specs.value[0].specMemberPrice = v
  }
}

watch(
  () => route.query.tab,
  (t) => {
    if (!t) return
    const key = String(t)
    if (key === 'matrix') {
      tab.value = 'sku'
      skuView.value = 'matrix'
      return
    }
    tab.value = key
  }
)

onMounted(() => {
  if (!route.query.id) {
    router.replace({ path: '/product/index', query: { create: '1' } })
    return
  }
  reload()
})
</script>

<style lang="scss" scoped>
@import './styles/theme.scss';

.wb-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 12px;
  align-items: center;
}

.wb-hero__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.wb-hero__img {
  width: 72px;
  height: 72px;
  border-radius: 14px;
}

.wb-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--pg-muted);
}

.wb-hero__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.reject-banner {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

.wb-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  min-height: calc(100vh - 260px);
}

.wb-nav {
  padding: 10px;
  height: fit-content;
  position: sticky;
  top: 12px;

  &__item {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--pg-muted);
    cursor: pointer;
    margin-bottom: 4px;

    &.active {
      background: var(--pg-teal-soft);
      color: var(--pg-teal);
      font-weight: 700;
    }
  }

  &__complete {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--pg-line);
  }
}

.wb-main {
  padding: 18px;
}

.section-tip {
  font-size: 13px;
  color: var(--pg-muted);
  margin: 0 0 12px;
}

.sku-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__hint {
    font-size: 12px;
    color: var(--pg-muted);
  }
}

.sku-panel {
  :deep(.sku-row--focus) {
    background: #ecfdf5 !important;
  }
}

.sku-bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--pg-sand);

  &__label {
    font-size: 12px;
    font-weight: 650;
    color: var(--pg-muted);
    margin-right: 4px;
  }

  :deep(.el-input-number) {
    width: 120px;
  }
}

.preset-block {
  margin-bottom: 14px;

  &__label {
    font-size: 12px;
    color: var(--pg-muted);
    margin-bottom: 6px;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--pg-line);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;

  &.on {
    background: var(--pg-teal);
    border-color: var(--pg-teal);
    color: #fff;
    font-weight: 700;
  }
}

.attr-extra {
  margin-top: 8px;
}

.dim {
  display: flex;
  gap: 4px;

  :deep(.el-input-number) {
    width: 64px;
  }
}

.audit-log {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--pg-line);
  color: var(--pg-muted);
  font-size: 13px;

  h4 {
    margin: 0 0 8px;
    color: var(--pg-ink);
  }
}

@media (max-width: 1100px) {
  .wb-layout {
    grid-template-columns: 1fr;
  }
  .wb-nav {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    &__complete {
      width: 100%;
    }
  }
}
</style>
