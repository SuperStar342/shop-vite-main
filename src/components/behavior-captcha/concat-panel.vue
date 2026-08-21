<template>
  <div class="concat-panel">
    <div class="concat-stage" :style="stageSize">
      <div class="concat-top" :style="topStyle"></div>
      <div class="concat-bottom" :style="bottomStyle"></div>
    </div>
    <track-slider
      ref="slider"
      hint="按住滑块，对齐上下图案"
      :locked="locked"
      @drag="handleDrag"
      @release="handleRelease"
    />
  </div>
</template>

<script>
import TrackSlider from './track-slider.vue';

export default {
  name: 'concatPanel',
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
      moveX: 0,
    };
  },
  computed: {
    // 舞台尺寸以服务端下发的逻辑尺寸为准，避免前后端各存一份常量产生偏差
    stageSize() {
      return { width: `${this.data.width}px`, height: `${this.data.height}px` };
    },
    topStyle() {
      return {
        height: `${this.data.sliceY}px`,
        backgroundImage: `url(${this.data.image})`,
        backgroundSize: `${this.data.width}px ${this.data.height}px`,
        backgroundPosition: '0 0',
      };
    },
    // 下条以背景横向循环平移实现推回复位，纵向偏移对准切缝以下的内容
    bottomStyle() {
      return {
        height: `${this.data.height - this.data.sliceY}px`,
        backgroundImage: `url(${this.data.image})`,
        backgroundSize: `${this.data.width}px ${this.data.height}px`,
        backgroundPosition: `${this.moveX}px -${this.data.sliceY}px`,
      };
    },
  },
  watch: {
    // 更换题目后下条回到初始错位状态
    data() {
      this.moveX = 0;
      this.$refs.slider?.reset();
    },
  },
  methods: {
    // 滑轨行程映射整幅画布宽度的循环位移
    handleDrag(progress) {
      this.moveX = Math.round(progress * this.data.width);
    },
    handleRelease() {
      this.$emit('confirm', String(this.moveX));
    },
  },
};
</script>

<style scoped>
.concat-stage {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
.concat-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
  pointer-events: none;
}
.concat-top,
.concat-bottom {
  width: 100%;
  background-repeat: repeat-x;
}
</style>
