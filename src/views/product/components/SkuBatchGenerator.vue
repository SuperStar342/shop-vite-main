<template>
  <el-drawer :model-value="visible" size="520px" append-to-body destroy-on-close title="SKU 批量生成" @close="emit('update:visible', false)">
    <p class="tip">笛卡尔积生成：规格位 × 颜色。首个 SKU 的材质会自动继承到新 SKU。</p>

    <el-form label-position="top">
      <el-form-item label="规格位（如：三人位/四人位/贵妃位）">
        <el-select
          v-model="sizes"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="回车添加"
          style="width: 100%"
        >
          <el-option v-for="s in sizePresets" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="颜色（如：米白/科技灰/深咖）">
        <el-select
          v-model="colors"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="回车添加"
          style="width: 100%"
        >
          <el-option v-for="s in colorPresets" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="8">
          <el-form-item label="统一售价">
            <el-input-number v-model="price" :min="0" :precision="2" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="统一库存">
            <el-input-number v-model="stock" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="继承材质">
            <el-switch v-model="inherit" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-alert
        type="info"
        :closable="false"
        :title="`将生成 ${sizes.length * colors.length} 个 SKU（已存在的颜色×规格组合会跳过）`"
      />
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="generate">生成并填充</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { COLOR_PRESETS, SPEC_NAME_PRESETS } from '../utils/presets'

const props = defineProps<{
  visible: boolean
  productCode: string
  baseSpec?: any
  existing?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'generated', specs: any[]): void
}>()

const sizes = ref<string[]>(['三人位', '四人位', '贵妃位'])
const colors = ref<string[]>(['米白', '科技灰', '深咖'])
const price = ref(2999)
const stock = ref(50)
const inherit = ref(true)
const sizePresets = SPEC_NAME_PRESETS.sofa
const colorPresets = COLOR_PRESETS

watch(
  () => props.visible,
  (v) => {
    if (v && props.baseSpec?.specPrice) price.value = Number(props.baseSpec.specPrice)
  }
)

function generate() {
  if (!sizes.value.length || !colors.value.length) {
    ElMessage.warning('请至少选择规格位与颜色')
    return
  }
  const base = inherit.value ? props.baseSpec || {} : {}
  const exist = new Set(
    (props.existing || []).map((s) => `${s.color}__${s.specName}`)
  )
  const created: any[] = []
  let i = (props.existing?.length || 0) + 1
  for (const size of sizes.value) {
    for (const color of colors.value) {
      const key = `${color}__${size}`
      if (exist.has(key)) continue
      const code = `${props.productCode || 'SP'}-${String(i).padStart(2, '0')}`
      created.push({
        specCode: code,
        specName: size,
        color,
        style: base.style || '',
        specPrice: price.value,
        specMemberPrice: price.value,
        specStock: stock.value,
        specUnit: base.specUnit || '件',
        isDefault: 0,
        specStatus: 1,
        specImage: '',
        mainMaterial: base.mainMaterial || '',
        fabricMaterial: base.fabricMaterial || '',
        fillingMaterial: base.fillingMaterial || '',
        frameMaterial: base.frameMaterial || '',
        surfaceCraft: base.surfaceCraft || '',
        environmentalGrade: base.environmentalGrade || '',
        length: base.length ?? null,
        width: base.width ?? null,
        height: base.height ?? null,
      })
      i++
    }
  }
  if (!created.length) {
    ElMessage.info('没有可新增的组合')
    return
  }
  emit('generated', created)
  emit('update:visible', false)
  ElMessage.success(`已生成 ${created.length} 个 SKU`)
}
</script>

<style scoped>
.tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: #78716c;
}
</style>
