<template>
  <div class="sku-matrix">
    <div v-if="!colors.length || !styles.length" class="empty">
      请先在列表中为 SKU 填写「颜色」与「规格名称」，或使用批量生成，矩阵将按 颜色 × 规格名 自动展开。
    </div>

    <div v-else class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr>
            <th>颜色 \\ 款式</th>
            <th v-for="st in styles" :key="st">{{ st }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="color in colors" :key="color">
            <th>{{ color }}</th>
            <td v-for="st in styles" :key="`${color}-${st}`">
              <div v-if="cell(color, st)" class="cell" :class="{ off: cell(color, st).specStatus === 0 }">
                <el-image v-if="cell(color, st).specImage" :src="cell(color, st).specImage" class="cell__img" fit="cover" />
                <div class="cell__code">{{ cell(color, st).specCode }}</div>
                <div class="cell__price">¥{{ num(cell(color, st).specMemberPrice ?? cell(color, st).specPrice) }}</div>
                <div class="cell__stock">库存 {{ cell(color, st).specStock || 0 }}</div>
                <el-button link type="primary" size="small" @click="emit('edit', cell(color, st))">编辑</el-button>
              </div>
              <button v-else type="button" class="cell cell--empty" @click="emit('create', { color, style: st })">+</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ specs: any[] }>()
const emit = defineEmits<{
  (e: 'edit', spec: any): void
  (e: 'create', payload: { color: string; style: string }): void
  (e: 'batch'): void
}>()

const colors = computed(() => {
  const set = new Set<string>()
  props.specs.forEach((s) => s.color && set.add(String(s.color)))
  return Array.from(set)
})

const styles = computed(() => {
  const set = new Set<string>()
  props.specs.forEach((s) => {
    const name = s.specName || s.style
    if (name) set.add(String(name))
  })
  return Array.from(set)
})

function cell(color: string, style: string) {
  return (
    props.specs.find((s) => s.color === color && (s.specName === style || s.style === style)) || null
  )
}

const num = (v: any) => Number(v ?? 0).toFixed(0)
</script>

<style lang="scss" scoped>
.matrix-wrap {
  overflow: auto;
}

.matrix {
  border-collapse: separate;
  border-spacing: 8px;
  min-width: 100%;

  th {
    font-size: 12px;
    color: #78716c;
    font-weight: 600;
    text-align: left;
    padding: 4px 8px;
  }

  td {
    vertical-align: top;
  }
}

.cell {
  width: 140px;
  min-height: 120px;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  padding: 8px;
  background: #fff;

  &--empty {
    display: grid;
    place-items: center;
    color: #a8a29e;
    font-size: 22px;
    cursor: pointer;
    background: #f7f5f2;

    &:hover {
      border-color: #0f766e;
      color: #0f766e;
    }
  }

  &.off {
    opacity: 0.5;
  }

  &__img {
    width: 100%;
    height: 56px;
    border-radius: 8px;
    margin-bottom: 6px;
  }

  &__code {
    font-size: 11px;
    color: #78716c;
  }

  &__price {
    font-weight: 800;
    color: #b45309;
    margin-top: 2px;
  }

  &__stock {
    font-size: 12px;
    color: #57534e;
    margin: 2px 0 4px;
  }
}

.empty {
  padding: 36px;
  text-align: center;
  color: #78716c;
  background: #f7f5f2;
  border-radius: 12px;
}
</style>
