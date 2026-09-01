/**
 * 非生产派工 · 类型设置（SF：t_PLSM_OtherPWageSort）
 * → /api/blade-system/non-prod/dispatch-type
 */
import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

export type PieceTypeLabel = '个人计件' | '团体计件' | '不计件'
export type ControlAttrLabel = '无关联' | '只关联单据' | '关联货品' | '关联单据+货品'
export type YesNo = '是' | '否'

export interface DispatchTypeRow {
  id: string
  code: string
  name: string
  quickQuery: string
  pieceTypeCode: string
  pieceType: PieceTypeLabel | string
  controlModeCode: string
  controlAttr: ControlAttrLabel | string
  linkNo: string
  docShortName: string
  linkTableName: string
  linkTableRemark: string
  keyField: string
  noField: string
  goodsField: string
  goodsFieldDesc: string
  unitField: string
  unitFieldDesc: string
  qtyField: string
  qtyFieldDesc: string
  cstlotNoField: string
  goodsUnitPropCode: string
  goodsUnitProp: string
  canRepeat: YesNo | string
  ifQtyLimited: YesNo | string
  ifUse: YesNo | string
  auditFlag: string
  auditStatus: string
  approver: string
  approverId: string
  appDate: string
  creator: string
  creatorCode: string
  createDate: string
  modifier: string
  modifierCode: string
  modifyDate: string
  empList: string
  empListName: string
  attachment: number
  remark?: string
}

export interface DispatchTypeQuery {
  code?: string
  name?: string
  ifUse?: string
  keyword?: string
  pageNo?: number
  pageSize?: number
}

const BASE = '/api/blade-system/non-prod/dispatch-type'

const mapRow = (row: any): DispatchTypeRow => ({
  id: row?.id != null ? String(row.id) : String(row?.code || ''),
  code: row?.code || '',
  name: row?.name || '',
  quickQuery: row?.quickQuery || '',
  pieceTypeCode: row?.pieceTypeCode || '',
  pieceType: row?.pieceType || '',
  controlModeCode: row?.controlModeCode || '',
  controlAttr: row?.controlAttr || '',
  linkNo: row?.linkNo || '',
  docShortName: row?.docShortName || row?.linkNo || '',
  linkTableName: row?.linkTableName || '',
  linkTableRemark: row?.linkTableRemark || row?.linkTableName || '',
  keyField: row?.keyField || '',
  noField: row?.noField || '',
  goodsField: row?.goodsField || '',
  goodsFieldDesc: row?.goodsFieldDesc || '',
  unitField: row?.unitField || '',
  unitFieldDesc: row?.unitFieldDesc || '',
  qtyField: row?.qtyField || '',
  qtyFieldDesc: row?.qtyFieldDesc || '',
  cstlotNoField: row?.cstlotNoField || '',
  goodsUnitPropCode: row?.goodsUnitPropCode || '',
  goodsUnitProp: row?.goodsUnitProp || '',
  canRepeat: row?.canRepeat || '否',
  ifQtyLimited: row?.ifQtyLimited || '否',
  ifUse: row?.ifUse || '是',
  auditFlag: row?.auditFlag || '',
  auditStatus: row?.auditStatus || '',
  approver: row?.approver || '',
  approverId: row?.approverId || '',
  appDate: row?.appDate || '',
  creator: row?.creator || '',
  creatorCode: row?.creatorCode || '',
  createDate: row?.createDate || '',
  modifier: row?.modifier || '',
  modifierCode: row?.modifierCode || '',
  modifyDate: row?.modifyDate || '',
  empList: row?.empList || '',
  empListName: row?.empListName || '',
  attachment: Number(row?.attachment) || 0,
  remark: row?.remark || '',
})

export async function getDispatchTypeList(params?: DispatchTypeQuery) {
  const page = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: page.current,
      size: page.size || 10,
      code: params?.code || undefined,
      name: params?.name || undefined,
      ifUse: params?.ifUse || undefined,
      keyword: params?.keyword || undefined,
    },
  })
  return adaptPage(res, mapRow)
}

export async function getDispatchTypeDetail(code: string) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { code },
  })
  const data = unwrap(res)
  return data ? mapRow(data) : null
}

export async function submitDispatchType(payload: Partial<DispatchTypeRow>) {
  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: payload,
  })
  return adaptMsg(res, '保存成功')
}

export async function deleteDispatchType(ids: string[]) {
  const res: any = await request({
    url: `${BASE}/remove`,
    method: 'post',
    params: { ids: ids.join(',') },
  })
  return adaptMsg(res, '删除成功')
}
