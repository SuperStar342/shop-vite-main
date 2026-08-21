-- PreAuth 菜单码对齐：code = 官方 PreAuth 码，alias = 前端路由 name
-- 切勿把 UserManagement 写进 code，否则 @PreAuth(menu="user") 会 401
SET NAMES utf8mb4;
START TRANSACTION;

UPDATE blade_menu SET code = 'dept', alias = 'DepartmentManagement'
WHERE is_deleted = 0 AND code IN ('departmentManagement', 'DepartmentManagement', 'dept');

UPDATE blade_menu SET code = 'user', alias = 'UserManagement'
WHERE is_deleted = 0 AND code IN ('userManagement', 'UserManagement', 'user');

UPDATE blade_menu SET code = 'role', alias = 'RoleManagement'
WHERE is_deleted = 0 AND code IN ('roleManagement', 'RoleManagement', 'role');

UPDATE blade_menu SET code = 'menu', alias = 'MenuManagement'
WHERE is_deleted = 0 AND code IN ('menu', 'MenuManagement') AND (path LIKE '%/menu%' OR name LIKE '%菜单%');

UPDATE blade_menu SET code = 'dict', alias = 'DictionaryManagement'
WHERE is_deleted = 0 AND code IN ('dictionarySystem', 'DictionaryManagement', 'dict');

UPDATE blade_menu SET code = 'dictbiz', alias = 'BizDictionaryManagement'
WHERE is_deleted = 0 AND code IN ('dictionaryBiz', 'BizDictionaryManagement', 'dictbiz');

UPDATE blade_menu SET code = 'param', alias = 'ParamManagement'
WHERE is_deleted = 0 AND code IN ('paramManagement', 'ParamManagement', 'param');

UPDATE blade_menu SET code = 'tenant', alias = 'TenantManagement'
WHERE is_deleted = 0 AND code IN ('tenantManagement', 'TenantManagement', 'tenant');

UPDATE blade_menu SET code = 'data_scope', alias = 'DataScope'
WHERE is_deleted = 0 AND code IN ('dataScope', 'DataScope', 'DataScopeManagement', 'data_scope');

UPDATE blade_menu SET code = 'api_scope', alias = 'ApiScope'
WHERE is_deleted = 0 AND code IN ('apiScope', 'ApiScope', 'ApiScopeManagement', 'api_scope');

UPDATE blade_menu SET code = 'post', alias = 'PostManagement'
WHERE is_deleted = 0 AND code IN ('post', 'PostManagement', 'postManagement');

COMMIT;

SELECT code, alias, name, path FROM blade_menu
WHERE is_deleted = 0 AND parent_id = 1123598815738675203
ORDER BY sort;
