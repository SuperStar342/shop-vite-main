import { getEnvelope, unwrap } from '/@/utils/bladeAdapter'
import { normalizeBorLines } from '/@/utils/dispatchBor'
import request from '/@/utils/request'

const BASE = '/api/blade-system/quick-dispatch'

const assertOk = (res: any, fallback: string) => {
  const envelope = getEnvelope(res) || {}
  if (envelope?.success === false || (envelope?.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope?.msg || fallback)
  }
  return unwrap(res)
}

export async function getQuickDispatchPreview(params: { moNo?: string; woNo?: string }) {
  const res: any = await request({
    url: `${BASE}/preview`,
    method: 'get',
    params: {
      moNo: params.moNo || undefined,
      woNo: params.woNo || undefined,
    },
  })
  return assertOk(res, '加载可派工单失败') || {}
}

/** 展开工单时懒加载该工单待派工序 */
export async function getQuickDispatchProcesses(params: { woNo: string; moNo?: string }) {
  const res: any = await request({
    url: `${BASE}/processes`,
    method: 'get',
    params: {
      woNo: params.woNo,
      moNo: params.moNo || undefined,
    },
  })
  const data = assertOk(res, '加载工序失败')
  return normalizeBorLines(Array.isArray(data) ? data : [])
}

export async function getQuickDispatchEmployees(params?: { deptId?: number | string; keyword?: string }) {
  const res: any = await request({
    url: `${BASE}/employees`,
    method: 'get',
    params: {
      deptId: params?.deptId || undefined,
      keyword: params?.keyword || undefined,
    },
  })
  const data = assertOk(res, '加载工人失败')
  return Array.isArray(data) ? data : []
}

/** 部门检索建议（代号 / 名称） */
export async function getQuickDispatchDeptSuggest(params?: { keyword?: string }) {
  const res: any = await request({
    url: `${BASE}/dept-suggest`,
    method: 'get',
    params: {
      keyword: params?.keyword || undefined,
    },
  })
  const data = assertOk(res, '加载部门建议失败')
  return Array.isArray(data) ? data : []
}

/** 智能派工推荐：近期工序经验 + 在途负荷 */
export async function getQuickDispatchSmartSuggest(params?: {
  deptId?: number | string
  prcCodes?: string | string[]
  limit?: number
  days?: number
}) {
  const codes = Array.isArray(params?.prcCodes)
    ? params!.prcCodes!.filter(Boolean).join(',')
    : params?.prcCodes || undefined
  const res: any = await request({
    url: `${BASE}/smart-suggest`,
    method: 'get',
    params: {
      deptId: params?.deptId || undefined,
      prcCodes: codes || undefined,
      limit: params?.limit ?? 2,
      days: params?.days ?? 30,
    },
  })
  return assertOk(res, '智能推荐失败') || {}
}

export async function submitQuickDispatch(payload: {
  moNo: string
  woNos: string[]
  processes: { woNo?: string; mrCode: string; prcCode: string; goodsId?: number; woBorSno?: string }[]
  workers: { empNo: string; planQty: number }[]
  items?: {
    woNo: string
    moNo?: string
    mrCode: string
    prcCode: string
    goodsId?: number
    woBorSno?: string
    workers: { empNo: string; planQty: number }[]
  }[]
  remark?: string
}) {
  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: payload,
  })
  return assertOk(res, '生成派工单失败')
}
