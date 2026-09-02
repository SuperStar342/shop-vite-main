/**
 * 非生产派工 · 完工申报管理（SF：t_PLSD_OWTFinish*）
 * → /api/blade-system/non-prod/completion-declaration
 */
import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

export interface CompletionItemRow {
  fnNo: string
  owtNo: string
  sNo: number
  owtFnSNo: number
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
  fnQty: number
  planQty: number
  prcUp: number
  ifRedivide: string
  goodsId: number
  goodsCode: string
  goodsName: string
  cstlotNo: string
  madeDesc: string
  planDate: string
  itemRemark: string
  workAttr: string
  createDate: string
}

export interface CompletionWorkerRow {
  fnNo: string
  owtNo: string
  sNo: number
  owtFnSNo: number
  deptId: number
  deptName: string
  empNo: string
  empName: string
  planQty: number
  remainQty: number
  fnQty: number
  wagePeriod: string
  ifWage: string
  wageQty: number
  allotmentRate: number
  upRate: number
  workTime: number
  wageAmt: number
  workGpCode: string
  workGpName: string
  createDate: string
}

export interface CompletionRow {
  fnNo: string
  deptId: number
  deptName: string
  fnDate: string
  remark: string
  auditFlag: string
  auditStatus: string
  workReceipt: string
  workerName: string
  workerCode: string
  creator: string
  creatorCode: string
  createDate: string
  modifier: string
  modifierCode: string
  modifyDate: string
  approver: string
  approverCode: string
  appDate: string
  accountantFlag: string
  accountantStatus: string
  accountant: string
  accountantCode: string
  accountantDate: string
  ifCancel: string
  itemCount: number
  totalFnQty: number
  workerCount: number
  totalWageAmt?: number
  totalWorkTime?: number
  items?: CompletionItemRow[]
  workers?: CompletionWorkerRow[]
}

export interface CompletionQuery {
  keyword?: string
  deptId?: number | ''
  auditStatus?: string
  dateFrom?: string
  dateTo?: string
  pageNo?: number
  pageSize?: number
}

export interface CompletionStats {
  totalCount: number
  auditedCount: number
  pendingCount: number
  recentCount: number
}

export interface DeptOption {
  deptId: number
  deptName: string
}

const BASE = '/api/blade-system/non-prod/completion-declaration'

const mapMaster = (row: any): CompletionRow => ({
  fnNo: row?.fnNo || '',
  deptId: Number(row?.deptId) || 0,
  deptName: row?.deptName || '',
  fnDate: row?.fnDate || '',
  remark: row?.remark || '',
  auditFlag: row?.auditFlag || '',
  auditStatus: row?.auditStatus || '',
  workReceipt: row?.workReceipt || '',
  workerName: row?.workerName || '',
  workerCode: row?.workerCode || '',
  creator: row?.creator || '',
  creatorCode: row?.creatorCode || '',
  createDate: row?.createDate || '',
  modifier: row?.modifier || '',
  modifierCode: row?.modifierCode || '',
  modifyDate: row?.modifyDate || '',
  approver: row?.approver || '',
  approverCode: row?.approverCode || '',
  appDate: row?.appDate || '',
  accountantFlag: row?.accountantFlag || '',
  accountantStatus: row?.accountantStatus || '否',
  accountant: row?.accountant || '',
  accountantCode: row?.accountantCode || '',
  accountantDate: row?.accountantDate || '',
  ifCancel: row?.ifCancel || '',
  itemCount: Number(row?.itemCount) || 0,
  totalFnQty: Number(row?.totalFnQty) || 0,
  workerCount: Number(row?.workerCount) || 0,
  totalWageAmt: Number(row?.totalWageAmt) || 0,
  totalWorkTime: Number(row?.totalWorkTime) || 0,
})

const mapItem = (row: any): CompletionItemRow => ({
  fnNo: row?.fnNo || '',
  owtNo: row?.owtNo || '',
  sNo: Number(row?.sNo) || 0,
  owtFnSNo: Number(row?.owtFnSNo) || 0,
  pwSortCode: row?.pwSortCode || '',
  pwSortName: row?.pwSortName || '',
  receiptCode: row?.receiptCode || '',
  receiptName: row?.receiptName || '',
  oriNo: row?.oriNo || '',
  oriSNo: Number(row?.oriSNo) || 0,
  pieceTypeCode: row?.pieceTypeCode || '',
  pieceType: row?.pieceType || '',
  assignTypeCode: row?.assignTypeCode || '',
  assignType: row?.assignType || '',
  unit: row?.unit || '',
  fnQty: Number(row?.fnQty) || 0,
  planQty: Number(row?.planQty) || 0,
  prcUp: Number(row?.prcUp) || 0,
  ifRedivide: row?.ifRedivide || '否',
  goodsId: Number(row?.goodsId) || 0,
  goodsCode: row?.goodsCode || '',
  goodsName: row?.goodsName || '',
  cstlotNo: row?.cstlotNo || '',
  madeDesc: row?.madeDesc || '',
  planDate: row?.planDate || '',
  itemRemark: row?.itemRemark || '',
  workAttr: row?.workAttr || '',
  createDate: row?.createDate || '',
})

const mapWorker = (row: any): CompletionWorkerRow => ({
  fnNo: row?.fnNo || '',
  owtNo: row?.owtNo || '',
  sNo: Number(row?.sNo) || 0,
  owtFnSNo: Number(row?.owtFnSNo) || 0,
  deptId: Number(row?.deptId) || 0,
  deptName: row?.deptName || '',
  empNo: row?.empNo || '',
  empName: row?.empName || '',
  planQty: Number(row?.planQty) || 0,
  remainQty: Number(row?.remainQty) || 0,
  fnQty: Number(row?.fnQty) || 0,
  wagePeriod: row?.wagePeriod || '',
  ifWage: row?.ifWage || '',
  wageQty: Number(row?.wageQty) || 0,
  allotmentRate: Number(row?.allotmentRate) || 0,
  upRate: Number(row?.upRate) || 0,
  workTime: Number(row?.workTime) || 0,
  wageAmt: Number(row?.wageAmt) || 0,
  workGpCode: row?.workGpCode || '',
  workGpName: row?.workGpName || '',
  createDate: row?.createDate || '',
})

export async function getCompletionList(params?: CompletionQuery) {
  const page = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: page.current,
      size: page.size || 10,
      keyword: params?.keyword || undefined,
      deptId: params?.deptId || undefined,
      auditStatus: params?.auditStatus || undefined,
      dateFrom: params?.dateFrom || undefined,
      dateTo: params?.dateTo || undefined,
    },
  })
  return adaptPage(res, mapMaster)
}

export async function getCompletionDetail(fnNo: string) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { fnNo },
  })
  const data = unwrap(res)
  if (!data) return null
  const master = mapMaster(data)
  master.items = (data.items || []).map(mapItem)
  master.workers = (data.workers || []).map(mapWorker)
  return master
}

export async function getCompletionStats(dateFrom?: string, dateTo?: string) {
  const res: any = await request({
    url: `${BASE}/stats`,
    method: 'get',
    params: {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
  })
  const data = unwrap(res) || {}
  return {
    totalCount: Number(data.totalCount) || 0,
    auditedCount: Number(data.auditedCount) || 0,
    pendingCount: Number(data.pendingCount) || 0,
    recentCount: Number(data.recentCount) || 0,
  } as CompletionStats
}

export async function getCompletionDeptOptions() {
  const res: any = await request({
    url: `${BASE}/dept-options`,
    method: 'get',
  })
  const data = unwrap(res)
  const arr = Array.isArray(data) ? data : []
  return arr.map((row: any) => ({
    deptId: Number(row.deptId) || 0,
    deptName: row.deptName || '',
  })) as DeptOption[]
}

export async function auditCompletion(fnNo: string, approve = true) {
  const res: any = await request({
    url: `${BASE}/audit`,
    method: 'post',
    params: { fnNo, approve },
  })
  return adaptMsg(res, approve ? '审核成功' : '反审核成功')
}

export async function updateCompletionRemark(fnNo: string, remark: string) {
  const res: any = await request({
    url: `${BASE}/update-remark`,
    method: 'post',
    params: { fnNo, remark },
  })
  return adaptMsg(res, '保存成功')
}
