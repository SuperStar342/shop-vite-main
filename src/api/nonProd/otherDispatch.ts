/**
 * 非生产派工 · 派工管理（SF：t_PLSD_OWorkTicket*）
 * → /api/blade-system/non-prod/other-dispatch
 */
import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

export interface OtherDispatchItemRow {
  owtNo: string
  sNo: number
  pwSortCode: string
  pwSortName: string
  receiptCode: string
  receiptName: string
  oriNo: string
  oriSNo: number
  pieceTypeCode: string
  pieceType: string
  assignTypeCode: string
  assignType: string
  unit: string
  planQty: number
  fnQty: number
  prcUp: number
  goodsId: number
  goodsCode: string
  goodsName: string
  cstlotNo: string
  madeDesc: string
  planDate: string
  itemRemark: string
}

export interface OtherDispatchWorkerRow {
  owtNo: string
  sNo: number
  deptId: number
  deptName: string
  empNo: string
  empName: string
  planQty: number
  fnQty: number
  wageQty: number
  workGpCode: string
  workGpName: string
}

export interface OtherDispatchRow {
  owtNo: string
  deptId: number
  deptName: string
  deptCode: string
  owtDate: string
  planDate: string
  fnDate: string
  remark: string
  auditFlag: string
  auditStatus: string
  closeFlag: string
  closeStatus: string
  wageAmt: number
  creator: string
  creatorCode: string
  createDate: string
  modifier: string
  modifyDate: string
  approver: string
  approverCode: string
  appDate: string
  ifCancel: string
  itemCount: number
  totalPlanQty: number
  workerCount: number
  items?: OtherDispatchItemRow[]
  workers?: OtherDispatchWorkerRow[]
}

export interface OtherDispatchQuery {
  keyword?: string
  deptId?: number | ''
  auditStatus?: string
  closeStatus?: string
  dateFrom?: string
  dateTo?: string
  pageNo?: number
  pageSize?: number
}

export interface OtherDispatchStats {
  totalCount: number
  auditedCount: number
  pendingCount: number
  recentCount: number
}

export interface DeptOption {
  deptId: number
  deptCode?: string
  deptName: string
}

export interface DispatchTypeOption {
  code: string
  name: string
  pieceTypeCode: string
  pieceType: string
}

export interface EmpOption {
  empNo: string
  empName: string
  deptId: number
  deptName: string
}

const BASE = '/api/blade-system/non-prod/other-dispatch'

const mapMaster = (row: any): OtherDispatchRow => ({
  owtNo: String(row?.owtNo || '').trim(),
  deptId: Number(row?.deptId) || 0,
  deptName: row?.deptName || '',
  deptCode: row?.deptCode || '',
  owtDate: row?.owtDate || '',
  planDate: row?.planDate || '',
  fnDate: row?.fnDate || '',
  remark: row?.remark || '',
  auditFlag: row?.auditFlag || '',
  auditStatus: row?.auditStatus || '',
  closeFlag: row?.closeFlag || '',
  closeStatus: row?.closeStatus || '',
  wageAmt: Number(row?.wageAmt) || 0,
  creator: row?.creator || '',
  creatorCode: row?.creatorCode || '',
  createDate: row?.createDate || '',
  modifier: row?.modifier || '',
  modifyDate: row?.modifyDate || '',
  approver: row?.approver || '',
  approverCode: row?.approverCode || '',
  appDate: row?.appDate || '',
  ifCancel: row?.ifCancel || '',
  itemCount: Number(row?.itemCount) || 0,
  totalPlanQty: Number(row?.totalPlanQty) || 0,
  workerCount: Number(row?.workerCount) || 0,
})

const pickSNo = (row: any) => Number(row?.sNo ?? row?.SNo ?? row?.fSNo ?? row?.sno) || 0

const mapItem = (row: any): OtherDispatchItemRow => ({
  owtNo: String(row?.owtNo || row?.OWTNo || '').trim(),
  sNo: pickSNo(row),
  pwSortCode: String(row?.pwSortCode || '').trim(),
  pwSortName: row?.pwSortName || '',
  receiptCode: String(row?.receiptCode || '').trim(),
  receiptName: row?.receiptName || '',
  oriNo: row?.oriNo || '',
  oriSNo: Number(row?.oriSNo) || 0,
  pieceTypeCode: String(row?.pieceTypeCode || '').trim(),
  pieceType: row?.pieceType || '',
  assignTypeCode: String(row?.assignTypeCode || '').trim(),
  assignType: row?.assignType || '',
  unit: String(row?.unit || '').trim(),
  planQty: Number(row?.planQty) || 0,
  fnQty: Number(row?.fnQty) || 0,
  prcUp: Number(row?.prcUp) || 0,
  goodsId: Number(row?.goodsId) || 0,
  goodsCode: row?.goodsCode || '',
  goodsName: row?.goodsName || '',
  cstlotNo: row?.cstlotNo || '',
  madeDesc: row?.madeDesc || '',
  planDate: row?.planDate || '',
  itemRemark: row?.itemRemark || '',
})

const mapWorker = (row: any): OtherDispatchWorkerRow => ({
  owtNo: String(row?.owtNo || row?.OWTNo || '').trim(),
  sNo: pickSNo(row),
  deptId: Number(row?.deptId) || 0,
  deptName: row?.deptName || '',
  empNo: String(row?.empNo || '').trim(),
  empName: row?.empName || '',
  planQty: Number(row?.planQty) || 0,
  fnQty: Number(row?.fnQty) || 0,
  wageQty: Number(row?.wageQty) || 0,
  workGpCode: String(row?.workGpCode || '').trim(),
  workGpName: row?.workGpName || '',
})

export async function getOtherDispatchList(params?: OtherDispatchQuery) {
  const page = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: page.current,
      size: page.size || 20,
      keyword: params?.keyword || undefined,
      deptId: params?.deptId || undefined,
      auditStatus: params?.auditStatus || undefined,
      closeStatus: params?.closeStatus || undefined,
      dateFrom: params?.dateFrom || undefined,
      dateTo: params?.dateTo || undefined,
    },
  })
  return adaptPage(res, mapMaster)
}

export async function getOtherDispatchDetail(owtNo: string) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { owtNo: String(owtNo || '').trim() },
  })
  const data = unwrap(res)
  if (!data) return null
  const master = mapMaster(data)
  const rawItems = data.items || data.itemList || []
  const rawWorkers = data.workers || data.workerList || []
  master.items = (Array.isArray(rawItems) ? rawItems : []).map(mapItem)
  master.workers = (Array.isArray(rawWorkers) ? rawWorkers : []).map(mapWorker)
  return master
}

export async function getOtherDispatchStats(dateFrom?: string, dateTo?: string) {
  const res: any = await request({
    url: `${BASE}/stats`,
    method: 'get',
    params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
  })
  const data = unwrap(res) || {}
  return {
    totalCount: Number(data.totalCount) || 0,
    auditedCount: Number(data.auditedCount) || 0,
    pendingCount: Number(data.pendingCount) || 0,
    recentCount: Number(data.recentCount) || 0,
  } as OtherDispatchStats
}

export async function getOtherDispatchDeptOptions() {
  const res: any = await request({ url: `${BASE}/dept-options`, method: 'get' })
  const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
  return arr.map((row: any) => ({
    deptId: Number(row.deptId) || 0,
    deptCode: row.deptCode || '',
    deptName: row.deptName || '',
  })) as DeptOption[]
}

export async function getOtherDispatchActiveDepts() {
  const res: any = await request({ url: `${BASE}/active-depts`, method: 'get' })
  const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
  return arr.map((row: any) => ({
    deptId: Number(row.deptId) || 0,
    deptCode: row.deptCode || '',
    deptName: row.deptName || '',
  })) as DeptOption[]
}

export async function getNextOwtNo(deptId: number, owtDate: string) {
  const res: any = await request({
    url: `${BASE}/next-owt-no`,
    method: 'get',
    params: { deptId, owtDate },
  })
  return String(unwrap(res) || '')
}

export async function getOtherDispatchTypeOptions() {
  const res: any = await request({ url: `${BASE}/dispatch-type-options`, method: 'get' })
  const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
  return arr.map((row: any) => ({
    code: row.code || '',
    name: row.name || '',
    pieceTypeCode: row.pieceTypeCode || '2',
    pieceType: row.pieceType || '',
  })) as DispatchTypeOption[]
}

export async function getOtherDispatchEmployees(deptId?: number, keyword?: string) {
  const res: any = await request({
    url: `${BASE}/employees`,
    method: 'get',
    params: { deptId: deptId || undefined, keyword: keyword || undefined },
  })
  const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
  return arr.map((row: any) => ({
    empNo: row.empNo || '',
    empName: row.empName || '',
    deptId: Number(row.deptId) || 0,
    deptName: row.deptName || '',
  })) as EmpOption[]
}

export async function submitOtherDispatch(payload: Partial<OtherDispatchRow>) {
  const res: any = await request({ url: `${BASE}/submit`, method: 'post', data: payload })
  const envelope = res?.data != null && (res.config != null || res.status != null) ? res.data : res
  const owtNo = unwrap(res)
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || '保存成功',
    data: owtNo != null ? String(owtNo) : '',
  }
}

export async function updateOtherDispatch(payload: Partial<OtherDispatchRow>) {
  const res: any = await request({ url: `${BASE}/update`, method: 'post', data: payload })
  const envelope = res?.data != null && (res.config != null || res.status != null) ? res.data : res
  const owtNo = unwrap(res)
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || '保存成功',
    data: owtNo != null ? String(owtNo) : '',
  }
}

export async function removeOtherDispatch(owtNo: string) {
  const res: any = await request({
    url: `${BASE}/remove`,
    method: 'post',
    params: { owtNo },
  })
  return adaptMsg(res, '删除成功')
}

export async function auditOtherDispatch(owtNo: string, approve = true) {
  const res: any = await request({
    url: `${BASE}/audit`,
    method: 'post',
    params: { owtNo, approve },
  })
  return adaptMsg(res, approve ? '审核成功' : '反审核成功')
}
