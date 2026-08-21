import { adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/** 工单管理 → /api/blade-system/work-order */

export async function getWoList(params?: any) {
  const res: any = await request({
    url: '/api/blade-system/work-order/list',
    method: 'get',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 100,
      woNo: params?.woNo || undefined,
      moNo: params?.moNo || undefined,
      ifOpen: params?.ifOpen || undefined,
      cFlag: params?.cFlag || undefined,
      ifClose: params?.ifClose || undefined,
      ifCancel: params?.ifCancel || undefined,
    },
  })
  return adaptPage(res)
}

export async function getWoItems(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/items',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoItemsByGoods(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/items-by-goods',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoPickItems(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/pick-items',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoPickItemsByGoods(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/pick-items-by-goods',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoBorItems(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/bor-items',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoCutItems(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/cut-items',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWoWcsItems(woNo: string) {
  const res: any = await request({
    url: '/api/blade-system/work-order/wcs-items',
    method: 'get',
    params: { woNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}
