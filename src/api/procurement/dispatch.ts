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

/**
 * 删除未开工派工单（后端需再次校验完工数等）。
 * wtNos: 单个或逗号分隔多个派工单号
 */
export async function removeWt(wtNos: string | string[]) {
  const list = (Array.isArray(wtNos) ? wtNos : String(wtNos || '').split(',')).map((s) => String(s || '').trim()).filter(Boolean)
  if (!list.length) throw new Error('缺少派工单号')
  const res: any = await request({
    url: '/api/blade-system/dispatch/remove',
    method: 'post',
    params: { wtNos: list.join(',') },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除派工单失败')
  }
  return unwrap(res)
}

const postWtAction = async (path: string, wtNos: string | string[], failMsg: string) => {
  const list = (Array.isArray(wtNos) ? wtNos : String(wtNos || '').split(',')).map((s) => String(s || '').trim()).filter(Boolean)
  if (!list.length) throw new Error('缺少派工单号')
  const res: any = await request({
    url: `/api/blade-system/dispatch/${path}`,
    method: 'post',
    params: { wtNos: list.join(',') },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || failMsg)
  }
  return unwrap(res)
}

/** 审核派工单 */
export function approveWt(wtNos: string | string[]) {
  return postWtAction('approve', wtNos, '审核失败')
}

/** 反审核派工单（需未开工） */
export function unapproveWt(wtNos: string | string[]) {
  return postWtAction('unapprove', wtNos, '反审核失败')
}

/** 结案派工单（仅已审核） */
export function closeWt(wtNos: string | string[]) {
  return postWtAction('close', wtNos, '结案失败')
}
