<template>
  <div class="complete-panel">
    <div class="complete-panel__score">
      <div class="pg-score">{{ result.score }}<small>%</small></div>
      <div class="complete-panel__label">商品完整度</div>
      <el-progress :percentage="result.score" :stroke-width="10" color="#0f766e" />
    </div>
    <ul class="complete-panel__list">
      <li
        v-for="item in result.items"
        :key="item.key"
        :class="{ ok: item.ok, must: !item.ok && item.level === 'must', suggest: !item.ok && item.level === 'suggest' }"
        @click="!item.ok && item.tab && emit('jump', item.tab)"
      >
        <span class="mark">{{ item.ok ? '✓' : item.level === 'must' ? '✗' : '!' }}</span>
        <span>{{ item.label }}</span>
        <em v-if="!item.ok">去完善</em>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { calcCompleteness } from '../utils/completeness'

const props = defineProps<{ product: any }>()
const emit = defineEmits<{ (e: 'jump', tab: string): void }>()
const result = computed(() => calcCompleteness(props.product))
</script>

<style lang="scss" scoped>
.complete-panel {
  &__score {
    margin-bottom: 14px;
  }

  &__label {
    font-size: 12px;
    color: #78716c;
    margin: 4px 0 8px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      background: #f7f5f2;
      font-size: 13px;
      cursor: default;

      &.ok {
        color: #047857;
        background: #ecfdf5;
      }

      &.must {
        color: #b91c1c;
        background: #fef2f2;
        cursor: pointer;
      }

      &.suggest {
        color: #b45309;
        background: #fffbeb;
        cursor: pointer;
      }

      em {
        margin-left: auto;
        font-style: normal;
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }

  .mark {
    font-weight: 800;
    width: 14px;
  }
}
</style>
