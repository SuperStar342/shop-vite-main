<template>
  <div class="word-panel">
    <div class="word-stage" :style="stageSize" @click="handleStageClick">
      <img alt="" class="word-image" draggable="false" :src="data.image" />
      <transition-group name="word-dot">
        <span
          v-for="(dot, index) in dots"
          :key="dot.id"
          class="word-dot"
          :style="{ left: `${dot.x}px`, top: `${dot.y}px` }"
          >{{ index + 1 }}</span
        >
      </transition-group>
    </div>
    <div class="word-bar">
      <span class="word-bar-label">{{ data.prompt ? '依次点击' : '按语序点击' }}</span>
      <div class="word-chips">
        <span
          v-for="(chip, index) in chips"
          :key="index"
          class="word-chip"
          :class="{ 'is-active': index < dots.length, 'is-ordinal': !data.prompt }"
          >{{ chip }}</span
        >
      </div>
      <button class="word-undo" :disabled="!dots.length" title="撤销上一步" @click="undo">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'wordPanel',
  props: {
    data: {
      type: Object,
      required: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['confirm'],
  data() {
    return {
      dots: [],
      dotSeed: 0,
    };
  },
  computed: {
    // 舞台尺寸以服务端下发的逻辑尺寸为准，避免前后端各存一份常量产生偏差
    stageSize() {
      return { width: `${this.data.width}px`, height: `${this.data.height}px` };
    },
    // 语序模式不下发目标字符，提示条降级为作答进度序号
    chips() {
      if (this.data.prompt) {
        return this.data.prompt;
      }
      return Array.from({ length: this.data.targetCount }, (item, index) => index + 1);
    },
  },
  watch: {
    // 更换题目后清空作答痕迹
    data() {
      this.dots = [];
      this.clearTimer();
    },
  },
  beforeUnmount() {
    this.clearTimer();
  },
  methods: {
    handleStageClick(event) {
      if (this.locked || this.dots.length >= this.data.targetCount) return;
      // 以图片原始尺寸换算坐标，保证展示缩放时命中判定仍然准确
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.round(((event.clientX - rect.left) / rect.width) * this.data.width);
      const y = Math.round(((event.clientY - rect.top) / rect.height) * this.data.height);
      this.dots.push({ x, y, id: ++this.dotSeed });
      if (this.dots.length === this.data.targetCount) {
        // 短暂停留让最后一个序号标记完成入场，再提交作答
        this.timer = setTimeout(() => {
          this.$emit('confirm', this.dots.map(dot => `${dot.x},${dot.y}`).join(';'));
        }, 300);
      }
    },
    undo() {
      if (this.locked) return;
      this.dots.pop();
      this.clearTimer();
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
  },
};
</script>

<style scoped>
.word-stage {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}
.word-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
  pointer-events: none;
}
.word-image {
  display: block;
  width: 100%;
  height: 100%;
}
.word-dot {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}
.word-dot-enter-active {
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.word-dot-enter-from {
  opacity: 0;
  transform: scale(0.3);
}
.word-dot-leave-active {
  transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.word-dot-leave-to {
  opacity: 0;
  transform: scale(0.3);
}

.word-bar {
  display: flex;
  align-items: center;
  height: 40px;
  margin-top: 12px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.word-bar-label {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}
.word-chips {
  display: flex;
  gap: 6px;
  flex: 1;
  justify-content: center;
}
.word-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.word-chip.is-ordinal {
  color: #9ca3af;
  font-size: 12px;
}
.word-chip.is-active {
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  transform: scale(1.05);
}
.word-undo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.word-undo svg {
  width: 14px;
  height: 14px;
}
.word-undo:hover:not(:disabled) {
  background: #f3f4f6;
  color: #111827;
}
.word-undo:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
