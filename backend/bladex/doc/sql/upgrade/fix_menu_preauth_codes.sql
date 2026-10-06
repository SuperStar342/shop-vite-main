-- 纠正菜单 code：@PreAuth(menu="xxx") 只认 blade_menu.code（不是 alias）
-- 执行后请：1) 角色管理重新勾选授权并保存  2) dogman 重新登录  3) 可选清 Redis SYS_CACHE

SET NAMES utf8mb4;
START TRANSACTION;

-- code = PreAuth 官方码；alias = 前端路由 name（侧边栏兼容）
UPDATE blade_menu SET code = 'user', alias = 'UserManagement'
WHERE is_deleted = 0 AND (
  code IN ('user', 'UserManagement', 'userManagement')
  OR alias IN ('user', 'UserManagement', 'userManagement')
) AND (path LIKE '%/user%' OR name LIKE '%用户%');

UPDATE blade_menu SET code = 'role', alias = 'RoleManagement'
WHERE is_deleted = 0 AND (
  code IN ('role', 'RoleManagement', 'roleManagement')
  OR alias IN ('role', 'RoleManagement', 'roleManagement')
) AND (path LIKE '%/role%' OR name LIKE '%角色%');

UPDATE blade_menu SET code = 'dept', alias = 'DepartmentManagement'
WHERE is_deleted = 0 AND (
  code IN ('dept', 'DepartmentManagement', 'departmentManagement')
  OR alias IN ('dept', 'DepartmentManagement', 'departmentManagement')
) AND (path LIKE '%/dept%' OR path LIKE '%/department%' OR name LIKE '%机构%' OR name LIKE '%部门%');

UPDATE blade_menu SET code = 'menu', alias = 'MenuManagement'
WHERE is_deleted = 0 AND (
  code IN ('menu', 'MenuManagement')
  OR alias IN ('menu', 'MenuManagement')
) AND (path LIKE '%/menu%' OR name LIKE '%菜单%');

UPDATE blade_menu SET code = 'param', alias = 'ParamManagement'
WHERE is_deleted = 0 AND (
  code IN ('param', 'ParamManagement', 'paramManagement')
  OR alias IN ('param', 'ParamManagement', 'paramManagement')
) AND (path LIKE '%/param%' OR name LIKE '%参数%');

UPDATE blade_menu SET code = 'dict', alias = 'DictionaryManagement'
WHERE is_deleted = 0 AND (
  code IN ('dict', 'DictionaryManagement', 'dictionarySystem')
  OR alias IN ('dict', 'DictionaryManagement')
) AND (path LIKE '%dictionary/system%' OR name LIKE '%系统字典%');

UPDATE blade_menu SET code = 'dictbiz', alias = 'BizDictionaryManagement'
WHERE is_deleted = 0 AND (
  code IN ('dictbiz', 'BizDictionaryManagement', 'dictionaryBiz')
  OR alias IN ('dictbiz', 'BizDictionaryManagement')
) AND (path LIKE '%dictionary/biz%' OR name LIKE '%业务字典%');

UPDATE blade_menu SET code = 'data_scope', alias = 'DataScope'
WHERE is_deleted = 0 AND (
  code IN ('data_scope', 'dataScope', 'DataScope', 'DataScopeManagement')
  OR alias IN ('data_scope', 'dataScope', 'DataScope')
);

UPDATE blade_menu SET code = 'api_scope', alias = 'ApiScope'
WHERE is_deleted = 0 AND (
  code IN ('api_scope', 'apiScope', 'ApiScope', 'ApiScopeManagement')
  OR alias IN ('api_scope', 'apiScope', 'ApiScope')
);

COMMIT;

-- 核对 dogman 角色是否已挂上正确 code 的菜单
-- SELECT u.account, u.role_id, m.id, m.code, m.alias, m.name
-- FROM blade_user u
-- JOIN blade_role_menu rm ON FIND_IN_SET(rm.role_id, REPLACE(u.role_id,' ',''))
-- JOIN blade_menu m ON m.id = rm.menu_id AND m.is_deleted = 0
-- WHERE u.account = 'dogman';
