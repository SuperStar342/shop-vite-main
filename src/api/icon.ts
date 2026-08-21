import { REMIX_ICONS } from '/@/data/remixIcons'

interface QueryFormType {
  pageNo?: number
  pageSize?: number
  title?: string
  colorful?: boolean
  num?: number
}

/**
 * 图标列表：本地 Remix 名分页（不走网关）
 * 避免 mock 未启用时请求 /icon/getList → 127.0.0.1 404
 */
export const getIconList = async (params?: QueryFormType) => {
  const pageNo = Math.max(1, Number(params?.pageNo) || 1)
  const pageSize = Math.max(1, Number(params?.pageSize) || 20)
  const title = String(params?.title || '')
    .trim()
    .toLowerCase()

  const filtered = title
    ? REMIX_ICONS.filter((name) => name.toLowerCase().includes(title))
    : REMIX_ICONS

  const start = (pageNo - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  return {
    code: 200,
    success: true,
    msg: 'success',
    data: {
      list,
      total: filtered.length,
    },
  }
}
