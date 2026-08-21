import { adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

const mapAuditRow = (log: any) => {
  return {
    ...log,
    id: log.id != null ? String(log.id) : '',
    userAccount: log.userAccount || log.account || '',
    userName: log.userName || log.name || '',
    bizName: log.bizName || log.moduleName || log.serviceId || '',
    methodName: log.methodName || log.method || '',
    requestUri: log.requestUri || log.uri || log.path || '',
    requestMethod: log.requestMethod || log.httpMethod || log.method || '',
    method: log.method || log.requestMethod || log.httpMethod || '',
    operationType: log.operationType || getOperationType(log.requestUri || log.uri || ''),
    operationTypeLabel: getOperationTypeLabel(log.requestUri || log.uri || ''),
    params: log.params || log.requestData || log.body || '',
    result: log.result || log.executeResult || '',
    logTime: log.logTime || log.createTime || '',
    recordTime: log.recordTime || log.createTime || log.logTime || '',
    env: log.env || log.environment || '',
    remoteIp: log.remoteIp || log.ip || log.userIp || '',
    ip: log.ip || log.userIp || log.remoteIp || '',
    costTime: log.costTime || log.time || log.recordCost || 0,
    recordCost: log.recordCost || log.costTime || log.time || 0,
  }
}

const getOperationType = (uri: string): string => {
  if (!uri) return 'unknown'
  if (uri.includes('/submit') || uri.includes('/add')) return 'create'
  if (uri.includes('/update') || uri.includes('/edit')) return 'update'
  if (uri.includes('/remove') || uri.includes('/delete')) return 'delete'
  if (uri.includes('/detail') || uri.includes('/get')) return 'query'
  if (uri.includes('/page') || uri.includes('/list')) return 'query'
  return 'other'
}

const getOperationTypeLabel = (uri: string): string => {
  const map: Record<string, string> = {
    create: '新增',
    update: '修改',
    delete: '删除',
    query: '查询',
    other: '其他',
  }
  return map[getOperationType(uri)] || '其他'
}

const emptyPage = () =>
  ({
    code: 200,
    success: true,
    msg: '操作成功',
    data: { list: [], total: 0 },
  }) as any

/** 按顺序尝试真实审计接口；全部 silent，避免 401 误踢登录 */
export async function getList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    userAccount: params?.userAccount || params?.account,
    bizName: params?.bizName || params?.moduleName,
    startTime: params?.startTime,
    endTime: params?.endTime,
  }
  const urls = [
    '/api/blade-system/record-data/list',
    '/api/blade-log/api/list',
  ]
  for (const url of urls) {
    try {
      const res: any = await request({
        url,
        method: 'get',
        params: pageParams,
        silentError: true,
        meta: { silentError: true },
      })
      const page = adaptPage(res, mapAuditRow)
      // 业务成功才采用（含空列表）
      if (page && (page.code === 200 || page.success !== false)) {
        return page
      }
    } catch {
      /* try next */
    }
  }
  return emptyPage()
}

export async function getDetail(id: string | number) {
  try {
    const res: any = await request({
      url: '/api/blade-system/record-data/detail',
      method: 'get',
      params: { id },
      silentError: true,
      meta: { silentError: true },
    })
    return unwrap(res) || {}
  } catch {
    try {
      const res: any = await request({
        url: '/api/blade-log/api/detail',
        method: 'get',
        params: { id },
        silentError: true,
        meta: { silentError: true },
      })
      return unwrap(res) || {}
    } catch {
      return {}
    }
  }
}
