export const COMMON_MODULE = 'commonModule'

export const createCommonProvider = (hiprint: any) => {
  const addElementTypes = (context: any) => {
    context.removePrintElementTypes(COMMON_MODULE)
    context.addPrintElementTypes(COMMON_MODULE, [
      new hiprint.PrintElementTypeGroup('常规', [
        {
          tid: 'commonModule.text',
          title: '文本',
          type: 'text',
        },
        {
          tid: 'commonModule.longText',
          title: '长文',
          type: 'longText',
        },
        {
          tid: 'commonModule.table',
          title: '表格',
          type: 'table',
          field: 'table',
          // hiprint 要求 columns 在顶层，放 options 内会导致拖拽 createPrintElement 失败
          columns: [
            [
              { title: '列1', field: 'col1', width: 100 },
              { title: '列2', field: 'col2', width: 100 },
              { title: '列3', field: 'col3', width: 100 },
            ],
          ],
        },
      ]),
      new hiprint.PrintElementTypeGroup('辅助', [
        {
          tid: 'commonModule.hline',
          title: '横线',
          type: 'hline',
        },
        {
          tid: 'commonModule.vline',
          title: '竖线',
          type: 'vline',
        },
        {
          tid: 'commonModule.rect',
          title: '矩形',
          type: 'rect',
        },
        {
          tid: 'commonModule.barcode',
          title: '条形码',
          type: 'barcode',
          options: {
            testData: 'JP20260912001',
            height: 40,
            width: 160,
          },
        },
        {
          tid: 'commonModule.qrcode',
          title: '二维码',
          type: 'qrcode',
          options: {
            testData: 'https://jpai.local/demo',
            height: 72,
            width: 72,
          },
        },
      ]),
    ])
  }

  return { addElementTypes }
}
