import type { MockMethod } from 'vite-plugin-mock'
import { REMIX_ICONS } from '../../src/data/remixIcons'

export default [
  {
    url: '/icon/getList',
    method: 'get',
    response({ query }: any) {
      const { title, pageNo = 1, pageSize = 72 } = query
      const mockList = REMIX_ICONS.filter((item) => !(title && !item.includes(title)))
      const list = mockList.filter((item, index) => index < pageSize * pageNo && index >= pageSize * (pageNo - 1))
      return {
        code: 200,
        msg: 'success',
        data: { list, total: mockList.length },
      }
    },
  },
] as MockMethod[]
