import { A4_H, A4_W, ensureJquery } from '../core'

export const INSTRUCTION_REPORT_KEY = 'instruction-sheet'

const MARGIN = 18
const CONTENT_W = A4_W - MARGIN * 2

/** 列宽合计 = CONTENT_W，保证表格铺满纸面内容区 */
const COLS = [
  { title: '订单号', field: 'ordNo', width: 52 },
  { title: '客户订单号', field: 'custOrdNo', width: 58 },
  { title: '客户', field: 'custName', width: 36 },
  { title: '生产款式', field: 'styleCode', width: 68 },
  { title: '产品名称', field: 'goodsName', width: 76 },
  { title: '面料编号', field: 'fabricCode', width: 42 },
  { title: '颜色', field: 'clrCode', width: 34 },
  { title: '订单数量', field: 'moQty', width: 40 },
  { title: '要求生产交期', field: 'reqDate', width: 56 },
  { title: '交货日期', field: 'deliveryDate', width: 48 },
  { title: '生产备注', field: 'remark', width: 49.28 },
]

export async function buildInstructionSheetDefaultTemplate(): Promise<unknown> {
  await ensureJquery()
  const { hiprint } = await import('vue-plugin-hiprint')
  const tpl = new hiprint.PrintTemplate()
  const panel = tpl.addPrintPanel({
    width: 210,
    height: 297,
    paperHeader: 0,
    paperFooter: A4_H - 12,
  })

  panel.addPrintText({
    options: {
      left: MARGIN,
      top: 16,
      width: 56,
      height: 22,
      title: "J'pai",
      fontSize: 16,
      fontWeight: '700',
      color: '#c9a227',
      fontFamily: 'Georgia, Times New Roman, serif',
      textAlign: 'left',
    },
  })
  panel.addPrintText({
    options: {
      left: MARGIN + 56,
      top: 14,
      width: CONTENT_W - 56,
      height: 22,
      title: '海宁卓杰家具有限公司',
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    },
  })
  panel.addPrintText({
    options: {
      left: MARGIN,
      top: 42,
      width: CONTENT_W,
      height: 26,
      title: '生 产 指 令 单',
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    },
  })
  panel.addPrintText({
    options: {
      left: MARGIN,
      top: 74,
      width: 220,
      height: 16,
      title: '打印日期：',
      field: 'printDate',
      fontSize: 11,
      textAlign: 'left',
    },
  })
  panel.addPrintText({
    options: {
      left: A4_W - MARGIN - 120,
      top: 74,
      width: 120,
      height: 16,
      title: '页次：',
      field: 'pageInfo',
      fontSize: 11,
      textAlign: 'right',
    },
  })
  panel.addPrintTable({
    options: {
      left: MARGIN,
      top: 96,
      width: CONTENT_W,
      height: 56,
      field: 'table',
      fontSize: 9,
      lineHeight: 14,
      textAlign: 'center',
      tableHeaderRepeat: 'page',
      tableHeaderRowHeight: 28,
      tableBodyRowHeight: 26,
      tableHeaderBackground: '#ffffff',
      tableHeaderFontWeight: '700',
      tableBorder: 'border',
      borderColor: '#000',
      borderWidth: 0.75,
      columns: [
        COLS.map((c) => ({
          title: c.title,
          field: c.field,
          width: c.width,
          align: 'center',
          halign: 'center',
          vAlign: 'middle',
        })),
      ],
    },
  })

  return tpl.getJson()
}
