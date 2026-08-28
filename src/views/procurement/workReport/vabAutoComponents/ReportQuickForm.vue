<template>
  <section class="rqf">
    <header class="rqf__head">
      <div>
        <span class="rqf__tag">快速报工</span>
        <h3>{{ task ? task.woNo : '请选择左侧任务' }}</h3>
        <p v-if="task">
          {{ task.goodsName }} · {{ task.prcName }}
          <el-tag effect="plain" size="small" :type="statusType">{{ task.status }}</el-tag>
        </p>
        <p v-else class="rqf__hint">点选待报工行或扫码定位任务</p>
      </div>
      <div v-if="task" class="rqf__mini-stats">
        <div><em>派工</em><b>{{ task.wtQty }}</b></div>
        <div><em>已报</em><b>{{ task.fnQty }}</b></div>
        <div class="is-pending"><em>待报</em><b>{{ task.pendingQty }}</b></div>
      </div>
    </header>

    <el-form ref="formRef" class="rqf__form" :disabled="!task" label-position="top" :model="form" :rules="rules">
      <el-form-item label="报工数量" prop="reportQty">
        <el-input-number v-model="form.reportQty" class="rqf__qty" :max="maxQty" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="报工时间" prop="reportTime">
        <el-date-picker
          v-model="form.reportTime"
          format="YYYY-MM-DD HH:mm"
          style="width: 100%"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>

      <div class="rqf__quality">
        <el-form-item label="合格数量" prop="passQty">
          <el-input-number v-model="form.passQty" :max="form.reportQty" :min="0" />
        </el-form-item>
        <el-form-item label="不良数量" prop="defectQty">
          <el-input-number v-model="form.defectQty" :max="form.reportQty" :min="0" />
        </el-form-item>
        <el-form-item label="返工数量" prop="reworkQty">
          <el-input-number v-model="form.reworkQty" :max="form.reportQty" :min="0" />
        </el-form-item>
      </div>

      <el-form-item v-if="form.defectQty > 0" label="不良原因" prop="defectReason">
        <el-select v-model="form.defectReason" allow-create clearable filterable placeholder="选择或输入" style="width: 100%">
          <el-option v-for="r in defectReasons" :key="r" :label="r" :value="r" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="选填" type="textarea" />
      </el-form-item>

      <el-form-item label="现场照片（最多 3 张）">
        <el-upload
          v-model:file-list="fileList"
          accept="image/*"
          :auto-upload="false"
          :limit="3"
          list-type="picture-card"
        >
          <el-icon><plus /></el-icon>
        </el-upload>
      </el-form-item>
    </el-form>

    <footer class="rqf__foot">
      <el-button :disabled="!task" @click="emit('reset')">取消</el-button>
      <el-button :disabled="!task" :loading="submitting" type="primary" @click="onSubmit">
        确认报工
      </el-button>
    </footer>
  </section>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus'
import type { SubmitWorkReportPayload, WorkReportTask } from '/@/api/procurement/workReport'
import { validateReportPayload } from '/@/api/procurement/workReport'

const props = defineProps<{
  task: WorkReportTask | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: SubmitWorkReportPayload]
  reset: []
}>()

const formRef = ref<FormInstance>()
const fileList = ref<UploadUserFile[]>([])

const defectReasons = ['尺寸偏差', '表面瑕疵', '组装不良', '物料缺失', '其他']

const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const form = reactive({
  reportQty: 1,
  reportTime: nowStr(),
  passQty: 1,
  defectQty: 0,
  reworkQty: 0,
  defectReason: '',
  remark: '',
})

const maxQty = computed(() => Math.max(1, props.task?.pendingQty || 1))

const statusType = computed(() => {
  const s = props.task?.status
  if (s === '已完工') return 'success'
  if (s === '部分完工') return 'warning'
  return 'info'
})

const rules: FormRules = {
  reportQty: [{ required: true, message: '请输入报工数量', trigger: 'blur' }],
  reportTime: [{ required: true, message: '请选择报工时间', trigger: 'change' }],
}

watch(
  () => props.task?.id,
  (id) => {
    if (!id) return
    const pending = props.task?.pendingQty || 1
    form.reportQty = Math.min(pending, Math.max(1, Math.ceil(pending / 2)))
    form.reportTime = nowStr()
    form.passQty = form.reportQty
    form.defectQty = 0
    form.reworkQty = 0
    form.defectReason = ''
    form.remark = ''
    fileList.value = []
  },
  { immediate: true }
)

watch(
  () => form.reportQty,
  (qty) => {
    if (form.passQty + form.defectQty + form.reworkQty !== qty) {
      form.passQty = Math.max(0, qty - form.defectQty - form.reworkQty)
    }
  }
)

watch([() => form.defectQty, () => form.reworkQty], () => {
  const rest = form.reportQty - form.defectQty - form.reworkQty
  form.passQty = Math.max(0, rest)
})

const onSubmit = async () => {
  if (!props.task) return
  await formRef.value?.validate?.().catch(() => {
    throw new Error('请完善报工信息')
  })
  const payload: SubmitWorkReportPayload = {
    taskId: props.task.id,
    reportQty: form.reportQty,
    reportTime: form.reportTime,
    passQty: form.passQty,
    defectQty: form.defectQty,
    reworkQty: form.reworkQty,
    defectReason: form.defectReason || undefined,
    remark: form.remark || undefined,
  }
  const err = validateReportPayload(props.task, payload)
  if (err) {
    $baseMessage(err, 'warning', 'hey')
    return
  }
  emit('submit', payload)
}
</script>

<style lang="scss" scoped>
.rqf {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(165deg, #f8fbff 0%, #fff 45%);
  border: 1px solid #e3ecf5;
  border-radius: 12px;
  overflow: hidden;
}

.rqf__head {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 18px 12px;
  background: linear-gradient(135deg, #1a6fb5 0%, #2e8fd6 100%);
  color: #fff;

  h3 {
    margin: 4px 0 2px;
    font-size: 17px;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 12px;
    opacity: 0.92;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.rqf__tag {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.rqf__hint {
  opacity: 0.75 !important;
}

.rqf__mini-stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;

  div {
    min-width: 52px;
    padding: 6px 10px;
    text-align: center;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    backdrop-filter: blur(4px);

    em {
      display: block;
      font-size: 10px;
      font-style: normal;
      opacity: 0.85;
    }

    b {
      font-size: 18px;
      font-weight: 700;
    }

    &.is-pending b {
      color: #ffe082;
    }
  }
}

.rqf__form {
  flex: 1;
  padding: 14px 18px;
  overflow: auto;
}

.rqf__qty {
  width: 100%;

  :deep(.el-input__inner) {
    font-size: 20px;
    font-weight: 700;
    text-align: center;
  }
}

.rqf__quality {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rqf__foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 12px 18px 16px;
  border-top: 1px solid #eef2f6;
  background: #fafcff;
}
</style>
