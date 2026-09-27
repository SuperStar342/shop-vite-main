<template>
  <div class="smart-check">
    <div class="smart-check__head">
      <h3>智能提交检查</h3>
      <p>提交审核前自动校验，区分必须修复与建议完善。</p>
    </div>

    <div v-if="result.canSubmit" class="banner ok">已满足必填项，可以提交审核。</div>
    <div v-else class="banner bad">还有 {{ result.mustFail.length }} 项必须修复后才能送审。</div>

    <div class="block" v-if="result.mustFail.length">
      <div class="block__title">必须修复</div>
      <button
        v-for="i in result.mustFail"
        :key="i.key"
        type="button"
        class="check-row must"
        @click="i.tab && emit('jump', i.tab)"
      >
        <span>✗ {{ i.label }}</span>
        <em>去修复</em>
      </button>
    </div>

    <div class="block" v-if="result.suggestFail.length">
      <div class="block__title">建议完善</div>
      <button
        v-for="i in result.suggestFail"
        :key="i.key"
        type="button"
        class="check-row suggest"
        @click="i.tab && emit('jump', i.tab)"
      >
        <span>! {{ i.label }}</span>
        <em>去完善</em>
      </button>
    </div>

    <div class="actions">
      <el-button @click="emit('cancel')">返回编辑</el-button>
      <el-button type="primary" :disabled="!result.canSubmit" :loading="loading" @click="emit('submit')">
        确认提交审核
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { calcCompleteness } from '../utils/completeness'

const props = defineProps<{ product: any; loading?: boolean }>()
const emit = defineEmits<{
  (e: 'jump', tab: string): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()
const result = computed(() => calcCompleteness(props.product))
</script>

<style lang="scss" scoped>
.smart-check__head {
  h3 {
    margin: 0;
    font-size: 18px;
  }
  p {
    margin: 6px 0 16px;
    color: #78716c;
    font-size: 13px;
  }
}

.banner {
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-weight: 650;

  &.ok {
    background: #ecfdf5;
    color: #047857;
  }
  &.bad {
    background: #fef2f2;
    color: #b91c1c;
  }
}

.block {
  margin-bottom: 16px;

  &__title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
  }
}

.check-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;

  &.must {
    background: #fef2f2;
    color: #b91c1c;
  }
  &.suggest {
    background: #fffbeb;
    color: #b45309;
  }

  em {
    font-style: normal;
    font-size: 12px;
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
