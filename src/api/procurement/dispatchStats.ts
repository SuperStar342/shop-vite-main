import { unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/** 人员派工报工统计 → /api/blade-system/dispatch-stats */

export type DispatchStatsQuery = {
  startDate?: string
  endDate?: string
  wsName?: string
  workGpName?: string
  empKeyword?: string
  prcName?: string
}

export type DispatchStatsKpi = {
  key: string
  label: string
  value: string
  trend: number
  trendLabel: string
  /** down 为利好时（如未报工时下降） */
  trendPositiveWhenDown?: boolean
}

export type DispatchStatsTrendPoint = {
  date: string
  dispatchHours: number
  reportHours: number
  rate: number
}

export type DispatchStatsProcessSlice = {
  name: string
  hours: number
  percent: number
}

export type DispatchStatsWagePoint = {
  date: string
  wage: number
}

export type DispatchStatsEmpRank = {
  rank: number
  empName: string
  dispatchHours: number
  reportHours: number
  rate: number
  wage: number
}

export type DispatchStatsPrcRank = {
  rank: number
  prcName: string
  reportHours: number
  rate: number
}

export type DispatchStatsUnreported = {
  woNo: string
  prcName: string
  empName: string
  unreportedHours: number
  unreportedWage: number
}

export type DispatchStatsPayload = {
  kpis: DispatchStatsKpi[]
  trend: DispatchStatsTrendPoint[]
  processDist: DispatchStatsProcessSlice[]
  processTotalHours: number
  wageTrend: DispatchStatsWagePoint[]
  empTop: DispatchStatsEmpRank[]
  prcTop: DispatchStatsPrcRank[]
  unreportedTop: DispatchStatsUnreported[]
  refreshedAt: string
  formulaHint: string
}

const USE_MOCK = true
const delay = (ms = 320) => new Promise((r) => setTimeout(r, ms))

const mockPayload = (): DispatchStatsPayload => ({
  kpis: [
    { key: 'workers', label: '派工人数', value: '128 人', trend: 12.5, trendLabel: '较上周' },
    { key: 'dispatchH', label: '派工工时', value: '2,568 h', trend: 8.3, trendLabel: '较上周' },
    { key: 'reportH', label: '报工工时', value: '2,152 h', trend: 10.2, trendLabel: '较上周' },
    { key: 'rate', label: '报工完成率', value: '83.7%', trend: 6.1, trendLabel: '较上周' },
    { key: 'wage', label: '计件工资合计', value: '¥86,520', trend: 7.8, trendLabel: '较上周' },
    {
      key: 'pendingH',
      label: '未报工时',
      value: '416 h',
      trend: -3.2,
      trendLabel: '较上周',
      trendPositiveWhenDown: true,
    },
  ],
  trend: [
    { date: '05-20', dispatchHours: 320, reportHours: 260, rate: 81.3 },
    { date: '05-21', dispatchHours: 380, reportHours: 310, rate: 81.6 },
    { date: '05-22', dispatchHours: 350, reportHours: 290, rate: 82.9 },
    { date: '05-23', dispatchHours: 420, reportHours: 380, rate: 90.5 },
    { date: '05-24', dispatchHours: 390, reportHours: 320, rate: 82.1 },
    { date: '05-25', dispatchHours: 360, reportHours: 300, rate: 83.3 },
    { date: '05-26', dispatchHours: 348, reportHours: 292, rate: 83.9 },
  ],
  processDist: [
    { name: '缝纫', hours: 766, percent: 35.6 },
    { name: '裁剪', hours: 609, percent: 28.3 },
    { name: '组装', hours: 433, percent: 20.1 },
    { name: '包装', hours: 219, percent: 10.2 },
    { name: '检验', hours: 125, percent: 5.8 },
  ],
  processTotalHours: 2152,
  wageTrend: [
    { date: '05-20', wage: 9800 },
    { date: '05-21', wage: 11200 },
    { date: '05-22', wage: 10500 },
    { date: '05-23', wage: 18620 },
    { date: '05-24', wage: 12800 },
    { date: '05-25', wage: 12100 },
    { date: '05-26', wage: 11500 },
  ],
  empTop: [
    { rank: 1, empName: '张伟', dispatchHours: 56, reportHours: 54, rate: 96.4, wage: 4320 },
    { rank: 2, empName: '李娜', dispatchHours: 52, reportHours: 50, rate: 96.2, wage: 4000 },
    { rank: 3, empName: '王强', dispatchHours: 48, reportHours: 45, rate: 93.8, wage: 3600 },
    { rank: 4, empName: '赵敏', dispatchHours: 46, reportHours: 42, rate: 91.3, wage: 3360 },
    { rank: 5, empName: '陈杰', dispatchHours: 44, reportHours: 40, rate: 90.9, wage: 3200 },
  ],
  prcTop: [
    { rank: 1, prcName: '缝纫', reportHours: 766, rate: 92.1 },
    { rank: 2, prcName: '裁剪', reportHours: 609, rate: 88.4 },
    { rank: 3, prcName: '组装', reportHours: 433, rate: 85.6 },
    { rank: 4, prcName: '包装', reportHours: 219, rate: 81.2 },
    { rank: 5, prcName: '检验', reportHours: 125, rate: 78.5 },
  ],
  unreportedTop: [
    { woNo: 'WO20250526001', prcName: '缝纫', empName: '刘洋', unreportedHours: 8, unreportedWage: 640 },
    { woNo: 'WO20250526015', prcName: '裁剪', empName: '周婷', unreportedHours: 6.5, unreportedWage: 520 },
    { woNo: 'WO20250525088', prcName: '组装', empName: '吴磊', unreportedHours: 5, unreportedWage: 400 },
    { woNo: 'WO20250525102', prcName: '包装', empName: '郑浩', unreportedHours: 4.5, unreportedWage: 360 },
    { woNo: 'WO20250524067', prcName: '检验', empName: '孙悦', unreportedHours: 4, unreportedWage: 320 },
  ],
  refreshedAt: '2025-05-26 23:59:59',
  formulaHint: '完成率 = 报工工时 ÷ 派工工时；未报工时 = 派工工时 − 报工工时；计件工资按工序单价 × 报工量汇总',
})

/** 拉取统计面板数据（当前 Mock；后端就绪后关闭 USE_MOCK） */
export async function getDispatchStats(params?: DispatchStatsQuery): Promise<DispatchStatsPayload> {
  if (USE_MOCK) {
    await delay()
    const data = mockPayload()
    // 轻微筛选有响应：按工序名过滤分布/排行（演示口径）
    const prc = String(params?.prcName || '').trim()
    if (prc && prc !== '全部') {
      data.processDist = data.processDist.filter((p) => p.name.includes(prc))
      data.prcTop = data.prcTop.filter((p) => p.prcName.includes(prc))
      data.unreportedTop = data.unreportedTop.filter((p) => p.prcName.includes(prc))
    }
    const emp = String(params?.empKeyword || '').trim()
    if (emp) {
      data.empTop = data.empTop.filter((p) => p.empName.includes(emp))
      data.unreportedTop = data.unreportedTop.filter((p) => p.empName.includes(emp))
    }
    return data
  }
  const res: any = await request({
    url: '/api/blade-system/dispatch-stats/overview',
    method: 'get',
    params,
  })
  return unwrap(res) as DispatchStatsPayload
}
