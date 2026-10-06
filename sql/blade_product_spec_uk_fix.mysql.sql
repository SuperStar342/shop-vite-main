-- 修复提交审核时 Duplicate entry '000000--1' for uk_product_spec_tenant_code
-- 原因：逻辑删除把多行 SKU 的 is_deleted 都改成 1，空编码/同编码在 (tenant_id,spec_code,is_deleted) 下冲突

-- 1) 清掉逻辑删除残留与空编码脏数据
DELETE FROM blade_product_spec WHERE is_deleted <> 0;
DELETE FROM blade_product_spec WHERE spec_code IS NULL OR TRIM(spec_code) = '';

SET @db := DATABASE();

-- 2) 去掉「含 is_deleted」的唯一索引（该设计与整批逻辑删除不兼容）
SET @sql := (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE blade_product_spec DROP INDEX uk_product_spec_tenant_code',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'blade_product_spec' AND index_name = 'uk_product_spec_tenant_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE blade_product_spec DROP INDEX uk_spec_code',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'blade_product_spec' AND index_name = 'uk_spec_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) 改为仅约束有效编码（业务唯一）；删除走物理删除，不再依赖 is_deleted 拼唯一键
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE blade_product_spec ADD UNIQUE KEY uk_product_spec_tenant_code (tenant_id, spec_code)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'blade_product_spec' AND index_name = 'uk_product_spec_tenant_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
