import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 参数管理 → BladeX /blade-system/param
 * 对齐 Saber3：list / detail / submit / remove
 */

const mapParamRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  paramName: row?.paramName || '',
  paramKey: row?.paramKey || '',
  paramValue: row?.paramValue ?? '',
  remark: row?.remark || '',
})

/** 分页列表（BladeX 接口名为 /list，带 current/size） */
export async function getList(params?: any) {
  const pageParams = toBladePage(params)
  const res: any = await request({
    url: '/api/blade-system/param/list',
    method: 'get',
    params: {
      current: pageParams.current,
      size: pageParams.size,
      // 最新在前，新增后第一页能立刻看到
      descs: 'id',
      paramName: params?.paramName || undefined,
      paramKey: params?.paramKey || undefined,
      paramValue: params?.paramValue || undefined,
    },
  })
  return adaptPage(res, mapParamRow)
}

export async function getParamDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/param/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapParamRow(data) : {}
}

/** 新增/修改统一走 /submit */
export async function doEdit(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    paramName: data.paramName,
    paramKey: data.paramKey,
    paramValue: data.paramValue,
    remark: data.remark ?? '',
  }

  if (!payload.paramName) throw new Error('参数名不能为空')
  if (!payload.paramKey) throw new Error('参数键不能为空')
  // 编辑时若未改脱敏值，调用方可省略 paramValue；此处仅删空 id
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k]
  })

  const res: any = await request({
    url: '/api/blade-system/param/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少参数ID')
  }
  const res: any = await request({
    url: '/api/blade-system/param/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}
