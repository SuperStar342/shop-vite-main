<template>
  <el-dialog
    v-model="visible"
    append-to-body
    destroy-on-close
    title="报工记录"
    width="860px"
    @open="load"
  >
    <div class="rrd-toolbar">
      <span>{{ subtitle }}</span>
      <el-button :icon="Refresh" link :loading="loading" @click="load">刷新</el-button>
    </div>
    <el-table v-loading="loading" border :data="list" max-height="420">
      <el-table-column label="报工时间" min-width="150" prop="reportTime" />
      <el-table-column label="报工人" min-width="90" prop="reporter" />
      <el-table-column align="right" label="本次报工" min-width="80" prop="reportQty" />
      <el-table-column align="right" label="合格" min-width="64" prop="passQty" />
      <el-table-column align="right" label="不良" min-width="64" prop="defectQty" />
      <el-table-column align="right" label="返工" min-width="64" prop="reworkQty" />
      <el-table-column label="方式" min-width="90" prop="reportMethod" />
      <el-table-column label="备注" min-width="120" prop="remark" show-overflow-tooltip />
      <template #empty>
        <el-empty description="暂无报工记录" :image-size="72" />
      </template>
    </el-table>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'
import type { WorkReportRecord } from '/@/api/procurement/workReport'
import { getDispatchReportRecords } from '/@/api/procurement/workReport'

const props = defineProps<{
  modelValue: boolean
  wtNo?: string
  woNo?: string
  prcName?: string
  titleHint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const list = ref<WorkReportRecord[]>([])

const subtitle = computed(
  () => props.titleHint || [props.wtNo, props.woNo, props.prcName].filter(Boolean).join(' · ') || '当前工序历史报工'
)

const load = async () => {
  loading.value = true
  try {
    const { data } = await getDispatchReportRecords({
      wtNo: props.wtNo,
      woNo: props.woNo,
      prcName: props.prcName,
    })
    list.value = data.list || []
  } catch (e: any) {
    list.value = []
    $baseMessage(e?.message || '加载报工记录失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.rrd-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}
</style>
