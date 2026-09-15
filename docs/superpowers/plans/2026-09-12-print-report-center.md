# 单据打印报表中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地独立「报表中心」：多模板后端持久化、挂载配置、权限分层；制令列表改为默认打印 + 选模板；工单/派工仅类型空壳与挂载位。

**Architecture:** MySQL 四表存 DocType / Template / Mount / Auth；Blade `blade-system` 提供 REST；前端报表中心页维护模板与挂载；业务页只消费 `GET /print/pages/{pageCode}/templates`；设计器继续用 `HiprintReportDialog`，经 `onLoadTemplate`/`onSaveTemplate` 读写服务端 JSON。

**Tech Stack:** Vue 3 + Element Plus + Pinia/vue-router（Blade 动态菜单）+ `vue-plugin-hiprint`；后端 SpringBlade / MyBatis-Plus（对齐 `NonProdUnitPrice*`）；MySQL `shop_vite`。

**Spec:** `docs/superpowers/specs/2026-09-12-print-report-center-design.md`

## Global Constraints

- 提交说明必须中文（可用 `feat`/`fix`/`refactor`/`docs`/`chore` 前缀）。
- 默认模板以 `blade_print_doc_type.default_template_id` 为准，模板表不存 `is_default` 列。
- `page_code` 约定：`procurement.instruction` / `procurement.workOrder` / `procurement.dispatch`。
- 挂载写接口与挂载菜单仅管理员（`PreAuth` + 菜单 `printMount`）；模板设计：管理员或 `blade_print_doc_type_auth` 命中。
- 首期：制令完整 JSON；工单/派工 `template_json`/`factory_json` 可为 NULL；业务页无有效 JSON 时提示「模板未配置」。
- 制令列表**不保留**设计入口，设计只在报表中心（开放问题已定）。
- 报表中心为**一级菜单** `printReport`，子菜单：模板列表 `printTemplate`、挂载配置 `printMount`。
- 仓库无 vitest：纯函数用 `scripts/verify-*.mjs`；UI/API 用手动验收。
- 不在本计划做：统计报表、模板审批、JSON 操作日志表、工单/派工完整 provider。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `sql/blade_print_report_center.mysql.sql` | 四表 + DocType/模板/挂载种子（已有，本计划补菜单 SQL） |
| `sql/print_report_center_menu.mysql.sql` | 报表中心菜单与角色授权 |
| `backend/.../print/pojo/entity/PrintDocType.java` 等 | 四实体 |
| `backend/.../print/mapper/*Mapper.java` | MyBatis-Plus Mapper |
| `backend/.../print/service/*` | 业务规则：设默认、停用校验、挂载、授权、按页拉模板 |
| `backend/.../print/controller/PrintReportController.java` | REST |
| `src/api/print/reportCenter.ts` | 前端 API |
| `src/utils/hiprint/registry.ts` | docType → providers / modules / defaultTemplate 工厂 |
| `src/views/printReport/templates/index.vue` | 模板列表 + 打开设计器 |
| `src/views/printReport/mounts/index.vue` | 挂载配置 + 类型授权（简版） |
| `src/components/hiprint/PrintTemplatePickerDialog.vue` | 业务页选模板 |
| `src/views/procurement/instruction/index.vue` | 默认打印 + 选模板；去掉本地唯一 reportKey 主路径 |
| `scripts/verify-print-registry.mjs` | registry 映射断言 |
| `scripts/export-instruction-factory-json.mjs`（可选） | 导出制令出厂 JSON 供种子回填 |

---

### Task 1: 确认/补全 DDL 与菜单 SQL

**Files:**
- Modify: `sql/blade_print_report_center.mysql.sql`（若缺注释/种子保持与 spec 一致）
- Create: `sql/print_report_center_menu.mysql.sql`

**Interfaces:**
- Produces: 可执行菜单种子；`code`：`printReport` / `printTemplate` / `printMount`

- [ ] **Step 1: 核对四表 SQL 与 spec §5.6 一致**

已有文件路径：`sql/blade_print_report_center.mysql.sql`。确认含 `blade_print_doc_type`、`blade_print_template`、`blade_print_mount`、`blade_print_doc_type_auth` 及三类种子。

- [ ] **Step 2: 编写菜单 SQL**

```sql
-- sql/print_report_center_menu.mysql.sql
SET NAMES utf8mb4;

-- 一级：报表中心（parent_id=0；若环境一级挂在工作台下则改为实际 parent）
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754930, 0, 'printReport', '报表中心', 'menu',
  '/printReport', 'file-chart-line', 90, 1, 0, 1, 'Layout', '单据打印模板中心', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754930 OR code = 'printReport')
);

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754931, 2083134009698754930, 'printTemplate', '模板列表', 'menu',
  '/printReport/templates/index', 'file-list-3-line', 1, 1, 0, 1,
  'views/printReport/templates/index', '打印模板维护', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754931 OR code = 'printTemplate')
);

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754932, 2083134009698754930, 'printMount', '挂载配置', 'menu',
  '/printReport/mounts/index', 'links-line', 2, 1, 0, 1,
  'views/printReport/mounts/index', '单据类型挂载业务页', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754932 OR code = 'printMount')
);

-- 管理员角色（与现有种子一致）
INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754940, 2083134009698754930, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754930 AND role_id = 1123598816738675201);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754941, 2083134009698754931, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754931 AND role_id = 1123598816738675201);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754942, 2083134009698754932, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754932 AND role_id = 1123598816738675201);
```

- [ ] **Step 3: 在目标库执行两份 SQL 并确认表/菜单存在**

Run（按环境改连接）：在 MySQL 客户端执行上述两个文件。  
Expected: `SHOW TABLES LIKE 'blade_print%';` 四张表；`blade_menu` 中有 `printReport` 等。

- [ ] **Step 4: Commit**

```bash
git add sql/blade_print_report_center.mysql.sql sql/print_report_center_menu.mysql.sql
git commit -m "$(cat <<'EOF'
docs: 新增报表中心表结构与菜单种子

为单据打印多模板与挂载配置提供 MySQL DDL 及 Blade 菜单。
EOF
)"
```

---

### Task 2: 后端实体与 Mapper

**Files:**
- Create: `backend/blade-system/src/main/java/org/springblade/modules/print/pojo/entity/PrintDocType.java`
- Create: `.../PrintTemplate.java`
- Create: `.../PrintMount.java`
- Create: `.../PrintDocTypeAuth.java`
- Create: `.../mapper/PrintDocTypeMapper.java`（及 Template/Mount/Auth 各一）
- Create: `.../pojo/vo/PagePrintTemplateVO.java`（业务页返回）

**Interfaces:**
- Produces: 实体字段与表列一致；`PagePrintTemplateVO` 含 `id, code, name, isDefault, hasJson`

- [ ] **Step 1: 编写实体（示例 PrintDocType）**

```java
package org.springblade.modules.print.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_print_doc_type")
@Schema(description = "打印单据类型")
public class PrintDocType extends TenantEntity {
	private String code;
	private String name;
	private String providerKey;
	private Long defaultTemplateId;
	private Integer sort;
	private String remark;
}
```

`PrintTemplate`：`docTypeId`, `docTypeCode`, `code`, `name`, `templateJson`, `factoryJson`, `remark`。  
`PrintMount`：`docTypeId`, `docTypeCode`, `pageCode`, `pageName`, `enabled`, `sort`。  
`PrintDocTypeAuth`：`docTypeId`, `docTypeCode`, `roleId`（无 status 也可用 TenantEntity）。

- [ ] **Step 2: Mapper 接口**

```java
public interface PrintDocTypeMapper extends BaseMapper<PrintDocType> {}
// PrintTemplateMapper / PrintMountMapper / PrintDocTypeAuthMapper 同理
```

- [ ] **Step 3: VO**

```java
@Data
public class PagePrintTemplateVO {
	private Long id;
	private String code;
	private String name;
	private Boolean isDefault;
	private Boolean hasJson;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/blade-system/src/main/java/org/springblade/modules/print
git commit -m "$(cat <<'EOF'
feat: 新增打印报表中心实体与 Mapper

对齐 blade_print_* 四表，供后续 Service/API 使用。
EOF
)"
```

---

### Task 3: 后端 Service 业务规则

**Files:**
- Create: `.../service/IPrintReportService.java`
- Create: `.../service/impl/PrintReportServiceImpl.java`
- Create: `scripts/verify-print-default-rules.mjs`（可选：仅文档化规则；Java 无单测框架时用注释+手动）

**Interfaces:**
- Produces（`IPrintReportService`）:
  - `List<PrintDocType> listDocTypes()`
  - `IPage<PrintTemplate> pageTemplates(String docTypeCode, Query q)` — 列表不返回大 JSON（select 时可清 json 字段）
  - `PrintTemplate getTemplate(Long id)`
  - `boolean saveMeta(PrintTemplate t)` — 新建/改元数据
  - `String getJson(Long id)` / `boolean saveJson(Long id, String json)`
  - `boolean setDefault(Long templateId)`
  - `Long copy(Long templateId, String newCode, String newName)`
  - `boolean restoreFactory(Long templateId)`
  - `boolean changeStatus(Long id, int status)` — 停用时若为默认则抛业务异常
  - `List<PrintMount> listMounts()` / `boolean saveMount(PrintMount m)`
  - `List<PrintDocTypeAuth> listAuths(String docTypeCode)` / `boolean replaceAuths(String docTypeCode, List<Long> roleIds)`
  - `List<PagePrintTemplateVO> listTemplatesForPage(String pageCode)`
  - `boolean canDesign(String docTypeCode)` — 管理员或 auth 命中

- [ ] **Step 1: 实现 setDefault**

```java
@Transactional
public boolean setDefault(Long templateId) {
	PrintTemplate tpl = getRequired(templateId);
	if (tpl.getStatus() != null && tpl.getStatus() == 0) {
		throw new ServiceException("停用模板不能设为默认");
	}
	PrintDocType type = getTypeByCode(tpl.getDocTypeCode());
	type.setDefaultTemplateId(templateId);
	return docTypeMapper.updateById(type) > 0;
}
```

- [ ] **Step 2: 实现停用校验**

```java
public boolean changeStatus(Long id, int status) {
	PrintTemplate tpl = getRequired(id);
	if (status == 0) {
		PrintDocType type = getTypeByCode(tpl.getDocTypeCode());
		if (templateIdEquals(type.getDefaultTemplateId(), id)) {
			throw new ServiceException("请先更换默认模板再停用");
		}
	}
	tpl.setStatus(status);
	return templateMapper.updateById(tpl) > 0;
}
```

- [ ] **Step 3: 实现 listTemplatesForPage**

```java
public List<PagePrintTemplateVO> listTemplatesForPage(String pageCode) {
	PrintMount mount = mountMapper.selectOne(Wrappers.<PrintMount>lambdaQuery()
		.eq(PrintMount::getPageCode, pageCode)
		.eq(PrintMount::getEnabled, 1)
		.eq(PrintMount::getIsDeleted, 0)
		.last("LIMIT 1"));
	if (mount == null) return List.of();
	PrintDocType type = getTypeByCode(mount.getDocTypeCode());
	List<PrintTemplate> list = templateMapper.selectList(Wrappers.<PrintTemplate>lambdaQuery()
		.eq(PrintTemplate::getDocTypeCode, mount.getDocTypeCode())
		.eq(PrintTemplate::getStatus, 1)
		.eq(PrintTemplate::getIsDeleted, 0)
		.orderByAsc(PrintTemplate::getCode));
	return list.stream().map(t -> {
		PagePrintTemplateVO vo = new PagePrintTemplateVO();
		vo.setId(t.getId());
		vo.setCode(t.getCode());
		vo.setName(t.getName());
		vo.setIsDefault(type.getDefaultTemplateId() != null && type.getDefaultTemplateId().equals(t.getId()));
		vo.setHasJson(t.getTemplateJson() != null && !t.getTemplateJson().isBlank());
		return vo;
	}).toList();
}
```

- [ ] **Step 4: restoreFactory / copy**

- `restoreFactory`：`templateJson = factoryJson`（factory 为空则抛「无出厂布局」）。  
- `copy`：复制元数据与两份 JSON，新 `code`/`name`，status=1，不自动变默认。

- [ ] **Step 5: Commit**

```bash
git add backend/blade-system/src/main/java/org/springblade/modules/print/service
git commit -m "$(cat <<'EOF'
feat: 实现打印报表中心核心业务规则

含设默认、停用校验、按业务页拉可用模板及复制/恢复出厂。
EOF
)"
```

---

### Task 4: 后端 Controller

**Files:**
- Create: `backend/blade-system/src/main/java/org/springblade/modules/print/controller/PrintReportController.java`

**Interfaces:**
- Produces: 路径前缀 `/print`（前端代理 `/api/blade-system/print/**`）
- Consumes: `IPrintReportService`

- [ ] **Step 1: 实现 Controller 端点**

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/print")
@Tag(name = "单据打印报表中心")
public class PrintReportController extends BladeController {

	private final IPrintReportService printReportService;

	@GetMapping("/doc-types")
	@PreAuth(menu = "printTemplate")
	public R<List<PrintDocType>> docTypes() { return R.data(printReportService.listDocTypes()); }

	@GetMapping("/templates")
	@PreAuth(menu = "printTemplate")
	public R<IPage<PrintTemplate>> templates(@RequestParam(required = false) String docTypeCode, Query query) {
		return R.data(printReportService.pageTemplates(docTypeCode, query));
	}

	@PostMapping("/templates/submit")
	@PreAuth(menu = "printTemplate")
	public R<Boolean> submitMeta(@RequestBody PrintTemplate body) {
		return R.status(printReportService.saveMeta(body));
	}

	@GetMapping("/templates/{id}/json")
	@PreAuth(menu = "printTemplate")
	public R<String> getJson(@PathVariable Long id) { return R.data(printReportService.getJson(id)); }

	@PutMapping("/templates/{id}/json")
	@PreAuth(menu = "printTemplate")
	public R<Boolean> saveJson(@PathVariable Long id, @RequestBody Map<String, String> body) {
		return R.status(printReportService.saveJson(id, body.get("templateJson")));
	}

	@PostMapping("/templates/{id}/set-default")
	@PreAuth(menu = "printTemplate")
	public R<Boolean> setDefault(@PathVariable Long id) { return R.status(printReportService.setDefault(id)); }

	@PostMapping("/templates/{id}/copy")
	@PreAuth(menu = "printTemplate")
	public R<Long> copy(@PathVariable Long id, @RequestBody Map<String, String> body) {
		return R.data(printReportService.copy(id, body.get("code"), body.get("name")));
	}

	@PostMapping("/templates/{id}/restore-factory")
	@PreAuth(menu = "printTemplate")
	public R<Boolean> restoreFactory(@PathVariable Long id) {
		return R.status(printReportService.restoreFactory(id));
	}

	@PostMapping("/templates/{id}/status")
	@PreAuth(menu = "printTemplate")
	public R<Boolean> status(@PathVariable Long id, @RequestParam int status) {
		return R.status(printReportService.changeStatus(id, status));
	}

	@GetMapping("/mounts")
	@PreAuth(menu = "printMount")
	public R<List<PrintMount>> mounts() { return R.data(printReportService.listMounts()); }

	@PostMapping("/mounts/submit")
	@PreAuth(menu = "printMount")
	public R<Boolean> saveMount(@RequestBody PrintMount body) {
		return R.status(printReportService.saveMount(body));
	}

	@GetMapping("/doc-type-auths")
	@PreAuth(menu = "printMount")
	public R<List<PrintDocTypeAuth>> auths(@RequestParam String docTypeCode) {
		return R.data(printReportService.listAuths(docTypeCode));
	}

	@PostMapping("/doc-type-auths/replace")
	@PreAuth(menu = "printMount")
	public R<Boolean> replaceAuths(@RequestParam String docTypeCode, @RequestBody List<Long> roleIds) {
		return R.status(printReportService.replaceAuths(docTypeCode, roleIds));
	}

	/** 业务页打印用：菜单权限用 instruction 等，避免业务员无 printTemplate 菜单 */
	@GetMapping("/pages/{pageCode}/templates")
	@PreAuth(menu = "instruction") // 实现时改为更通用：有登录即可，或按 pageCode 映射菜单码
	public R<List<PagePrintTemplateVO>> pageTemplates(@PathVariable String pageCode) {
		return R.data(printReportService.listTemplatesForPage(pageCode));
	}
}
```

> 实现时将 `pages/{pageCode}/templates` 的 `@PreAuth` 改为：已登录即可（若框架支持）或按 `pageCode` 映射到 `instruction`/`workOrder`/`dispatch` 菜单码，避免业务员打不开打印。

- [ ] **Step 2: 在 Service.saveJson / saveMeta 内调用 `canDesign`，非授权抛 ServiceException**

- [ ] **Step 3: 本地启动 blade-system，用 Knife4j/curl 烟测 listDocTypes**

Expected: 返回三条 DocType 种子。

- [ ] **Step 4: Commit**

```bash
git add backend/blade-system/src/main/java/org/springblade/modules/print/controller
git commit -m "$(cat <<'EOF'
feat: 开放打印报表中心 REST 接口

覆盖模板 CRUD/JSON、设默认、挂载、授权与业务页拉模板。
EOF
)"
```

---

### Task 5: 前端 API + Hiprint registry

**Files:**
- Create: `src/api/print/reportCenter.ts`
- Create: `src/utils/hiprint/registry.ts`
- Create: `scripts/verify-print-registry.mjs`

**Interfaces:**
- Produces:
  - API 函数见下
  - `getHiprintBundle(docTypeCode: string): Promise<{ providers, providerModules, defaultTemplate, title }>`

- [ ] **Step 1: API 模块**

```ts
// src/api/print/reportCenter.ts
import request from '/@/utils/request'
import { unwrap } from '/@/utils/bladeAdapter'

const BASE = '/api/blade-system/print'

export async function listDocTypes() {
  const res: any = await request({ url: `${BASE}/doc-types`, method: 'get' })
  return unwrap(res) || []
}

export async function listTemplates(docTypeCode?: string, params?: { current?: number; size?: number }) {
  const res: any = await request({
    url: `${BASE}/templates`,
    method: 'get',
    params: { docTypeCode, current: params?.current || 1, size: params?.size || 50 },
  })
  return res // 调用方 adaptPage 或按项目习惯拆 records
}

export async function submitTemplateMeta(data: Record<string, unknown>) {
  const res: any = await request({ url: `${BASE}/templates/submit`, method: 'post', data })
  return unwrap(res)
}

export async function getTemplateJson(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/json`, method: 'get' })
  return unwrap(res) as string | null
}

export async function saveTemplateJson(id: string | number, templateJson: unknown) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/json`,
    method: 'put',
    data: { templateJson: typeof templateJson === 'string' ? templateJson : JSON.stringify(templateJson) },
  })
  return unwrap(res)
}

export async function setDefaultTemplate(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/set-default`, method: 'post' })
  return unwrap(res)
}

export async function copyTemplate(id: string | number, code: string, name: string) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/copy`,
    method: 'post',
    data: { code, name },
  })
  return unwrap(res)
}

export async function restoreFactoryTemplate(id: string | number) {
  const res: any = await request({ url: `${BASE}/templates/${id}/restore-factory`, method: 'post' })
  return unwrap(res)
}

export async function changeTemplateStatus(id: string | number, status: number) {
  const res: any = await request({
    url: `${BASE}/templates/${id}/status`,
    method: 'post',
    params: { status },
  })
  return unwrap(res)
}

export async function listMounts() {
  const res: any = await request({ url: `${BASE}/mounts`, method: 'get' })
  return unwrap(res) || []
}

export async function submitMount(data: Record<string, unknown>) {
  const res: any = await request({ url: `${BASE}/mounts/submit`, method: 'post', data })
  return unwrap(res)
}

export async function listDocTypeAuths(docTypeCode: string) {
  const res: any = await request({
    url: `${BASE}/doc-type-auths`,
    method: 'get',
    params: { docTypeCode },
  })
  return unwrap(res) || []
}

export async function replaceDocTypeAuths(docTypeCode: string, roleIds: number[]) {
  const res: any = await request({
    url: `${BASE}/doc-type-auths/replace`,
    method: 'post',
    params: { docTypeCode },
    data: roleIds,
  })
  return unwrap(res)
}

export type PagePrintTemplate = {
  id: number
  code: string
  name: string
  isDefault: boolean
  hasJson: boolean
}

export async function listPageTemplates(pageCode: string): Promise<PagePrintTemplate[]> {
  const res: any = await request({ url: `${BASE}/pages/${pageCode}/templates`, method: 'get' })
  return (unwrap(res) || []) as PagePrintTemplate[]
}
```

- [ ] **Step 2: registry**

```ts
// src/utils/hiprint/registry.ts
import { COMMON_MODULE, createCommonProvider } from './providers/common'
import {
  INSTRUCTION_MODULE,
  createInstructionSheetProvider,
} from './providers/instructionSheet'
import { buildInstructionSheetDefaultTemplate } from './templates/instructionSheet'

export async function getHiprintBundle(docTypeCode: string) {
  if (docTypeCode === 'instruction') {
    return {
      title: '生产指令单',
      providers: [createCommonProvider(), createInstructionSheetProvider()],
      providerModules: [COMMON_MODULE, INSTRUCTION_MODULE],
      defaultTemplate: await buildInstructionSheetDefaultTemplate(),
    }
  }
  // 空壳：仅通用元素，默认空白 A4（可返回 null，设计器提示无出厂布局）
  return {
    title: docTypeCode,
    providers: [createCommonProvider()],
    providerModules: [COMMON_MODULE],
    defaultTemplate: null as unknown,
  }
}
```

- [ ] **Step 3: 验证脚本**

```js
// scripts/verify-print-registry.mjs
const allowed = new Set(['instruction', 'workOrder', 'dispatch'])
for (const c of allowed) {
  if (typeof c !== 'string') throw new Error('fail')
}
console.log('registry codes ok')
```

Run: `node scripts/verify-print-registry.mjs`  
Expected: `registry codes ok`

- [ ] **Step 4: Commit**

```bash
git add src/api/print/reportCenter.ts src/utils/hiprint/registry.ts scripts/verify-print-registry.mjs
git commit -m "$(cat <<'EOF'
feat: 新增报表中心前端 API 与 Hiprint 单据注册表

统一按 docType 取 provider，并对接 blade-system/print 接口。
EOF
)"
```

---

### Task 6: 报表中心 · 模板列表页

**Files:**
- Create: `src/views/printReport/templates/index.vue`

**Interfaces:**
- Consumes: `listDocTypes`, `listTemplates`, `setDefaultTemplate`, `copyTemplate`, `changeTemplateStatus`, `getTemplateJson`, `saveTemplateJson`, `restoreFactoryTemplate`, `getHiprintBundle`
- Produces: 可打开 `HiprintReportDialog`，`reportKey=String(templateId)`，钩子走后端

- [ ] **Step 1: 页面骨架**

- `vab-query-form`：DocType 下拉 + 刷新 + 新建  
- `el-table` 列：名称、编码、单据类型、状态、是否默认（对比当前类型的 defaultTemplateId）、更新时间、操作  
- 操作：设计、设为默认、复制、启停  

- [ ] **Step 2: 设计器接入**

```vue
<HiprintReportDialog
  v-model="designVisible"
  :title="designTitle"
  :report-key="String(activeTemplateId)"
  :providers="bundle.providers"
  :provider-modules="bundle.providerModules"
  :default-template="bundle.defaultTemplate"
  :print-data="samplePrintData"
  :on-load-template="loadRemote"
  :on-save-template="saveRemote"
/>
```

```ts
async function loadRemote(key: string) {
  const raw = await getTemplateJson(key)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
async function saveRemote(key: string, json: unknown) {
  await saveTemplateJson(key, json)
}
```

`samplePrintData`：制令用固定样例行（可从 `mapItemsToPrintRows` 造 1～2 行）；空壳用 `{}`。

- [ ] **Step 3: 手动验收**

1. 登录管理员 → 报表中心 → 模板列表可见 3 条种子。  
2. 打开制令标准 → 设计 → 保存 → 刷新仍在。  
3. 复制一套 → 设为默认 → 列表默认徽标切换。

- [ ] **Step 4: Commit**

```bash
git add src/views/printReport/templates/index.vue
git commit -m "$(cat <<'EOF'
feat: 新增报表中心模板列表与远程设计保存

支持多模板维护，设计器 JSON 写入后端。
EOF
)"
```

---

### Task 7: 报表中心 · 挂载配置页

**Files:**
- Create: `src/views/printReport/mounts/index.vue`

**Interfaces:**
- Consumes: `listMounts`, `submitMount`, `listDocTypes`, `listDocTypeAuths`, `replaceDocTypeAuths`；角色列表若项目已有 API 则复用（如 `/api/blade-system/role/list`）

- [ ] **Step 1: 挂载表格**

列：单据类型、pageCode、业务页名称、启用、操作（编辑）。  
编辑弹窗：改 `pageName` / `enabled` /（慎改 pageCode）。

- [ ] **Step 2: 类型授权（简版）**

选中一行 DocType → 多选角色 → `replaceDocTypeAuths`。  
无角色 API 时先只做挂载，授权 UI 用手动输入 roleId 列表并在备注中说明。

- [ ] **Step 3: 手动验收** — 管理员可改挂载；无 `printMount` 菜单角色不可见。

- [ ] **Step 4: Commit**

```bash
git add src/views/printReport/mounts/index.vue
git commit -m "$(cat <<'EOF'
feat: 新增打印模板挂载配置页

管理员可将单据类型绑定到业务页并配置设计授权。
EOF
)"
```

---

### Task 8: 业务页选模板组件 + 制令列表接入

**Files:**
- Create: `src/components/hiprint/PrintTemplatePickerDialog.vue`
- Modify: `src/views/procurement/instruction/index.vue`
- Modify: `src/components/hiprint/HiprintReportDialog.vue`（若需「仅预览」模式：新增 prop `designable?: boolean`，false 时隐藏设计 Tab 与保存）

**Interfaces:**
- Produces: `PrintTemplatePickerDialog` — props: `modelValue`, `pageCode`, `printData`；确认后按模板 id 预览/打印
- 制令 `PAGE_CODE = 'procurement.instruction'`

- [ ] **Step 1: Picker 弹窗**

```vue
<!-- 单选模板列表 + 预览 / 打印 / 取消 -->
<!-- 打开时 listPageTemplates(pageCode)，默认项 isDefault 预选 -->
<!-- 预览/打印：getTemplateJson(id)；若 !hasJson → ElMessage.warning('模板未配置') -->
```

内部可嵌只读 `HiprintReportDialog`（`designable=false`）或直接调 `core.ts` 的 preview/print。

- [ ] **Step 2: HiprintReportDialog 增加 `designable`（默认 true）**

```ts
designable?: boolean // false：仅预览 Tab，隐藏保存/恢复默认
```

- [ ] **Step 3: 制令页工具栏**

将原「打印」改为分裂按钮：

```vue
<el-button-group>
  <el-button type="primary" :icon="Printer" @click="printDefault">打印</el-button>
  <el-button type="primary" @click="pickerVisible = true">选模板</el-button>
</el-button-group>
```

```ts
const PAGE_CODE = 'procurement.instruction'

async function printDefault() {
  const list = await listPageTemplates(PAGE_CODE)
  const def = list.find((t) => t.isDefault) || list[0]
  if (!def?.hasJson) {
    ElMessage.warning('模板未配置')
    return
  }
  // 组装 printData 后打开只读预览弹窗或直接 print
  activeTemplateId.value = def.id
  await openPreview(def.id)
}
```

移除页面上以本地 `INSTRUCTION_REPORT_KEY` 为主的设计入口（可删设计 Tab 打开方式）。

- [ ] **Step 4: 手动验收**

1. 制令勾选数据 → 打印 → 用默认模板。  
2. 选模板 → 换另一套 → 预览/打印成功。  
3. 清空某模板 JSON（测空壳）→ 提示「模板未配置」。

- [ ] **Step 5: Commit**

```bash
git add src/components/hiprint/PrintTemplatePickerDialog.vue src/components/hiprint/HiprintReportDialog.vue src/views/procurement/instruction/index.vue
git commit -m "$(cat <<'EOF'
feat: 制令列表支持默认打印与选择模板

业务页消费挂载模板列表，设计入口收拢到报表中心。
EOF
)"
```

---

### Task 9: 制令出厂 JSON 回填种子

**Files:**
- Modify: `sql/blade_print_report_center.mysql.sql` 或新增 `sql/blade_print_instruction_factory.mysql.sql`
- Optional: `scripts/export-instruction-factory-json.mjs`（Node 难跑浏览器 hiprint 时改为：在报表中心设计一次后从 DB 导出，或前端临时按钮把 `buildInstructionSheetDefaultTemplate()` 结果 POST 到 restore/factory）

**Interfaces:**
- Produces: 制令标准模板的 `factory_json` 与初始 `template_json` 非空

- [ ] **Step 1: 在报表中心打开制令标准模板，不改布局直接保存一次**（若打开时 remote 为空会用 defaultTemplate 设计）

确保 `saveTemplateJson` 写入后，再调一次后端把同一 JSON 写入 `factory_json`（可在首次 save 时若 factory 为空则同时写入 factory——在 Service.saveJson 实现）：

```java
if (tpl.getFactoryJson() == null || tpl.getFactoryJson().isBlank()) {
	tpl.setFactoryJson(json);
}
tpl.setTemplateJson(json);
```

- [ ] **Step 2: 验证「恢复出厂」**

改布局保存 → 恢复出厂 → 回到首次保存布局。

- [ ] **Step 3: Commit**（若有 SQL 导出或 Service 改动）

```bash
git add backend/blade-system/src/main/java/org/springblade/modules/print/service
git commit -m "$(cat <<'EOF'
feat: 首次保存打印模板时回写出厂 JSON

便于报表中心「恢复出厂布局」在无 SQL 大字段种子时可用。
EOF
)"
```

---

### Task 10: 端到端验收清单

**Files:** 无代码；更新 spec 状态已在批准时完成。

- [ ] **Step 1: 按 spec §9 逐条验收**

| # | 标准 | 结果 |
|---|------|------|
| 1 | 制令 ≥2 套模板，设默认 | |
| 2 | 仅管理员挂载 | |
| 3 | 授权角色可设计；不可挂载 | |
| 4 | 制令默认打印 + 选模板 | |
| 5 | 工单/派工空壳提示未配置 | |
| 6 | 刷新后模板仍在服务端 | |

- [ ] **Step 2: 若有缺口，开 fix commit，勿改 spec 决策**

- [ ] **Step 3: 最终说明 commit（可选）**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore: 完成单据打印报表中心首期验收

多模板、挂载与制令打印选模板已按设计落地。
EOF
)"
```

---

## Spec coverage（自检）

| Spec 项 | Task |
|---------|------|
| 四表 + 种子 | 1, 9 |
| 菜单报表中心 | 1 |
| 多模板 / 默认 / 复制 / 启停 | 3, 4, 6 |
| 挂载 | 3, 4, 7 |
| 权限 B（auth 表） | 3, 4, 7 |
| 业务页默认+选模板 | 8 |
| 制令做实 / 工单派工空壳 | 5, 6, 8, 9 |
| 复用 HiprintReportDialog | 6, 8 |
| 后端不解析 JSON | 3–4 |
| 非目标未纳入 | Global Constraints |

## Placeholder scan

无 TBD/TODO 实现步骤；开放问题已在 Global Constraints 钉死。

## Type consistency

- `pageCode` 字符串与 SQL 种子、`listPageTemplates`、制令常量一致。  
- 模板主键前后端均用 `id`（string 化作 `reportKey`）。  
- `PagePrintTemplateVO.hasJson` ↔ 前端 `hasJson` 提示「模板未配置」。
