import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 数据源管理 → /api/blade-system/tenant-datasource
 */

const mapRow = (row: any) => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  category: row?.category ?? 1,
  name: row?.name || '',
  driverClass: row?.driverClass || '',
  url: row?.url || '',
  username: row?.username || '',
  password: row?.password || '',
  remark: row?.remark || '',
})

export async function getList(params?: any) {
  const pageParams = toBladePage(params)
  const res: any = await request({
    url: '/api/blade-system/tenant-datasource/list',
    method: 'get',
    params: {
      current: pageParams.current,
      size: pageParams.size,
      descs: 'id',
      name: params?.name || undefined,
    },
  })
  return adaptPage(res, mapRow)
}

export async function getDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/tenant-datasource/detail',
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  return data ? mapRow(data) : {}
}

export async function doEdit(data: any) {
  const payload: Record<string, any> = {
    id: data.id || undefined,
    category: data.category ?? 1,
    name: data.name,
    driverClass: data.driverClass,
    url: data.url,
    username: data.username,
    password: data.password,
    remark: data.remark ?? '',
  }
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k]
  })
  const res: any = await request({
    url: '/api/blade-system/tenant-datasource/submit',
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
    throw new Error('缺少数据源ID')
  }
  const res: any = await request({
    url: '/api/blade-system/tenant-datasource/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

export async function testConnection(data: any, opts?: { silent?: boolean }) {
  const res: any = await request({
    url: '/api/blade-system/tenant-datasource/test',
    method: 'post',
    silentError: opts?.silent === true,
    data: {
      category: data.category ?? 1,
      name: data.name,
      driverClass: data.driverClass,
      url: data.url,
      username: data.username,
      password: data.password,
    },
  })
  const envelope = res?.data != null && res?.success === undefined ? res.data : res
  if (envelope?.success === false) {
    throw new Error(envelope?.msg || '连接失败')
  }
  return envelope?.msg || '连接成功'
}

/** 当前 blade-system 已引入的驱动 */
export const DRIVER_OPTIONS = [
  { label: 'MySQL', value: 'com.mysql.cj.jdbc.Driver' },
  { label: 'SQL Server', value: 'com.microsoft.sqlserver.jdbc.SQLServerDriver' },
  { label: 'Oracle', value: 'oracle.jdbc.OracleDriver' },
  { label: 'PostgreSQL（需引入驱动）', value: 'org.postgresql.Driver' },
]
