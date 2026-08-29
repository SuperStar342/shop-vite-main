<template>
  <section class="rpb">
    <header class="rpb__head">
      <strong>生产进度看板</strong>
      <span v-if="progress?.moNo">制令 {{ progress.moNo }}</span>
    </header>

    <div v-if="progress?.moNo" class="rpb__body">
      <div class="rpb__summary">
        <div class="rpb__thumb">{{ goodsInitial }}</div>
        <div>
          <h4>{{ progress.goodsName }}</h4>
          <p>计划 {{ progress.planQty }} 套 · 交期 {{ progress.planEndDate }}</p>
        </div>
        <div class="rpb__ring">
          <el-progress
            :format="(p: number) => `${Number(p).toFixed(1)}%`"
            :percentage="Number(progress.progress) || 0"
            type="circle"
            :width="72"
          />
          <em>总进度</em>
        </div>
      </div>

      <div class="rpb__pipeline">
        <div
          v-for="(step, idx) in progress.steps"
          :key="step.code"
          class="rpb__step"
          :class="`is-${step.status}`"
        >
          <div class="rpb__step-icon">
            <el-icon v-if="step.status === 'done'"><circle-check /></el-icon>
            <span v-else-if="step.status === 'active'" class="pulse" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div class="rpb__step-main">
            <b>{{ step.name }}</b>
            <small>{{ step.doneQty }}/{{ step.planQty }} 套</small>
            <el-progress
              :color="stepColor(step.status)"
              :percentage="step.progress"
              :show-text="false"
              :stroke-width="6"
            />
          </div>
          <i v-if="idx < progress.steps.length - 1" class="rpb__arrow" />
        </div>
      </div>
    </div>

    <el-empty v-else class="rpb__empty" description="选择任务后查看制令进度" :image-size="64" />
  </section>
</template>

<script lang="ts" setup>
import { CircleCheck } from '@element-plus/icons-vue'
import type { MoProgress } from '/@/api/procurement/workReport'

const props = defineProps<{
  progress: MoProgress | null
}>()

const goodsInitial = computed(() => (props.progress?.goodsName || '产').slice(0, 1))

const stepColor = (status: string) => {
  if (status === 'done') return '#2e7d5a'
  if (status === 'active') return '#1a6fb5'
  return '#c0c4cc'
}
</script>

<style lang="scss" scoped>
.rpb {
  background: #fff;
  border: 1px solid #e8eef4;
  border-radius: 12px;
  overflow: hidden;
}

.rpb__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  font-size: 13px;
  background: #f4f8fc;
  border-bottom: 1px solid #e8eef4;

  strong {
    color: #1a3a52;
  }

  span {
    color: #909399;
    font-size: 12px;
  }
}

.rpb__body {
  padding: 14px 16px 16px;
}

.rpb__summary {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

.rpb__thumb {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: #1a6fb5;
  background: linear-gradient(135deg, #e8f4ff, #f0f7ff);
  border-radius: 10px;
}

.rpb__ring {
  margin-left: auto;
  text-align: center;

  em {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    font-style: normal;
    color: #909399;
  }
}

.rpb__pipeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.rpb__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 108px;
  flex: 1;

  &.is-done .rpb__step-icon {
    background: #e8f5ee;
    color: #2e7d5a;
    border-color: #2e7d5a;
  }

  &.is-active .rpb__step-icon {
    background: #e8f2fb;
    border-color: #1a6fb5;
  }
}

.rpb__step-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #909399;
  background: #f5f7fa;
  border: 2px solid #dcdfe6;
  border-radius: 50%;
  z-index: 1;
}

.pulse {
  width: 10px;
  height: 10px;
  background: #1a6fb5;
  border-radius: 50%;
  animation: rpb-pulse 1.2s ease infinite;
}

@keyframes rpb-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.35);
    opacity: 0.55;
  }
}

.rpb__step-main {
  width: 100%;
  padding: 8px 6px 0;
  text-align: center;

  b {
    display: block;
    font-size: 12px;
    color: #303133;
    margin-bottom: 2px;
  }

  small {
    display: block;
    font-size: 10px;
    color: #909399;
    margin-bottom: 6px;
  }
}

.rpb__arrow {
  position: absolute;
  top: 16px;
  right: -8px;
  width: 16px;
  height: 2px;
  background: #dcdfe6;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: -3px;
    border: 4px solid transparent;
    border-left-color: #dcdfe6;
  }
}

.rpb__empty {
  padding: 20px 0;
}
</style>
