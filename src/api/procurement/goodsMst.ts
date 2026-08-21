import { adaptMsg, adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 材料资料管理 → BladeX /blade-system/goods-mst（映射 blade_bomm_goodsmst 表）
 */
const BASE = '/api/blade-system/goods-mst'

const mapRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  goodsCode: row?.goodsCode || '',
  goodsName: row?.goodsName || '',
  goodsType: row?.goodsType || '',
  alias: row?.alias || '',
  stdUnit: row?.stdUnit || '',
  stkUnit: row?.stkUnit || row?.stdUnit || '',
  businessUnit: row?.businessUnit || row?.stdUnit || '',
  brandCode: row?.brandCode || '',
  sortCode: row?.sortCode || '',
  quickQuery: row?.quickQuery || '',
  remark: row?.remark || '',
  sizeDesc: row?.sizeDesc || '',
  costType: row?.costType != null && row?.costType !== '' ? String(row.costType) : '1',
  codeGenMode: row?.codeGenMode != null ? String(row.codeGenMode) : '1',
  nameGenMode: row?.nameGenMode != null ? String(row.nameGenMode) : '1',
  specGenMode: row?.specGenMode != null ? String(row.specGenMode) : '1',
})

/** 分页列表 */
export async function getList(params?: any) {
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 20,
      goodsCode: params?.goodsCode || undefined,
      goodsName: params?.goodsName || undefined,
      sortCode: params?.sortCode || undefined,
      categoryCode: params?.categoryCode || undefined,
      includeChildren: params?.includeChildren === false ? false : true,
      costType: params?.costType || undefined,
      codeGenMode: params?.codeGenMode || undefined,
      nameGenMode: params?.nameGenMode || undefined,
      specGenMode: params?.specGenMode || undefined,
      goodsType: params?.goodsType || undefined,
      brandCode: params?.brandCode || undefined,
      stdUnit: params?.stdUnit || undefined,
    },
  })
  return adaptPage(res, mapRow)
}

/** 材料类别树（左侧筛选） */
export async function getCategoryTree() {
  const res: any = await request({
    url: '/api/blade-system/material-category/tree',
    method: 'get',
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
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

/** 新增/修改 */
export async function doEdit(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    goodsCode: data.goodsCode,
    goodsName: data.goodsName,
    goodsType: data.goodsType || '',
    alias: data.alias || '',
    stdUnit: data.stdUnit || '',
    stkUnit: data.stkUnit || data.stdUnit || '',
    businessUnit: data.businessUnit || data.stdUnit || '',
    brandCode: data.brandCode || '',
    sortCode: data.sortCode || '',
    quickQuery: data.quickQuery || '',
    remark: data.remark || '',
    sizeDesc: data.sizeDesc || '',
    costType: data.costType ?? '1',
    codeGenMode: data.codeGenMode ?? '1',
    nameGenMode: data.nameGenMode ?? '1',
    specGenMode: data.specGenMode ?? '1',
  }

  if (!payload.goodsCode) throw new Error('材料编码不能为空')
  if (!payload.goodsName) throw new Error('材料名称不能为空')

  if (payload.id === undefined) delete payload.id

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

/** 删除（物理删除） */
export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少材料ID')
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

const flattenCategories = (nodes: any[], acc: any[] = []) => {
  for (const n of nodes || []) {
    if (n?.categoryCode) acc.push(n)
    if (Array.isArray(n?.children) && n.children.length) flattenCategories(n.children, acc)
  }
  return acc
}

/**
 * 获取材料类别下拉（扁平列表，用于 sortCode）
 */
export async function getCategoryOptions() {
  try {
    const tree = await getCategoryTree()
    return flattenCategories(tree)
  } catch {
    return []
  }
}
