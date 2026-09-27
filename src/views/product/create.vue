<template>
  <div class="pg create">
    <!-- <header class="create-hero pg-card">
      <div>
        <div class="pg-eyebrow">极速上新</div>
        <h1 class="pg-title">{{ form.productName || '填名称 · 报价 · 传图即可' }}</h1>
        <p class="pg-sub">点选品类与颜色即可带出编码 / 品牌 / 材质 / SKU，尽量少打字。</p>
      </div>
      <el-button @click="handleCancel">取消</el-button>
    </header> -->

    <div class="pg-card create-body">
      <div class="tpls">
        <button
          v-for="t in PRODUCT_TEMPLATES"
          :key="t.key"
          type="button"
          class="tpl"
          :class="{ on: tpl === t.key }"
          @click="applyTpl(t)"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="core">
        <el-upload
          class="cover-box"
          action="#"
          drag
          :show-file-list="false"
          :http-request="(o) => up(o, 'main')"
          accept="image/*"
        >
          <el-image v-if="form.mainImage" :src="form.mainImage" class="cover" fit="cover" />
          <div v-else class="cover empty">
            <strong>拖入或点击上传主图</strong>
            <span>可稍后补传</span>
          </div>
        </el-upload>

        <div class="core-fields">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="产品名称" required>
              <el-input
                v-model.trim="form.productName"
                size="large"
                placeholder="例如：北欧布艺沙发"
                maxlength="64"
                @input="onNameInput"
              />
            </el-form-item>

            <div class="price-row">
              <el-form-item label="售价（元）" required class="grow">
                <el-input-number
                  v-model="form.memberPrice"
                  :min="0"
                  :precision="0"
                  :step="100"
                  size="large"
                  controls-position="right"
                  style="width: 100%"
                  @change="syncPrice"
                />
              </el-form-item>
              <el-form-item label="库存" class="stock">
                <el-input-number
                  v-model="defaultStock"
                  :min="0"
                  :step="10"
                  size="large"
                  controls-position="right"
                  style="width: 100%"
                  @change="syncStock"
                />
              </el-form-item>
            </div>

            <div class="auto-line">
              <span>编码 {{ form.productCode }}</span>
              <span>{{ form.brand || '未设品牌' }}</span>
              <span>{{ form.categoryPath || '未设分类' }}</span>
              <span>零售价 ¥{{ form.retailPrice || '—' }}（自动）</span>
            </div>
          </el-form>
        </div>
      </div>

      <div class="sku-quick">
        <div class="sku-quick__head">
          <strong>规格颜色</strong>
          <span>点选即生成 SKU · 规格「{{ defaultSpecName }}」</span>
        </div>
        <div class="chips">
          <button
            v-for="n in specNameOptions"
            :key="n"
            type="button"
            class="chip"
            :class="{ on: defaultSpecName === n }"
            @click="pickSpecName(n)"
          >
            {{ n }}
          </button>
        </div>
        <div class="chips" style="margin-top: 8px">
          <button
            v-for="c in colorPresets"
            :key="c"
            type="button"
            class="chip"
            :class="{ on: hasColor(c) }"
            @click="toggleColor(c)"
          >
            {{ c }}
          </button>
        </div>
        <div class="sku-summary">
          已生成 <b>{{ specs.length }}</b> 个 SKU · 统一售价 ¥{{ form.memberPrice || 0 }} · 库存 {{ defaultStock }}
        </div>
      </div>

      <el-collapse class="more">
        <el-collapse-item title="更多选填（副标题 / 材质点选 / 详情图）" name="more">
          <el-form label-position="top">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="副标题">
                  <el-input v-model.trim="form.productSubtitle" placeholder="输入名称后自动生成" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="品牌">
                  <el-input v-model.trim="form.brand" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="分类">
                  <el-input v-model.trim="form.categoryPath" />
                </el-form-item>
              </el-col>
            </el-row>

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
                >
                  {{ v }}
                </button>
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
                >
                  {{ v }}
                </button>
              </div>
            </div>
            <div class="preset-block">
              <div class="preset-block__label">框架</div>
              <div class="chips">
                <button
                  v-for="v in FRAME_PRESETS"
                  :key="v"
                  type="button"
                  class="chip"
                  :class="{ on: attr.frameMaterial === v }"
                  @click="pickAttr('frameMaterial', v)"
                >
                  {{ v }}
                </button>
              </div>
            </div>
            <div class="preset-block">
              <div class="preset-block__label">环保 / 风格</div>
              <div class="chips">
                <button
                  v-for="v in ENV_PRESETS"
                  :key="v"
                  type="button"
                  class="chip"
                  :class="{ on: attr.environmentalGrade === v }"
                  @click="pickAttr('environmentalGrade', v)"
                >
                  {{ v }}
                </button>
                <button
                  v-for="v in STYLE_PRESETS"
                  :key="v"
                  type="button"
                  class="chip"
                  :class="{ on: attr.style === v }"
                  @click="pickAttr('style', v)"
                >
                  {{ v }}
                </button>
              </div>
            </div>

            <el-form-item label="简介 / 详情">
              <el-input v-model="form.productBrief" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
            <el-form-item label="详情图（可选）">
              <el-upload
                action="#"
                list-type="picture-card"
                :file-list="detailFiles"
                :http-request="(o) => up(o, 'detail')"
                :on-remove="onRemoveDetail"
                accept="image/*"
                multiple
                :limit="8"
              >
                <span class="plus">+</span>
              </el-upload>
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </div>

    <footer class="create-foot pg-card">
      <div class="create-foot__hint">
        <template v-if="!canSubmit">请填写名称与售价</template>
        <template v-else-if="!form.mainImage">可先存草稿，主图稍后补</template>
        <template v-else>资料齐全，可直接送审</template>
      </div>
      <div class="create-foot__ops">
        <el-button :loading="saving" @click="saveDraft">存草稿</el-button>
        <el-button type="primary" class="pg-btn-primary" :loading="saving" :disabled="!canSubmit" @click="submitAudit">
          {{ form.mainImage ? '提交审核' : '保存并送审' }}
        </el-button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { genProductCode, PRODUCT_TEMPLATES, submit } from '/@/api/product'
import type { ProductTemplateKey } from '/@/api/product'
import { uploadAttachFile } from '/@/api/resource'
import {
  COLOR_PRESETS,
  ENV_PRESETS,
  FABRIC_PRESETS,
  FILLING_PRESETS,
  FRAME_PRESETS,
  retailFromMember,
  STYLE_PRESETS,
  TEMPLATE_ATTRS,
  specNamePresetsFor,
} from './utils/presets'

const props = defineProps<{ embedded?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'saved'): void }>()

const router = useRouter()
const saving = ref(false)
const tpl = ref<ProductTemplateKey>('sofa')
const defaultStock = ref(100)
const defaultSpecName = ref(TEMPLATE_ATTRS.sofa.defaultSpecName)
const detailFiles = ref<any[]>([])
const colorPresets = COLOR_PRESETS

const sofaAttr = TEMPLATE_ATTRS.sofa
const form = reactive<any>({
  productName: '',
  productCode: genProductCode('SF'),
  brand: '宜家家居',
  categoryPath: '客厅家具/沙发/布艺沙发',
  productSubtitle: '',
  productBrief: '',
  productDescription: '',
  memberPrice: sofaAttr.defaultPrice,
  retailPrice: retailFromMember(sofaAttr.defaultPrice),
  productType: 0,
  unit: '件',
  minOrderQty: 1,
  mainImage: '',
  detailImages: [] as string[],
  videoUrl: '',
  model3dUrl: '',
  applicableSpace: ['客厅'],
  applicableScene: ['家用'],
  tags: ['送货安装'],
  origin: ['中国', '广东'],
  productStatus: 0,
  auditStatus: -1,
  isOnShelf: 0,
  isNew: 1,
  isHot: 0,
  isRecommended: 0,
  sortWeight: 50,
})

const attr = reactive({
  fabricMaterial: sofaAttr.fabricMaterial || '',
  fillingMaterial: sofaAttr.fillingMaterial || '',
  frameMaterial: sofaAttr.frameMaterial || '',
  environmentalGrade: sofaAttr.environmentalGrade || '',
  style: sofaAttr.style || '',
  mainMaterial: sofaAttr.mainMaterial || '',
  surfaceCraft: sofaAttr.surfaceCraft || '',
  length: sofaAttr.length ?? null,
  width: sofaAttr.width ?? null,
  height: sofaAttr.height ?? null,
})

const specs = ref<any[]>([
  makeSpec('米白', defaultSpecName.value, form.productCode, form.memberPrice, defaultStock.value, true),
])

const canSubmit = computed(() => !!form.productName && Number(form.memberPrice) > 0)
const specNameOptions = computed(() => specNamePresetsFor(tpl.value))

function makeSpec(color: string, name: string, code: string, price: number, stock: number, isDefault: boolean) {
  return {
    specCode: `${code}-${String(1).padStart(2, '0')}`,
    specName: name,
    color,
    specPrice: price,
    specMemberPrice: price,
    specStock: stock,
    isDefault: isDefault ? 1 : 0,
    specStatus: 1,
    length: attr.length,
    width: attr.width,
    height: attr.height,
    ...pickAttrFields(),
  }
}

function pickAttrFields() {
  return {
    fabricMaterial: attr.fabricMaterial,
    fillingMaterial: attr.fillingMaterial,
    frameMaterial: attr.frameMaterial,
    environmentalGrade: attr.environmentalGrade,
    style: attr.style,
    mainMaterial: attr.mainMaterial,
    surfaceCraft: attr.surfaceCraft,
  }
}

function rebuildSpecCodes() {
  specs.value.forEach((s, i) => {
    s.specCode = `${form.productCode}-${String(i + 1).padStart(2, '0')}`
    s.specName = defaultSpecName.value
    s.length = attr.length
    s.width = attr.width
    s.height = attr.height
    Object.assign(s, pickAttrFields())
  })
}

function applyTpl(t: (typeof PRODUCT_TEMPLATES)[number]) {
  tpl.value = t.key
  form.brand = t.brand
  form.categoryPath = t.categoryPath
  form.unit = t.unit
  form.productType = t.productType
  form.applicableSpace = [...t.applicableSpace]
  form.applicableScene = [...t.applicableScene]
  form.tags = [...t.tags]
  form.origin = [...t.origin]
  form.productCode = genProductCode(t.prefix)

  const ta = TEMPLATE_ATTRS[t.key] || TEMPLATE_ATTRS.custom
  defaultSpecName.value = ta.defaultSpecName
  form.memberPrice = ta.defaultPrice
  form.retailPrice = retailFromMember(ta.defaultPrice)
  Object.assign(attr, {
    fabricMaterial: ta.fabricMaterial || '',
    fillingMaterial: ta.fillingMaterial || '',
    frameMaterial: ta.frameMaterial || '',
    environmentalGrade: ta.environmentalGrade || '',
    style: ta.style || '',
    mainMaterial: ta.mainMaterial || '',
    surfaceCraft: ta.surfaceCraft || '',
    length: ta.length ?? null,
    width: ta.width ?? null,
    height: ta.height ?? null,
  })

  const colors = ta.colors?.length ? ta.colors : ['默认色']
  specs.value = colors.map((c, i) =>
    makeSpec(c, defaultSpecName.value, form.productCode, form.memberPrice, defaultStock.value, i === 0)
  )
  rebuildSpecCodes()
  if (form.productName) onNameInput()
}

function pickSpecName(n: string) {
  defaultSpecName.value = n
  syncSpecName()
}

function pickAttr(key: keyof typeof attr, value: string) {
  ;(attr as any)[key] = (attr as any)[key] === value ? '' : value
  rebuildSpecCodes()
  if (form.productName) onNameInput()
}

function onNameInput() {
  const name = form.productName
  if (!name) return
  form.productSubtitle = `${name} · ${attr.style || '品质家居'}`
  form.productBrief = `${name}，精选材质，灵活适用户型，支持送货安装。`
  form.productDescription = `<p>${name}</p><p>材质：${attr.fabricMaterial || attr.mainMaterial || '—'}；框架：${attr.frameMaterial || '—'}；环保等级：${attr.environmentalGrade || '—'}。</p>`
}

function syncPrice(v: number | undefined) {
  const price = Number(v || 0)
  form.retailPrice = retailFromMember(price)
  specs.value.forEach((s) => {
    s.specPrice = price
    s.specMemberPrice = price
  })
}

function syncStock(v: number | undefined) {
  const stock = Number(v || 0)
  specs.value.forEach((s) => {
    s.specStock = stock
  })
}

function syncSpecName() {
  specs.value.forEach((s) => {
    s.specName = defaultSpecName.value
  })
}

function hasColor(c: string) {
  return specs.value.some((s) => s.color === c)
}

function toggleColor(c: string) {
  const idx = specs.value.findIndex((s) => s.color === c)
  if (idx >= 0) {
    if (specs.value.length === 1) {
      ElMessage.info('至少保留一个规格')
      return
    }
    const wasDefault = specs.value[idx].isDefault === 1
    specs.value.splice(idx, 1)
    if (wasDefault && specs.value[0]) specs.value[0].isDefault = 1
    rebuildSpecCodes()
    return
  }
  specs.value.push(
    makeSpec(c, defaultSpecName.value, form.productCode, form.memberPrice, defaultStock.value, false)
  )
  rebuildSpecCodes()
}

async function up(opts: any, type: 'main' | 'detail') {
  try {
    const res: any = await uploadAttachFile(opts.file)
    const link = res?.link || res?.url
    if (!link) throw new Error('上传失败')
    if (type === 'main') form.mainImage = link
    else {
      form.detailImages.push(link)
      detailFiles.value = form.detailImages.map((url: string, i: number) => ({
        name: `图${i + 1}`,
        url,
        status: 'success',
      }))
    }
    ElMessage.success('上传成功')
    opts.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
    opts.onError?.(e)
  }
}

function onRemoveDetail(file: any) {
  const url = file?.url || ''
  form.detailImages = form.detailImages.filter((u: string) => u !== url)
  detailFiles.value = form.detailImages.map((u: string, i: number) => ({
    name: `图${i + 1}`,
    url: u,
    status: 'success',
  }))
}

async function persist(auditStatus: number) {
  if (!canSubmit.value) {
    ElMessage.warning('请填写产品名称与售价')
    return
  }
  onNameInput()
  rebuildSpecCodes()
  if (!specs.value.length) {
    specs.value = [
      makeSpec('米白', defaultSpecName.value, form.productCode, form.memberPrice, defaultStock.value, true),
    ]
  }
  if (!specs.value.some((s) => s.isDefault === 1)) specs.value[0].isDefault = 1

  saving.value = true
  try {
    await submit({
      ...form,
      retailPrice: form.retailPrice ?? form.memberPrice,
      specs: specs.value.map((s, i) => ({
        ...pickAttrFields(),
        length: attr.length,
        width: attr.width,
        height: attr.height,
        ...s,
        isDefault: i === 0 ? 1 : 0,
      })),
      auditStatus,
      productStatus: 0,
    })
    ElMessage.success(auditStatus === 0 ? '已提交审核' : '草稿已保存')
    emit('saved')
    if (!router.currentRoute.value.path.includes('/product/index')) {
      router.push('/product/index')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('cancel')
  if (!router.currentRoute.value.path.includes('/product/index')) {
    router.push('/product/index')
  }
}

function saveDraft() {
  persist(-1)
}
function submitAudit() {
  if (!form.mainImage) {
    ElMessage.info('未上传主图，建议稍后在工作台补齐')
  }
  persist(0)
}

onMounted(() => {
  if (!props.embedded) {
    router.replace({ path: '/product/index', query: { create: '1' } })
  }
})
</script>

<style lang="scss" scoped>
@import './styles/theme.scss';

.create-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 18px 20px;
  margin-bottom: 12px;
}

.create-body {
  padding: 16px 18px 8px;
}

.tpls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tpl {
  border: 1px solid var(--pg-line);
  background: var(--pg-sand);
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;

  &.on {
    background: var(--pg-teal-soft);
    border-color: var(--pg-teal);
    color: var(--pg-teal);
    font-weight: 700;
  }
}

.core {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 18px;
  margin-bottom: 16px;
}

.cover-box {
  width: 100%;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
    height: 200px;
    padding: 0;
    border-radius: 14px;
    overflow: hidden;
  }
}

.cover {
  width: 100%;
  height: 200px;

  &.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--pg-sand);
    color: var(--pg-muted);

    strong {
      color: var(--pg-ink);
      font-size: 14px;
    }

    span {
      font-size: 12px;
    }
  }
}

.price-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}

.auto-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--pg-muted);

  span {
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--pg-sand);
  }
}

.sku-quick {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--pg-sand);
  margin-bottom: 12px;

  &__head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 10px;

    span {
      font-size: 12px;
      color: var(--pg-muted);
    }
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

.preset-block {
  margin-bottom: 12px;

  &__label {
    font-size: 12px;
    color: var(--pg-muted);
    margin-bottom: 6px;
  }
}

.sku-summary {
  margin-top: 10px;
  font-size: 12px;
  color: var(--pg-muted);

  b {
    color: var(--pg-teal);
  }
}

.more {
  border: none;

  :deep(.el-collapse-item__header) {
    font-size: 13px;
    color: var(--pg-muted);
    border: none;
    height: 40px;
  }

  :deep(.el-collapse-item__wrap) {
    border: none;
  }
}

.plus {
  font-size: 22px;
  color: #a8a29e;
}

.create-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 12px;

  &__hint {
    font-size: 13px;
    color: var(--pg-muted);
  }

  &__ops {
    display: flex;
    gap: 8px;
  }
}

@media (max-width: 900px) {
  .core {
    grid-template-columns: 1fr;
  }
}
</style>
