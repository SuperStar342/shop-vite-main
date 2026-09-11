export const INSTRUCTION_MODULE = 'instructionModule'

const TABLE_COLUMNS = [
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

export const createInstructionSheetProvider = (hiprint: any) => {
  const addElementTypes = (context: any) => {
    context.removePrintElementTypes(INSTRUCTION_MODULE)
    context.addPrintElementTypes(INSTRUCTION_MODULE, [
      new hiprint.PrintElementTypeGroup('制令字段', [
        {
          tid: 'instructionModule.ordNo',
          title: '订单号',
          type: 'text',
          options: { field: 'ordNo' },
        },
        {
          tid: 'instructionModule.custOrdNo',
          title: '客户订单号',
          type: 'text',
          options: { field: 'custOrdNo' },
        },
        {
          tid: 'instructionModule.custName',
          title: '客户',
          type: 'text',
          options: { field: 'custName' },
        },
        {
          tid: 'instructionModule.styleCode',
          title: '生产款式',
          type: 'text',
          options: { field: 'styleCode' },
        },
        {
          tid: 'instructionModule.goodsName',
          title: '产品名称',
          type: 'text',
          options: { field: 'goodsName' },
        },
        {
          tid: 'instructionModule.fabricCode',
          title: '面料编号',
          type: 'text',
          options: { field: 'fabricCode' },
        },
        {
          tid: 'instructionModule.clrCode',
          title: '颜色',
          type: 'text',
          options: { field: 'clrCode' },
        },
        {
          tid: 'instructionModule.moQty',
          title: '订单数量',
          type: 'text',
          options: { field: 'moQty' },
        },
        {
          tid: 'instructionModule.reqDate',
          title: '要求生产交期',
          type: 'text',
          options: { field: 'reqDate' },
        },
        {
          tid: 'instructionModule.deliveryDate',
          title: '交货日期',
          type: 'text',
          options: { field: 'deliveryDate' },
        },
        {
          tid: 'instructionModule.remark',
          title: '生产备注',
          type: 'text',
          options: { field: 'remark' },
        },
        {
          tid: 'instructionModule.printDate',
          title: '打印日期',
          type: 'text',
          options: { field: 'printDate' },
        },
        {
          tid: 'instructionModule.pageInfo',
          title: '页次',
          type: 'text',
          options: { field: 'pageInfo' },
        },
        {
          tid: 'instructionModule.table',
          title: '明细表格',
          type: 'table',
          options: {
            field: 'table',
            columns: [
              TABLE_COLUMNS.map((c) => ({
                title: c.title,
                field: c.field,
                width: c.width,
                align: 'center',
              })),
            ],
          },
        },
      ]),
    ])
  }

  return { addElementTypes }
}
