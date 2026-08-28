<template>
  <div class="rotate-panel">
    <div class="rotate-stage" :style="stageSize">
      <img alt="" class="rotate-image" draggable="false" :src="data.image" />
      <img
        alt=""
        class="rotate-ring"
        draggable="false"
        :src="data.ring"
        :style="{
          width: `${data.ringSize}px`,
          height: `${data.ringSize}px`,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        }"
      />
    </div>
    <track-slider
      ref="slider"
      hint="按住滑块，转动图案至正确方向"
      :locked="locked"
      @drag="handleDrag"
      @release="handleRelease"
    />
  </div>
</template>

<script>
import TrackSlider from './track-slider.vue';

export default {
  name: 'rotatePanel',
  components: { TrackSlider },
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
      angle: 0,
    };
  },
  computed: {
    // 舞台尺寸以服务端下发的逻辑尺寸为准，避免前后端各存一份常量产生偏差
    stageSize() {
      return { width: `${this.data.width}px`, height: `${this.data.height}px` };
    },
  },
  watch: {
    // 更换题目后内圆回到初始方向
    data() {
      this.angle = 0;
      this.$refs.slider?.reset();
    },
  },
  methods: {
    // 滑轨行程映射整圆角度
    handleDrag(progress) {
      this.angle = Math.round(progress * 360);
    },
    handleRelease() {
      this.$emit('confirm', String(this.angle));
    },
  },
};
</script>

<style scoped>
.rotate-stage {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
.rotate-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
  pointer-events: none;
}
.rotate-image {
  display: block;
  width: 100%;
  height: 100%;
}
.rotate-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  will-change: transform;
}
</style>
