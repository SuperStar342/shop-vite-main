<template>
  <div class="prd-design auto-height-container">
    <hiprint-report-dialog
      v-if="ready"
      mode="page"
      :model-value="true"
      :title="designTitle"
      :report-key="templateId"
      :providers="bundle.providers"
      :provider-modules="bundle.providerModules"
      :default-template="bundle.defaultTemplate"
      :print-data="samplePrintData"
      :on-load-template="loadRemote"
      :on-save-template="saveRemote"
      @close="goBack"
    />
    <el-empty v-else-if="!loading" description="缺少模板参数，请从模板列表进入设计" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import HiprintReportDialog from '/@/components/hiprint/HiprintReportDialog.vue'
import { getTemplateJson, saveTemplateJson } from '/@/api/print/reportCenter'
import {
  buildInstructionPrintData,
  mapItemsToPrintRows,
} from '/@/utils/hiprint/instructionSheet'
import { getHiprintBundle } from '/@/utils/hiprint/registry'
import { useTabsStore } from '/@/store/modules/tabs'
import { handleActivePath } from '/@/utils/routes'

defineOptions({ name: 'PrintReportTemplateDesign' })

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()
const { changeTabsMeta, delVisitedRoute } = tabsStore

const loading = ref(true)
const ready = ref(false)
const templateId = computed(() => String(route.query.id || ''))
const templateName = computed(() => String(route.query.name || '未命名模板'))
const docTypeCode = computed(() => String(route.query.docTypeCode || 'instruction'))
const designTitle = computed(() => `设计 - ${templateName.value}`)

const bundle = reactive({
  providers: [] as any[],
  providerModules: [] as string[],
  defaultTemplate: null as unknown,
})

const makeSamplePrintData = (code: string) => {
  if (code === 'instruction') {
    const rows = mapItemsToPrintRows(
      [
        {
          ordNo: 'ORD-20260912-001',
          custOrdNo: 'CUST-001',
          custName: '示例客户',
          styleCode: 'STYLE-001',
          goodsName: '示例货品',
          fabricCode: 'FAB-001',
          clrCode: 'CLR-001',
          moQty: 100,
          ordDate: '2026-09-12',
        },
        {
          ordNo: 'ORD-20260912-002',
          custOrdNo: 'CUST-002',
          custName: '示例客户二',
          styleCode: 'STYLE-002',
          goodsName: '示例货品二',
          fabricCode: 'FAB-002',
          clrCode: 'CLR-002',
          moQty: 200,
          ordDate: '2026-09-12',
        },
      ],
      {}
    )
    return buildInstructionPrintData(rows)
  }
  return {}
}

const samplePrintData = computed(() => makeSamplePrintData(docTypeCode.value))

const loadRemote = async (key: string) => {
  const raw = await getTemplateJson(key)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

const saveRemote = async (key: string, json: unknown) => {
  await saveTemplateJson(key, json)
}

const boot = async () => {
  loading.value = true
  ready.value = false
  if (!templateId.value) {
    loading.value = false
    return
  }
  try {
    const b = await getHiprintBundle(docTypeCode.value)
    bundle.providers = b.providers
    bundle.providerModules = b.providerModules
    bundle.defaultTemplate = b.defaultTemplate
    await nextTick()
    ready.value = true
    changeTabsMeta({
      name: 'printTemplateDesign',
      title: '模板设计',
      meta: { title: designTitle.value },
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '加载设计器失败')
  } finally {
    loading.value = false
  }
}

const goBack = async () => {
  await delVisitedRoute(handleActivePath(route as any, true))
  router.push('/printReport/templates/index')
}

watch(
  () => [route.query.id, route.query.docTypeCode, route.query.name],
  () => {
    boot()
  },
  { immediate: true }
)
</script>

<style scoped>
.prd-design {
  min-height: 0;
}
</style>
