<template>
  <el-drawer
    :model-value="visible"
    size="440px"
    append-to-body
    destroy-on-close
    class="audit-drawer"
    @close="emit('update:visible', false)"
  >
    <template #header>
      <div class="audit-drawer__title">商品审核</div>
      <div class="audit-drawer__sub">通过后可自动上架 · 驳回需填写原因</div>
    </template>

    <div v-if="product" class="audit-body">
      <div class="audit-card">
        <el-image class="audit-card__img" :src="product.mainImage || defaultImg" fit="cover" />
        <div class="audit-card__meta">
          <div class="audit-card__name">{{ product.productName }}</div>
          <div class="audit-card__code">{{ product.productCode }}</div>
          <div class="audit-card__price">¥{{ formatPrice(product.memberPrice ?? product.retailPrice) }}</div>
        </div>
      </div>

      <ul class="audit-checklist">
        <li :class="{ ok: !!product.mainImage }">主图已上传</li>
        <li :class="{ ok: !!product.productName && !!product.productCode }">名称 / 编码完整</li>
        <li :class="{ ok: Number(product.memberPrice ?? product.retailPrice) > 0 }">价格已填写</li>
        <li :class="{ ok: Number(product.specStock) > 0 }">库存 &gt; 0</li>
        <li :class="{ ok: !!product.categoryPath }">分类路径已填</li>
      </ul>

      <el-form label-position="top">
        <el-form-item label="审核结论">
          <el-radio-group v-model="decision" class="decision-group">
            <el-radio-button :value="1">通过</el-radio-button>
            <el-radio-button :value="2">驳回</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="decision === 1" label="通过后">
          <el-checkbox v-model="autoOnShelf">自动上架开售</el-checkbox>
        </el-form-item>

        <el-form-item :label="decision === 2 ? '驳回原因（必填）' : '审核备注（可选）'">
          <el-input
            v-model.trim="remark"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            :placeholder="decision === 2 ? '例如：主图不清晰 / 价格异常 / 规格缺失' : '可填写审核说明'"
          />
          <div v-if="decision === 2" class="quick-reasons">
            <el-button
              v-for="r in rejectReasons"
              :key="r"
              size="small"
              round
              @click="remark = r"
            >
              {{ r }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="confirm">确认提交</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { updateAuditStatus } from '/@/api/product'

const props = defineProps<{
  visible: boolean
  product: any | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'done'): void
}>()

const decision = ref(1)
const autoOnShelf = ref(true)
const remark = ref('')
const submitting = ref(false)

const rejectReasons = ['主图缺失或不清晰', '价格信息异常', '规格 / 库存不完整', '分类信息有误', '文案需优化']

const defaultImg =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNmNWY3ZmEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYzBjNGNjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='

const formatPrice = (v: any) => (v == null || v === '' ? '0.00' : Number(v).toFixed(2))

watch(
  () => props.visible,
  (v) => {
    if (v) {
      decision.value = 1
      autoOnShelf.value = true
      remark.value = ''
    }
  }
)

async function confirm() {
  if (!props.product?.id) return
  if (decision.value === 2 && !remark.value) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await updateAuditStatus(props.product.id, decision.value, {
      auditRemark: remark.value,
      autoOnShelf: autoOnShelf.value,
    })
    ElMessage.success(decision.value === 1 ? '已通过审核' : '已驳回')
    emit('update:visible', false)
    emit('done')
  } catch (e: any) {
    ElMessage.error(e?.message || '审核失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.audit-drawer__title {
  font-size: 16px;
  font-weight: 700;
  color: #1a2332;
}
.audit-drawer__sub {
  margin-top: 2px;
  font-size: 12px;
  color: #8b95a8;
}

.audit-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f4f7fb, #eef3f8);
  margin-bottom: 16px;

  &__img {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  &__name {
    font-weight: 700;
    color: #1a2332;
  }

  &__code {
    margin-top: 4px;
    font-size: 12px;
    color: #8b95a8;
  }

  &__price {
    margin-top: 6px;
    color: #c45c26;
    font-weight: 700;
  }
}

.audit-checklist {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: grid;
  gap: 8px;

  li {
    position: relative;
    padding: 8px 12px 8px 32px;
    border-radius: 8px;
    background: #f8fafc;
    font-size: 13px;
    color: #64748b;

    &::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 50%;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      transform: translateY(-50%);
      background: #cbd5e1;
    }

    &.ok {
      color: #0f766e;
      background: #ecfdf5;

      &::before {
        background: #14b8a6;
      }
    }
  }
}

.decision-group {
  width: 100%;

  :deep(.el-radio-button) {
    flex: 1;
  }

  :deep(.el-radio-button__inner) {
    width: 100%;
  }
}

.quick-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
</style>
