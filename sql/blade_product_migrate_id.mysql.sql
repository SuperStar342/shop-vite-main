-- 若库中仍为 product_id / spec_id / model_3d_url，执行本迁移以对齐 Blade 实体（id + model3d_url）
SET NAMES utf8mb4;

-- 主键对齐 TenantEntity.id
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blade_product' AND COLUMN_NAME = 'product_id'
);
SET @sql := IF(@col > 0,
  'ALTER TABLE blade_product CHANGE COLUMN product_id id BIGINT NOT NULL AUTO_INCREMENT COMMENT ''主键''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blade_product_spec' AND COLUMN_NAME = 'spec_id'
);
SET @sql := IF(@col > 0,
  'ALTER TABLE blade_product_spec CHANGE COLUMN spec_id id BIGINT NOT NULL AUTO_INCREMENT COMMENT ''主键''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3D 字段名对齐实体 model3dUrl → model3d_url
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blade_product' AND COLUMN_NAME = 'model_3d_url'
);
SET @sql := IF(@col > 0,
  'ALTER TABLE blade_product CHANGE COLUMN model_3d_url model3d_url varchar(512) DEFAULT NULL COMMENT ''3D 模型 URL''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
