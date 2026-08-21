-- =============================================================================
-- 修复租户/资源 401：对齐 PreAuth 菜单 code
-- 根因（结合后端）：
--   1) Tenant/Oss/Attach/Sms 接口使用 @IsAdmin → 要求 JWT 角色别名含 admin/administrator
--      仅勾选菜单不够；非 admin 角色会 401「请求未授权」
--   2) 租户菜单 code 被写成 TenantManagement，alias=tenant（反了）
--      若后端改为 @PreAuth(menu="tenant")，必须 code='tenant'
-- oss/attach/sms 的 code 已正确，本脚本只校正租户并复核授权
-- =============================================================================
SET NAMES utf8mb4;
START TRANSACTION;

-- code = PreAuth 码；alias = 前端路由 name
UPDATE blade_menu
SET code = 'tenant', alias = 'TenantManagement'
WHERE is_deleted = 0
  AND (
    code IN ('TenantManagement', 'tenantManagement', 'tenant')
    OR path LIKE '%/tenantManagement%'
    OR name = '租户管理'
  );

-- 确保 admin / administrator 角色已授权租户与资源菜单
INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT FLOOR(RAND() * 1000000000000000000) + 2000000000000000000, m.id, r.id
FROM blade_menu m
CROSS JOIN blade_role r
WHERE m.is_deleted = 0
  AND r.is_deleted = 0
  AND r.role_alias IN ('administrator', 'admin')
  AND m.code IN ('tenant', 'resource', 'oss', 'attach', 'sms')
  AND NOT EXISTS (
    SELECT 1 FROM blade_role_menu rm WHERE rm.menu_id = m.id AND rm.role_id = r.id
  );

COMMIT;

SELECT id, code, alias, name, path
FROM blade_menu
WHERE is_deleted = 0
  AND code IN ('tenant', 'resource', 'oss', 'attach', 'sms', 'TenantManagement')
ORDER BY code;
