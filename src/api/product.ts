import { adaptMsg, adaptPage, toBladePage, unwrap } from '/@/utils/bladeAdapter'
import request from '/@/utils/request'

/**
 * 商品管理 → BladeX /blade-system/product
 * 数据表：shop_vite.product（SPU） + shop_vite.product_spec（SKU）
 */
const BASE = '/api/blade-system/product'

/** 产品状态 */
export const PRODUCT_STATUS = [
  { value: 0, label: '草稿', type: 'info' },
  { value: 1, label: '在售', type: 'success' },
  { value: 2, label: '停售', type: 'warning' },
  { value: 3, label: '淘汰', type: 'danger' },
]

/** 审核状态 */
export const AUDIT_STATUS = [
  { value: -1, label: '未送审', type: 'info' },
  { value: 0, label: '待审核', type: 'warning' },
  { value: 1, label: '已通过', type: 'success' },
  { value: 2, label: '已驳回', type: 'danger' },
]

/** 商品类型 */
export const PRODUCT_TYPE = [
  { value: 0, label: '成品' },
  { value: 1, label: '定制' },
  { value: 2, label: '半成品' },
  { value: 3, label: '配件' },
]

/** 包装类型 */
export const PACKAGE_TYPE = [
  { value: 0, label: '独立件' },
  { value: 1, label: '分包件' },
  { value: 2, label: '组合' },
]

const toStrList = (v: any): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch {
      return v
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

const mapRow = (row: any): any => {
  const m: any = {
    ...row,
    id: row?.id != null ? String(row.id) : '',
    productCode: row?.productCode || '',
    productName: row?.productName || '',
    productSubtitle: row?.productSubtitle || '',
    productBrief: row?.productBrief || '',
    productDescription: row?.productDescription || '',
    keywords: row?.keywords || '',
    brand: row?.brand || '',
    categoryId: row?.categoryId ?? null,
    categoryPath: row?.categoryPath || '',
    origin: toStrList(row?.origin),
    applicableSpace: toStrList(row?.applicableSpace),
    applicableScene: toStrList(row?.applicableScene),
    productType: row?.productType ?? null,
    packageType: row?.packageType ?? null,
    retailPrice: row?.retailPrice ?? null,
    memberPrice: row?.memberPrice ?? null,
    costPrice: row?.costPrice ?? null,
    unit: row?.unit || '',
    minOrderQty: row?.minOrderQty ?? 1,
    taxRate: row?.taxRate ?? null,
    productStatus: row?.productStatus ?? 0,
    auditStatus: row?.auditStatus ?? -1,
    auditRemark: row?.auditRemark || '',
    auditTime: row?.auditTime || '',
    mainImage: row?.mainImage || '',
    detailImages: toStrList(row?.detailImages),
    videoUrl: row?.videoUrl || '',
    model3dUrl: row?.model3dUrl || '',
    isOnShelf: row?.isOnShelf ?? 0,
    isRecommended: row?.isRecommended ?? 0,
    isNew: row?.isNew ?? 0,
    isHot: row?.isHot ?? 0,
    sortWeight: row?.sortWeight ?? 0,
    tags: toStrList(row?.tags),
    specStock: row?.specStock ?? 0,
    specCount: row?.specCount ?? 0,
    createTime: row?.createTime || '',
    updateTime: row?.updateTime || '',
  }
  const checks = [
    !!(m.productName && m.productCode),
    !!m.mainImage,
    Number(m.memberPrice ?? m.retailPrice) > 0,
    Number(m.specStock) > 0 || Number(m.specCount) > 0,
    !!m.categoryPath,
    !!m.brand,
    !!m.videoUrl,
    !!m.model3dUrl,
    Array.isArray(m.detailImages) && m.detailImages.length > 0,
  ]
  m.completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  return m
}

const mapSpec = (row: any): any => ({
  ...row,
  id: row?.id != null ? String(row.id) : '',
  productId: row?.productId ?? null,
  specCode: row?.specCode || '',
  specName: row?.specName || '',
  specPrice: row?.specPrice ?? null,
  specMemberPrice: row?.specMemberPrice ?? null,
  specCostPrice: row?.specCostPrice ?? null,
  specStock: row?.specStock ?? 0,
  specUnit: row?.specUnit || '',
  specImage: row?.specImage || '',
  isDefault: row?.isDefault ?? 0,
  specStatus: row?.specStatus ?? 1,
  length: row?.length ?? null,
  width: row?.width ?? null,
  height: row?.height ?? null,
  seatHeight: row?.seatHeight ?? null,
  unfoldedSize: row?.unfoldedSize || '',
  productWeight: row?.productWeight ?? null,
  mainMaterial: row?.mainMaterial || '',
  auxiliaryMaterial: row?.auxiliaryMaterial || '',
  fabricMaterial: row?.fabricMaterial || '',
  fillingMaterial: row?.fillingMaterial || '',
  frameMaterial: row?.frameMaterial || '',
  hardware: row?.hardware || '',
  surfaceCraft: row?.surfaceCraft || '',
  color: row?.color || '',
  style: row?.style || '',
  environmentalGrade: row?.environmentalGrade || '',
})

/** 分页列表 */
export async function getList(params?: any) {
  const pageParams = toBladePage(params)
  const res: any = await request({
    url: `${BASE}/list`,
    method: 'get',
    params: {
      current: pageParams.current,
      size: pageParams.size,
      keyword: params?.keyword || undefined,
      brand: params?.brand || undefined,
      categoryId: params?.categoryId || undefined,
      categoryPath: params?.categoryPath || undefined,
      productStatus: params?.productStatus ?? undefined,
      auditStatus: params?.auditStatus ?? undefined,
      isOnShelf: params?.isOnShelf ?? undefined,
      productType: params?.productType ?? undefined,
    },
  })
  return adaptPage(res, mapRow)
}

/** 详情（含规格） */
export async function getDetail(id: string | number) {
  const res: any = await request({
    url: `${BASE}/detail`,
    method: 'get',
    params: { id },
  })
  const data = unwrap(res)
  if (!data) return {}
  const product = mapRow(data)
  product.specs = Array.isArray(data.specs) ? data.specs.map(mapSpec) : []
  return product
}

/** 新增/修改（含规格） */
export async function submit(data: any) {
  const specs = Array.isArray(data.specs)
    ? data.specs.map((s: any) => {
        const o: any = { ...s }
        if (o.id) delete o.id
        return o
      })
    : []

  const payload: Record<string, any> = {
    id: data.id || undefined,
    productCode: data.productCode,
    productName: data.productName,
    productSubtitle: data.productSubtitle || undefined,
    productBrief: data.productBrief || undefined,
    productDescription: data.productDescription || undefined,
    keywords: data.keywords || undefined,
    brand: data.brand || undefined,
    categoryId: data.categoryId || undefined,
    categoryPath: data.categoryPath || undefined,
    origin: Array.isArray(data.origin) && data.origin.length ? data.origin : undefined,
    applicableSpace: Array.isArray(data.applicableSpace) && data.applicableSpace.length ? data.applicableSpace : undefined,
    applicableScene: Array.isArray(data.applicableScene) && data.applicableScene.length ? data.applicableScene : undefined,
    productType: data.productType ?? undefined,
    packageType: data.packageType ?? undefined,
    retailPrice: data.retailPrice ?? undefined,
    memberPrice: data.memberPrice ?? undefined,
    costPrice: data.costPrice ?? undefined,
    unit: data.unit || undefined,
    minOrderQty: data.minOrderQty ?? 1,
    taxRate: data.taxRate ?? undefined,
    productStatus: data.productStatus ?? 0,
    auditStatus: data.auditStatus ?? -1,
    auditRemark: data.auditRemark || undefined,
    mainImage: data.mainImage || undefined,
    detailImages: Array.isArray(data.detailImages) && data.detailImages.length ? data.detailImages : undefined,
    videoUrl: data.videoUrl || undefined,
    model3dUrl: data.model3dUrl || undefined,
    isOnShelf: data.isOnShelf ?? 0,
    isRecommended: data.isRecommended ?? 0,
    isNew: data.isNew ?? 0,
    isHot: data.isHot ?? 0,
    sortWeight: data.sortWeight ?? 0,
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : undefined,
    specs,
  }

  if (!payload.productCode) throw new Error('产品编码不能为空')
  if (!payload.productName) throw new Error('产品名称不能为空')

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k]
  })

  const res: any = await request({
    url: `${BASE}/submit`,
    method: 'post',
    data: payload,
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '保存失败')
  }
  return adaptMsg(res, '保存成功')
}

/** 删除 */
export async function doRemove(data: any) {
  const ids = data?.ids ?? data?.id
  if (ids === undefined || ids === null || ids === '') {
    throw new Error('缺少产品ID')
  }
  const res: any = await request({
    url: `${BASE}/remove`,
    method: 'post',
    params: { ids: String(ids) },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '删除失败')
  }
  return adaptMsg(res, '删除成功')
}

/** 上架/下架 */
export async function updateOnShelf(id: string | number, isOnShelf: number) {
  const res: any = await request({
    url: `${BASE}/on-shelf`,
    method: 'post',
    params: { id, isOnShelf },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '操作失败')
  }
  return adaptMsg(res, isOnShelf === 1 ? '上架成功' : '下架成功')
}

/** 审核：1通过 / 2驳回（驳回必填 remark） */
export async function updateAuditStatus(
  id: string | number,
  auditStatus: number,
  options?: { auditRemark?: string; autoOnShelf?: boolean }
) {
  const res: any = await request({
    url: `${BASE}/audit`,
    method: 'post',
    params: {
      id,
      auditStatus,
      auditRemark: options?.auditRemark || undefined,
      autoOnShelf: options?.autoOnShelf !== false,
    },
  })
  if (res?.success === false) {
    throw new Error(res?.msg || '操作失败')
  }
  return adaptMsg(res, auditStatus === 1 ? '审核通过' : '已驳回')
}

/** 自动生成 SPU 编码 */
export function genProductCode(prefix = 'SF') {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `${prefix}-${y}${m}${day}-${rand}`
}

/** 品类快捷模板（减少录入） */
export const PRODUCT_TEMPLATES = [
  {
    key: 'sofa',
    label: '布艺沙发',
    prefix: 'SF',
    categoryPath: '客厅家具/沙发/布艺沙发',
    brand: '宜家家居',
    productType: 0,
    unit: '件',
    applicableSpace: ['客厅'],
    applicableScene: ['家用'],
    tags: ['小户型', '送货安装'],
    origin: ['中国', '广东'],
    icon: 'sofa',
  },
  {
    key: 'table',
    label: '实木餐桌',
    prefix: 'TB',
    categoryPath: '餐厅家具/餐桌/实木餐桌',
    brand: '全友家居',
    productType: 0,
    unit: '件',
    applicableSpace: ['餐厅'],
    applicableScene: ['家用'],
    tags: ['环保', '北欧'],
    origin: ['中国', '浙江'],
    icon: 'table',
  },
  {
    key: 'chair',
    label: '办公椅',
    prefix: 'CH',
    categoryPath: '办公家具/椅子/人体工学椅',
    brand: '顾家家居',
    productType: 0,
    unit: '把',
    applicableSpace: ['办公', '书房'],
    applicableScene: ['办公'],
    tags: ['可定制'],
    origin: ['中国'],
    icon: 'chair',
  },
  {
    key: 'bed',
    label: '床垫',
    prefix: 'BD',
    categoryPath: '卧室家具/床垫/弹簧床垫',
    brand: '林氏木业',
    productType: 0,
    unit: '张',
    applicableSpace: ['卧室'],
    applicableScene: ['家用'],
    tags: ['环保'],
    origin: ['中国'],
    icon: 'bed',
  },
  {
    key: 'custom',
    label: '空白创建',
    prefix: 'SP',
    categoryPath: '',
    brand: '',
    productType: 0,
    unit: '件',
    applicableSpace: [] as string[],
    applicableScene: [] as string[],
    tags: [] as string[],
    origin: [] as string[],
    icon: 'custom',
  },
] as const

export type ProductTemplateKey = (typeof PRODUCT_TEMPLATES)[number]['key']

/** 商品驾驶舱统计 */
export async function getDashboard() {
  const res: any = await request({
    url: `${BASE}/dashboard`,
    method: 'get',
  })
  return unwrap(res) || {
    total: 0,
    onSale: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    stopped: 0,
    missing: 0,
    avgCompleteness: 0,
  }
}

