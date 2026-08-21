import request from '/@/utils/request'
import { adaptPage, toBladePage } from '/@/utils/bladeAdapter'

/**
 * 系统日志 → BladeX /blade-log
 */
export async function getList(params?: any) {
  const res: any = await request({
    url: '/api/blade-log/usual/list',
    method: 'get',
    params: toBladePage(params),
  })
  return adaptPage(res, (row) => ({
    ...row,
    datetime: row.createTime,
    message: row.logData || row.message || row.title,
  }))
}
