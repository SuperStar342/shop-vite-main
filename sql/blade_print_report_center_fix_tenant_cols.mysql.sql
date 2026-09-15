-- 补齐 TenantEntity / BaseEntity 审计列（修复 create_dept 等字段缺失）
SET NAMES utf8mb4;

-- blade_print_mount：缺 create_dept
ALTER TABLE blade_print_mount
  ADD COLUMN create_dept bigint DEFAULT NULL AFTER create_user;

-- blade_print_doc_type_auth：缺 create_dept / update_user / update_time / status
ALTER TABLE blade_print_doc_type_auth
  ADD COLUMN create_dept bigint DEFAULT NULL AFTER create_user,
  ADD COLUMN update_user bigint DEFAULT NULL AFTER create_time,
  ADD COLUMN update_time datetime DEFAULT NULL AFTER update_user,
  ADD COLUMN status int DEFAULT 1 AFTER update_time;
