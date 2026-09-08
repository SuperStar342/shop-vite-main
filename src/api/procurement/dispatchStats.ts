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

export type DispatchStatsFilterOptions = {
  workshops: string[]
  groups: string[]
  processes: string[]
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
  empAll?: DispatchStatsEmpRank[]
  prcAll?: DispatchStatsPrcRank[]
  unreportedAll?: DispatchStatsUnreported[]
  filterOptions?: DispatchStatsFilterOptions
  refreshedAt: string
  formulaHint: string
}

/** 拉取统计面板数据（ERP SF 聚合） */
export async function getDispatchStats(params?: DispatchStatsQuery): Promise<DispatchStatsPayload> {
  const res: any = await request({
    url: '/api/blade-system/dispatch-stats/overview',
    method: 'get',
    params,
  })
  return unwrap(res) as DispatchStatsPayload
}
