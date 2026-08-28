<template>
  <vab-context-menu v-model:show="tableCopyMenu.show" :options="menuOptions">
    <vab-context-menu-item :label="cellLabel" @click="onCopyCell" />
    <vab-context-menu-item :label="rowLabel" @click="onCopyRow" />
  </vab-context-menu>
</template>

<script lang="ts" setup>
import { VabContextMenu, VabContextMenuItem } from '/@/plugins/VabContextMenu'
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
  minWidth: 200,
  zIndex: tableCopyMenu.zIndex,
  x: tableCopyMenu.x,
  y: tableCopyMenu.y,
}))

const cellLabel = computed(() => {
  const { mode, cellCount, rowCount, preview } = tableCopySelection
  if (mode === 'range' && cellCount > 1) {
    return `复制选区（${cellCount} 格 / ${rowCount} 行）`
  }
  if (mode === 'rows' && rowCount > 1) {
    return `复制选中行（${rowCount} 行）`
  }
  if (!preview) return '复制单元格 (Ctrl+C)'
  const short = preview.length > 16 ? `${preview.slice(0, 16)}…` : preview
  return `复制单元格「${short}」`
})

const rowLabel = computed(() => {
  const { rowCount } = tableCopySelection
  if (rowCount > 1) return `复制 ${rowCount} 整行 (Ctrl+Shift+C)`
  return '复制整行 (Ctrl+Shift+C)'
})

const onCopyCell = () => {
  void copyTableCopyCell()
}

const onCopyRow = () => {
  void copyTableCopyRow()
}
</script>
