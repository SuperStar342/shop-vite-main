# 单据打印报表中心设计

日期：2026-09-12  
状态：已批准  
前置：`2026-09-11-hiprint-report-designer-design.md`（制令 Hiprint 弹窗封装）

## 1. 背景与目标

已有可复用的 `HiprintReportDialog`，目前仅制令列表接入，模板以 `localStorage` 为主。需要建设独立「报表中心」，支持：

- 按单据类型（制令 / 工单 / 派工等）维护**多套打印模板**
- 每类设**一个默认模板**；业务页一键用默认，也可**选择其他模板**
- 将单据类型**挂载**到对应业务页
- 权限：管理员管挂载与全局；关键岗位可设计其授权单据类型的模板

### 1.1 已确认决策

| 项 | 选择 |
|----|------|
| 报表形态 | A：单据打印模板（非统计分析） |
| 模板数量 | B：一类单据多套 |
| 打印交互 | C：默认一键打印 + 可切换选模板 |
| 权限 | B：管理员 + 关键岗位可改授权类型模板；挂载仅管理员 |
| 首期范围 | C：制令做实；工单/派工建类型、挂载位与空壳模板 |
| 架构 | 方案 2：独立报表中心 + 按单据类型注册 + 后端持久化 |

### 1.2 非目标（首期不做）

- 统计分析类报表、Excel 导出中心
- 模板审批流、完整版本历史 UI
- 按车间/组织隔离多套模板库（可用角色授权近似）
- 全屏独立设计工作台（继续大弹窗复用 Hiprint）
- 工单/派工完整字段 provider 与出厂布局

## 2. 信息架构

### 2.1 核心对象

| 对象 | 说明 |
|------|------|
| DocType | 单据类型：`instruction` / `workOrder` / `dispatch` |
| Template | 某 DocType 下的多套 Hiprint 模板；有启停、编码、JSON |
| Mount | DocType ↔ 业务页（`page_code`） |
| DocTypeAuth | 哪些角色可设计/维护某 DocType 的模板（不含挂载） |

### 2.2 菜单

```
报表中心（新一级或挂系统管理/业务配置下）
├─ 模板列表     views/.../printReport/templates/index
└─ 挂载配置     views/.../printReport/mounts/index   （仅管理员菜单）
```

业务页（制令等）不新增菜单，只改打印入口。

### 2.3 权限矩阵

| 动作 | 管理员 | 授权岗位（DocType 授权） | 普通业务员 |
|------|--------|--------------------------|------------|
| 挂载配置 | ✓ | ✗ | ✗ |
| 新建/复制/启停/设默认 | ✓ | 仅授权 DocType | ✗ |
| 设计模板 JSON | ✓ | 仅授权 DocType | ✗ |
| 业务页打印 / 选模板 | ✓ | ✓ | ✓ |

## 3. 页面与交互

### 3.1 主流程

1. 报表中心维护模板 → 2. 管理员挂载 → 3. 业务页选数据 → 4. 默认打印或选模板后预览/打印

### 3.2 页面

| 页面 | 要点 |
|------|------|
| 模板列表 | 按 DocType 筛选；列：名称、类型、状态、是否默认、挂载页摘要、更新人/时间；操作：设计/设默认/复制/启停 |
| 挂载配置 | DocType ↔ 业务页；可用模板数、当前默认；仅管理员 |
| 模板设计 | 复用 `HiprintReportDialog`；Load/Save 走后端 |
| 业务页打印 | 分裂按钮：打印（默认名） / 选择模板… |
| 选模板弹窗 | 仅「已挂载 + 启用」；默认预选；预览 / 打印 |

### 3.3 业务规则

- 同一租户 + DocType 仅一个默认模板（存于 DocType.`default_template_id`）
- 停用默认前必须先指定新默认
- 空壳模板（`template_json` 为空）：业务页打印提示「模板未配置」
- 「恢复出厂」：写回 `factory_json`，不删元数据

### 3.4 UI 示意路径

| 图 | 路径 |
|----|------|
| 报表中心列表 | `.cursor/projects/.../assets/report-center-list.png`（会话生成） |
| 挂载配置 | `assets/report-mount-config.png` |
| 业务页打印入口 | `assets/biz-print-entry.png` |
| 选模板弹窗 | `assets/print-template-picker.png` |
| 设计器 | `assets/template-designer.png` |
| 主流程 | `assets/report-center-flow.png` |

（图片位于 Cursor 项目 assets；实现阶段可拷贝到 `docs/superpowers/specs/assets/`）

## 4. 与现有 Hiprint 关系

- 继续使用 `HiprintReportDialog`、`utils/hiprint/core.ts`、制令 `providers` / `templates`
- `reportKey` 升级为模板 `id`（字符串化 snowflake）
- `onLoadTemplate` / `onSaveTemplate` 对接后端；`localStorage` 不再作为主存储（可选短缓存）
- 制令列表：打印改为拉 `/print/pages/{pageCode}/templates`；设计入口以报表中心为主

## 5. 数据库设计（MySQL / shop_vite）

命名与现有表对齐：`blade_` 前缀、`bigint` 主键、`tenant_id`、审计字段、`status`、`is_deleted`。

### 5.1 ER 关系

```
blade_print_doc_type 1 ── * blade_print_template
         │ 1
         │
         ├── 1 default_template_id → blade_print_template.id（可空）
         │
         ├── * blade_print_mount（挂到业务页）
         │
         └── * blade_print_doc_type_auth（角色可设计哪些类型）
```

### 5.2 `blade_print_doc_type` — 单据类型

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigint PK | 主键 |
| tenant_id | varchar(12) | 租户，默认 `000000` |
| code | varchar(32) | 唯一业务码：`instruction` / `workOrder` / `dispatch` |
| name | varchar(64) | 显示名 |
| provider_key | varchar(64) | 前端 provider 模块键；空壳可 `''` |
| default_template_id | bigint | 当前默认模板 id，可空 |
| sort | int | 排序 |
| remark | varchar(512) | 备注 |
| create_user / create_dept / create_time | | Blade 审计 |
| update_user / update_time | | |
| status | int | 1 启用 0 停用 |
| is_deleted | int | 逻辑删除 |

唯一：`(tenant_id, code)` where 业务上 `is_deleted=0`（实现可用唯一索引 + 删除改 code 后缀，或应用层保证）。

### 5.3 `blade_print_template` — 打印模板

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigint PK | 主键 |
| tenant_id | varchar(12) | 租户 |
| doc_type_code | varchar(32) | 冗余 DocType.code，便于查询 |
| doc_type_id | bigint | 关联 doc_type.id |
| code | varchar(64) | 同类型下模板编码 |
| name | varchar(128) | 显示名 |
| template_json | longtext | 当前 Hiprint JSON；空壳为 NULL |
| factory_json | longtext | 出厂 JSON；制令首期写入；空壳 NULL |
| remark | varchar(512) | |
| create_user / create_dept / create_time | | |
| update_user / update_time | | |
| status | int | 1 启用 0 停用 |
| is_deleted | int | |

唯一：`(tenant_id, doc_type_code, code)`（未删除行由应用保证）。  
索引：`(tenant_id, doc_type_code, status)`、`(doc_type_id)`。

> 是否默认不存本表，避免双写；以 `doc_type.default_template_id` 为准。列表接口计算 `isDefault = (id == default_template_id)`。

### 5.4 `blade_print_mount` — 挂载

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigint PK | |
| tenant_id | varchar(12) | |
| doc_type_id | bigint | |
| doc_type_code | varchar(32) | 冗余 |
| page_code | varchar(64) | 业务页标识，如 `procurement.instruction` |
| page_name | varchar(128) | 展示名，如「制令列表」 |
| enabled | tinyint | 1 生效 0 关闭 |
| sort | int | |
| create_user / create_time / update_user / update_time | | |
| status | int | 1 |
| is_deleted | int | |

唯一：`(tenant_id, page_code)` — 一个业务页首期只挂一个 DocType。  
若未来一页多 DocType，改为 `(tenant_id, page_code, doc_type_code)`。

### 5.5 `blade_print_doc_type_auth` — 类型设计授权

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigint PK | |
| tenant_id | varchar(12) | |
| doc_type_id | bigint | |
| doc_type_code | varchar(32) | |
| role_id | bigint | `blade_role.id` |
| create_user / create_time | | |
| is_deleted | int | |

唯一：`(tenant_id, doc_type_code, role_id)`。  
管理员可不依赖本表（角色码/超管短路）。挂载接口仍仅管理员。

### 5.6 DDL（MySQL）

```sql
SET NAMES utf8mb4;

-- 单据类型
CREATE TABLE IF NOT EXISTS blade_print_doc_type (
  id                   bigint       NOT NULL COMMENT '主键',
  tenant_id            varchar(12)  DEFAULT '000000' COMMENT '租户',
  code                 varchar(32)  NOT NULL COMMENT '类型编码 instruction/workOrder/dispatch',
  name                 varchar(64)  NOT NULL COMMENT '显示名',
  provider_key         varchar(64)  DEFAULT '' COMMENT '前端 provider 键',
  default_template_id  bigint       DEFAULT NULL COMMENT '默认模板ID',
  sort                 int          DEFAULT 0 COMMENT '排序',
  remark               varchar(512) DEFAULT '' COMMENT '备注',
  create_user          bigint       DEFAULT NULL,
  create_dept          bigint       DEFAULT NULL,
  create_time          datetime     DEFAULT NULL,
  update_user          bigint       DEFAULT NULL,
  update_time          datetime     DEFAULT NULL,
  status               int          DEFAULT 1 COMMENT '1启用 0停用',
  is_deleted           int          DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_print_doc_type_tenant_code (tenant_id, code),
  KEY idx_print_doc_type_tenant (tenant_id, is_deleted, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印单据类型';

-- 打印模板
CREATE TABLE IF NOT EXISTS blade_print_template (
  id              bigint       NOT NULL COMMENT '主键',
  tenant_id       varchar(12)  DEFAULT '000000' COMMENT '租户',
  doc_type_id     bigint       NOT NULL COMMENT '单据类型ID',
  doc_type_code   varchar(32)  NOT NULL COMMENT '单据类型编码',
  code            varchar(64)  NOT NULL COMMENT '模板编码',
  name            varchar(128) NOT NULL COMMENT '模板名称',
  template_json   longtext     COMMENT '当前 Hiprint JSON',
  factory_json    longtext     COMMENT '出厂 Hiprint JSON',
  remark          varchar(512) DEFAULT '' COMMENT '备注',
  create_user     bigint       DEFAULT NULL,
  create_dept     bigint       DEFAULT NULL,
  create_time     datetime     DEFAULT NULL,
  update_user     bigint       DEFAULT NULL,
  update_time     datetime     DEFAULT NULL,
  status          int          DEFAULT 1 COMMENT '1启用 0停用',
  is_deleted      int          DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_print_tpl_tenant_type_code (tenant_id, doc_type_code, code),
  KEY idx_print_tpl_type (tenant_id, doc_type_code, status, is_deleted),
  KEY idx_print_tpl_doc_type_id (doc_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印模板';

-- 挂载：业务页 ↔ 单据类型
CREATE TABLE IF NOT EXISTS blade_print_mount (
  id              bigint       NOT NULL COMMENT '主键',
  tenant_id       varchar(12)  DEFAULT '000000' COMMENT '租户',
  doc_type_id     bigint       NOT NULL COMMENT '单据类型ID',
  doc_type_code   varchar(32)  NOT NULL COMMENT '单据类型编码',
  page_code       varchar(64)  NOT NULL COMMENT '业务页编码',
  page_name       varchar(128) NOT NULL DEFAULT '' COMMENT '业务页名称',
  enabled         tinyint      NOT NULL DEFAULT 1 COMMENT '1生效 0关闭',
  sort            int          DEFAULT 0,
  create_user     bigint       DEFAULT NULL,
  create_time     datetime     DEFAULT NULL,
  update_user     bigint       DEFAULT NULL,
  update_time     datetime     DEFAULT NULL,
  status          int          DEFAULT 1,
  is_deleted      int          DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_print_mount_tenant_page (tenant_id, page_code),
  KEY idx_print_mount_type (tenant_id, doc_type_code, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印模板挂载';

-- 单据类型设计授权（角色）
CREATE TABLE IF NOT EXISTS blade_print_doc_type_auth (
  id              bigint       NOT NULL COMMENT '主键',
  tenant_id       varchar(12)  DEFAULT '000000' COMMENT '租户',
  doc_type_id     bigint       NOT NULL COMMENT '单据类型ID',
  doc_type_code   varchar(32)  NOT NULL COMMENT '单据类型编码',
  role_id         bigint       NOT NULL COMMENT '角色ID',
  create_user     bigint       DEFAULT NULL,
  create_time     datetime     DEFAULT NULL,
  is_deleted      int          DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_print_auth_tenant_type_role (tenant_id, doc_type_code, role_id),
  KEY idx_print_auth_role (tenant_id, role_id, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印单据类型设计授权';
```

### 5.7 首期种子数据（逻辑）

| doc_type | 模板 | 挂载 page_code | template_json |
|----------|------|----------------|---------------|
| instruction | 生产指令单-标准 (`standard`) | `procurement.instruction` | 现有出厂 JSON |
| workOrder | 工单打印-空壳 (`shell`) | `procurement.workOrder` | NULL |
| dispatch | 派工单打印-空壳 (`shell`) | `procurement.dispatch` | NULL |

- `instruction.default_template_id` → 标准模板 id  
- 工单/派工：`default_template_id` 可指向空壳（打印时校验 JSON 非空）或暂空  

约定 `page_code`：

| page_code | 页面 |
|-----------|------|
| `procurement.instruction` | 制令列表 |
| `procurement.workOrder` | 工单列表 |
| `procurement.dispatch` | 派工管理 |

### 5.8 约束与一致性（应用层）

1. 设默认：更新 `doc_type.default_template_id`，且模板必须同类型、启用、未删除。  
2. 停用模板：若 `id == default_template_id`，拒绝并提示先更换默认。  
3. 删除模板（逻辑删）：同上；并禁止删除仍被默认引用的模板。  
4. 保存 JSON：仅管理员或 `doc_type_auth` 命中角色。  
5. 挂载写接口：仅管理员。  
6. 业务页拉模板：按 `page_code` → mount → doc_type → 启用模板列表 + default id。

## 6. API（示意）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/blade-system/print/doc-types` | 类型列表 |
| GET | `/blade-system/print/templates` | `?docTypeCode=` |
| POST | `/blade-system/print/templates` | 新建元数据 |
| PUT | `/blade-system/print/templates/{id}` | 更新元数据 |
| GET | `/blade-system/print/templates/{id}/json` | 读 JSON |
| PUT | `/blade-system/print/templates/{id}/json` | 写 JSON |
| POST | `/blade-system/print/templates/{id}/set-default` | 设默认 |
| POST | `/blade-system/print/templates/{id}/copy` | 复制 |
| POST | `/blade-system/print/templates/{id}/restore-factory` | 恢复出厂 |
| GET/PUT | `/blade-system/print/mounts` | 挂载（管理员） |
| GET/PUT | `/blade-system/print/doc-type-auths` | 类型授权（管理员） |
| GET | `/blade-system/print/pages/{pageCode}/templates` | 业务页可用模板 |

前缀按现有 Blade 模块习惯可调整（如独立 `blade-print`）。

## 7. 前后端边界

```
报表中心 → CRUD / 挂载 / 授权 / 打开设计器
HiprintReportDialog(templateId)
  onLoad → GET .../json
  onSave → PUT .../json

制令列表
  → GET .../pages/procurement.instruction/templates
  → printData 仍由前端 mapItemsToPrintRows 组装
```

- 后端不解析 Hiprint JSON。  
- Provider / 出厂模板 JSON 仍在前端 `src/utils/hiprint/`；种子 `factory_json` 可由前端默认导出后写入 SQL/初始化接口。

## 8. 首期交付切片

1. 四张表 + 种子（制令完整 + 工单/派工空壳 + 挂载）  
2. 后端 API + 权限  
3. 菜单：模板列表、挂载配置  
4. 制令列表：默认打印 + 选模板；设计以中心为主  
5. 工单/派工：仅中心可见空壳与挂载，业务页打印可后接或提示未配置  

## 9. 验收标准

1. 报表中心可为制令维护 ≥2 套模板，设默认成功。  
2. 管理员可配置挂载；非管理员无挂载菜单/接口。  
3. 授权角色可设计授权 DocType；不可改挂载。  
4. 制令列表默认打印用默认模板；选模板可换套预览/打印。  
5. 工单/派工在中心可见类型与空壳；无 JSON 时打印有明确提示。  
6. 刷新浏览器后模板仍在（服务端持久化）。  

## 10. 开放问题（已拍板）

| 问题 | 决定 |
|------|------|
| 报表中心菜单位置 | 一级菜单 `printReport` |
| 制令列表是否保留设计入口 | 否，设计仅在报表中心 |
| 模板 JSON 操作日志表 | 二期不做 |

实现计划：`docs/superpowers/plans/2026-09-12-print-report-center.md`。
