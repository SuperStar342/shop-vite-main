import request from '/@/utils/request'
import { adaptMsg, unwrap } from '/@/utils/bladeAdapter'

/**
 * 网站设置 → BladeX 参数 /blade-system/param
 * 使用 paramKey = website_setting 存 JSON
 */
const WEBSITE_PARAM_KEY = 'website_setting'

export async function getWebsiteSetting() {
  const res: any = await request({
    url: '/api/blade-system/param/detail',
    method: 'get',
    params: { paramKey: WEBSITE_PARAM_KEY },
  })
  const detail = unwrap(res) || {}
  let setting: any = {}
  try {
    setting = detail.paramValue ? JSON.parse(detail.paramValue) : detail
  } catch {
    setting = detail
  }
  return {
    code: 200,
    success: true,
    msg: '获取成功',
    data: setting,
  }
}

export async function saveWebsiteSetting(data: any) {
  const detailRes: any = await request({
    url: '/api/blade-system/param/detail',
    method: 'get',
    params: { paramKey: WEBSITE_PARAM_KEY },
  })
  const detail = unwrap(detailRes) || {}
  const payload = {
    id: detail.id,
    paramName: detail.paramName || '网站设置',
    paramKey: WEBSITE_PARAM_KEY,
    paramValue: JSON.stringify(data),
  }
  const res: any = await request({
    url: '/api/blade-system/param/submit',
    method: 'post',
    data: payload,
  })
  return adaptMsg(res, '保存成功')
}

export async function uploadFile(data: FormData) {
  const res: any = await request({
    url: '/api/blade-resource/oss/endpoint/put-file',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return {
    code: 200,
    success: true,
    msg: '上传成功',
    data: unwrap(res),
  }
}
