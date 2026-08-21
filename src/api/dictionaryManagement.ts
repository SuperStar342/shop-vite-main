import type { InjectionKey } from 'vue'
import request from '/@/utils/request'
import { adaptList, adaptMsg, adaptPage, unwrap } from '/@/utils/bladeAdapter'

/**
 * 系统字典 → /blade-system/dict
 * 业务字典 → /blade-system/dict-biz
 */

export type DictApiBase = 'dict' | 'dict-biz'

const mapDictRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  parentId: row?.parentId != null ? String(row.parentId) : '0',
  label: row?.dictValue || row?.label || '',
  dictName: row?.dictValue || row?.dictName || '',
  isSealed: Number(row?.isSealed ?? 0),
  status: Number(row?.status ?? 1),
  sort: Number(row?.sort ?? 0),
})

export function createDictApi(base: DictApiBase = 'dict') {
  const prefix = `/api/blade-system/${base}`

  /** 顶级字典分类分页 */
  async function getList(params?: any) {
    const res: any = await request({
      url: `${prefix}/parent-list`,
      method: 'get',
      params: {
        current: params?.pageNo || params?.current || 1,
        size: params?.pageSize || params?.size || 20,
        code: params?.code || undefined,
        dictValue: params?.key || params?.dictValue || params?.dictName || undefined,
      },
    })
    return adaptPage(res, mapDictRow)
  }

  /** 某字典分类下的字典项列表 */
  async function getChildList(params?: any) {
    const res: any = await request({
      url: `${prefix}/child-list`,
      method: 'get',
      params: {
        parentId: params?.parentId,
        code: params?.code || undefined,
        dictValue: params?.dictValue || params?.dictName || undefined,
        current: params?.pageNo || params?.current || 1,
        size: params?.pageSize || params?.size || 20,
      },
    })
    return adaptList(res, mapDictRow)
  }

  /** 字典树 */
  async function getTree(params?: any) {
    const res: any = await request({
      url: `${prefix}/tree`,
      method: 'get',
      params: { code: 'DICT', ...params },
    })
    return adaptList(res)
  }

  /** 字典详情（编辑回显） */
  async function getDetail(id: string | number) {
    const res: any = await request({
      url: `${prefix}/detail`,
      method: 'get',
      params: { id },
    })
    const data = unwrap(res)
    return data ? mapDictRow(data) : {}
  }

  /** 新增/修改（父级分类或子项） */
  async function doEdit(data: any) {
    const isParent = !data?.parentId || String(data.parentId) === '0' || data?.isParent === true
    const payload: Record<string, any> = {
      code: data.code,
      dictValue: data.dictValue || data.dictName || data.label,
      dictKey: isParent ? (data.dictKey ?? '-1') : data.dictKey,
      sort: data.sort ?? 0,
      remark: data.remark || '',
      isSealed: Number(data.isSealed ?? 0),
      status: Number(data.status ?? 1),
      parentId: isParent ? 0 : data.parentId,
    }
    if (data.id) {
      payload.id = data.id
    }
    const res: any = await request({
      url: `${prefix}/submit`,
      method: 'post',
      data: payload,
    })
    return adaptMsg(res, '保存成功')
  }

  async function doDelete(data: any) {
    const res: any = await request({
      url: `${prefix}/remove`,
      method: 'post',
      params: { ids: data?.ids || data?.id },
    })
    return adaptMsg(res, '删除成功')
  }

  return { base, getList, getChildList, getTree, getDetail, doEdit, doDelete }
}

export type DictApi = ReturnType<typeof createDictApi>

export const DICT_API_KEY: InjectionKey<DictApi> = Symbol('dictApi')

/** 系统字典（默认导出兼容） */
export const systemDictApi = createDictApi('dict')
/** 业务字典 */
export const bizDictApi = createDictApi('dict-biz')

export const getList = systemDictApi.getList
export const getChildList = systemDictApi.getChildList
export const getTree = systemDictApi.getTree
export const getDetail = systemDictApi.getDetail
export const doEdit = systemDictApi.doEdit
export const doDelete = systemDictApi.doDelete
