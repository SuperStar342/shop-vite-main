<template>
  <div class="align-segmented hidden-xs-only">
    <el-radio-group v-model="modelValueLocal" size="large">
      <el-radio-button value="left">{{ translate('居左') }}</el-radio-button>
      <el-radio-button value="center">{{ translate('居中') }}</el-radio-button>
      <el-radio-button value="right">{{ translate('居右') }}</el-radio-button>
    </el-radio-group>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits(['update:modelValue'])

const STORAGE_KEY = 'login-align-type'

const getInitialAlignType = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved || props.modelValue
}

const modelValueLocal = ref(getInitialAlignType())

watch(modelValueLocal, (v) => {
  localStorage.setItem(STORAGE_KEY, v)
  emit('update:modelValue', v)
})

watch(
  () => props.modelValue,
  (v) => {
    if (v !== modelValueLocal.value) modelValueLocal.value = v
  }
)
</script>

<style lang="scss" scoped>
.align-segmented {
  position: fixed;
  top: calc(var(--el-margin) * 1.4);
  left: 50%;
  z-index: 10;
  transform: translateX(-50%);
}
</style>
