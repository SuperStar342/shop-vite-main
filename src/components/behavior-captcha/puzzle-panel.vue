<template>
  <div class="puzzle-panel">
    <div class="puzzle-stage" :style="stageSize">
      <img alt="" class="puzzle-image" draggable="false" :src="data.image" />
      <img
        alt=""
        class="puzzle-piece"
        draggable="false"
        :src="data.piece"
        :style="{
          left: `${pieceX}px`,
          top: `${data.pieceY}px`,
          width: `${data.pieceSize}px`,
          height: `${data.pieceSize}px`,
        }"
      />
    </div>
    <track-slider
      ref="slider"
      hint="按住滑块，拖动完成拼图"
      :locked="locked"
      @drag="handleDrag"
      @release="handleRelease"
    />
  </div>
</template>

<script>
import TrackSlider from './track-slider.vue';

export default {
  name: 'puzzlePanel',
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
      pieceX: 0,
    };
  },
  computed: {
    // 舞台尺寸以服务端下发的逻辑尺寸为准，避免前后端各存一份常量产生偏差
    stageSize() {
      return { width: `${this.data.width}px`, height: `${this.data.height}px` };
    },
  },
  watch: {
    // 更换题目后拼图块回到起点
    data() {
      this.pieceX = 0;
      this.$refs.slider?.reset();
    },
  },
  methods: {
    // 滑轨行程与拼图块行程等比映射，保证滑到尽头时拼图块恰好到达画布右缘
    handleDrag(progress) {
      this.pieceX = Math.round(progress * (this.data.width - this.data.pieceSize));
    },
    handleRelease() {
      this.$emit('confirm', String(this.pieceX));
    },
  },
};
</script>

<style scoped>
.puzzle-stage {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
.puzzle-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
  pointer-events: none;
}
.puzzle-image {
  display: block;
  width: 100%;
  height: 100%;
}
.puzzle-piece {
  position: absolute;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
  pointer-events: none;
}
</style>
