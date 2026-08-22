/** 数值安全转换 */
export const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export const fmtNum = (v: any) => {
  const n = num(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

export type AllocWorker = { empNo: string; empName?: string; deptName?: string; ratio?: number; planQty: number }

/**
 * 把一组工人的总量，按目标 remain 拆到各行（按未派量比例）。
 * workers.planQty 为合并行上的「合计派量」；返回每行对应的 workers（planQty 已拆分）。
 */
export const splitWorkersByRemain = <T extends { remainQty?: any }>(
  workers: AllocWorker[],
  lines: T[]
): { line: T; workers: AllocWorker[] }[] => {
  const list = (workers || []).filter((w) => w?.empNo && num(w.planQty) > 0)
  if (!list.length || !lines?.length) {
    return (lines || []).map((line) => ({ line, workers: [] as AllocWorker[] }))
  }

  const remains = lines.map((l) => Math.max(0, num(l.remainQty)))
  const totalRemain = remains.reduce((s, n) => s + n, 0)
  if (totalRemain <= 0) {
    return lines.map((line) => ({ line, workers: [] as AllocWorker[] }))
  }

  return lines.map((line, idx) => {
    const remain = remains[idx]
    const preferInteger = list.every((w) => Math.abs(num(w.planQty) - Math.round(num(w.planQty))) < 0.000001)
    const lineWorkers = list
      .map((w) => {
        const exact = (num(w.planQty) * remain) / totalRemain
        const planQty = preferInteger ? Math.floor(exact) : Number(exact.toFixed(2))
        return {
          empNo: w.empNo,
          empName: w.empName,
          deptName: w.deptName,
          ratio: num(w.ratio),
          planQty,
          _frac: exact - Math.floor(exact),
        }
      })
      .filter((w) => num(w.planQty) > 0 || preferInteger)

    if (preferInteger) {
      // 余数按小数部分回补到各工人，使本行合计尽量贴近 round(合计 * remain/total)
      const targetSum = Math.round(
        (list.reduce((s, w) => s + num(w.planQty), 0) * remain) / totalRemain
      )
      let assigned = lineWorkers.reduce((s, w) => s + num(w.planQty), 0)
      const ordered = [...lineWorkers].sort((a, b) => b._frac - a._frac)
      let i = 0
      while (assigned < targetSum && ordered.length) {
        ordered[i % ordered.length].planQty += 1
        assigned += 1
        i += 1
      }
    }

    return {
      line,
      workers: lineWorkers
        .filter((w) => num(w.planQty) > 0)
        .map(({ empNo, empName, deptName, ratio, planQty }) => ({
          empNo,
          empName,
          deptName,
          ratio,
          planQty,
        })),
    }
  })
}

/** 按权重把整数总量分给 N 人 */
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
