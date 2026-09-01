/**
 * 非生产派工 · 单价设置（SF SQL Server：t_PLSD_OtherPiecePrice）
 * → /api/blade-system/non-prod/unit-price
 */
import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

export type PieceType = '个人计件' | '班组计件' | '不计件'
export type YesNo = '是' | '否'

export interface UnitPriceRow {
  id: string
  dispatchTypeCode: string
  dispatchTypeName: string
  pieceType: PieceType | string
  controlAttr: string
  docName: string
  goodsCode: string
  goodsName: string
  stdAttr: string
  unitName: string
  ratioQty: number
  piecePrice: number
  remark: string
  unitCode: string
  resourceFixedCode: string
  allowEditPrice: YesNo | string
  createDate: string
  creator: string
  creatorCode: string
  modifyDate: string
  modifier: string
  modifierCode: string
}

export interface UnitPriceQuery {
  keyword?: string
  dispatchTypeCode?: string
  pieceType?: string
  allowEditPrice?: string
  pageNo?: number
  pageSize?: number
}

const BASE = '/api/blade-system/non-prod/unit-price'

const mapRow = (row: any): UnitPriceRow => ({
  id: row?.id != null ? String(row.id) : '',
  dispatchTypeCode: row?.dispatchTypeCode || '',
  dispatchTypeName: row?.dispatchTypeName || '',
  pieceType: row?.pieceType || '',
  controlAttr: row?.controlAttr || '',
  docName: row?.docName || '',
  goodsCode: row?.goodsCode || '',
  goodsName: row?.goodsName || '',
  stdAttr: row?.stdAttr || '',
  unitName: row?.unitName || '',
  ratioQty: Number(row?.ratioQty) || 0,
  piecePrice: Number(row?.piecePrice) || 0,
  remark: row?.remark || '',
  unitCode: row?.unitCode || '',
  resourceFixedCode: row?.resourceFixedCode || '',
  allowEditPrice: row?.allowEditPrice || '否',
  createDate: row?.createDate || '',
  creator: row?.creator || '',
  creatorCode: row?.creatorCode || '',
  modifyDate: row?.modifyDate || '',
  modifier: row?.modifier || '',
  modifierCode: row?.modifierCode || '',
})

export async function getUnitPriceList(params?: UnitPriceQuery) {
  const page = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: page.current,
      size: page.size || 50,
      keyword: params?.keyword || undefined,
      dispatchTypeCode: params?.dispatchTypeCode || undefined,
      pieceType: params?.pieceType || undefined,
      allowEditPrice: params?.allowEditPrice || undefined,
    },
  })
  return adaptPage(res, mapRow)
}

export async function getUnitPriceTypeStats() {
  const res: any = await request({
    url: `${BASE}/type-stats`,
    method: 'get',
  })
  const data = unwrap(res)
  const list = Array.isArray(data) ? data : []
  return {
    data: list.map((t: any) => ({
      code: String(t?.code || ''),
      name: String(t?.name || ''),
      count: Number(t?.count) || 0,
      avgPrice: Number(t?.avgPrice) || 0,
    })),
  }
}

export async function getUnitPriceDetail(id: string | number) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapRow(data) : null
}

export async function updateUnitPrice(
  id: string,
  payload: Partial<Pick<UnitPriceRow, 'piecePrice' | 'remark' | 'allowEditPrice' | 'ratioQty'>> & Record<string, any>
) {
  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: {
      id,
      piecePrice: payload.piecePrice,
      remark: payload.remark,
      allowEditPrice: payload.allowEditPrice,
      ratioQty: payload.ratioQty,
      ...payload,
    },
  })
  return adaptMsg(res, '保存成功')
}

export async function createUnitPrice(
  payload: Omit<
    UnitPriceRow,
    'id' | 'modifyDate' | 'modifier' | 'modifierCode' | 'createDate' | 'creator' | 'creatorCode'
  >
) {
  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: { ...payload, id: undefined },
  })
  return adaptMsg(res, '新增成功')
}

export async function deleteUnitPrice(ids: string[]) {
  const res: any = await request({
    url: `${BASE}/remove`,
    method: 'post',
    params: { ids: ids.join(',') },
  })
  return adaptMsg(res, '删除成功')
}
