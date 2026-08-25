<template>
  <vab-context-menu v-model:show="tableCopyMenu.show" :options="menuOptions">
    <vab-context-menu-item :label="cellLabel" @click="onCopyCell" />
    <vab-context-menu-item :label="rowLabel" @click="onCopyRow" />
  </vab-context-menu>
</template>

<script lang="ts" setup>
import {
  copyTableCopyCell,
  copyTableCopyRow,
  ensureTableCopyHotkeys,
  tableCopyMenu,
  tableCopySelection,
} from '/@/utils/tableCopy'

defineOptions({ name: 'TableCopyMenu' })

onMounted(() => {
  ensureTableCopyHotkeys()
})

const menuOptions = computed(() => ({
  minWidth: 180,
  zIndex: tableCopyMenu.zIndex,
  x: tableCopyMenu.x,
  y: tableCopyMenu.y,
}))

const cellLabel = computed(() => {
  const tip = tableCopySelection.preview || tableCopyMenu.cellText
  if (!tip) return '复制单元格 (Ctrl+C)'
  const short = tip.length > 18 ? `${tip.slice(0, 18)}…` : tip
  return `复制单元格「${short}」`
})

const rowLabel = computed(() => '复制整行 (Ctrl+Shift+C)')

const onCopyCell = () => {
  void copyTableCopyCell()
}

const onCopyRow = () => {
  void copyTableCopyRow()
}
</script>
