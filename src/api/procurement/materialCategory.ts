import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 物料类别管理 → BladeX /blade-system/material-category
 * 数据表：shop_vite.blade_bomm_goodsmst（fIfCategory=1）
 */
const BASE = '/api/blade-system/material-category'

const mapRow = (row: any): any => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  categoryName: row?.categoryName || '',
  categoryCode: row?.categoryCode || '',
  parentId: row?.parentId != null ? String(row.parentId) : '0',
  parentName: row?.parentName || '',
  sort: row?.sort ?? 0,
  status: row?.status ?? 1,
  remark: row?.remark || '',
  qcMode: row?.qcMode ?? '2',
  daysOfChk: row?.daysOfChk ?? 0,
  daysBefPur: row?.daysBefPur ?? 0,
  leadDays: row?.leadDays ?? 0,
  applyLeadDays: row?.applyLeadDays ?? 0,
  stkCode: row?.stkCode || '',
  mustQc: row?.mustQc || '否',
  edgeWarehouse: row?.edgeWarehouse || '否',
  nameCodeMode: row?.nameCodeMode || '手动',
  nameFormula: row?.nameFormula || '',
  specCodeMode: row?.specCodeMode || '手动',
  specFormula: row?.specFormula || '',
  specDescMode: row?.specDescMode || '手动',
  ifRecalc: row?.ifRecalc ?? 0,
  prodInStk: row?.prodInStk ?? 0,
  sectionCode: row?.sectionCode || '',
  invoiceName: row?.invoiceName || '',
  invoiceUnit: row?.invoiceUnit || '',
  exceedCtrl: row?.exceedCtrl ?? 0,
  costType: row?.costType != null ? String(row.costType) : '1',
  codeGenMode: row?.codeGenMode || '1',
  nameGenMode: row?.nameGenMode || '1',
  specGenMode: row?.specGenMode || '1',
  children: Array.isArray(row?.children) ? row.children.map(mapRow) : undefined,
})

/** 树形列表（默认） */
export async function getList(params?: any) {
  const pageParams = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: pageParams.current,
      size: pageParams.size || 5000,
      categoryName: params?.categoryName || undefined,
      categoryCode: params?.categoryCode || undefined,
      tree: params?.tree === false ? false : true,
    },
  })
  return adaptPage(res, mapRow)
}

/** 详情 */
export async function getDetail(id: string | number) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapRow(data) : {}
}

/** 类别树（下拉） */
export async function getCategoryTree() {
  const res: any = await request({
    url: `${BASE}/tree`,
    method: 'get',
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data.map(mapRow) : []
}

/** 产生编码 */
export async function genCategoryCode(parentId?: string | number) {
  const res: any = await request({
    url: '/api/blade-system/material-category/gen-code',
    method: 'post',
    params: { parentId: parentId || 0 },
  })
  const data = unwrap(res) || {}
  return String(data.categoryCode || '')
}

/** 新增/修改 */
export async function doEdit(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    categoryName: data.categoryName,
    categoryCode: data.categoryCode,
    parentId: data.parentId || 0,
    sort: data.sort ?? 0,
    status: data.status ?? 1,
    remark: data.remark ?? '',
    qcMode: data.qcMode ?? '2',
    daysOfChk: data.daysOfChk ?? 0,
    daysBefPur: data.daysBefPur ?? 0,
    costType: data.costType ?? '1',
    codeGenMode: data.codeGenMode ?? '1',
    nameGenMode: data.nameGenMode ?? '1',
    specGenMode: data.specGenMode ?? '1',
  }

  if (!payload.categoryName) throw new Error('类别名称不能为空')
  if (!payload.categoryCode) throw new Error('类别编码不能为空')

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k]
  })

  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

/** 删除 */
export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少类别ID')
  }
  const res: any = await request({
    url: `${BASE}/remove`,
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}
