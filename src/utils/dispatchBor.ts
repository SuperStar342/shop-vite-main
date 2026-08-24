/**
 * BOR（工单工序）字段归一化与工价/工时估算。
 * 兼容接口大小写与历史字段别名，供普通/快捷派工页面使用。
 */
import { fmtNum, num } from '/@/utils/dispatchAlloc'

/** 从接口行中按别名取字段（兼容大小写/旧字段） */
export const pickBorField = (row: any, ...keys: string[]) => {
  if (!row || typeof row !== 'object') return undefined
  for (const k of keys) {
    const v = row[k]
    if (v != null && v !== '') return v
  }
  return undefined
}

/** BOR 行唯一键（与后端 lineMatchKey 一致） */
export const borLineKey = (row: any) =>
  `${row?.woNo || ''}|${row?.mrCode || ''}|${row?.prcCode || ''}|${row?.goodsId ?? ''}|${row?.woBorSno || ''}`

/** 归一化 BOR 工序行，确保工价/计薪/工时等字段类型与命名一致 */
export const normalizeBorLine = (raw: any) => {
  if (!raw || typeof raw !== 'object') return raw
  const machiningUp = num(pickBorField(raw, 'machiningUp', 'machiningUP', 'fMachiningUP'))
  const machiningTime = num(pickBorField(raw, 'machiningTime', 'fMachiningTime'))
  const machiningTimes = num(pickBorField(raw, 'machiningTimes', 'fMachiningTimes')) || 1
  const pWageType = String(pickBorField(raw, 'pWageType', 'pwageType', 'fPWageType') ?? '').trim()
  const timeUnit = String(pickBorField(raw, 'timeUnit', 'fTimeUnit') ?? '').trim()
  const woQty = num(pickBorField(raw, 'woQty', 'planQty', 'fWOQty'))
  const wtQty = num(pickBorField(raw, 'wtQty', 'fWTQty'))
  const remainRaw = pickBorField(raw, 'remainQty')
  const remainQty =
    remainRaw != null && remainRaw !== ''
      ? num(remainRaw)
      : Math.max(0, woQty - wtQty)

  return {
    ...raw,
    woNo: String(pickBorField(raw, 'woNo', 'fWONo') ?? '').trim(),
    moNo: String(pickBorField(raw, 'moNo', 'fMONo') ?? '').trim(),
    mrCode: String(pickBorField(raw, 'mrCode', 'fMRCode') ?? '').trim(),
    mrName: String(pickBorField(raw, 'mrName', 'fmrname', 'fMRName') ?? '').trim(),
    prcCode: String(pickBorField(raw, 'prcCode', 'fPrcCode') ?? '').trim(),
    prcName: String(pickBorField(raw, 'prcName', 'fPrcName') ?? '').trim(),
    goodsId: pickBorField(raw, 'goodsId', 'fGoodsID'),
    goodsCode: String(pickBorField(raw, 'goodsCode', 'fGoodsCode') ?? '').trim(),
    goodsName: String(pickBorField(raw, 'goodsName', 'fGoodsName') ?? '').trim(),
    woBorSno: String(pickBorField(raw, 'woBorSno', 'fWoBorSno') ?? '').trim(),
    workSNo: pickBorField(raw, 'workSNo', 'fWorkSNo'),
    machiningUp,
    machiningTime,
    machiningTimes,
    pWageType,
    timeUnit,
    woQty,
    wtQty,
    remainQty,
    fnQty: num(pickBorField(raw, 'fnQty', 'fFnQty')),
    unitCode: String(pickBorField(raw, 'unitCode', 'fUnitCode') ?? '').trim(),
    machiningDesc: String(pickBorField(raw, 'machiningDesc', 'fMachiningDesc') ?? '').trim(),
  }
}

export const normalizeBorLines = (rows: any[]) =>
  (rows || []).map(normalizeBorLine).filter((l) => num(l?.remainQty) > 0)

/** SF：1 计时 / 2 计件 */
export const wageTypeLabel = (v: any) => {
  const t = String(v ?? '').trim()
  if (t === '1') return '计时'
  if (t === '2') return '计件'
  return t || '-'
}

const TIME_UNIT_LABEL: Record<string, string> = {
  S: '秒',
  H: '小时',
  M: '分',
  D: '天',
}

export const timeUnitLabel = (unit?: any) => {
  const u = String(unit ?? '').trim().toUpperCase()
  return TIME_UNIT_LABEL[u] || u
}

/** 加工工时展示（带单位中文） */
export const fmtMachiningTime = (time: any, unit?: any) => {
  const t = num(time)
  if (t <= 0) return '-'
  const u = String(unit ?? '').trim()
  if (!u) return fmtNum(t)
  return `${fmtNum(t)}${timeUnitLabel(u)}`
}

/** 将加工工时换算为秒 */
export const toWorkSeconds = (time: any, unit?: any) => {
  const t = num(time)
  if (t <= 0) return 0
  const u = String(unit ?? '').trim().toUpperCase()
  if (u === 'H') return t * 3600
  if (u === 'M') return t * 60
  if (u === 'D') return t * 86400
  return t
}

/** 工序标准预计工时（秒）= 加工工时 × 加工次数 */
export const estimateBorWorkSeconds = (line: any) => {
  const time = toWorkSeconds(line?.machiningTime, line?.timeUnit)
  const times = num(line?.machiningTimes) || 1
  return time * times
}

/** 预计工时展示（秒；为 0 显示 -） */
export const fmtWorkSeconds = (sec: number) => {
  if (!sec || sec <= 0) return '-'
  return `${fmtNum(sec)}秒`
}

const uniqueTexts = (values: string[]) => [...new Set(values.filter(Boolean))]

/** 合并多行时的工价摘要（单价/计薪/工时不混写为单一值） */
export const summarizeBorWageFields = (lines: any[]) => {
  const ups = uniqueTexts(lines.map((l) => fmtNum(l.machiningUp)))
  const types = uniqueTexts(lines.map((l) => wageTypeLabel(l.pWageType)))
  const times = uniqueTexts(lines.map((l) => fmtMachiningTime(l.machiningTime, l.timeUnit)))
  const upMixed = ups.length > 1
  return {
    wageTypeText: types.length <= 1 ? types[0] || '-' : types.join('/'),
    upText: upMixed ? `${ups[0]}~${ups[ups.length - 1]}` : ups[0] || '0',
    upMixed,
    timeText: times.length <= 1 ? times[0] || '-' : '多项',
    estWageByQty: (qtyByLineKey: Map<string, number> | null, fallbackQty: number) => {
      if (qtyByLineKey) {
        return lines.reduce(
          (s, l) => s + estimateBorWage(l, num(qtyByLineKey.get(borLineKey(l)) || 0)),
          0
        )
      }
      if (lines.length === 1) return estimateBorWage(lines[0], fallbackQty)
      return lines.reduce((s, l) => s + estimateBorWage(l), 0)
    },
  }
}

/** 预估工费：计件=单价×数量×次数；计时=单价×工时×次数×数量 */
export const estimateBorWage = (line: any, qty?: number) => {
  const q = qty != null ? num(qty) : num(line?.remainQty)
  if (q <= 0) return 0
  const up = num(line?.machiningUp)
  const times = num(line?.machiningTimes) || 1
  const time = num(line?.machiningTime)
  const wageType = String(line?.pWageType ?? '').trim()
  if (wageType === '1') {
    if (time > 0) return up * time * times * q
    return up * q
  }
  return up * q * times
}

/** 工序树/列表副标题：计薪 · 单价 · 工时 */
export const borWageBrief = (line: any) => {
  const n = normalizeBorLine(line)
  return `${wageTypeLabel(n.pWageType)} · 单价 ${fmtNum(n.machiningUp)} · 工时 ${fmtMachiningTime(n.machiningTime, n.timeUnit)}`
}
