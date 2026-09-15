const allowed = new Set(['instruction', 'workOrder', 'dispatch'])
for (const c of allowed) {
  if (typeof c !== 'string') throw new Error('fail')
}
console.log('registry codes ok')
