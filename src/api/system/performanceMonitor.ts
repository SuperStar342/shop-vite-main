import request from '/@/utils/request'
import { adaptPage, toBladePage } from '/@/utils/bladeAdapter'

export async function getPerformanceList(params?: any) {
  const res: any = await request({
    url: '/api/blade-shop/performance/list',
    method: 'get',
    params: toBladePage(params),
  })
  return adaptPage(res)
}

export async function getPerformanceTrend(params?: any) {
  return getPerformanceList(params)
}

export async function getStats(params?: any) {
  return getPerformanceList(params)
}
