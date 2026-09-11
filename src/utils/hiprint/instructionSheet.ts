/**
 * 制令「生产指令单」— vue-plugin-hiprint
 * 纸张：A4 竖版（mm）；元素坐标/宽高：pt（1mm ≈ 2.8346pt）
 */
import dayjs from 'dayjs'
import { ensureJquery, fitPreviewToContainer as coreFitPreviewToContainer } from './core'
import { buildInstructionSheetDefaultTemplate } from './templates/instructionSheet'

export type InstructionPrintRow = {
  ordNo: string
  custOrdNo: string
  custName: string
  styleCode: string
  goodsName: string
  fabricCode: string
  clrCode: string
  moQty: string | number
  reqDate: string
  deliveryDate: string
  remark: string
}

const dateOnly = (v: unknown) => {
  const s = String(v ?? '').trim()
  if (!s) return ''
  return s.length >= 10 ? s.slice(0, 10) : s
}

/** 将生产内容行 + 制令主表日期映射为打印行 */
export const mapItemsToPrintRows = (
  items: any[],
  master?: Record<string, any> | null
): InstructionPrintRow[] => {
  const reqDate = dateOnly(master?.planEndDate)
  const deliveryDate = dateOnly(master?.planStDate || master?.planEndDate)
  return (items || []).map((it) => ({
    ordNo: String(it.ordNo ?? master?.ordNo ?? ''),
    custOrdNo: String(it.custOrdNo ?? master?.custOrdNo ?? ''),
    custName: String(it.custName ?? ''),
    styleCode: String(it.styleCode || it.goodsCode || master?.fgCode || ''),
    goodsName: String(it.goodsName || master?.fgName || ''),
    fabricCode: String(it.fabricCode || it.grpCode || ''),
    clrCode: String(it.clrCode ?? ''),
    moQty: it.moQty ?? '',
    reqDate: reqDate || dateOnly(it.ordDate),
    deliveryDate: deliveryDate || dateOnly(it.ordDate),
    remark: String(it.remark || it.prodReq || master?.remark || ''),
  }))
}

const withTotalRow = (rows: InstructionPrintRow[]): InstructionPrintRow[] => {
  const total = rows.reduce((s, r) => s + (Number(r.moQty) || 0), 0)
  return [
    ...rows,
    {
      ordNo: '',
      custOrdNo: '',
      custName: '',
      styleCode: '',
      goodsName: '',
      fabricCode: '',
      clrCode: '合计：',
      moQty: total,
      reqDate: '',
      deliveryDate: '',
      remark: '',
    },
  ]
}

export const buildInstructionPrintData = (rows: InstructionPrintRow[]) => ({
  printDate: dayjs().format('YYYY-MM-DD HH:mm'),
  pageInfo: '1 / 1',
  table: withTotalRow(rows),
})

const createInstructionTemplate = async () => {
  await ensureJquery()
  const { hiprint } = await import('vue-plugin-hiprint')
  const template = await buildInstructionSheetDefaultTemplate()
  return new hiprint.PrintTemplate({ template })
}

/** 预览区：把纸张缩放到铺满容器宽度 */
export const fitPreviewToContainer = (container: HTMLElement) => {
  coreFitPreviewToContainer(container)
}

/** 浏览器预览并调起打印 */
export const printInstructionSheet = async (rows: InstructionPrintRow[]) => {
  if (!rows.length) throw new Error('没有可打印的明细数据')
  const tpl = await createInstructionTemplate()
  tpl.print(buildInstructionPrintData(rows))
}

/** 生成预览 HTML（挂到容器） */
export const renderInstructionSheetPreview = async (
  container: HTMLElement,
  rows: InstructionPrintRow[]
) => {
  const $ = await ensureJquery()
  if (!rows.length) {
    container.innerHTML = '<p style="padding:24px;color:#909399;text-align:center">暂无数据</p>'
    return null
  }
  const tpl = await createInstructionTemplate()
  const html = tpl.getHtml(buildInstructionPrintData(rows)) as any
  const $wrap = $('<div class="hiprint-printPagination instruction-print-fit"/>')
  if (html) $wrap.append(html)
  $(container).empty().append($wrap)
  requestAnimationFrame(() => {
    fitPreviewToContainer(container)
    requestAnimationFrame(() => fitPreviewToContainer(container))
  })
  return tpl
}
