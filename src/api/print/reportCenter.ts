import { adaptPage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

const BASE = '/api/blade-system/print'

export type PrintDocType = {
  code: string
  name: string
  defaultTemplateId?: number
  status?: number
  remark?: string
}

export type PrintTemplate = {
  id: number
  code: string
  name: string
  docTypeCode: string
  docTypeName: string
  status: number
  isDefault?: boolean
  hasJson?: boolean
  createTime?: string
  updateTime?: string
}

export async function listDocTypes(): Promise<PrintDocType[]> {
  const res: any = await request({ url: `${BASE}/doc-types`, method: 'get' })
  return (unwrap(res) || []) as PrintDocType[]
}

export async function listTemplates(docTypeCode?: string, params?: { current?: number; size?: number }) {
  const res: any = await request({
    url: `${BASE}/templates`,
    method: 'get',
    params: { docTypeCode, current: params?.current || 1, size: params?.size || 50 },
  })
  return adaptPage(res)
}

export async function submitTemplateMeta(data: Record<string, unknown>) {
  const res: any = await request({ url: `${BASE}/templates/submit`, method: 'post', data })
  return unwrap(res)
}

export async function getTemplateJson(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/json`, method: 'get' })
  return unwrap(res) as string | null
}

export async function saveTemplateJson(id: string | number, templateJson: unknown) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/json`,
    method: 'put',
    data: { templateJson: typeof templateJson === 'string' ? templateJson : JSON.stringify(templateJson) },
  })
  return unwrap(res)
}

export async function setDefaultTemplate(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/set-default`, method: 'post' })
  return unwrap(res)
}

export async function copyTemplate(id: string | number, code: string, name: string) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/copy`,
    method: 'post',
    data: { code, name },
  })
  return unwrap(res)
}

export async function restoreFactoryTemplate(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/restore-factory`, method: 'post' })
  return unwrap(res)
}

export async function changeTemplateStatus(id: string | number, status: number) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/status`,
    method: 'post',
    params: { status },
  })
  return unwrap(res)
}

export async function listMounts() {
  const res: any = await request({ url: `${BASE}/mounts`, method: 'get' })
  return unwrap(res) || []
}

export async function submitMount(data: Record<string, unknown>) {
  const res: any = await request({ url: `${BASE}/mounts/submit`, method: 'post', data })
  return unwrap(res)
}

export async function listDocTypeAuths(docTypeCode: string) {
  const res: any = await request({
    url: `${BASE}/doc-type-auths`,
    method: 'get',
    params: { docTypeCode },
  })
  return unwrap(res) || []
}

export async function replaceDocTypeAuths(docTypeCode: string, roleIds: number[]) {
  const res: any = await request({
    url: `${BASE}/doc-type-auths/replace`,
    method: 'post',
    params: { docTypeCode },
    data: roleIds,
  })
  return unwrap(res)
}

export type PagePrintTemplate = {
  id: number
  code: string
  name: string
  isDefault: boolean
  hasJson: boolean
}

export async function listPageTemplates(pageCode: string): Promise<PagePrintTemplate[]> {
  const res: any = await request({ url: `${BASE}/pages/${pageCode}/templates`, method: 'get' })
  return (unwrap(res) || []) as PagePrintTemplate[]
}
