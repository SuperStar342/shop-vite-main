# Hiprint 报表设计器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 封装可复用的 Hiprint 报表弹窗（设计 | 预览 | 打印），制令页接入；模板先存 localStorage，预留后端读写。

**Architecture:** `HiprintReportDialog` 统一 UI；`core.ts` 负责 hiprint/jquery 生命周期；`storage.ts` 管本地模板；各业务用 `providers/*` + `templates/*` 注入字段与默认布局。制令页只传 `reportKey` / providers / defaultTemplate / printData。

**Tech Stack:** Vue 3 + Element Plus + `vue-plugin-hiprint@0.0.60` + jQuery 3.7.1；路径别名 `/@/`。

**Spec:** `docs/superpowers/specs/2026-09-11-hiprint-report-designer-design.md`

## Global Constraints

- 提交说明必须中文（可用 `feat`/`fix`/`refactor`/`docs`/`chore` 前缀）。
- 本地键名：`hiprint:tpl:${reportKey}`。
- 纸张默认 A4 竖版；元素坐标单位 pt，纸张宽高 mm（与现有踩坑一致）。
- 动态 `import('vue-plugin-hiprint')` / `import('jquery')`，勿静态打进无关主路径。
- 首版不做：后端持久化、权限、多模板、独立报表中心页。
- 仓库无 vitest/jest：纯函数用 Node 断言脚本验证；UI 用手动验收清单。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `src/utils/hiprint/storage.ts` | localStorage 读写/清除；`resolveTemplate` 合并远程钩子 |
| `src/utils/hiprint/core.ts` | jquery/hiprint 初始化、设计器、预览 HTML、打印、缩放 |
| `src/utils/hiprint/providers/common.ts` | 通用拖拽元素 provider 工厂 |
| `src/utils/hiprint/providers/instructionSheet.ts` | 生产指令单业务字段 provider |
| `src/utils/hiprint/templates/instructionSheet.ts` | 默认模板 JSON（由现有布局构建后 `getJson`） |
| `src/utils/hiprint/instructionSheet.ts` | 保留 `InstructionPrintRow` / `mapItemsToPrintRows` / `buildInstructionPrintData`；删除页面级 preview-only API |
| `src/components/hiprint/HiprintReportDialog.vue` | 通用弹窗：设计\|预览 Tab + 保存/恢复/打印 |
| `src/views/procurement/instruction/index.vue` | 接入通用弹窗，移除旧预览弹窗逻辑 |

---

### Task 1: 模板存储 `storage.ts`

**Files:**
- Create: `src/utils/hiprint/storage.ts`
- Create: `scripts/verify-hiprint-storage.mjs`（一次性断言，验证后可保留）

**Interfaces:**
- Produces:
  - `storageKey(reportKey: string): string` → ``hiprint:tpl:${reportKey}``
  - `loadLocalTemplate(reportKey: string): Record<string, unknown> | null`
  - `saveLocalTemplate(reportKey: string, template: unknown): void`
  - `clearLocalTemplate(reportKey: string): void`
  - `resolveTemplate(options: { reportKey: string; defaultTemplate: unknown; onLoadTemplate?: (key: string) => Promise<unknown | null> }): Promise<unknown>`

- [ ] **Step 1: 实现 storage.ts**

```ts
const PREFIX = 'hiprint:tpl:'

export const storageKey = (reportKey: string) => `${PREFIX}${reportKey}`

export const loadLocalTemplate = (reportKey: string): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(storageKey(reportKey))
    if (!raw) return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export const saveLocalTemplate = (reportKey: string, template: unknown): void => {
  localStorage.setItem(storageKey(reportKey), JSON.stringify(template))
}

export const clearLocalTemplate = (reportKey: string): void => {
  localStorage.removeItem(storageKey(reportKey))
}

export const resolveTemplate = async (options: {
  reportKey: string
  defaultTemplate: unknown
  onLoadTemplate?: (key: string) => Promise<unknown | null>
}): Promise<unknown> => {
  if (options.onLoadTemplate) {
    const remote = await options.onLoadTemplate(options.reportKey)
    if (remote != null) return remote
  }
  return loadLocalTemplate(options.reportKey) ?? options.defaultTemplate
}
```

- [ ] **Step 2: 写 Node 断言脚本并跑通**

`scripts/verify-hiprint-storage.mjs`：用内存假 `localStorage` 测 key / save / load / clear / resolve 优先级（远程 > 本地 > default）。因 `storage.ts` 依赖浏览器 `localStorage`，脚本内联同等逻辑做断言，或复制函数到脚本验证契约。

Run: `node scripts/verify-hiprint-storage.mjs`  
Expected: 打印 `storage ok` 且 exit 0。

- [ ] **Step 3: Commit**

```bash
git add src/utils/hiprint/storage.ts scripts/verify-hiprint-storage.mjs
git commit -m "feat: 新增 hiprint 模板本地存储工具"
```

---

### Task 2: 核心引擎 `core.ts`

**Files:**
- Create: `src/utils/hiprint/core.ts`
- 从 `instructionSheet.ts` 迁入 `fitPreviewToContainer`

**Interfaces:**
- Consumes: `vue-plugin-hiprint`, `jquery`, `/@/styles/hiprint-print-lock.css`
- Produces:
  - `ensureJquery(): Promise<any>`
  - `initHiprint(providers: Array<{ addElementTypes: Function }>): Promise<any>`
  - `createPrintTemplate(options: { template?: unknown; settingContainer?: string }): Promise<any>`
  - `designTemplate(tpl: any, containerSelector: string): void`
  - `buildProviderPanel($container: any, moduleName: string): Promise<void>`
  - `renderPreview(container: HTMLElement, tpl: any, printData: unknown): Promise<void>`
  - `printWithTemplate(tpl: any, printData: unknown): void`
  - `fitPreviewToContainer(container: HTMLElement): void`
  - 常量：`A4_W = 595.28`, `A4_H = 841.89`

- [ ] **Step 1: 实现 core.ts**

```ts
import '/@/styles/hiprint-print-lock.css'

export const A4_W = 595.28
export const A4_H = 841.89

export const ensureJquery = async () => {
  const jquery = (await import('jquery')).default
  const w = window as any
  w.$ = jquery
  w.jQuery = jquery
  return jquery
}

export const initHiprint = async (providers: any[] = []) => {
  await ensureJquery()
  const { hiprint } = await import('vue-plugin-hiprint')
  hiprint.init({ providers })
  return hiprint
}

export const createPrintTemplate = async (options: {
  template?: unknown
  settingContainer?: string
} = {}) => {
  const { hiprint } = await import('vue-plugin-hiprint')
  return new hiprint.PrintTemplate({
    template: options.template,
    settingContainer: options.settingContainer,
  })
}

export const designTemplate = (tpl: any, containerSelector: string) => {
  tpl.design(containerSelector)
}

export const buildProviderPanel = async ($container: any, moduleName: string) => {
  const { hiprint } = await import('vue-plugin-hiprint')
  $container.empty()
  hiprint.PrintElementTypeManager.build($container, moduleName)
}

export const renderPreview = async (container: HTMLElement, tpl: any, printData: unknown) => {
  const $ = await ensureJquery()
  const html = tpl.getHtml(printData) as any
  const $wrap = $('<div class="hiprint-printPagination hiprint-report-preview-fit"/>')
  if (html) $wrap.append(html)
  $(container).empty().append($wrap)
  requestAnimationFrame(() => {
    fitPreviewToContainer(container)
    requestAnimationFrame(() => fitPreviewToContainer(container))
  })
}

export const printWithTemplate = (tpl: any, printData: unknown) => {
  tpl.print(printData)
}

export const fitPreviewToContainer = (container: HTMLElement) => {
  const paper = container.querySelector('.hiprint-printPaper') as HTMLElement | null
  if (!paper) return
  const wrap = paper.parentElement as HTMLElement | null
  const avail = container.clientWidth - 8
  const paperW = paper.offsetWidth || A4_W
  if (avail <= 0 || paperW <= 0) return
  const scale = Math.min(avail / paperW, 2.4)
  paper.style.transformOrigin = 'top center'
  paper.style.transform = `scale(${scale})`
  paper.style.margin = '0 auto'
  if (wrap) {
    wrap.style.width = '100%'
    wrap.style.display = 'flex'
    wrap.style.justifyContent = 'center'
    wrap.style.minHeight = `${paper.offsetHeight * scale + 24}px`
    wrap.style.paddingTop = '8px'
  }
}
```

- [ ] **Step 2: 确认文件可被引用、无新增明显语法错误**

- [ ] **Step 3: Commit**

```bash
git add src/utils/hiprint/core.ts
git commit -m "feat: 新增 hiprint 核心设计/预览/打印工具"
```

---

### Task 3: Provider（通用 + 制令）

**Files:**
- Create: `src/utils/hiprint/providers/common.ts`
- Create: `src/utils/hiprint/providers/instructionSheet.ts`

**Interfaces:**
- Consumes: `hiprint` 命名空间（工厂入参，**不要**在工厂内 `init`）
- Produces:
  - `COMMON_MODULE = 'commonModule'`
  - `INSTRUCTION_MODULE = 'instructionModule'`
  - `createCommonProvider(hiprint: any)`
  - `createInstructionSheetProvider(hiprint: any)`

- [ ] **Step 1: 实现 common provider**

元素至少：文本 `text`、长文 `longText`、表格 `table`、横线 `hline`、竖线 `vline`、矩形 `rect`。  
`tid` 形如 `commonModule.text`；`addElementTypes` 开头 `context.removePrintElementTypes('commonModule')`。

- [ ] **Step 2: 实现 instruction provider**

业务字段（`type: 'text'`，表格一项 `type: 'table'`）：

| tid | field | title |
|-----|-------|-------|
| `instructionModule.ordNo` | `ordNo` | 订单号 |
| `instructionModule.custOrdNo` | `custOrdNo` | 客户订单号 |
| `instructionModule.custName` | `custName` | 客户 |
| `instructionModule.styleCode` | `styleCode` | 生产款式 |
| `instructionModule.goodsName` | `goodsName` | 产品名称 |
| `instructionModule.fabricCode` | `fabricCode` | 面料编号 |
| `instructionModule.clrCode` | `clrCode` | 颜色 |
| `instructionModule.moQty` | `moQty` | 订单数量 |
| `instructionModule.reqDate` | `reqDate` | 要求生产交期 |
| `instructionModule.deliveryDate` | `deliveryDate` | 交货日期 |
| `instructionModule.remark` | `remark` | 生产备注 |
| `instructionModule.printDate` | `printDate` | 打印日期 |
| `instructionModule.pageInfo` | `pageInfo` | 页次 |
| `instructionModule.table` | `table` | 明细表格 |

明细表格 `columns` 与现 `COLS` 宽度一致（合计铺满内容区）。

- [ ] **Step 3: Commit**

```bash
git add src/utils/hiprint/providers/
git commit -m "feat: 新增 hiprint 通用与制令字段 provider"
```

---

### Task 4: 默认模板 + 制令数据辅助瘦身

**Files:**
- Create: `src/utils/hiprint/templates/instructionSheet.ts`
- Modify: `src/utils/hiprint/instructionSheet.ts`

**Interfaces:**
- Produces:
  - `INSTRUCTION_REPORT_KEY = 'instruction-sheet'`
  - `buildInstructionSheetDefaultTemplate(): Promise<unknown>` — 现有布局构建后 `tpl.getJson()`
  - `buildInstructionPrintData(rows: InstructionPrintRow[]): { printDate: string; pageInfo: string; table: InstructionPrintRow[] }`
- Keep: `InstructionPrintRow`, `mapItemsToPrintRows`
- Remove: `renderInstructionSheetPreview`, `printInstructionSheet`, `fitPreviewToContainer`, `buildTemplate`

- [ ] **Step 1: 迁默认布局到 templates**

将现 `instructionSheet.ts` 中 `COLS`、`MARGIN`、`CONTENT_W`、`buildTemplate` 的 panel 元素迁到 `templates/instructionSheet.ts`，最后 `return tpl.getJson()`。纸张 `width: 210, height: 297`。使用 `core` 的 `ensureJquery` / 动态 import hiprint（**不要**在此 `init` 带 providers）。

```ts
export const INSTRUCTION_REPORT_KEY = 'instruction-sheet'

export const buildInstructionSheetDefaultTemplate = async (): Promise<unknown> => {
  await ensureJquery()
  const { hiprint } = await import('vue-plugin-hiprint')
  const tpl = new hiprint.PrintTemplate()
  // ... 现有 Logo / 公司名 / 标题 / 打印日期 / 页次 / table
  return tpl.getJson()
}
```

- [ ] **Step 2: 瘦身 instructionSheet.ts**

仅保留类型、`mapItemsToPrintRows`、`buildInstructionPrintData`（原 `buildPrintData` + `withTotalRow`）。

- [ ] **Step 3: Commit**

```bash
git add src/utils/hiprint/templates/instructionSheet.ts src/utils/hiprint/instructionSheet.ts
git commit -m "refactor: 制令默认模板迁出并瘦身打印辅助"
```

---

### Task 5: 通用组件 `HiprintReportDialog.vue`

**Files:**
- Create: `src/components/hiprint/HiprintReportDialog.vue`

**Interfaces:**
- Consumes: Task 1–2 API；Element Plus Dialog/Tabs/Button/MessageBox
- Props:

```ts
defineProps<{
  modelValue: boolean
  title?: string
  reportKey: string
  providers: Array<{ addElementTypes: (...args: any[]) => void }>
  providerModules: string[]
  defaultTemplate: unknown
  printData: Record<string, unknown>
  onLoadTemplate?: (key: string) => Promise<unknown | null>
  onSaveTemplate?: (key: string, json: unknown) => Promise<void>
}>()
defineEmits<{ 'update:modelValue': [boolean] }>()
```

- [ ] **Step 1: UI 骨架**

- `el-dialog`：`width="1100px"`，`top="4vh"`，`append-to-body`，`destroy-on-close`，`class="hiprint-report-dialog"`
- `el-tabs`：设计 / 预览
- 设计三栏：左 provider、中 design、右 setting（所有 DOM id 带组件 `uid`，防多实例冲突）
- footer：保存模板、恢复默认、打印、关闭

- [ ] **Step 2: @opened 初始化**

1. `templateJson = await resolveTemplate(...)`
2. `await initHiprint(providers)`
3. 对各 `providerModules`：`buildProviderPanel`
4. `tpl = await createPrintTemplate({ template: templateJson, settingContainer: '#...setting...' })`
5. `designTemplate(tpl, '#...design...')`
6. `savedSnapshot = JSON.stringify(tpl.getJson())`

- [ ] **Step 3: Tab 切换**

- → 预览：`getJson()` 后 `renderPreview` + `fitPreviewToContainer`
- → 设计：用内存 JSON 重新 `design`，不读 localStorage

- [ ] **Step 4: 保存 / 恢复 / 打印 / 关闭**

- 保存：`saveLocalTemplate` + 可选 `onSaveTemplate`；更新 snapshot
- 恢复：确认 → `clearLocalTemplate` → 用 `defaultTemplate` 重建
- 打印：`printWithTemplate(tpl, printData)`（先同步最新 getJson 到 tpl）
- 关闭：dirty 时 `ElMessageBox.confirm`

- [ ] **Step 5: 样式**

`max-height: 88vh`；设计区中间可滚动灰底；预览区禁止表头竖排（`:deep` 覆盖 writing-mode）。

- [ ] **Step 6: Commit**

```bash
git add src/components/hiprint/HiprintReportDialog.vue
git commit -m "feat: 新增 Hiprint 报表设计/预览通用弹窗"
```

---

### Task 6: 制令页接入

**Files:**
- Modify: `src/views/procurement/instruction/index.vue`

**Interfaces:**
- Consumes: Dialog + Task 3–4 导出

- [ ] **Step 1: 替换弹窗**

```vue
<HiprintReportDialog
  v-model="printVisible"
  title="生产指令单"
  :report-key="INSTRUCTION_REPORT_KEY"
  :providers="printProviders"
  :provider-modules="[COMMON_MODULE, INSTRUCTION_MODULE]"
  :default-template="instructionDefaultTemplate"
  :print-data="printData"
/>
```

- [ ] **Step 2: 脚本接入**

```ts
const printVisible = ref(false)
const printLoading = ref(false)
const printData = ref<Record<string, unknown>>({ table: [] })
const printProviders = ref<any[]>([])
const instructionDefaultTemplate = ref<unknown>(null)

const ensurePrintSetup = async () => {
  if (instructionDefaultTemplate.value && printProviders.value.length) return
  const { hiprint } = await import('vue-plugin-hiprint')
  printProviders.value = [
    createCommonProvider(hiprint),
    createInstructionSheetProvider(hiprint),
  ]
  instructionDefaultTemplate.value = await buildInstructionSheetDefaultTemplate()
}

const openPrint = async () => {
  printLoading.value = true
  try {
    const rows = await loadPrintRows()
    if (!rows.length) return
    await ensurePrintSetup()
    printData.value = buildInstructionPrintData(rows)
    printVisible.value = true
  } catch (e: any) {
    $baseMessage(e?.message || '准备打印数据失败', 'error', 'hey')
  } finally {
    printLoading.value = false
  }
}
```

删除：`printPreviewRef`、`onPrintDialogOpened`、`doPrint`、旧 preview/print/fit import、页面内旧 print dialog 样式。

页面 **不要** 先 `initHiprint([])`；仅 import `hiprint` 命名空间建 provider，由 Dialog 内统一 `initHiprint(providers)`。

- [ ] **Step 3: 手动验收**

1. 设计可拖元素，属性生效  
2. 预览有制令数据  
3. 保存后重开仍在  
4. 恢复默认成功  
5. 打印与预览一致  

- [ ] **Step 4: Commit**

```bash
git add src/views/procurement/instruction/index.vue
git commit -m "feat: 制令管理接入 hiprint 报表设计弹窗"
```

---

### Task 7: 收尾清理

**Files:**
- Grep 全库清理死引用
- Optional: spec 状态改为「已实现」

- [ ] **Step 1: Grep**

搜索 `renderInstructionSheetPreview|printInstructionSheet|fitPreviewToContainer`，确保无业务引用。

- [ ] **Step 2: 再走一遍验收清单**

- [ ] **Step 3: 若有清理则 Commit**

```bash
git add -u src/utils/hiprint src/components/hiprint src/views/procurement/instruction
git commit -m "chore: 清理旧制令预览打印 API 引用"
```

---

## Spec Coverage Checklist

| Spec 项 | Task |
|---------|------|
| 设计\|预览 Tab 同弹窗 | 5 |
| 通用组件 + 配置接入 | 5–6 |
| localStorage + 预留 onLoad/onSave | 1、5 |
| 通用 + 业务 provider | 3 |
| 默认模板迁移 | 4 |
| 制令页替换 | 6 |
| A4 / pt / 动态 import | 2、4、Global |
| 非目标未做 | 全任务遵守 |

---

Plan complete and saved to `docs/superpowers/plans/2026-09-11-hiprint-report-designer.md`. Two execution options:

**1. Subagent-Driven（推荐）** — 每任务派生子代理，任务间复审，迭代快  

**2. Inline Execution** — 本会话按 executing-plans 连续执行并设检查点  

Which approach?
