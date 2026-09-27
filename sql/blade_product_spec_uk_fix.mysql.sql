-- 修复 SKU 唯一索引：逻辑删除后仍可复用同一 spec_code
-- 适用：已存在 uk_spec_code / uk_product_spec_tenant_code 导致二次保存 Duplicate entry

-- 1) 清掉已逻辑删除的 SKU 残留（释放唯一索引）
DELETE FROM blade_product_spec WHERE is_deleted = 1;

-- 2) 删除旧唯一索引（名称按实际库调整，不存在会报错可忽略）
-- ALTER TABLE blade_product_spec DROP INDEX uk_spec_code;
-- ALTER TABLE blade_product_spec DROP INDEX uk_product_spec_tenant_code;

SET @db := DATABASE();

-- 动态删除名为 uk_spec_code 的索引（若存在）
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

-- 3) 重建：租户 + 编码 + 删除标记，逻辑删除后可同编码重新插入
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE blade_product_spec ADD UNIQUE KEY uk_product_spec_tenant_code (tenant_id, spec_code, is_deleted)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'blade_product_spec' AND index_name = 'uk_product_spec_tenant_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
