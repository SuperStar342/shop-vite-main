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
      ]),
    ])
  }

  return { addElementTypes }
}
