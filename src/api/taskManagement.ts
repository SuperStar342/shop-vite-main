import request from '/@/utils/request'
import { adaptPage, toBladePage } from '/@/utils/bladeAdapter'

export async function getList(params?: any) {
  const res: any = await request({
    url: '/api/blade-shop/task/list',
    method: 'get',
    params: toBladePage(params),
  })
  return adaptPage(res)
}
