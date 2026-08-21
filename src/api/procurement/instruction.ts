import { adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/** 指令管理（制令查询）→ /api/blade-system/instruction */

export async function getMoList(params?: any) {
  const res: any = await request({
    url: '/api/blade-system/instruction/list',
    method: 'get',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 100,
      moNo: params?.moNo || undefined,
      ordNo: params?.ordNo || undefined,
      ifSuspend: params?.ifSuspend || undefined,
      ifOpen: params?.ifOpen || undefined,
      cFlag: params?.cFlag || undefined,
      ifClose: params?.ifClose || undefined,
    },
  })
  return adaptPage(res)
}

/** 生产内容 */
export async function getMoItems(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/items',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

/** 制令分件列表 / 生产内容下方明细 */
export async function getMoDetailItems(moNo: string, ordNo?: string, goodsId?: number | string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/detail-items',
    method: 'get',
    params: {
      moNo,
      ordNo: ordNo || undefined,
      goodsId: goodsId || undefined,
    },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMoBomItems(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/bom-items',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

/** 制令物料清单 / 自制・外协・采购建议；srcType: 0采购 1自制 2托外 */
export async function getMoBomMrItems(moNo: string, srcType?: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/bom-mr-items',
    method: 'get',
    params: { moNo, srcType: srcType || undefined },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

/** 物料 BOM 用量明细（下方） */
export async function getMoBomUsages(moNo: string, goodsId: number | string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/bom-usages',
    method: 'get',
    params: { moNo, goodsId },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMoDailyPlans(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/daily-plans',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMoSchDailyPlans(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/sch-daily-plans',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMoMrPlans(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/mr-plans',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMoPrcDailyPlans(moNo: string) {
  const res: any = await request({
    url: '/api/blade-system/instruction/prc-daily-plans',
    method: 'get',
    params: { moNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}
