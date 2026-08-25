<template>
  <vab-context-menu v-model:show="tableCopyMenu.show" :options="menuOptions">
    <vab-context-menu-item label="复制单元格" @click="onCopyCell" />
    <vab-context-menu-item label="复制整行" @click="onCopyRow" />
  </vab-context-menu>
</template>

<script lang="ts" setup>
import {
  copyTableCopyCell,
  copyTableCopyRow,
  tableCopyMenu,
} from '/@/utils/tableCopy'

defineOptions({ name: 'TableCopyMenu' })

const menuOptions = computed(() => ({
  minWidth: 140,
  zIndex: tableCopyMenu.zIndex,
  x: tableCopyMenu.x,
  y: tableCopyMenu.y,
}))

const onCopyCell = () => {
  void copyTableCopyCell()
}

const onCopyRow = () => {
  void copyTableCopyRow()
}
</script>
