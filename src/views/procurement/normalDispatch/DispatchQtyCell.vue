<template>
  <div
    class="nd-dispatch-cell"
    :class="[`is-align-${align}`, `is-size-${size}`, `is-mode-${mode}`]"
  >
    <span class="nd-dispatch-badge" :class="`is-${statusKind}`">{{ statusText }}</span>
    <div class="nd-dispatch-qty">
      <b>{{ fmtNum(primaryQty) }}</b>
      <span class="sep">/</span>
      <span>{{ fmtNum(secondaryQty) }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  allocStatusKind,
  dispatchStatusKind,
  fmtNum,
  num,
  resolveAllocStatus,
  resolveDispatchStatus,
} from '/@/utils/dispatchAlloc'

/**
 * 数量状态展示：ERP 派工进度（dispatch）或本次分配进度（alloc）。
 * dispatch：ERP 已派 / 计划；alloc：本次已分 / 可派剩余（未派量）。
 */
const props = withDefaults(
  defineProps<{
    mode?: 'dispatch' | 'alloc'
    remainQty?: any
    planQty?: any
    wtQty?: any
    assignedQty?: any
    status?: string
    align?: 'left' | 'right'
    size?: 'sm' | 'md'
  }>(),
  {
    mode: 'dispatch',
    align: 'right',
    size: 'md',
  }
)

const statusText = computed(() => {
  if (props.mode === 'alloc') {
    return resolveAllocStatus(props.assignedQty, props.remainQty)
  }
  return resolveDispatchStatus(props.remainQty, props.planQty, props.wtQty, props.status)
})

const statusKind = computed(() =>
  props.mode === 'alloc' ? allocStatusKind(statusText.value) : dispatchStatusKind(statusText.value)
)

/** ERP 已派数量：优先 wtQty，否则由计划量 - 未派量推算 */
const dispatchedQty = computed(() => {
  if (props.wtQty != null && props.wtQty !== '') return num(props.wtQty)
  const plan = num(props.planQty)
  const remain = num(props.remainQty)
  if (plan > 0) return Math.max(0, plan - remain)
  return 0
})

const primaryQty = computed(() =>
  props.mode === 'alloc' ? num(props.assignedQty) : dispatchedQty.value
)

const secondaryQty = computed(() =>
  props.mode === 'alloc' ? num(props.remainQty) : num(props.planQty)
)
</script>

<style scoped lang="scss">
.nd-dispatch-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  &.is-align-right {
    align-items: flex-end;
    text-align: right;
  }

  &.is-align-left {
    align-items: flex-start;
    text-align: left;
  }

  &.is-size-sm {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.nd-dispatch-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;

  &.is-none {
    color: #64748b;
    background: #f1f5f3;
    border-color: #e2e8f0;
  }

  &.is-partial {
    color: #c2410c;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  &.is-done {
    color: #2e7d5a;
    background: #ecfdf3;
    border-color: #bbf7d0;
  }
}

.nd-dispatch-qty {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;

  b {
    color: #2e7d5a;
    font-size: 13px;
    font-weight: 700;
  }

  .sep,
  span:not(.sep) {
    color: #9aaba0;
    font-size: 12px;
  }
}

.is-mode-alloc .nd-dispatch-qty b {
  color: #2563eb;
}

.is-size-sm .nd-dispatch-qty b {
  font-size: 12px;
}
</style>
