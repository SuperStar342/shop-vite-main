import { adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'
import { getWtItems, getWtWorkers } from './dispatch'

/** 报工管理 → /api/blade-system/work-report */

export type ReportTaskStatus = '待报工' | '部分完工' | '已完工'

export type WorkReportTask = {
  id: string
  wtNo: string
  woNo: string
  moNo: string
  goodsCode: string
  goodsName: string
  prcCode: string
  prcName: string
  wsCode: string
  wsName: string
  wtQty: number
  fnQty: number
  pendingQty: number
  progress: number
  status: ReportTaskStatus
  empNo?: string
  empName?: string
  planEndDate?: string
}

export type WorkReportRecord = {
  id: string
  reportNo: string
  wtNo: string
  woNo: string
  moNo: string
  goodsName: string
  prcName: string
  reportQty: number
  passQty: number
  defectQty: number
  reworkQty: number
  reportTime: string
  reporter: string
  defectReason?: string
  remark?: string
  reportMethod?: string
}

export type WorkReportStats = {
  pendingCount: number
  pendingSets: number
  todayReported: number
  todayTrend: number
  todayHours: number
  efficiency: number
  passRate: number
  defectCount: number
}

export type MoProgressStep = {
  code: string
  name: string
  planQty: number
  doneQty: number
  progress: number
  status: 'done' | 'active' | 'pending'
}

export type MoProgress = {
  moNo: string
  goodsName: string
  planQty: number
  doneQty: number
  progress: number
  planEndDate: string
  steps: MoProgressStep[]
}

export type SubmitWorkReportPayload = {
  taskId: string
  reportQty: number
  reportTime: string
  passQty: number
  defectQty: number
  reworkQty: number
  defectReason?: string
  remark?: string
}

/** 派工页上下文报工（不依赖待报任务列表） */
export type DispatchReportPayload = {
  wtNo: string
  woNo?: string
  moNo?: string
  goodsName?: string
  prcCode?: string
  prcName?: string
  empNo?: string
  empName?: string
  pendingQty: number
  reportQty: number
  passQty: number
  defectQty: number
  reworkQty: number
  reportTime: string
  defectReason?: string
  remark?: string
  reportMethod?: string
}

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms))

const mkTask = (row: Partial<WorkReportTask> & Pick<WorkReportTask, 'id' | 'wtNo' | 'woNo' | 'moNo' | 'goodsName' | 'prcName' | 'wtQty' | 'fnQty'>): WorkReportTask => {
  const pendingQty = Math.max(0, row.wtQty - row.fnQty)
  const progress = row.wtQty > 0 ? Math.round((row.fnQty / row.wtQty) * 100) : 0
  const status: ReportTaskStatus = pendingQty <= 0 ? '已完工' : row.fnQty > 0 ? '部分完工' : '待报工'
  return {
    goodsCode: '',
    prcCode: '',
    wsCode: 'WS01',
    wsName: '木工车间',
    empNo: 'E001',
    empName: '张师傅',
    planEndDate: '2024-08-30',
    ...row,
    pendingQty,
    progress,
    status,
  }
}

/** 开发期 mock：后端就绪后由 USE_MOCK 关闭 */
const USE_MOCK = false

let mockTasks: WorkReportTask[] = [
  mkTask({ id: 't1', wtNo: 'WT240826001', woNo: 'WO-2024082601', moNo: 'MO-2408-001', goodsCode: 'SF-3S-001', goodsName: '三人位真皮沙发', prcCode: 'OP20', prcName: 'OP20 框架组装', wtQty: 20, fnQty: 8 }),
  mkTask({ id: 't2', wtNo: 'WT240826002', woNo: 'WO-2024082602', moNo: 'MO-2408-001', goodsCode: 'SF-3S-001', goodsName: '三人位真皮沙发', prcCode: 'OP30', prcName: 'OP30 海绵裁切', wtQty: 20, fnQty: 0, wsName: '海绵车间' }),
  mkTask({ id: 't3', wtNo: 'WT240826003', woNo: 'WO-2024082603', moNo: 'MO-2408-002', goodsCode: 'SF-2S-002', goodsName: '双人位布艺沙发', prcCode: 'OP40', prcName: 'OP40 缝纫', wtQty: 15, fnQty: 10, wsName: '缝纫车间' }),
  mkTask({ id: 't4', wtNo: 'WT240826004', woNo: 'WO-2024082604', moNo: 'MO-2408-002', goodsCode: 'SF-2S-002', goodsName: '双人位布艺沙发', prcCode: 'OP50', prcName: 'OP50 组装', wtQty: 15, fnQty: 0 }),
  mkTask({ id: 't5', wtNo: 'WT240826005', woNo: 'WO-2024082605', moNo: 'MO-2408-003', goodsCode: 'SF-1S-003', goodsName: '单人位功能沙发', prcCode: 'OP20', prcName: 'OP20 框架组装', wtQty: 30, fnQty: 22 }),
  mkTask({ id: 't6', wtNo: 'WT240826006', woNo: 'WO-2024082606', moNo: 'MO-2408-003', goodsCode: 'SF-1S-003', goodsName: '单人位功能沙发', prcCode: 'OP60', prcName: 'OP60 包装', wtQty: 30, fnQty: 5, wsName: '包装车间' }),
  mkTask({ id: 't7', wtNo: 'WT240826007', woNo: 'WO-2024082607', moNo: 'MO-2408-004', goodsCode: 'SF-L-004', goodsName: 'L型转角沙发', prcCode: 'OP30', prcName: 'OP30 海绵裁切', wtQty: 8, fnQty: 0 }),
  mkTask({ id: 't8', wtNo: 'WT240826008', woNo: 'WO-2024082608', moNo: 'MO-2408-004', goodsCode: 'SF-L-004', goodsName: 'L型转角沙发', prcCode: 'OP50', prcName: 'OP50 组装', wtQty: 8, fnQty: 3 }),
]

let mockRecords: WorkReportRecord[] = [
  {
    id: 'r1',
    reportNo: 'RP240826001',
    wtNo: 'WT240826001',
    woNo: 'WO-2024082601',
    moNo: 'MO-2408-001',
    goodsName: '三人位真皮沙发',
    prcName: 'OP20 框架组装',
    reportQty: 5,
    passQty: 5,
    defectQty: 0,
    reworkQty: 0,
    reportTime: '2024-08-26 08:30:00',
    reporter: '张师傅',
  },
]

const mockProgressMap: Record<string, MoProgress> = {
  'MO-2408-001': {
    moNo: 'MO-2408-001',
    goodsName: '三人位真皮沙发',
    planQty: 100,
    doneQty: 65,
    progress: 65,
    planEndDate: '2024-08-30',
    steps: [
      { code: 'OP10', name: '木工组框', planQty: 100, doneQty: 100, progress: 100, status: 'done' },
      { code: 'OP20', name: '海绵加工', planQty: 100, doneQty: 80, progress: 80, status: 'done' },
      { code: 'OP30', name: '裁剪', planQty: 100, doneQty: 65, progress: 65, status: 'active' },
      { code: 'OP40', name: '缝纫', planQty: 100, doneQty: 30, progress: 30, status: 'pending' },
      { code: 'OP50', name: '组装', planQty: 100, doneQty: 10, progress: 10, status: 'pending' },
      { code: 'OP60', name: '包装', planQty: 100, doneQty: 0, progress: 0, status: 'pending' },
    ],
  },
  'MO-2408-002': {
    moNo: 'MO-2408-002',
    goodsName: '双人位布艺沙发',
    planQty: 60,
    doneQty: 42,
    progress: 70,
    planEndDate: '2024-08-28',
    steps: [
      { code: 'OP10', name: '木工组框', planQty: 60, doneQty: 60, progress: 100, status: 'done' },
      { code: 'OP20', name: '海绵加工', planQty: 60, doneQty: 55, progress: 92, status: 'done' },
      { code: 'OP30', name: '裁剪', planQty: 60, doneQty: 50, progress: 83, status: 'done' },
      { code: 'OP40', name: '缝纫', planQty: 60, doneQty: 42, progress: 70, status: 'active' },
      { code: 'OP50', name: '组装', planQty: 60, doneQty: 0, progress: 0, status: 'pending' },
      { code: 'OP60', name: '包装', planQty: 60, doneQty: 0, progress: 0, status: 'pending' },
    ],
  },
}

const calcStats = (tasks: WorkReportTask[]): WorkReportStats => {
  const pending = tasks.filter((t) => t.pendingQty > 0)
  const todayReported = mockRecords
    .filter((r) => r.reportTime.startsWith('2024-08-26'))
    .reduce((s, r) => s + r.reportQty, 0)
  const defectCount = mockRecords.reduce((s, r) => s + r.defectQty, 0)
  const totalReported = mockRecords.reduce((s, r) => s + r.reportQty, 0)
  return {
    pendingCount: pending.length,
    pendingSets: pending.reduce((s, t) => s + t.pendingQty, 0),
    todayReported: todayReported || 56,
    todayTrend: 16.7,
    todayHours: 8.6,
    efficiency: 112,
    passRate: totalReported > 0 ? Math.round(((totalReported - defectCount) / totalReported) * 1000) / 10 : 98.5,
    defectCount,
  }
}

const filterTasks = (tasks: WorkReportTask[], params?: any) => {
  let list = [...tasks]
  const kw = String(params?.keyword || '').trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (t) =>
        t.woNo.toLowerCase().includes(kw) ||
        t.moNo.toLowerCase().includes(kw) ||
        t.goodsName.toLowerCase().includes(kw) ||
        t.prcName.toLowerCase().includes(kw)
    )
  }
  if (params?.wsName) list = list.filter((t) => t.wsName === params.wsName)
  if (params?.prcName) list = list.filter((t) => t.prcName.includes(params.prcName))
  if (params?.status) list = list.filter((t) => t.status === params.status)
  if (params?.scope === 'mine') list = list.filter((t) => t.empNo === 'E001')
  if (params?.onlyPending) list = list.filter((t) => t.pendingQty > 0)
  return list
}

export async function getWorkReportStats(params?: { scope?: string }) {
  if (USE_MOCK) {
    await delay()
    const tasks = filterTasks(mockTasks, { ...params, onlyPending: false })
    return calcStats(tasks)
  }
  const res: any = await request({ url: '/api/blade-system/work-report/stats', method: 'get', params })
  return unwrap(res) as WorkReportStats
}

export async function getPendingReportTasks(params?: any) {
  if (USE_MOCK) {
    await delay()
    const list = filterTasks(mockTasks, { ...params, onlyPending: true })
    return { code: 200, data: { list, total: list.length } }
  }
  const res: any = await request({
    url: '/api/blade-system/work-report/pending',
    method: 'get',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 100,
      keyword: params?.keyword,
      wsName: params?.wsName,
      prcName: params?.prcName,
      status: params?.status,
      scope: params?.scope,
    },
  })
  return adaptPage(res)
}

export async function getReportRecords(params?: any) {
  if (USE_MOCK) {
    await delay()
    let list = [...mockRecords].reverse()
    const kw = String(params?.keyword || '').trim().toLowerCase()
    if (kw) {
      list = list.filter(
        (r) =>
          r.reportNo.toLowerCase().includes(kw) ||
          r.woNo.toLowerCase().includes(kw) ||
          r.goodsName.toLowerCase().includes(kw)
      )
    }
    return { code: 200, data: { list, total: list.length } }
  }
  const res: any = await request({
    url: '/api/blade-system/work-report/records',
    method: 'get',
    params: { current: params?.pageNo || 1, size: params?.pageSize || 100, keyword: params?.keyword },
  })
  return adaptPage(res)
}

export async function getMoProgress(moNo: string) {
  if (USE_MOCK) {
    await delay(120)
    return (
      mockProgressMap[moNo] || {
        moNo,
        goodsName: '—',
        planQty: 0,
        doneQty: 0,
        progress: 0,
        planEndDate: '—',
        steps: [],
      }
    )
  }
  const res: any = await request({ url: '/api/blade-system/work-report/mo-progress', method: 'get', params: { moNo } })
  return unwrap(res) as MoProgress
}

export function validateReportPayload(task: WorkReportTask | null, payload: SubmitWorkReportPayload) {
  if (!task) return '请先选择待报工任务'
  if (payload.reportQty <= 0) return '报工数量须大于 0'
  if (payload.reportQty > task.pendingQty) return `报工数量不能超过待报数量（${task.pendingQty}）`
  const sum = payload.passQty + payload.defectQty + payload.reworkQty
  if (sum !== payload.reportQty) return '合格 + 不良 + 返工 须等于报工数量'
  if (payload.defectQty > 0 && !payload.defectReason?.trim()) return '存在不良品时请填写不良原因'
  return ''
}

export async function submitWorkReport(payload: SubmitWorkReportPayload) {
  if (USE_MOCK) {
    await delay(400)
    const idx = mockTasks.findIndex((t) => t.id === payload.taskId)
    if (idx < 0) throw new Error('任务不存在')
    const task = mockTasks[idx]
    const err = validateReportPayload(task, payload)
    if (err) throw new Error(err)

    const fnQty = task.fnQty + payload.reportQty
    mockTasks[idx] = mkTask({ ...task, fnQty })

    const reportNo = `RP${Date.now().toString().slice(-8)}`
    mockRecords.push({
      id: `r-${Date.now()}`,
      reportNo,
      wtNo: task.wtNo,
      woNo: task.woNo,
      moNo: task.moNo,
      goodsName: task.goodsName,
      prcName: task.prcName,
      reportQty: payload.reportQty,
      passQty: payload.passQty,
      defectQty: payload.defectQty,
      reworkQty: payload.reworkQty,
      reportTime: payload.reportTime,
      reporter: task.empName || '当前用户',
      defectReason: payload.defectReason,
      remark: payload.remark,
    })

    const prog = mockProgressMap[task.moNo]
    if (prog) {
      const step = prog.steps.find((s) => task.prcName.includes(s.name) || task.prcCode === s.code)
      if (step) {
        step.doneQty = Math.min(step.planQty, step.doneQty + payload.passQty)
        step.progress = step.planQty > 0 ? Math.round((step.doneQty / step.planQty) * 100) : 0
        step.status = step.progress >= 100 ? 'done' : 'active'
      }
      prog.doneQty = Math.min(prog.planQty, prog.doneQty + payload.passQty)
      prog.progress = prog.planQty > 0 ? Math.round((prog.doneQty / prog.planQty) * 100) : 0
    }

    return { reportNo, task: mockTasks[idx] }
  }

  const res: any = await request({
    url: '/api/blade-system/work-report/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) throw new Error(res?.msg || '报工失败')
  return unwrap(res)
}

export function validateDispatchReport(payload: DispatchReportPayload) {
  if (!payload.wtNo) return '缺少派工单号'
  if (payload.reportQty <= 0) return '报工数量须大于 0'
  if (payload.reportQty > payload.pendingQty) {
    return `报工数量不能超过待报数量（${payload.pendingQty}）`
  }
  const sum = payload.passQty + payload.defectQty + payload.reworkQty
  if (sum !== payload.reportQty) return '合格 + 不良 + 返工 须等于报工数量'
  if (payload.defectQty > 0 && !payload.defectReason?.trim()) return '存在不良品时请填写不良原因'
  return ''
}

/** 派工页提交报工；mock 时写入本地记录供弹窗查询 */
export type DispatchReportBatchPayload = {
  payloads: DispatchReportPayload[]
}

export type DispatchReportBatchResult = {
  successCount: number
  failCount: number
  reportNos: string[]
  errors?: { empNo?: string; empName?: string; message: string }[]
}

/** 批量报工准备：工序 + 人员 + 单价金额 */
export type BatchReportWorkerRow = {
  empNo: string
  empName: string
  deptName?: string
  planQty: number
  fnQty: number
  pendingQty: number
  reportQty: number
  passQty: number
  defectQty: number
  reworkQty: number
  machiningUp: number
  reportAmt: number
  selected: boolean
}

export type BatchReportItemRow = {
  itemKey: string
  item: Record<string, any>
  woNo: string
  moNo: string
  goodsCode: string
  goodsName: string
  prcCode: string
  prcName: string
  wtQty: number
  fnQty: number
  pendingQty: number
  machiningUp: number
  machiningAmt: number
  reportAmt: number
  pWageType: string
  assignType: string
  workGpName: string
  workers: BatchReportWorkerRow[]
  selected: boolean
  expanded: boolean
}

export type BatchReportPrep = {
  wtNo: string
  wsName?: string
  deptName?: string
  pendingItemCount: number
  totalPendingQty: number
  totalReportAmt: number
  items: BatchReportItemRow[]
}

export async function submitDispatchReport(payload: DispatchReportPayload) {
  const err = validateDispatchReport(payload)
  if (err) throw new Error(err)

  if (USE_MOCK) {
    await delay(320)
    const reportNo = `RP${Date.now().toString().slice(-8)}`
    mockRecords.push({
      id: `r-${Date.now()}`,
      reportNo,
      wtNo: payload.wtNo,
      woNo: payload.woNo || '',
      moNo: payload.moNo || '',
      goodsName: payload.goodsName || '',
      prcName: payload.prcName || '',
      reportQty: payload.reportQty,
      passQty: payload.passQty,
      defectQty: payload.defectQty,
      reworkQty: payload.reworkQty,
      reportTime: payload.reportTime,
      reporter: payload.empName || payload.empNo || '当前用户',
      defectReason: payload.defectReason,
      remark: payload.remark,
      reportMethod: payload.reportMethod || '手工报工',
    } as WorkReportRecord & { reportMethod?: string })
    return { reportNo }
  }

  const res: any = await request({
    url: '/api/blade-system/work-report/submit-dispatch',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) throw new Error(res?.msg || '报工失败')
  return unwrap(res)
}

/** 批量/一键报工：单次请求提交多笔人员报工 */
export async function submitDispatchReportBatch(batch: DispatchReportBatchPayload): Promise<DispatchReportBatchResult> {
  const payloads = batch?.payloads || []
  if (!payloads.length) throw new Error('没有可提交的报工数据')

  for (const payload of payloads) {
    const err = validateDispatchReport(payload)
    if (err) throw new Error(err)
  }

  if (USE_MOCK) {
    await delay(420)
    const reportNos: string[] = []
    const errors: DispatchReportBatchResult['errors'] = []
    for (const payload of payloads) {
      try {
        const reportNo = `RP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`
        mockRecords.push({
          id: `r-${Date.now()}-${reportNos.length}`,
          reportNo,
          wtNo: payload.wtNo,
          woNo: payload.woNo || '',
          moNo: payload.moNo || '',
          goodsName: payload.goodsName || '',
          prcName: payload.prcName || '',
          reportQty: payload.reportQty,
          passQty: payload.passQty,
          defectQty: payload.defectQty,
          reworkQty: payload.reworkQty,
          reportTime: payload.reportTime,
          reporter: payload.empName || payload.empNo || '当前用户',
          defectReason: payload.defectReason,
          remark: payload.remark,
          reportMethod: payload.reportMethod || '一键报工',
        } as WorkReportRecord & { reportMethod?: string })
        reportNos.push(reportNo)
      } catch (e: any) {
        errors.push({
          empNo: payload.empNo,
          empName: payload.empName,
          message: e?.message || '报工失败',
        })
      }
    }
    return {
      successCount: reportNos.length,
      failCount: errors.length,
      reportNos,
      errors: errors.length ? errors : undefined,
    }
  }

  const res: any = await request({
    url: '/api/blade-system/work-report/submit-batch',
    method: 'post',
    data: batch,
  })
  if (res?.success === false) throw new Error(res?.msg || '批量报工失败')
  const data = unwrap(res) as DispatchReportBatchResult
  if (!data || (data.successCount == null && !Array.isArray((data as any).reportNos))) {
    throw new Error('批量报工接口无返回有效结果，请确认已部署 work-report 并重启 blade-system')
  }
  return data
}

export async function getDispatchReportRecords(params: {
  wtNo?: string
  woNo?: string
  prcCode?: string
  prcName?: string
}) {
  if (USE_MOCK) {
    await delay(160)
    let list = [...mockRecords].reverse()
    if (params.wtNo) list = list.filter((r) => r.wtNo === params.wtNo)
    if (params.woNo) list = list.filter((r) => r.woNo === params.woNo)
    if (params.prcName) list = list.filter((r) => r.prcName === params.prcName)
    return { code: 200, data: { list, total: list.length } }
  }
  const res: any = await request({
    url: '/api/blade-system/work-report/records',
    method: 'get',
    params,
  })
  return adaptPage(res)
}

export async function scanReportByCode(code: string) {
  const kw = String(code || '').trim()
  if (!kw) throw new Error('请扫描或输入工单/派工单号')
  if (USE_MOCK) {
    await delay(200)
    const task =
      mockTasks.find((t) => t.woNo === kw || t.wtNo === kw || t.moNo === kw) ||
      mockTasks.find((t) => t.woNo.includes(kw) || t.wtNo.includes(kw))
    if (!task) throw new Error('未找到对应待报工任务')
    return task
  }
  const res: any = await request({ url: '/api/blade-system/work-report/scan', method: 'get', params: { code: kw } })
  return unwrap(res) as WorkReportTask
}

const batchItemKey = (row: any) =>
  `${row.wtNo}-${row.sNo}-${row.woNo}-${row.moNo}-${row.goodsId}-${row.prcCode}`

const batchNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function composeBatchPrepFromDispatch(wtNo: string, wtInfo?: Record<string, any>): Promise<BatchReportPrep> {
  const rawItems = await getWtItems(wtNo)
  const pending = rawItems.filter((item) => batchNum(item.wtQty) - batchNum(item.fnQty) > 0.000001)
  const rows: BatchReportItemRow[] = []

  for (const item of pending) {
    const pendingQty = Math.max(0, batchNum(item.wtQty) - batchNum(item.fnQty))
    const machiningUp = batchNum(item.machiningUp)
    const workersRaw = await getWtWorkers({
      wtNo,
      woNo: item.woNo,
      moNo: item.moNo,
      goodsId: item.goodsId,
      prcCode: item.prcCode,
      woBorSno: item.woBorSno,
    })
    const workers: BatchReportWorkerRow[] = workersRaw
      .map((w) => {
        const wPending = Math.max(0, batchNum(w.planQty) - batchNum(w.fnQty))
        const wUp = batchNum((w as any).machiningUp) || machiningUp
        return {
          empNo: w.empNo || '',
          empName: w.empName || '',
          deptName: w.deptName,
          planQty: batchNum(w.planQty),
          fnQty: batchNum(w.fnQty),
          pendingQty: wPending,
          reportQty: wPending,
          passQty: wPending,
          defectQty: 0,
          reworkQty: 0,
          machiningUp: wUp,
          reportAmt: wPending * wUp,
          selected: wPending > 0,
        }
      })
      .filter((w) => w.pendingQty > 0)

    rows.push({
      itemKey: batchItemKey({ ...item, wtNo }),
      item,
      woNo: item.woNo || '',
      moNo: item.moNo || '',
      goodsCode: item.goodsCode || '',
      goodsName: item.goodsName || '',
      prcCode: item.prcCode || '',
      prcName: item.prcName || '',
      wtQty: batchNum(item.wtQty),
      fnQty: batchNum(item.fnQty),
      pendingQty,
      machiningUp,
      machiningAmt: batchNum(item.machiningAmt),
      reportAmt: pendingQty * machiningUp,
      pWageType: item.pWageType || '',
      assignType: item.assignType || '',
      workGpName: item.workGpName || '',
      workers,
      selected: workers.length > 0,
      expanded: workers.length > 0,
    })
  }

  const active = rows.filter((r) => r.workers.length > 0)
  return {
    wtNo,
    wsName: wtInfo?.wsName,
    deptName: wtInfo?.deptName,
    pendingItemCount: active.length,
    totalPendingQty: active.reduce(
      (s, r) => s + r.workers.filter((w) => w.selected).reduce((ws, w) => ws + w.reportQty, 0),
      0
    ),
    totalReportAmt: active.reduce(
      (s, r) => s + r.workers.filter((w) => w.selected).reduce((ws, w) => ws + w.reportAmt, 0),
      0
    ),
    items: active,
  }
}

/** 批量报工准备：组合 dispatch/items + workers（batch-prep 未上线前不请求，避免报错） */
export async function getBatchReportPrep(wtNo: string, wtInfo?: Record<string, any>): Promise<BatchReportPrep> {
  const no = String(wtNo || '').trim()
  if (!no) throw new Error('请选择派工单')
  return composeBatchPrepFromDispatch(no, wtInfo)
}
