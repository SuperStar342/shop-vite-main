<template>
  <teleport to="body">
    <transition name="behavior-fade">
      <div v-if="visible" class="behavior-overlay">
        <div class="behavior-panel" :class="{ 'is-shake': status === 'fail' }">
          <div class="behavior-header">
            <div class="behavior-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div class="behavior-title">
              <span class="behavior-title-main">安全验证</span>
              <span class="behavior-title-sub">{{ subtitle }}</span>
            </div>
            <div class="behavior-actions">
              <button class="behavior-icon-btn" :class="{ 'is-spinning': status === 'loading' }" title="换一题" @click="load">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
              <button class="behavior-icon-btn" title="关闭" @click="close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="behavior-body">
            <transition name="behavior-swap" mode="out-in">
              <div v-if="status === 'loading'" key="skeleton" class="behavior-skeleton">
                <div class="behavior-skeleton-stage">
                  <div class="behavior-skeleton-brand">
                    <span class="behavior-skeleton-halo"></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span class="behavior-skeleton-text">正在构建安全环境<i></i><i></i><i></i></span>
                </div>
                <div class="behavior-skeleton-bar"></div>
              </div>
              <div v-else key="panel" class="behavior-content">
                <word-panel v-if="type === 'word' || type === 'idiom'" :data="behaviorData" :locked="locked" @confirm="handleConfirm" />
                <puzzle-panel v-else-if="type === 'puzzle'" :data="behaviorData" :locked="locked" @confirm="handleConfirm" />
                <concat-panel v-else-if="type === 'concat'" :data="behaviorData" :locked="locked" @confirm="handleConfirm" />
                <rotate-panel v-else-if="type === 'rotate'" :data="behaviorData" :locked="locked" @confirm="handleConfirm" />
              </div>
            </transition>

            <transition name="behavior-result">
              <div v-if="status === 'success'" class="behavior-success">
                <svg class="behavior-success-icon" viewBox="0 0 52 52">
                  <circle class="behavior-success-circle" cx="26" cy="26" r="24" fill="none" />
                  <path class="behavior-success-check" fill="none" d="M14 27l8 8 16-17" />
                </svg>
                <span class="behavior-success-text">验证通过</span>
              </div>
            </transition>
          </div>

          <transition name="behavior-result">
            <div v-if="status === 'fail'" class="behavior-fail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <span>验证未通过，即将自动重试</span>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { ElMessage } from 'element-plus';
import WordPanel from './word-panel.vue';
import PuzzlePanel from './puzzle-panel.vue';
import ConcatPanel from './concat-panel.vue';
import RotatePanel from './rotate-panel.vue';
import { getBehavior, checkBehavior } from '/@/api/user';

const SUBTITLES = {
  word: '请按提示顺序点击图中文字',
  idiom: '请找出图中成语并按语序点击',
  puzzle: '请拖动滑块完成拼图',
  concat: '请拖动滑块对齐上下图案',
  rotate: '请拖动滑块将图案转至正确方向',
};

export default {
  name: 'behaviorCaptcha',
  components: { WordPanel, PuzzlePanel, ConcatPanel, RotatePanel },
  emits: ['success'],
  data() {
    return {
      visible: false,
      // 状态机: loading 出题中 / ready 待作答 / checking 核验中 / success 通过 / fail 未通过
      status: 'loading',
      key: '',
      type: '',
      behaviorData: {},
    };
  },
  computed: {
    subtitle() {
      return SUBTITLES[this.type] || '完成验证以继续登录';
    },
    locked() {
      return this.status !== 'ready';
    },
  },
  beforeUnmount() {
    this.clearTimer();
  },
  methods: {
    open() {
      this.visible = true;
      this.load();
    },
    close() {
      this.clearTimer();
      this.visible = false;
      this.status = 'loading';
      this.key = '';
      this.type = '';
      this.behaviorData = {};
    },
    load() {
      this.clearTimer();
      this.status = 'loading';
      getBehavior()
        .then(res => {
          const data = res.data || {};
          const payload = data.data || {};
          if (!data.key || !data.type || !payload.image) {
            throw new Error(data.msg || '验证码数据不完整');
          }
          // 题面图预解码完成后再切换视图：出题响应到达时图片尚未完成首帧绘制，
          // 立即切换会让舞台区域先渲染为空白，由骨架屏覆盖整个等待期
          return this.preloadImages([payload.image, payload.piece, payload.ring]).then(() => {
            this.key = data.key;
            this.behaviorData = payload;
            this.type = data.type;
            this.status = 'ready';
          });
        })
        .catch(err => {
          const message =
            (err && err.message) ||
            (typeof err === 'string' ? err : '') ||
            '验证码加载失败，请检查网络或后端 blade-auth / Redis';
          ElMessage({ message, type: 'error' });
          this.close();
        });
    },
    preloadImages(sources) {
      const tasks = sources.filter(Boolean).map(
        source =>
          new Promise(resolve => {
            const image = new Image();
            image.onload = resolve;
            // 解码失败不阻塞流程，交由面板正常渲染兜底
            image.onerror = resolve;
            image.src = source;
            if (image.decode) {
              image.decode().then(resolve, resolve);
            }
          })
      );
      return Promise.all(tasks);
    },
    handleConfirm(answer) {
      if (this.status !== 'ready') return;
      this.status = 'checking';
      checkBehavior(this.key, answer).then(
        res => {
          this.status = 'success';
          const ticket = res.data.ticket;
          this.timer = setTimeout(() => {
            const key = this.key;
            this.close();
            this.$emit('success', { key, ticket });
          }, 700);
        },
        () => {
          // 题目已被服务端一次性消费，短暂展示失败反馈后自动更换题目
          this.status = 'fail';
          this.timer = setTimeout(() => this.load(), 900);
        }
      );
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
.behavior-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(4px);
}
.behavior-panel {
  position: relative;
  /* 宽度跟随舞台内容自适应，保证题面图与提示条、滑轨结构性等宽对称 */
  width: fit-content;
  padding: 18px 20px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06);
}
.behavior-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}
.behavior-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
  color: #ffffff;
  flex-shrink: 0;
}
.behavior-badge svg {
  width: 18px;
  height: 18px;
}
.behavior-title {
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  flex: 1;
  min-width: 0;
}
.behavior-title-main {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}
.behavior-title-sub {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}
.behavior-actions {
  display: flex;
  gap: 2px;
}
.behavior-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-icon-btn svg {
  width: 16px;
  height: 16px;
}
.behavior-icon-btn:hover {
  background: #f3f4f6;
  color: #111827;
  transform: scale(1.05);
}
.behavior-icon-btn:active {
  transform: scale(0.96);
}
.behavior-icon-btn.is-spinning svg {
  animation: behavior-spin 0.8s linear infinite;
}
@keyframes behavior-spin {
  to {
    transform: rotate(360deg);
  }
}
.behavior-body {
  position: relative;
}

/* 骨架加载态：品牌徽标呼吸 + 斜向扫光，尺寸与题面舞台一致避免交接跳动 */
.behavior-skeleton-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 340px;
  height: 220px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fc, #f1f3f8);
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.04);
  overflow: hidden;
}
.behavior-skeleton-stage::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 50%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-16deg);
  animation: behavior-sweep 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}
@keyframes behavior-sweep {
  to {
    left: 120%;
  }
}
.behavior-skeleton-brand {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.28);
  color: #ffffff;
}
.behavior-skeleton-brand svg {
  width: 22px;
  height: 22px;
}
.behavior-skeleton-halo {
  position: absolute;
  inset: 0;
  border-radius: 13px;
  box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.35);
  animation: behavior-pulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}
@keyframes behavior-pulse {
  to {
    box-shadow: 0 0 0 16px rgba(99, 102, 241, 0);
  }
}
.behavior-skeleton-text {
  display: flex;
  align-items: baseline;
  font-size: 12px;
  color: #9ca3af;
  letter-spacing: 0.5px;
}
.behavior-skeleton-text i {
  width: 3px;
  height: 3px;
  margin-left: 3px;
  border-radius: 50%;
  background: #9ca3af;
  animation: behavior-dot 1.2s ease-in-out infinite;
}
.behavior-skeleton-text i:nth-child(2) {
  animation-delay: 0.15s;
}
.behavior-skeleton-text i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes behavior-dot {
  0%,
  60%,
  100% {
    opacity: 0.25;
  }
  30% {
    opacity: 1;
  }
}
.behavior-skeleton-bar {
  height: 40px;
  margin-top: 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: behavior-shimmer 1.4s ease-in-out infinite;
}
@keyframes behavior-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 骨架与题面的交接过渡 */
.behavior-swap-enter-active {
  transition: opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-swap-leave-active {
  transition: opacity 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-swap-enter-from {
  opacity: 0;
  transform: scale(0.98);
}
.behavior-swap-leave-to {
  opacity: 0;
}

/* 成功遮罩 */
.behavior-success {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
}
.behavior-success-icon {
  width: 52px;
  height: 52px;
  stroke: #10b981;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.behavior-success-circle {
  stroke-dasharray: 151;
  stroke-dashoffset: 151;
  animation: behavior-stroke 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.behavior-success-check {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: behavior-stroke 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) 0.35s forwards;
}
@keyframes behavior-stroke {
  to {
    stroke-dashoffset: 0;
  }
}
.behavior-success-text {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

/* 失败提示条 */
.behavior-fail {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  background: #fef2f2;
  color: #ef4444;
  font-size: 12px;
}
.behavior-fail svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* 面板抖动反馈 */
.is-shake {
  animation: behavior-shake 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes behavior-shake {
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}

/* 弹窗过渡 */
.behavior-fade-enter-active,
.behavior-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-fade-enter-active .behavior-panel,
.behavior-fade-leave-active .behavior-panel {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-fade-enter-from,
.behavior-fade-leave-to {
  opacity: 0;
}
.behavior-fade-enter-from .behavior-panel,
.behavior-fade-leave-to .behavior-panel {
  transform: scale(0.96) translateY(8px);
}
.behavior-result-enter-active,
.behavior-result-leave-active {
  transition: opacity 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.behavior-result-enter-from,
.behavior-result-leave-to {
  opacity: 0;
}
</style>
