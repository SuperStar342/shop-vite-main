-- 单据打印报表中心：表结构 + 首期种子（MySQL / shop_vite）
-- 对应设计：docs/superpowers/specs/2026-09-12-print-report-center-design.md
SET NAMES utf8mb4;

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

-- 单据类型种子
INSERT IGNORE INTO blade_print_doc_type (
  id, tenant_id, code, name, provider_key, default_template_id, sort,
  create_time, update_time, status, is_deleted
) VALUES
(2083134009698754901, '000000', 'instruction', '制令单', 'instructionSheet', 2083134009698754911, 1, NOW(), NOW(), 1, 0),
(2083134009698754902, '000000', 'workOrder',   '工单',   '',                 2083134009698754912, 2, NOW(), NOW(), 1, 0),
(2083134009698754903, '000000', 'dispatch',    '派工单', '',                 2083134009698754913, 3, NOW(), NOW(), 1, 0);

-- 模板种子（制令 JSON 实现阶段再回填 factory_json/template_json）
INSERT IGNORE INTO blade_print_template (
  id, tenant_id, doc_type_id, doc_type_code, code, name,
  template_json, factory_json, create_time, update_time, status, is_deleted
) VALUES
(2083134009698754911, '000000', 2083134009698754901, 'instruction', 'standard', '生产指令单-标准', NULL, NULL, NOW(), NOW(), 1, 0),
(2083134009698754912, '000000', 2083134009698754902, 'workOrder',   'shell',    '工单打印-空壳',     NULL, NULL, NOW(), NOW(), 1, 0),
(2083134009698754913, '000000', 2083134009698754903, 'dispatch',    'shell',    '派工单打印-空壳',   NULL, NULL, NOW(), NOW(), 1, 0);

-- 挂载种子
INSERT IGNORE INTO blade_print_mount (
  id, tenant_id, doc_type_id, doc_type_code, page_code, page_name, enabled, sort,
  create_time, update_time, status, is_deleted
) VALUES
(2083134009698754921, '000000', 2083134009698754901, 'instruction', 'procurement.instruction', '制令列表', 1, 1, NOW(), NOW(), 1, 0),
(2083134009698754922, '000000', 2083134009698754902, 'workOrder',   'procurement.workOrder',   '工单列表', 1, 2, NOW(), NOW(), 1, 0),
(2083134009698754923, '000000', 2083134009698754903, 'dispatch',    'procurement.dispatch',    '派工管理', 1, 3, NOW(), NOW(), 1, 0);
