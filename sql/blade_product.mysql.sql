-- 商品管理（新版）：SPU 主表 + SKU 规格表（MySQL / shop_vite）
-- 对应前端：src/api/product.ts → /api/blade-system/product/**
-- 若库中仍是 product_id / spec_id / model_3d_url，请先执行：sql/blade_product_migrate_id.mysql.sql
SET NAMES utf8mb4;

-- 审核字段（已有库可单独执行）
-- ALTER TABLE blade_product ADD COLUMN audit_remark varchar(512) DEFAULT '' COMMENT '审核备注/驳回原因' AFTER audit_status;
-- ALTER TABLE blade_product ADD COLUMN audit_time datetime DEFAULT NULL COMMENT '最近审核时间' AFTER audit_remark;

CREATE TABLE IF NOT EXISTS blade_product (
  id                  bigint        NOT NULL COMMENT '主键（雪花）',
  tenant_id           varchar(12)   DEFAULT '000000' COMMENT '租户',
  product_code        varchar(64)   NOT NULL COMMENT '产品编码 / SPU 编码，业务唯一',
  product_name        varchar(128)  NOT NULL COMMENT '产品名称',
  product_subtitle    varchar(256)  DEFAULT '' COMMENT '副标题 / 营销 slogan',
  product_brief       varchar(512)  DEFAULT '' COMMENT '产品简介',
  product_description text          COMMENT '产品详情富文本',
  keywords            varchar(256)  DEFAULT '' COMMENT '搜索关键词，逗号分隔',
  brand               varchar(64)   DEFAULT '' COMMENT '品牌名称',
  category_id         bigint        DEFAULT NULL COMMENT '三级分类ID',
  category_path       varchar(255)  DEFAULT '' COMMENT '分类路径',
  origin              json          DEFAULT NULL COMMENT '产地 / 生产地（多选数组）',
  applicable_space    json          DEFAULT NULL COMMENT '适用空间（多选数组）',
  applicable_scene    json          DEFAULT NULL COMMENT '适用场景（多选数组）',
  product_type        int           DEFAULT NULL COMMENT '商品类型 0成品 1定制 2半成品 3配件',
  package_type        int           DEFAULT NULL COMMENT '包装类型 0独立件 1分包件 2组合',
  retail_price        decimal(10,2) DEFAULT NULL COMMENT '零售指导价（元）',
  member_price        decimal(10,2) DEFAULT NULL COMMENT '会员价（元）',
  cost_price          decimal(10,2) DEFAULT NULL COMMENT '成本价（元）',
  unit                varchar(16)   DEFAULT '' COMMENT '计量单位',
  min_order_qty       int           DEFAULT 1 COMMENT '起订量',
  tax_rate            decimal(6,4)  DEFAULT NULL COMMENT '税率（如 0.13）',
  product_status      int           DEFAULT 0 COMMENT '产品状态 0草稿 1在售 2停售 3淘汰',
  audit_status        int           DEFAULT -1 COMMENT '审核 -1未送审 0待审 1通过 2驳回',
  audit_remark        varchar(512)  DEFAULT '' COMMENT '审核备注 / 驳回原因',
  audit_time          datetime      DEFAULT NULL COMMENT '最近审核时间',
  main_image          varchar(512)  DEFAULT '' COMMENT '主图 URL',
  detail_images       json          DEFAULT NULL COMMENT '详情图 URL 数组',
  video_url           varchar(512)  DEFAULT '' COMMENT '宣传视频 URL',
  model3d_url         varchar(512)  DEFAULT '' COMMENT '3D 模型 URL',
  is_on_shelf         int           DEFAULT 0 COMMENT '是否上架 0下架 1上架',
  is_recommended      int           DEFAULT 0 COMMENT '是否推荐',
  is_new              int           DEFAULT 0 COMMENT '是否新品',
  is_hot              int           DEFAULT 0 COMMENT '是否热销',
  sort_weight         int           DEFAULT 0 COMMENT '排序权重',
  tags                json          DEFAULT NULL COMMENT '产品标签数组',
  create_user         bigint        DEFAULT NULL,
  create_dept         bigint        DEFAULT NULL,
  create_time         datetime      DEFAULT NULL,
  update_user         bigint        DEFAULT NULL,
  update_time         datetime      DEFAULT NULL,
  status              int           DEFAULT 1 COMMENT '1启用 0停用',
  is_deleted          int           DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_product_tenant_code (tenant_id, product_code),
  KEY idx_product_tenant_status (tenant_id, is_deleted, product_status),
  KEY idx_product_tenant_audit (tenant_id, is_deleted, audit_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品主表（SPU）';

CREATE TABLE IF NOT EXISTS blade_product_spec (
  id                  bigint        NOT NULL COMMENT '主键（雪花）',
  tenant_id           varchar(12)   DEFAULT '000000' COMMENT '租户',
  product_id          bigint        NOT NULL COMMENT '产品ID，关联 blade_product.id',
  spec_code           varchar(64)   NOT NULL COMMENT '规格 SKU 编码，业务唯一',
  spec_name           varchar(128)  DEFAULT '' COMMENT '规格名称',
  spec_price          decimal(10,2) DEFAULT NULL COMMENT '规格售价（元）',
  spec_member_price   decimal(10,2) DEFAULT NULL COMMENT '规格会员价（元）',
  spec_cost_price     decimal(10,2) DEFAULT NULL COMMENT '规格成本价（元）',
  spec_stock          int           DEFAULT 0 COMMENT '规格库存',
  spec_unit           varchar(16)   DEFAULT '' COMMENT '规格单位',
  spec_image          varchar(512)  DEFAULT '' COMMENT '规格图片 URL',
  is_default          int           DEFAULT 0 COMMENT '是否默认规格 0否 1是',
  spec_status         int           DEFAULT 1 COMMENT '规格状态 0禁用 1启用',
  length              int           DEFAULT NULL COMMENT '长 (mm)',
  width               int           DEFAULT NULL COMMENT '宽 (mm)',
  height              int           DEFAULT NULL COMMENT '高 (mm)',
  seat_height         int           DEFAULT NULL COMMENT '坐高 (mm)',
  unfolded_size       varchar(64)   DEFAULT '' COMMENT '展开尺寸',
  product_weight      decimal(10,2) DEFAULT NULL COMMENT '产品重量 (kg)',
  main_material       varchar(64)   DEFAULT '' COMMENT '主材质',
  auxiliary_material  varchar(64)   DEFAULT '' COMMENT '辅助材质',
  fabric_material     varchar(64)   DEFAULT '' COMMENT '面料材质',
  filling_material    varchar(64)   DEFAULT '' COMMENT '填充材质',
  frame_material      varchar(64)   DEFAULT '' COMMENT '框架材质',
  hardware            varchar(64)   DEFAULT '' COMMENT '五金配件',
  surface_craft       varchar(64)   DEFAULT '' COMMENT '表面工艺',
  color               varchar(64)   DEFAULT '' COMMENT '颜色',
  style               varchar(64)   DEFAULT '' COMMENT '风格',
  environmental_grade varchar(32)   DEFAULT '' COMMENT '环保等级',
  create_user         bigint        DEFAULT NULL,
  create_dept         bigint        DEFAULT NULL,
  create_time         datetime      DEFAULT NULL,
  update_user         bigint        DEFAULT NULL,
  update_time         datetime      DEFAULT NULL,
  status              int           DEFAULT 1,
  is_deleted          int           DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_product_spec_tenant_code (tenant_id, spec_code, is_deleted),
  KEY idx_product_spec_product (tenant_id, product_id, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规格表（SKU）';

-- 演示种子数据（可重复执行：按编码忽略已存在）
INSERT INTO blade_product (
  id, tenant_id, product_code, product_name, product_subtitle, product_brief, brand, category_path,
  origin, applicable_space, applicable_scene, product_type, package_type,
  retail_price, member_price, cost_price, unit, min_order_qty, tax_rate,
  product_status, audit_status, main_image, detail_images, video_url, model3d_url,
  is_on_shelf, is_recommended, is_new, is_hot, sort_weight, tags,
  create_time, update_time, status, is_deleted
) VALUES
(
  1900000000000000001, '000000', 'SF-2026001', '多功能沙发床', '一体成型 · 折叠省空间 · 双人舒适',
  '客厅卧室两用，高弹海绵坐垫，可折叠收纳，适合小户型。', '宜家家居', '客厅家具/沙发/布艺沙发',
  JSON_ARRAY('中国', '广东'), JSON_ARRAY('客厅', '卧室'), JSON_ARRAY('家用', '办公'),
  0, 0, 3599.00, 2999.00, 1800.00, '件', 1, 0.1300,
  1, 1, '', JSON_ARRAY(), '', '',
  1, 1, 1, 1, 100, JSON_ARRAY('小户型', '可定制', '送货安装'),
  NOW(), NOW(), 1, 0
),
(
  1900000000000000002, '000000', 'BK-2026002', '北欧实木书柜', '白橡木 · 开放式层架 · 可调节隔板',
  '简约北欧风书柜，实木框架，层高可调，承重稳定。', '全友家居', '书房家具/书柜/实木书柜',
  JSON_ARRAY('中国', '浙江'), JSON_ARRAY('书房', '客厅'), JSON_ARRAY('家用'),
  0, 0, 1899.00, 1599.00, 900.00, '件', 1, 0.1300,
  1, 1, '', JSON_ARRAY(), '', '',
  1, 0, 1, 0, 80, JSON_ARRAY('环保', '北欧'),
  NOW(), NOW(), 1, 0
)
ON DUPLICATE KEY UPDATE update_time = VALUES(update_time);

INSERT INTO blade_product_spec (
  id, tenant_id, product_id, spec_code, spec_name, spec_price, spec_member_price, spec_cost_price,
  spec_stock, spec_unit, is_default, spec_status, length, width, height, seat_height,
  main_material, fabric_material, filling_material, color, style, environmental_grade,
  create_time, update_time, status, is_deleted
) VALUES
(
  1900000000000000101, '000000', 1900000000000000001, 'SF-2026001-A', '三人位 / 浅灰',
  3599.00, 2999.00, 1800.00, 198, '件', 1, 1, 2100, 900, 850, 420,
  '实木框架', '科技布', '高弹海绵', '浅灰', '现代简约', 'E0',
  NOW(), NOW(), 1, 0
),
(
  1900000000000000102, '000000', 1900000000000000001, 'SF-2026001-B', '三人位 / 胡桃',
  3799.00, 3199.00, 1900.00, 100, '件', 0, 1, 2100, 900, 850, 420,
  '实木框架', '科技布', '高弹海绵', '胡桃色', '现代简约', 'E0',
  NOW(), NOW(), 1, 0
),
(
  1900000000000000103, '000000', 1900000000000000002, 'BK-2026002-A', '五层 / 原木色',
  1899.00, 1599.00, 900.00, 86, '件', 1, 1, 800, 350, 1800, NULL,
  '白橡木', '', '', '原木色', '北欧', 'E0',
  NOW(), NOW(), 1, 0
)
ON DUPLICATE KEY UPDATE update_time = VALUES(update_time);
