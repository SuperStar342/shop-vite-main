import { pinyin } from 'pinyin-pro'

/** 纯字母关键词，按拼音检索 */
export const isPinyinLikeKeyword = (keyword: string) => /^[a-zA-Z]+$/.test(String(keyword || '').trim())

const nameSyllables = (text: string) =>
  pinyin(String(text || ''), { toneType: 'none', type: 'array', v: true }).map((s) =>
    String(s).toLowerCase().replace(/\s+/g, '')
  )

/**
 * 全拼音严格匹配（按音节边界，避免 zhang 误匹配「真」zhen）：
 * - 全拼：从某一字起连续拼接后以关键词为前缀（zhang → 张献 / 张华兰）
 * - 首字母：连续首字母前缀（zs → 张三）
 */
export const matchByFullPinyin = (text: string, keyword: string) => {
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw || !text || !isPinyinLikeKeyword(kw)) return false
  const syllables = nameSyllables(text).filter(Boolean)
  if (!syllables.length) return false

  for (let i = 0; i < syllables.length; i++) {
    if (syllables.slice(i).join('').startsWith(kw)) return true
  }

  const initials = syllables.map((s) => s.charAt(0)).join('')
  for (let i = 0; i < initials.length; i++) {
    if (initials.slice(i).startsWith(kw)) return true
  }
  return false
}

/**
 * 人员关键词：工号 / 姓名汉字 / 部门汉字，或姓名全拼/首字母
 */
export const matchEmpByKeyword = (
  row: { empNo?: string; empName?: string; deptName?: string; deptCode?: string },
  keyword: string
) => {
  const kw = String(keyword || '').trim()
  if (!kw) return true
  const lower = kw.toLowerCase()
  const empNo = String(row.empNo || '').toLowerCase()
  const empName = String(row.empName || '')
  const deptName = String(row.deptName || '')
  const deptCode = String(row.deptCode || '').toLowerCase()

  if (empNo.includes(lower) || empName.includes(kw) || deptName.includes(kw) || deptCode.includes(lower)) {
    return true
  }

  if (isPinyinLikeKeyword(kw)) {
    return matchByFullPinyin(empName, kw)
  }
  return false
}

export const filterEmpsByKeyword = <T extends { empNo?: string; empName?: string; deptName?: string; deptCode?: string }>(
  rows: T[],
  keyword: string
) => {
  const kw = String(keyword || '').trim()
  if (!kw) return rows
  return (rows || []).filter((row) => matchEmpByKeyword(row, kw))
}

export const filterDeptsByKeyword = <T extends { deptName?: string; deptCode?: string }>(rows: T[], keyword: string) => {
  const kw = String(keyword || '').trim()
  if (!kw) return rows
  const lower = kw.toLowerCase()
  return (rows || []).filter((row) => {
    const name = String(row.deptName || '')
    const code = String(row.deptCode || '').toLowerCase()
    if (name.includes(kw) || code.includes(lower)) return true
    if (isPinyinLikeKeyword(kw)) return matchByFullPinyin(name, kw)
    return false
  })
}
