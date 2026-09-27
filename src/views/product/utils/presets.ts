/** 家具品类常用预设，减少表单手输 */

export const COLOR_PRESETS = ['米白', '科技灰', '深咖', '胡桃', '墨绿', '燕麦', '原木色', '黑色']

export const SPEC_NAME_PRESETS: Record<string, string[]> = {
  sofa: ['单人位', '双人位', '三人位', '四人位', '贵妃位', '转角'],
  table: ['1.2米', '1.4米', '1.6米', '1.8米', '伸缩款'],
  chair: ['标准款', '带头枕', '网布款', '皮质款'],
  bed: ['1.5米', '1.8米', '2.0米'],
  custom: ['标准款', '升级款', '定制款'],
}

export const FABRIC_PRESETS = ['科技布', '棉麻', '真皮', '绒布', '猫抓布', '亚麻', '网布', '针织面料']
export const FILLING_PRESETS = ['高密度海绵', '乳胶', '羽绒', '记忆棉', '弹簧']
export const FRAME_PRESETS = ['松木框架', '橡木框架', '钢架', '实木框架', '板式']
export const MAIN_MATERIAL_PRESETS = ['实木复合', '全实木', '板式', '金属', '藤编', '弹簧']
export const ENV_PRESETS = ['E0', 'E1', 'F★★★★', 'ENF']
export const STYLE_PRESETS = ['现代简约', '北欧', '轻奢', '新中式', '意式']
export const SURFACE_PRESETS = ['水性漆', '开放漆', '哑光', '亮光', '油蜡']
export const SPACE_PRESETS = ['客厅', '卧室', '餐厅', '书房', '办公', '阳台']
export const TAG_PRESETS = ['小户型', '可定制', '送货安装', '环保', '北欧', '热销']

export type AttrPatch = {
  mainMaterial?: string
  fabricMaterial?: string
  fillingMaterial?: string
  frameMaterial?: string
  surfaceCraft?: string
  environmentalGrade?: string
  style?: string
  length?: number | null
  width?: number | null
  height?: number | null
}

/** 按品类模板 key 给出默认属性与尺寸，一点即填 */
export const TEMPLATE_ATTRS: Record<string, AttrPatch & { defaultSpecName: string; defaultPrice: number; colors: string[] }> = {
  sofa: {
    defaultSpecName: '三人位',
    defaultPrice: 2999,
    colors: ['米白'],
    mainMaterial: '实木复合',
    fabricMaterial: '科技布',
    fillingMaterial: '高密度海绵',
    frameMaterial: '松木框架',
    surfaceCraft: '水性漆',
    environmentalGrade: 'E0',
    style: '现代简约',
    length: 2100,
    width: 900,
    height: 850,
  },
  table: {
    defaultSpecName: '1.4米',
    defaultPrice: 1899,
    colors: ['原木色'],
    mainMaterial: '全实木',
    fabricMaterial: '',
    fillingMaterial: '',
    frameMaterial: '实木框架',
    surfaceCraft: '开放漆',
    environmentalGrade: 'E0',
    style: '北欧',
    length: 1400,
    width: 800,
    height: 750,
  },
  chair: {
    defaultSpecName: '标准款',
    defaultPrice: 899,
    colors: ['黑色'],
    mainMaterial: '金属',
    fabricMaterial: '网布',
    fillingMaterial: '高密度海绵',
    frameMaterial: '钢架',
    surfaceCraft: '哑光',
    environmentalGrade: 'E1',
    style: '现代简约',
    length: 680,
    width: 680,
    height: 1180,
  },
  bed: {
    defaultSpecName: '1.8米',
    defaultPrice: 2499,
    colors: ['米白'],
    mainMaterial: '弹簧',
    fabricMaterial: '针织面料',
    fillingMaterial: '乳胶',
    frameMaterial: '',
    surfaceCraft: '',
    environmentalGrade: 'E0',
    style: '现代简约',
    length: 2000,
    width: 1800,
    height: 280,
  },
  custom: {
    defaultSpecName: '标准款',
    defaultPrice: 999,
    colors: ['默认色'],
    mainMaterial: '',
    fabricMaterial: '',
    fillingMaterial: '',
    frameMaterial: '',
    surfaceCraft: '',
    environmentalGrade: '',
    style: '',
    length: null,
    width: null,
    height: null,
  },
}

export function retailFromMember(memberPrice: number | null | undefined) {
  const p = Number(memberPrice || 0)
  return p > 0 ? Math.round(p * 1.15) : null
}

export function specNamePresetsFor(tplKey?: string) {
  return SPEC_NAME_PRESETS[tplKey || 'custom'] || SPEC_NAME_PRESETS.custom
}
