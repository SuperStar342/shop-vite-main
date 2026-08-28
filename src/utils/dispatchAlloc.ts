/**
 * 派工分配工具：比例↔数量联动、按工费拆分到工单行、派工状态文案。
 * 普通派工 / 快捷派工共用。
 */
/** 数值安全转换 */
export const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 展示用数字格式（去多余小数 0） */
export const fmtNum = (v: any) => {
  const n = num(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

/** 任务行上的工人份额：ratio 为占未派量的百分比，planQty 为本次派量 */
export type AllocWorker = { empNo: string; empName?: string; deptName?: string; ratio?: number; planQty: number }

/**
 * 按权重把总量分给 N 人。
 * 总量为整数时用「最大余数法」保证每人份数为整数且合计精确。
 */
export const distributeByWeights = (total: number, weights: number[]) => {
  const n = weights.length
  if (!n || total <= 0) return weights.map(() => 0)
  const wSum = weights.reduce((s, w) => s + Math.max(0, num(w)), 0) || n
  const preferInteger = Math.abs(total - Math.round(total)) < 0.000001
  if (!preferInteger) {
    let assigned = 0
    return weights.map((w, i) => {
      if (i === n - 1) return Number((total - assigned).toFixed(2))
      const q = Number(((total * Math.max(0, num(w))) / wSum).toFixed(2))
      assigned += q
      return q
    })
  }
  const intTotal = Math.round(total)
  const parts = weights.map((w) => {
    const exact = (intTotal * Math.max(0, num(w))) / wSum
    const floor = Math.floor(exact)
    return { floor, frac: exact - floor }
  })
  let left = intTotal - parts.reduce((s, p) => s + p.floor, 0)
  parts
    .slice()
    .sort((a, b) => b.frac - a.frac)
    .forEach((p) => {
      if (left > 0) {
        p.floor += 1
        left -= 1
      }
    })
  return parts.map((p) => p.floor)
}

const normalizeToSum = (parts: number[], target: number, preferInteger: boolean) => {
  const n = parts.length
  if (!n) return parts
  if (preferInteger) {
    const floors = parts.map((p) => Math.max(0, Math.floor(p)))
    let left = Math.round(target) - floors.reduce((s, v) => s + v, 0)
    const ordered = parts.map((p, i) => ({ i, frac: p - Math.floor(p) })).sort((a, b) => b.frac - a.frac)
    let k = 0
    while (left > 0 && ordered.length) {
      floors[ordered[k % ordered.length].i] += 1
      left -= 1
      k += 1
    }
    // 若超了（极少），从最大项扣
    while (left < 0) {
      const idx = floors.indexOf(Math.max(...floors))
      if (idx < 0 || floors[idx] <= 0) break
      floors[idx] -= 1
      left += 1
    }
    return floors
  }
  const sum = parts.reduce((s, v) => s + v, 0)
  if (sum <= 0)
    return distributeByWeights(
      target,
      parts.map(() => 1)
    )
  let assigned = 0
  return parts.map((p, i) => {
    if (i === n - 1) return Number((target - assigned).toFixed(2))
    const q = Number(((target * p) / sum).toFixed(2))
    assigned += q
    return q
  })
}

/**
 * 按未派量比例拆分（单价相同时与按工费拆分等价）。
 */
export const splitWorkersByRemain = <T extends { remainQty?: any }>(
  workers: AllocWorker[],
  lines: T[]
): { line: T; workers: AllocWorker[] }[] =>
  splitWorkersByWage(
    workers,
    lines.map((l) => ({ ...l, machiningUp: 1 }))
  )

/**
 * 按工费份额拆到各工单行（方案 A）：
 * 1) 先按未派量把「合计派量」摊到各行
 * 2) 以 planQty 为权重定每人工费目标
 * 3) 逐行按「剩余目标工费」比例切分该行数量，使 Σ(qty×单价) 尽量接近目标工费
 * 单价全部相同退化为按未派量比例。
 */
export const splitWorkersByWage = <T extends { remainQty?: any; machiningUp?: any }>(
  workers: AllocWorker[],
  lines: T[]
): { line: T; workers: AllocWorker[] }[] => {
  const list = (workers || []).filter((w) => w?.empNo && num(w.planQty) > 0)
  if (!list.length || !lines?.length) {
    return (lines || []).map((line) => ({ line, workers: [] as AllocWorker[] }))
  }

  const remains = lines.map((l) => Math.max(0, num(l.remainQty)))
  const ups = lines.map((l) => {
    const u = num(l.machiningUp)
    return u > 0 ? u : 1
  })
  const totalRemain = remains.reduce((s, n) => s + n, 0)
  const totalAssign = list.reduce((s, w) => s + num(w.planQty), 0)
  if (totalRemain <= 0 || totalAssign <= 0) {
    return lines.map((line) => ({ line, workers: [] as AllocWorker[] }))
  }

  const preferInteger = list.every((w) => Math.abs(num(w.planQty) - Math.round(num(w.planQty))) < 0.000001)
  const assignTotal = Math.min(totalAssign, totalRemain)
  // 各行先摊派量（按未派量权重）
  const lineQtys = distributeByWeights(assignTotal, remains)

  const lineWages = lineQtys.map((q, j) => q * ups[j])
  const totalWage = lineWages.reduce((s, n) => s + n, 0)
  const weights = list.map((w) => Math.max(0, num(w.planQty)))
  const wSum = weights.reduce((s, n) => s + n, 0) || list.length
  const remTarget = list.map((_, i) => (totalWage * weights[i]) / wSum)

  const matrix: number[][] = lines.map(() => list.map(() => 0))

  for (let j = 0; j < lines.length; j++) {
    const qj = lineQtys[j]
    if (qj <= 0) continue
    const up = ups[j]
    const tSum = remTarget.reduce((s, n) => s + Math.max(0, n), 0)
    let raw: number[]
    if (tSum <= 0.000001) {
      raw = distributeByWeights(
        qj,
        list.map(() => 1)
      ).map((n) => Number(n))
    } else {
      // 该行工费按剩余目标比例切，再换算数量
      raw = remTarget.map((t) => (qj * Math.max(0, t)) / tSum)
    }
    const qtys = normalizeToSum(raw, qj, preferInteger)
    qtys.forEach((q, i) => {
      matrix[j][i] = q
      remTarget[i] = Math.max(0, remTarget[i] - q * up)
    })
  }

  return lines.map((line, j) => ({
    line,
    workers: list
      .map((w, i) => ({
        empNo: w.empNo,
        empName: w.empName,
        deptName: w.deptName,
        ratio: num(w.ratio),
        planQty: matrix[j][i],
      }))
      .filter((w) => num(w.planQty) > 0),
  }))
}

/** ERP 派工状态：未派工 / 部分派工 / 已派工 */
export const resolveDispatchStatus = (remainQty: any, planQty: any, wtQty?: any, explicit?: string) => {
  const status = String(explicit || '').trim()
  if (status) return status
  const remain = num(remainQty)
  const plan = num(planQty)
  const wt = num(wtQty)
  if (wt <= 0 && remain >= plan) return '未派工'
  if (remain <= 0 && wt > 0) return '已派工'
  if (wt > 0 || (plan > 0 && remain < plan)) return '部分派工'
  return '未派工'
}

export const dispatchStatusKind = (status: string) => {
  if (status === '已派工') return 'done'
  if (status === '部分派工') return 'partial'
  return 'none'
}

/** 本次指派进度：未分配 / 部分分配 / 已分满 */
export const resolveAllocStatus = (assignedQty: any, remainQty: any) => {
  const assigned = num(assignedQty)
  const remain = num(remainQty)
  if (assigned <= 0) return '未分配'
  if (assigned >= remain) return '已分满'
  return '部分分配'
}

export const allocStatusKind = (status: string) => {
  if (status === '已分满') return 'done'
  if (status === '部分分配') return 'partial'
  return 'none'
}

/** 按比例重算每人数量（cap = 本行未派量） */
export const redistributeWorkersByRatio = (workers: AllocWorker[], cap: number) => {
  const list = workers || []
  if (!list.length || cap <= 0) return
  const preferInteger = Math.abs(cap - Math.round(cap)) < 0.000001
  if (preferInteger) {
    const intCap = Math.round(cap)
    const parts = list.map((w) => {
      const exact = (intCap * num(w.ratio)) / 100
      const floor = Math.floor(exact)
      return { w, floor, frac: exact - floor }
    })
    const ratioTotal = list.reduce((s, w) => s + num(w.ratio), 0)
    const targetSum = Math.min(intCap, Math.round((intCap * ratioTotal) / 100))
    let remain = targetSum - parts.reduce((s, p) => s + p.floor, 0)
    parts
      .slice()
      .sort((a, b) => b.frac - a.frac)
      .forEach((p) => {
        if (remain > 0) {
          p.floor += 1
          remain -= 1
        }
      })
    parts.forEach((p) => {
      p.w.planQty = p.floor
    })
  } else {
    list.forEach((w) => {
      w.planQty = Number(((cap * num(w.ratio)) / 100).toFixed(2))
    })
  }
}

/** 按已填数量反推比例（合计约 100%），与 redistributeWorkersByRatio 双向联动 */
export const syncWorkersRatioFromQty = (workers: AllocWorker[], cap: number) => {
  const list = workers || []
  if (!list.length) return
  if (list.length === 1 && cap > 0) {
    list[0].ratio = Math.min(100, Math.max(0, Math.round((num(list[0].planQty) / cap) * 100)))
    return
  }
  const sum = list.reduce((s, w) => s + num(w.planQty), 0)
  if (sum <= 0) {
    list.forEach((w) => {
      w.ratio = 0
    })
    return
  }
  let assigned = 0
  list.forEach((w, i) => {
    if (i === list.length - 1) w.ratio = Math.max(0, 100 - assigned)
    else {
      const r = Math.round((num(w.planQty) / sum) * 100)
      w.ratio = r
      assigned += r
    }
  })
}

/** 平均分配比例并按 cap 写入每人 planQty */
export const applyEqualWorkers = (workers: AllocWorker[], cap: number) => {
  const list = workers || []
  const n = list.length
  if (!n) return
  const each = Math.floor(100 / n)
  list.forEach((w, i) => {
    w.ratio = i === n - 1 ? 100 - each * (n - 1) : each
  })
  redistributeWorkersByRatio(list, cap)
}
