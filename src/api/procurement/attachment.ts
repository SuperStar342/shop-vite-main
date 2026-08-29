/**
 * 业务附件 API（当前为前端内存 mock，便于联调交互与预览）
 * 后续可替换为真实后端 / OSS 接口，组件侧无需大改。
 */

export type AttachmentCategory = 'process' | 'drawing' | 'customer' | 'production' | 'other'

export interface BizAttachment {
  id: string
  bizType: string
  bizId: string
  name: string
  size: number
  ext: string
  category: AttachmentCategory
  uploader: string
  uploadTime: string
  /** 可预览/下载的地址；本地上传多为 blob: URL */
  url: string
  /** 上传时保留的本地 File，优先用于 File Viewer */
  file?: File
}

export interface AttachmentStorageInfo {
  usedBytes: number
  quotaBytes: number
}

export const ATTACHMENT_CATEGORIES: { value: AttachmentCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'process', label: '工艺文件' },
  { value: 'drawing', label: '产品图纸' },
  { value: 'customer', label: '客户文件' },
  { value: 'production', label: '生产文件' },
  { value: 'other', label: '其他' },
]

export const ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const QUOTA_BYTES = 5 * 1024 * 1024 * 1024

const SAMPLE_PDF = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
const SAMPLE_IMG = 'https://picsum.photos/seed/jpai-attach/1200/800'

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms))

const pad = (n: number) => String(n).padStart(2, '0')
const nowText = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const extOf = (name: string) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

const guessCategory = (ext: string, hint?: AttachmentCategory): AttachmentCategory => {
  if (hint) return hint
  if (['pdf', 'doc', 'docx'].includes(ext)) return 'process'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'dwg', 'dxf'].includes(ext)) return 'drawing'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'production'
  if (['ppt', 'pptx'].includes(ext)) return 'customer'
  return 'other'
}

/** bizKey -> attachments */
const store = new Map<string, BizAttachment[]>()
let usedBytes = 120 * 1024 * 1024
let seq = 100

const keyOf = (bizType: string, bizId: string) => `${bizType}::${bizId}`

const ensureSeed = (bizType: string, bizId: string) => {
  const key = keyOf(bizType, bizId)
  if (store.has(key)) return
  const seed: BizAttachment[] = [
    {
      id: `${bizId}-a1`,
      bizType,
      bizId,
      name: '工艺流程图.pdf',
      size: Math.round(2.8 * 1024 * 1024),
      ext: 'pdf',
      category: 'process',
      uploader: '张三',
      uploadTime: '2026-03-20 14:32',
      url: SAMPLE_PDF,
    },
    {
      id: `${bizId}-a2`,
      bizType,
      bizId,
      name: '产品尺寸表.xlsx',
      size: Math.round(1.2 * 1024 * 1024),
      ext: 'xlsx',
      category: 'production',
      uploader: '李四',
      uploadTime: '2026-03-19 10:15',
      // mock：无公开可预览源，请上传本地 Excel 体验预览
      url: '',
    },
    {
      id: `${bizId}-a3`,
      bizType,
      bizId,
      name: '客户确认单.docx',
      size: Math.round(856 * 1024),
      ext: 'docx',
      category: 'customer',
      uploader: '王五',
      uploadTime: '2026-03-18 16:48',
      url: '',
    },
    {
      id: `${bizId}-a4`,
      bizType,
      bizId,
      name: '外观效果图.png',
      size: Math.round(3.4 * 1024 * 1024),
      ext: 'png',
      category: 'drawing',
      uploader: '赵六',
      uploadTime: '2026-03-17 09:20',
      url: SAMPLE_IMG,
    },
  ]
  store.set(key, seed)
}

export async function getAttachmentCount(bizType: string, bizId: string): Promise<number> {
  if (!bizId) return 0
  ensureSeed(bizType, bizId)
  await delay(40)
  return store.get(keyOf(bizType, bizId))?.length || 0
}

export async function getAttachmentCounts(
  bizType: string,
  bizIds: string[]
): Promise<Record<string, number>> {
  const map: Record<string, number> = {}
  for (const id of bizIds) {
    if (!id) continue
    ensureSeed(bizType, id)
    map[id] = store.get(keyOf(bizType, id))?.length || 0
  }
  await delay(60)
  return map
}

export async function getAttachmentList(params: {
  bizType: string
  bizId: string
  category?: AttachmentCategory | 'all'
  keyword?: string
  ext?: string
}): Promise<BizAttachment[]> {
  const { bizType, bizId, category = 'all', keyword = '', ext = '' } = params
  ensureSeed(bizType, bizId)
  await delay()
  let list = [...(store.get(keyOf(bizType, bizId)) || [])]
  if (category && category !== 'all') list = list.filter((a) => a.category === category)
  const kw = keyword.trim().toLowerCase()
  if (kw) list = list.filter((a) => a.name.toLowerCase().includes(kw))
  if (ext) list = list.filter((a) => a.ext === ext.toLowerCase())
  return list
}

export async function getAttachmentCategoryCounts(
  bizType: string,
  bizId: string
): Promise<Record<AttachmentCategory | 'all', number>> {
  ensureSeed(bizType, bizId)
  await delay(40)
  const list = store.get(keyOf(bizType, bizId)) || []
  const counts: Record<string, number> = {
    all: list.length,
    process: 0,
    drawing: 0,
    customer: 0,
    production: 0,
    other: 0,
  }
  for (const a of list) counts[a.category] = (counts[a.category] || 0) + 1
  return counts as Record<AttachmentCategory | 'all', number>
}

export async function getAttachmentStorage(): Promise<AttachmentStorageInfo> {
  await delay(30)
  return { usedBytes, quotaBytes: QUOTA_BYTES }
}

export async function uploadAttachment(params: {
  bizType: string
  bizId: string
  file: File
  category?: AttachmentCategory
  uploader?: string
}): Promise<BizAttachment> {
  const { bizType, bizId, file, category, uploader = '当前用户' } = params
  if (!bizId) throw new Error('缺少业务主键')
  if (file.size > MAX_FILE_SIZE) throw new Error('单文件最大 50MB')
  ensureSeed(bizType, bizId)
  await delay(320)
  const ext = extOf(file.name)
  const item: BizAttachment = {
    id: `local-${++seq}`,
    bizType,
    bizId,
    name: file.name,
    size: file.size,
    ext,
    category: guessCategory(ext, category),
    uploader,
    uploadTime: nowText(),
    url: URL.createObjectURL(file),
    file,
  }
  const key = keyOf(bizType, bizId)
  const list = store.get(key) || []
  list.unshift(item)
  store.set(key, list)
  usedBytes += file.size
  return item
}

export async function deleteAttachment(id: string, bizType: string, bizId: string): Promise<void> {
  ensureSeed(bizType, bizId)
  await delay(120)
  const key = keyOf(bizType, bizId)
  const list = store.get(key) || []
  const idx = list.findIndex((a) => a.id === id)
  if (idx < 0) throw new Error('附件不存在')
  const [removed] = list.splice(idx, 1)
  if (removed.url.startsWith('blob:')) URL.revokeObjectURL(removed.url)
  usedBytes = Math.max(0, usedBytes - (removed.size || 0))
  store.set(key, list)
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function storagePercent(used: number, quota: number): string {
  if (!quota) return '0.0'
  return ((used / quota) * 100).toFixed(1)
}

export function isPreviewableExt(ext: string): boolean {
  const e = (ext || '').toLowerCase()
  return [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'txt',
    'csv',
  ].includes(e)
}
