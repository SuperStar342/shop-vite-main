/**
 * 商品完整度 / 智能提交检查 —— 基于 blade_product + blade_product_spec 现有字段
 */

export type CheckLevel = 'must' | 'suggest'
export type CheckItem = {
  key: string
  label: string
  ok: boolean
  level: CheckLevel
  /** 工作台跳转 tab */
  tab?: string
}

export function calcCompleteness(product: any) {
  const specs = Array.isArray(product?.specs) ? product.specs : []
  const items: CheckItem[] = [
    { key: 'name', label: '基础信息（名称/编码）', ok: !!(product?.productName && product?.productCode), level: 'must', tab: 'base' },
    { key: 'mainImage', label: '主图', ok: !!product?.mainImage, level: 'must', tab: 'media' },
    { key: 'price', label: '价格', ok: Number(product?.memberPrice ?? product?.retailPrice) > 0 || specs.some((s: any) => Number(s.specPrice ?? s.specMemberPrice) > 0), level: 'must', tab: 'sku' },
    { key: 'sku', label: 'SKU 规格', ok: specs.length > 0, level: 'must', tab: 'sku' },
    { key: 'defaultSku', label: '默认 SKU', ok: specs.some((s: any) => Number(s.isDefault) === 1) || specs.length === 1, level: 'must', tab: 'sku' },
    { key: 'stock', label: '库存', ok: specs.some((s: any) => Number(s.specStock) > 0) || Number(product?.specStock) > 0, level: 'must', tab: 'sku' },
    { key: 'category', label: '分类路径', ok: !!product?.categoryPath, level: 'suggest', tab: 'attrs' },
    { key: 'brand', label: '品牌', ok: !!product?.brand, level: 'suggest', tab: 'base' },
    { key: 'size', label: 'SKU 尺寸', ok: specs.some((s: any) => s.length || s.width || s.height), level: 'suggest', tab: 'sku' },
    { key: 'material', label: '面料/填充/框架', ok: specs.some((s: any) => s.fabricMaterial || s.fillingMaterial || s.frameMaterial || s.mainMaterial), level: 'suggest', tab: 'attrs' },
    { key: 'env', label: '环保等级', ok: specs.some((s: any) => !!s.environmentalGrade), level: 'suggest', tab: 'attrs' },
    { key: 'detailImages', label: '详情图', ok: Array.isArray(product?.detailImages) && product.detailImages.length >= 3, level: 'suggest', tab: 'media' },
    { key: 'video', label: '宣传视频', ok: !!product?.videoUrl, level: 'suggest', tab: 'media' },
    { key: 'model3d', label: '3D 模型', ok: !!product?.model3dUrl, level: 'suggest', tab: 'media' },
    { key: 'desc', label: '商品详情文案', ok: !!product?.productDescription, level: 'suggest', tab: 'detail' },
  ]

  const done = items.filter((i) => i.ok).length
  const score = Math.round((done / items.length) * 100)
  const mustFail = items.filter((i) => i.level === 'must' && !i.ok)
  const suggestFail = items.filter((i) => i.level === 'suggest' && !i.ok)

  return { score, items, mustFail, suggestFail, canSubmit: mustFail.length === 0 }
}

/** 列表行轻量完整度（无 specs 详情时用列表字段估算） */
export function calcListCompleteness(row: any) {
  const checks = [
    !!(row?.productName && row?.productCode),
    !!row?.mainImage,
    Number(row?.memberPrice ?? row?.retailPrice) > 0,
    Number(row?.specStock) > 0 || row?.specCount > 0,
    !!row?.categoryPath,
    !!row?.brand,
    !!row?.videoUrl,
    !!row?.model3dUrl,
    Array.isArray(row?.detailImages) && row.detailImages.length > 0,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export function isMissingMaterial(row: any) {
  const score = calcListCompleteness(row)
  return score < 70 || !row?.mainImage || !(Number(row?.memberPrice ?? row?.retailPrice) > 0)
}

/** 列表用：资料缺口文案（基于现有字段） */
export function listMissingReasons(row: any): string[] {
  const reasons: string[] = []
  if (!row?.mainImage) reasons.push('缺主图')
  if (!(Number(row?.memberPrice ?? row?.retailPrice) > 0)) reasons.push('缺价格')
  if (!row?.categoryPath) reasons.push('缺分类')
  if (!(Number(row?.specStock) > 0 || Number(row?.specCount) > 0)) reasons.push('缺库存/SKU')
  if (!row?.brand) reasons.push('缺品牌')
  if (!row?.videoUrl) reasons.push('缺视频')
  if (!row?.model3dUrl) reasons.push('缺3D')
  return reasons
}
