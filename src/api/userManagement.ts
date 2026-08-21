import request from '/@/utils/request'
import { adaptMsg, adaptPage, toBladePage, unwrap, unwrapBladeFile } from '/@/utils/bladeAdapter'

/**
 * 用户管理 → BladeX /blade-system/user
 */

const SEX_MAP: Record<string, number> = { 男: 1, 女: 2, 保密: 3, 未知: 3 }
const SEX_LABEL: Record<number, string> = { 1: '男', 2: '女', 3: '保密' }
const STATUS_MAP: Record<string, number> = { 已启用: 1, 启用: 1, 已停用: 0, 停用: 0 }
const STATUS_LABEL: Record<number, string> = { 1: '已启用', 0: '已停用' }
const USER_TYPE_MAP: Record<string, number> = { web: 1, app: 2, other: 3, wechat: 3 }
const USER_TYPE_LABEL: Record<number, string> = { 1: 'web', 2: 'app', 3: 'other' }

const toSex = (v: any) => {
  if (v === '' || v === undefined || v === null) return 1
  if (typeof v === 'number') return v
  if (/^\d+$/.test(String(v))) return Number(v)
  return SEX_MAP[String(v)] ?? 1
}

const toStatus = (v: any) => {
  if (v === '' || v === undefined || v === null) return 1
  if (typeof v === 'number') return v
  if (/^\d+$/.test(String(v))) return Number(v)
  return STATUS_MAP[String(v)] ?? 1
}

const toUserType = (v: any) => {
  if (v === '' || v === undefined || v === null) return 1
  if (typeof v === 'number') return v
  if (/^\d+$/.test(String(v))) return Number(v)
  return USER_TYPE_MAP[String(v).toLowerCase()] ?? 1
}

const joinIds = (v: any) => {
  if (Array.isArray(v)) return v.filter((x) => x !== '' && x != null).map(String).join(',')
  if (v === '' || v === undefined || v === null) return undefined
  return String(v)
}

/** 组装 BladeX User 提交体 */
export const toBladeUser = (data: any) => {
  const roleId =
    joinIds(data.roleId) ||
    joinIds(data.roleIds) ||
    (Array.isArray(data.roles) && data.roles.every((r: any) => /^\d+$/.test(String(r)))
      ? joinIds(data.roles)
      : undefined)

  const payload: Record<string, any> = {
    id: data.id || undefined,
    account: data.account || data.username,
    name: data.name || data.realName || data.username,
    realName: data.realName || data.name || data.username,
    email: data.email || undefined,
    phone: data.phone || undefined,
    avatar: data.avatar || undefined,
    birthday: data.birthday || undefined,
    remark: data.remark || undefined,
    sex: toSex(data.sex),
    status: toStatus(data.status),
    userType: toUserType(data.userType ?? data.usertype),
    roleId,
    deptId: joinIds(data.deptId),
    postId: joinIds(data.postId),
  }

  // 仅新增或显式填写密码时提交（后端会 DigestUtil.encrypt）
  if (data.password) {
    payload.password = data.password
  }

  // 清理空字段，避免覆盖后端已有值；脱敏占位（含 *）也绝不提交
  Object.keys(payload).forEach((k) => {
    const v = payload[k]
    if (v === undefined || v === '') delete payload[k]
    else if (typeof v === 'string' && v.includes('*') && (k === 'phone' || k === 'email')) {
      delete payload[k]
    }
  })
  return payload
}

const mapUserRow = (u: any) => {
  const sexNum = toSex(u.sex)
  const statusNum = toStatus(u.status)
  const userTypeNum = toUserType(u.userType)
  const roleIds = String(u.roleId || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
  return {
    ...u,
    id: u.id != null ? String(u.id) : '',
    username: u.account || u.userName || u.name || '',
    account: u.account || '',
    name: u.realName || u.name || u.account || '',
    email: u.email || '',
    phone: u.phone || u.mobile || '',
    avatar: u.avatar || '',
    roleId: u.roleId || '',
    roleIds,
    roles: String(u.roleName || u.role_name || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    deptId: u.deptId != null ? String(u.deptId).split(',')[0] : '',
    deptName: u.deptName || '',
    sex: sexNum,
    sexLabel: u.sexName || SEX_LABEL[sexNum] || '',
    status: statusNum,
    statusLabel: u.statusName || STATUS_LABEL[statusNum] || '',
    userType: userTypeNum,
    usertype: USER_TYPE_LABEL[userTypeNum] || String(u.userTypeName || userTypeNum),
    birthday: u.birthday || '',
    remark: u.remark || '',
    datetime: u.updateTime || u.createTime || '',
  }
}

export async function getList(params?: any) {
  const pageParams = {
    ...toBladePage(params),
    account: params?.username || params?.account,
    name: params?.name || params?.realName,
  }
  try {
    const res: any = await request({
      url: '/api/blade-system/user/page',
      method: 'get',
      params: pageParams,
      // 无菜单码时不弹窗，走下方兼容接口
      silentError: true,
    })
    return adaptPage(res, mapUserRow)
  } catch {
    // 兼容：旧版仍为 @IsAdmin，或菜单编号仅为 UserManagement 时
    const res: any = await request({
      url: '/api/blade-system/user/user-page',
      method: 'get',
      params: pageParams,
    })
    return adaptPage(res, mapUserRow)
  }
}

export async function doEdit(data: any) {
  const payload = toBladeUser(data)
  if (!payload.account) {
    throw new Error('账号不能为空')
  }
  if (!payload.roleId) {
    throw new Error('请选择角色')
  }
  if (!payload.deptId) {
    throw new Error('请选择部门')
  }
  if (!payload.id && !payload.password) {
    throw new Error('请输入密码')
  }
  // 禁止把 base64 当头像写入库，必须是 MinIO/OSS URL
  if (payload.avatar && String(payload.avatar).startsWith('data:')) {
    throw new Error('头像尚未上传到服务器，请重新选择头像')
  }

  const isUpdate = !!payload.id
  const res: any = await request({
    url: isUpdate ? '/api/blade-system/user/update' : '/api/blade-system/user/submit',
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

/**
 * 上传头像到 MinIO（blade-resource OSS）
 * 返回可落库的外链 URL（BladeFile.link）
 */
export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  let res: any
  try {
    res = await request({
      url: '/api/blade-resource/oss/endpoint/put-file',
      method: 'post',
      data: formData,
      timeout: 60000,
    })
  } catch (e: any) {
    const tip =
      e?.msg ||
      e?.message ||
      e?.error_description ||
      (typeof e === 'string' ? e : '') ||
      '头像上传失败'
    throw new Error(
      String(tip).includes('MinIO') || String(tip).includes('OSS') || String(tip).includes('上传')
        ? tip
        : `头像上传失败：${tip}。请确认 blade-resource 已启动，且 MinIO(127.0.0.1:9000) 可连`
    )
  }
  try {
    const fileInfo = unwrapBladeFile(res)
    if (!fileInfo.link) {
      throw new Error('头像上传失败，未返回文件地址（请检查 MinIO 桶 bladex 是否已创建，且 OSS 配置已启用）')
    }
    return {
      url: fileInfo.link,
      name: fileInfo.name || file.name,
      originalName: fileInfo.originalName || file.name,
    }
  } catch (e: any) {
    throw new Error(e?.message || '头像上传失败')
  }
}

export async function doDelete(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少用户ID')
  }
  const res: any = await request({
    url: '/api/blade-system/user/remove',
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

/** 管理员重置用户密码为系统默认密码 */
export async function resetPassword(userIds: string | number) {
  const res: any = await request({
    url: '/api/blade-system/user/reset-password',
    method: 'post',
    params: { userIds: String(userIds) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '重置密码失败')
  }
  return adaptMsg(res, '密码已重置为默认密码')
}

export async function getUserDetail(id: string | number) {
  const res: any = await request({
    url: '/api/blade-system/user/detail',
    method: 'get',
    params: { id },
  })
  return unwrap(res) || {}
}
