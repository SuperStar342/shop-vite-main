import { adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/** 派工管理 → /api/blade-system/dispatch */

export async function getWtList(params?: any) {
  const res: any = await request({
    url: '/api/blade-system/dispatch/list',
    method: 'get',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 100,
      wtNo: params?.wtNo || undefined,
      moNo: params?.moNo || undefined,
      cFlag: params?.cFlag || undefined,
      ifClose: params?.ifClose || undefined,
      ifCancel: params?.ifCancel || undefined,
      finishFlag: params?.finishFlag || undefined,
    },
  })
  return adaptPage(res)
}

export async function getWtItems(wtNo: string) {
  const res: any = await request({
    url: '/api/blade-system/dispatch/items',
    method: 'get',
    params: { wtNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWtWorkers(params: {
  wtNo: string
  woNo?: string
  moNo?: string
  goodsId?: number | string
  prcCode?: string
  woBorSno?: string
}) {
  const res: any = await request({
    url: '/api/blade-system/dispatch/workers',
    method: 'get',
    params: {
      wtNo: params.wtNo,
      woNo: params.woNo || undefined,
      moNo: params.moNo || undefined,
      goodsId: params.goodsId || undefined,
      prcCode: params.prcCode || undefined,
      woBorSno: params.woBorSno || undefined,
    },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}
