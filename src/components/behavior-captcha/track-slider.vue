<template>
  <div ref="track" class="track-slider" :class="{ 'is-dragging': dragging }">
    <div class="track-fill" :style="{ width: `${handleX + handleSize / 2}px` }"></div>
    <span v-show="!moved" class="track-hint">{{ hint }}</span>
    <div
      class="track-handle"
      :style="{ transform: `translateX(${handleX}px)` }"
      @pointerdown="handleDown"
    >
      <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  </div>
</template>

<script>
const HANDLE_SIZE = 40;

export default {
  name: 'trackSlider',
  props: {
    hint: {
      type: String,
      default: '',
    },
    locked: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['drag', 'release'],
  data() {
    return {
      handleSize: HANDLE_SIZE,
      handleX: 0,
      dragging: false,
      moved: false,
    };
  },
  methods: {
    handleDown(event) {
      if (this.locked) return;
      this.dragging = true;
      this.startX = event.clientX;
      this.baseX = this.handleX;
      this.handleEl = event.currentTarget;
      this.handleEl.setPointerCapture(event.pointerId);
      this.handleEl.addEventListener('pointermove', this.handleMove);
      this.handleEl.addEventListener('pointerup', this.handleUp, { once: true });
    },
    handleMove(event) {
      if (!this.dragging) return;
      const maxX = this.$refs.track.clientWidth - HANDLE_SIZE;
      this.handleX = Math.min(Math.max(this.baseX + event.clientX - this.startX, 0), maxX);
      this.moved = this.moved || this.handleX > 0;
      this.$emit('drag', maxX > 0 ? this.handleX / maxX : 0);
    },
    handleUp() {
      this.handleEl.removeEventListener('pointermove', this.handleMove);
      this.dragging = false;
      // 从未移动的误触不视为作答，避免白白消费一次题目
      if (!this.moved) return;
      const maxX = this.$refs.track.clientWidth - HANDLE_SIZE;
      this.$emit('release', maxX > 0 ? this.handleX / maxX : 0);
    },
    reset() {
      this.handleX = 0;
      this.dragging = false;
      this.moved = false;
    },
  },
};
</script>

<style scoped>
.track-slider {
  position: relative;
  height: 40px;
  margin-top: 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
.track-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.18));
  transition: none;
}
.track-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #9ca3af;
  pointer-events: none;
}
.track-handle {
  position: absolute;
  top: -1px;
  left: -1px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);
  color: #6b7280;
  cursor: grab;
  transition: box-shadow 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.track-handle svg {
  width: 16px;
  height: 16px;
}
.track-handle:hover {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 16px rgba(0, 0, 0, 0.06);
}
.is-dragging .track-handle {
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  border-color: transparent;
  color: #ffffff;
  cursor: grabbing;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(59, 130, 246, 0.35);
}
</style>
