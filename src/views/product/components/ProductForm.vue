<template>
  <div class="pf" v-loading="loading">
    <header class="pf__head">
      <div class="pf__head-left">
        <div class="pf__eyebrow">{{ form.id ? '编辑商品' : '极速上新' }}</div>
        <div class="pf__title">{{ form.productName || '三步完成商品建档' }}</div>
      </div>
      <div class="pf__flow">
        <div
          v-for="(s, i) in steps"
          :key="s.key"
          class="pf__step"
          :class="{ active: step === i, done: step > i }"
          @click="step = i"
        >
          <span class="pf__step-num">{{ i + 1 }}</span>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </header>

    <!-- 驳回提示 -->
    <div v-if="form.auditStatus === 2 && form.auditRemark" class="pf__reject">
      <strong>审核已驳回</strong>
      <span>{{ form.auditRemark }}</span>
      <em v-if="form.auditTime">{{ form.auditTime }}</em>
    </div>

    <el-form ref="formRef" class="pf__body" :model="form" :rules="rules" label-position="top">
      <!-- Step 1：核心信息 -->
      <section v-show="step === 0" class="pf-panel">
        <div v-if="!form.id" class="tpl-grid">
          <button
            v-for="t in PRODUCT_TEMPLATES"
            :key="t.key"
            type="button"
            class="tpl-card"
            :class="{ active: selectedTpl === t.key }"
            @click="applyTemplate(t)"
          >
            <span class="tpl-card__icon">{{ tplIcon(t.key) }}</span>
            <span class="tpl-card__label">{{ t.label }}</span>
          </button>
        </div>

        <div class="core-grid">
          <div class="cover-box">
            <el-upload
              action="#"
              drag
              :show-file-list="false"
              :before-upload="beforeImageUpload"
              :http-request="(opts) => handleUpload(opts, 'main')"
              accept="image/*"
              class="cover-upload"
            >
              <el-image v-if="form.mainImage" :src="form.mainImage" fit="cover" class="cover-img" />
              <div v-else class="cover-empty">
                <el-icon :size="28"><Plus /></el-icon>
                <p>拖入或点击上传主图</p>
                <span>建议 800×800，JPG/PNG</span>
              </div>
            </el-upload>
            <el-button v-if="form.mainImage" class="cover-clear" size="small" text type="danger" @click="form.mainImage = ''">
              清除主图
            </el-button>
          </div>

          <div class="core-fields">
            <el-form-item label="产品名称" prop="productName">
              <el-input
                v-model.trim="form.productName"
                maxlength="128"
                placeholder="例如：多功能沙发床"
                @blur="onNameBlur"
              />
            </el-form-item>

            <div class="code-row">
              <el-form-item label="SPU 编码（自动生成）" prop="productCode" class="code-row__code">
                <el-input v-model.trim="form.productCode" :disabled="!!form.id && !isCopy" placeholder="自动生成" />
              </el-form-item>
              <el-button v-if="!form.id || isCopy" class="code-row__btn" @click="regenCode">换一个</el-button>
            </div>

            <el-form-item label="售价（元）" prop="memberPrice">
              <el-input-number
                v-model="form.memberPrice"
                :min="0"
                :precision="2"
                :step="100"
                controls-position="right"
                style="width: 100%"
                placeholder="零售价"
                @change="syncRetail"
              />
            </el-form-item>

            <el-form-item label="分类">
              <el-select
                v-model="form.categoryPath"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="选择或输入分类路径"
                style="width: 100%"
              >
                <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>

            <el-form-item label="品牌">
              <el-select v-model="form.brand" filterable allow-create clearable placeholder="可选" style="width: 100%">
                <el-option v-for="b in brandOptions" :key="b" :label="b" :value="b" />
              </el-select>
            </el-form-item>
          </div>
        </div>

        <el-collapse class="more-collapse">
          <el-collapse-item title="更多选填（副标题 / 简介 / 标签）" name="more">
            <el-form-item label="副标题">
              <el-input v-model.trim="form.productSubtitle" maxlength="256" placeholder="一句话卖点" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model.trim="form.productBrief" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
            <el-form-item label="适用空间">
              <el-select v-model="form.applicableSpace" multiple filterable allow-create style="width: 100%">
                <el-option v-for="s in spaceOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签">
              <el-select v-model="form.tags" multiple filterable allow-create style="width: 100%">
                <el-option v-for="s in tagOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </section>

      <!-- Step 2：规格库存 -->
      <section v-show="step === 1" class="pf-panel">
        <div class="spec-hint">
          <p>默认已生成 1 个 SKU，改价格 / 库存即可。需要多规格再点「加规格」。</p>
          <el-button type="primary" plain size="small" :icon="Plus" @click="addSpec">加规格</el-button>
        </div>

        <div v-for="(row, idx) in form.specs" :key="idx" class="spec-card">
          <div class="spec-card__head">
            <el-radio v-model="form._defaultSpecIndex" :label="idx" @change="setDefaultSpec(idx)">默认规格</el-radio>
            <el-button v-if="form.specs.length > 1" link type="danger" @click="removeSpec(idx)">删除</el-button>
          </div>
          <el-row :gutter="12">
            <el-col :span="10">
              <el-form-item label="规格名">
                <el-input v-model.trim="row.specName" placeholder="标准款 / 胡桃色" />
              </el-form-item>
            </el-col>
            <el-col :span="14">
              <el-form-item label="SKU">
                <el-input v-model.trim="row.specCode" placeholder="自动带出" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="售价">
                <el-input-number v-model="row.specPrice" :min="0" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="库存">
                <el-input-number v-model="row.specStock" :min="0" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="规格图">
                <el-upload action="#" :show-file-list="false" :http-request="(opts) => handleSpecImage(opts, row)" accept="image/*">
                  <div class="mini-thumb">
                    <el-image v-if="row.specImage" :src="row.specImage" fit="cover" />
                    <el-icon v-else><Plus /></el-icon>
                  </div>
                </el-upload>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </section>

      <!-- Step 3：媒体与发布 -->
      <section v-show="step === 2" class="pf-panel">
        <el-form-item label="详情图（可选，最多 8 张）">
          <el-upload
            v-model:file-list="detailFileList"
            action="#"
            list-type="picture-card"
            :before-upload="beforeImageUpload"
            :http-request="(opts) => handleUpload(opts, 'detail')"
            :on-remove="handleDetailRemove"
            accept="image/*"
            :limit="8"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="宣传视频（可选）">
              <div class="media-row">
                <el-input v-model.trim="form.videoUrl" placeholder="上传或粘贴 URL" />
                <el-upload action="#" :show-file-list="false" :http-request="(opts) => handleUpload(opts, 'video')" accept="video/*">
                  <el-button>上传</el-button>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="3D 模型（可选）">
              <div class="media-row">
                <el-input v-model.trim="form.model3dUrl" placeholder=".glb / .usdz" />
                <el-upload action="#" :show-file-list="false" :http-request="(opts) => handleUpload(opts, 'model')" accept=".glb,.gltf,.usdz">
                  <el-button>上传</el-button>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="详情文案（可选）">
          <el-input v-model="form.productDescription" type="textarea" :rows="4" placeholder="支持简单 HTML" />
        </el-form-item>

        <div class="publish-flags">
          <el-checkbox v-model="form.isNew" :true-value="1" :false-value="0">新品</el-checkbox>
          <el-checkbox v-model="form.isHot" :true-value="1" :false-value="0">热销</el-checkbox>
          <el-checkbox v-model="form.isRecommended" :true-value="1" :false-value="0">推荐</el-checkbox>
        </div>

        <div class="publish-preview">
          <div class="publish-preview__label">发布预览</div>
          <div class="publish-preview__card">
            <el-image :src="form.mainImage || defaultImg" fit="cover" class="publish-preview__img" />
            <div>
              <div class="publish-preview__name">{{ form.productName || '未命名商品' }}</div>
              <div class="publish-preview__code">{{ form.productCode || '—' }}</div>
              <div class="publish-preview__price">¥{{ formatPrice(form.memberPrice) }}</div>
            </div>
          </div>
        </div>
      </section>
    </el-form>

    <footer class="pf__foot">
      <el-button @click="emit('cancel')">取消</el-button>
      <div class="pf__foot-right">
        <el-button v-if="step > 0" @click="step -= 1">上一步</el-button>
        <el-button v-if="step < 2" type="primary" @click="nextStep">下一步</el-button>
        <template v-else>
          <el-button :loading="saving" @click="handleSave(0)">存草稿</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave('audit')">提交审核</el-button>
        </template>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { uploadAttachFile } from '/@/api/resource'
import {
  genProductCode,
  getDetail,
  PRODUCT_TEMPLATES,
  submit,
} from '/@/api/product'

const props = defineProps<{
  productId?: string | number | null
  copy?: boolean
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const steps = [
  { key: 'core', label: '核心信息' },
  { key: 'spec', label: '规格库存' },
  { key: 'publish', label: '媒体发布' },
]

const formRef = ref()
const step = ref(0)
const saving = ref(false)
const loading = ref(false)
const isCopy = ref(false)
const selectedTpl = ref('sofa')
const detailFileList = ref<any[]>([])
const codePrefix = ref('SF')

const brandOptions = ['宜家家居', '全友家居', '顾家家居', '林氏木业', '源氏木语', '芝华仕']
const spaceOptions = ['客厅', '卧室', '餐厅', '书房', '办公', '阳台']
const tagOptions = ['小户型', '可定制', '送货安装', '环保', '北欧', '轻奢']
const categoryOptions = [
  '客厅家具/沙发/布艺沙发',
  '餐厅家具/餐桌/实木餐桌',
  '办公家具/椅子/人体工学椅',
  '卧室家具/床垫/弹簧床垫',
  '书房家具/书柜/实木书柜',
]

const defaultImg =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNmNWY3ZmEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYzBjNGNjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='

const formatPrice = (v: any) => (v == null || v === '' ? '0.00' : Number(v).toFixed(2))

function tplIcon(key: string) {
  const map: Record<string, string> = {
    sofa: 'SF',
    table: 'TB',
    chair: 'CH',
    bed: 'BD',
    custom: '+',
  }
  return map[key] || '+'
}

const createEmptySpec = (name = '标准款', code = '', price: number | null = null) => ({
  specCode: code,
  specName: name,
  specPrice: price,
  specMemberPrice: price,
  specCostPrice: null,
  specStock: 100,
  specUnit: '件',
  specImage: '',
  isDefault: 1,
  specStatus: 1,
})

function createEmptyForm() {
  return {
    id: undefined as string | undefined,
    productCode: genProductCode('SF'),
    productName: '',
    productSubtitle: '',
    productBrief: '',
    productDescription: '',
    keywords: '',
    brand: '宜家家居',
    categoryId: null as number | null,
    categoryPath: '客厅家具/沙发/布艺沙发',
    origin: ['中国', '广东'] as string[],
    applicableSpace: ['客厅'] as string[],
    applicableScene: ['家用'] as string[],
    productType: 0 as number | null,
    packageType: 0 as number | null,
    retailPrice: null as number | null,
    memberPrice: null as number | null,
    costPrice: null as number | null,
    unit: '件',
    minOrderQty: 1,
    taxRate: 0.13,
    productStatus: 0,
    auditStatus: -1 as number,
    auditRemark: '',
    auditTime: '',
    mainImage: '',
    detailImages: [] as string[],
    videoUrl: '',
    model3dUrl: '',
    isOnShelf: 0,
    isRecommended: 0,
    isNew: 1,
    isHot: 0,
    sortWeight: 50,
    tags: ['送货安装'] as string[],
    specs: [createEmptySpec('标准款', '', null)] as any[],
    _defaultSpecIndex: 0,
  }
}

const form = reactive(createEmptyForm())

const rules = {
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  productCode: [{ required: true, message: '请生成产品编码', trigger: 'blur' }],
  memberPrice: [{ required: true, message: '请填写售价', trigger: 'change' }],
}

function ensureDefaultSpec() {
  if (!form.specs.length) {
    form.specs = [createEmptySpec('标准款', `${form.productCode}-01`, form.memberPrice)]
    form._defaultSpecIndex = 0
  } else {
    const s0 = form.specs[0]
    if (!s0.specCode && form.productCode) s0.specCode = `${form.productCode}-01`
    if (s0.specPrice == null && form.memberPrice != null) {
      s0.specPrice = form.memberPrice
      s0.specMemberPrice = form.memberPrice
    }
    if (!s0.specName) s0.specName = '标准款'
  }
}

function applyTemplate(t: (typeof PRODUCT_TEMPLATES)[number]) {
  selectedTpl.value = t.key
  codePrefix.value = t.prefix
  form.brand = t.brand
  form.categoryPath = t.categoryPath
  form.productType = t.productType
  form.unit = t.unit
  form.applicableSpace = [...t.applicableSpace]
  form.applicableScene = [...t.applicableScene]
  form.tags = [...t.tags]
  form.origin = [...t.origin]
  if (!form.id) {
    form.productCode = genProductCode(t.prefix)
    ensureDefaultSpec()
    form.specs[0].specCode = `${form.productCode}-01`
    form.specs[0].specUnit = t.unit
  }
}

function regenCode() {
  form.productCode = genProductCode(codePrefix.value)
  if (form.specs[0]) form.specs[0].specCode = `${form.productCode}-01`
}

function onNameBlur() {
  if (!form.productSubtitle && form.productName) {
    form.productSubtitle = `${form.productName} · 品质家居`
  }
  if (!form.productBrief && form.productName) {
    form.productBrief = `${form.productName}，精选材质，适用户型灵活搭配。`
  }
  ensureDefaultSpec()
}

function syncRetail(val: number | undefined) {
  if (val != null) {
    form.retailPrice = Math.round(val * 1.15 * 100) / 100
    ensureDefaultSpec()
    form.specs[0].specPrice = val
    form.specs[0].specMemberPrice = val
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  detailFileList.value = []
  step.value = 0
  isCopy.value = false
  selectedTpl.value = 'sofa'
  codePrefix.value = 'SF'
  ensureDefaultSpec()
}

function applyDetail(data: any, copy = false) {
  Object.assign(form, createEmptyForm(), data)
  form.specs = Array.isArray(data.specs) && data.specs.length
    ? data.specs.map((s: any) => ({ ...s }))
    : [createEmptySpec('标准款', `${data.productCode || 'SP'}-01`, data.memberPrice)]
  const defaultIdx = form.specs.findIndex((s: any) => s.isDefault === 1)
  form._defaultSpecIndex = defaultIdx >= 0 ? defaultIdx : 0
  detailFileList.value = (form.detailImages || []).map((url: string, i: number) => ({
    name: `详情图${i + 1}`,
    url,
    status: 'success',
  }))
  if (copy) {
    form.id = undefined
    form.productCode = genProductCode(codePrefix.value)
    form.productName = form.productName ? `${form.productName}（副本）` : ''
    form.auditStatus = 0
    form.auditRemark = ''
    form.isOnShelf = 0
    form.specs.forEach((s: any, i: number) => {
      s.id = undefined
      s.specCode = `${form.productCode}-${String(i + 1).padStart(2, '0')}`
    })
    isCopy.value = true
  } else {
    isCopy.value = false
  }
  step.value = 0
}

async function load(id?: string | number | null, copy = false) {
  if (!id) {
    resetForm()
    return
  }
  loading.value = true
  try {
    const data = await getDetail(id)
    applyDetail(data, copy)
  } catch (e: any) {
    ElMessage.error(e?.message || '加载详情失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.productId, props.copy],
  ([id, copy]) => {
    load(id as any, !!copy)
  },
  { immediate: true }
)

function addSpec() {
  const n = form.specs.length + 1
  form.specs.push(
    createEmptySpec(`规格${n}`, `${form.productCode || 'SP'}-${String(n).padStart(2, '0')}`, form.memberPrice)
  )
}
function removeSpec(idx: number) {
  form.specs.splice(idx, 1)
  if (form._defaultSpecIndex >= form.specs.length) form._defaultSpecIndex = 0
  setDefaultSpec(form._defaultSpecIndex)
}
function setDefaultSpec(idx: number) {
  form.specs.forEach((s: any, i: number) => {
    s.isDefault = i === idx ? 1 : 0
  })
}

function beforeImageUpload(file: File) {
  const ok = file.type.startsWith('image/')
  if (!ok) ElMessage.error('只能上传图片')
  const sizeOk = file.size / 1024 / 1024 < 10
  if (!sizeOk) ElMessage.error('图片不能超过 10MB')
  return ok && sizeOk
}

async function handleUpload(opts: any, type: 'main' | 'detail' | 'video' | 'model') {
  try {
    const res: any = await uploadAttachFile(opts.file)
    const link = res?.link || res?.url || ''
    if (!link) throw new Error('上传失败')
    if (type === 'main') form.mainImage = link
    else if (type === 'detail') form.detailImages.push(link)
    else if (type === 'video') form.videoUrl = link
    else form.model3dUrl = link
    ElMessage.success('上传成功')
    opts.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
    opts.onError?.(e)
  }
}

async function handleSpecImage(opts: any, row: any) {
  try {
    const res: any = await uploadAttachFile(opts.file)
    row.specImage = res?.link || res?.url || ''
    ElMessage.success('已上传')
    opts.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
    opts.onError?.(e)
  }
}

function handleDetailRemove(file: any) {
  const url = file?.url || ''
  const idx = form.detailImages.indexOf(url)
  if (idx >= 0) form.detailImages.splice(idx, 1)
}

function applyMedia(payload: { link: string; kind: string }) {
  if (payload.kind === 'video') form.videoUrl = payload.link
  else if (payload.kind === 'model') form.model3dUrl = payload.link
  else if (!form.mainImage) form.mainImage = payload.link
  else form.detailImages.push(payload.link)
}

async function nextStep() {
  if (step.value === 0) {
    try {
      await formRef.value.validateField(['productName', 'productCode', 'memberPrice'])
    } catch {
      ElMessage.warning('请先完善名称、编码与售价')
      return
    }
    ensureDefaultSpec()
  }
  step.value += 1
}

async function handleSave(mode: 0 | 'audit' = 0) {
  try {
    await formRef.value.validate()
  } catch {
    step.value = 0
    ElMessage.warning('请完善必填项')
    return
  }
  ensureDefaultSpec()
  const codes = form.specs.map((s: any) => s.specCode).filter(Boolean)
  if (new Set(codes).size !== codes.length) {
    ElMessage.error('SKU 编码不能重复')
    step.value = 1
    return
  }

  const payload: any = {
    ...form,
    id: form.id && !isCopy.value ? form.id : undefined,
    retailPrice: form.retailPrice ?? form.memberPrice,
    specs: form.specs,
  }
  if (mode === 'audit') {
    payload.auditStatus = 0
    payload.auditRemark = ''
    payload.productStatus = 0
  } else if (form.auditStatus !== 2) {
    // 存草稿：未送审（驳回态保留，方便展示原因）
    payload.auditStatus = -1
  }
  delete payload._defaultSpecIndex
  delete payload.auditTime

  saving.value = true
  try {
    await submit(payload)
    ElMessage.success(mode === 'audit' ? '已提交审核，请等待处理' : '草稿已保存')
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

defineExpose({ load, resetForm, applyMedia, handleSave })
</script>

<style lang="scss" scoped>
.pf {
  --pf-ink: #1a2332;
  --pf-muted: #6b778c;
  --pf-line: #e6ebf2;
  --pf-sand: #f3efe8;
  --pf-teal: #0f766e;
  --pf-teal-soft: #ccfbf1;
  --pf-warm: #c45c26;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--pf-line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(26, 35, 50, 0.04);
}

.pf__head {
  padding: 14px 16px 10px;
  background:
    radial-gradient(1200px 180px at 0% 0%, rgba(15, 118, 110, 0.08), transparent 60%),
    linear-gradient(180deg, #fbfaf7 0%, #fff 100%);
  border-bottom: 1px solid var(--pf-line);
}

.pf__eyebrow {
  font-size: 12px;
  color: var(--pf-teal);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.pf__title {
  margin-top: 2px;
  font-size: 17px;
  font-weight: 750;
  color: var(--pf-ink);
}

.pf__flow {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.pf__step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--pf-line);
  background: #fff;
  color: var(--pf-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    border-color: var(--pf-teal);
    background: var(--pf-teal-soft);
    color: var(--pf-teal);
    font-weight: 700;
  }

  &.done {
    border-color: #99f6e4;
    color: var(--pf-teal);
  }
}

.pf__step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;

  .active & {
    background: var(--pf-teal);
    color: #fff;
  }
}

.pf__reject {
  margin: 10px 16px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  color: #a8071a;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;

  em {
    margin-left: auto;
    font-style: normal;
    color: #cf1322;
    opacity: 0.7;
    font-size: 12px;
  }
}

.pf__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 8px;
}

.pf-panel {
  animation: pfIn 0.22s ease;
}

@keyframes pfIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.tpl-card {
  border: 1px solid var(--pf-line);
  background: var(--pf-sand);
  border-radius: 12px;
  padding: 10px 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: #99f6e4;
  }

  &.active {
    background: var(--pf-teal-soft);
    border-color: var(--pf-teal);
    box-shadow: 0 6px 16px rgba(15, 118, 110, 0.12);
  }

  &__icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #fff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 800;
    color: var(--pf-teal);
  }

  &__label {
    font-size: 12px;
    color: var(--pf-ink);
    font-weight: 600;
  }
}

.core-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
}

.cover-box {
  position: relative;
}

.cover-upload {
  width: 100%;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
    height: 180px;
    padding: 0;
    border-radius: 14px;
    border: 1px dashed #b7c4d4;
    background: #f8fafc;
    overflow: hidden;
  }
}

.cover-img {
  width: 100%;
  height: 180px;
}

.cover-empty {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--pf-muted);
  gap: 4px;

  p {
    margin: 0;
    font-size: 13px;
    color: var(--pf-ink);
  }

  span {
    font-size: 11px;
  }
}

.cover-clear {
  margin-top: 6px;
}

.code-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;

  &__code {
    flex: 1;
  }

  &__btn {
    margin-bottom: 18px;
  }
}

.more-collapse {
  margin-top: 4px;
  border: none;

  :deep(.el-collapse-item__header) {
    font-size: 13px;
    color: var(--pf-muted);
    border: none;
  }

  :deep(.el-collapse-item__wrap) {
    border: none;
  }
}

.spec-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--pf-sand);

  p {
    margin: 0;
    font-size: 13px;
    color: var(--pf-muted);
  }
}

.spec-card {
  border: 1px solid var(--pf-line);
  border-radius: 12px;
  padding: 10px 12px 2px;
  margin-bottom: 10px;
  background: #fff;

  &__head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
}

.mini-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: pointer;

  .el-image {
    width: 100%;
    height: 100%;
  }
}

.media-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.publish-flags {
  display: flex;
  gap: 16px;
  margin: 4px 0 14px;
}

.publish-preview {
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc, #f3efe8);

  &__label {
    font-size: 12px;
    color: var(--pf-muted);
    margin-bottom: 8px;
  }

  &__card {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__img {
    width: 64px;
    height: 64px;
    border-radius: 10px;
  }

  &__name {
    font-weight: 700;
    color: var(--pf-ink);
  }

  &__code {
    font-size: 12px;
    color: var(--pf-muted);
    margin-top: 2px;
  }

  &__price {
    margin-top: 4px;
    color: var(--pf-warm);
    font-weight: 700;
  }
}

.pf__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--pf-line);
  background: #fbfcfe;
}

.pf__foot-right {
  display: flex;
  gap: 8px;
}

@media (max-width: 1100px) {
  .tpl-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .core-grid {
    grid-template-columns: 1fr;
  }
}
</style>
