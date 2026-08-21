/**
 * 从树形列表中剔除指定 id 节点（含子树重建 hasChildren）
 * 用于删除成功后本地更新，避免重新查询
 */
export function removeFromTree(nodes: any[] = [], idSet: Set<string>): any[] {
  return (nodes || [])
    .filter((n) => !idSet.has(String(n.id)))
    .map((n) => {
      if (!Array.isArray(n.children) || !n.children.length) {
        return { ...n, children: undefined, hasChildren: false, childCount: 0 }
      }
      const children = removeFromTree(n.children, idSet)
      return {
        ...n,
        children: children.length ? children : undefined,
        hasChildren: children.length > 0,
        childCount: children.length,
      }
    })
}

/** 扁平列表按 id 剔除 */
export function removeFromList(list: any[] = [], idSet: Set<string>, idKey = 'id') {
  return (list || []).filter((item) => !idSet.has(String(item?.[idKey] ?? '')))
}

export function toIdSet(ids: string | number | Array<string | number>): Set<string> {
  const raw = Array.isArray(ids) ? ids.join(',') : String(ids ?? '')
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}
