-- =============================================================================
-- 系统菜单：常用靠前排序 + 补图标 + 字典拆为系统/业务子菜单
-- 库：192.168.20.209 / shop_vite
-- =============================================================================
SET NAMES utf8mb4;
START TRANSACTION;

SET @sys := 1123598815738675203;

-- 1) 字典管理改为父级目录，挂系统字典 / 业务字典
UPDATE blade_menu
SET
  name = '字典管理',
  alias = 'dict',
  path = '/system/dictionary',
  source = 'book-2-line',
  component = '',
  sort = 6
WHERE id = 1123598815738675562 AND is_deleted = 0;

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675586, 1123598815738675562, 'dictionarySystem', '系统字典', 'dict',
       '/system/dictionary/system', 'book-read-line', 1, 1, 0, 1,
       'views/system/dictionaryManagement/index', 'dictSystem', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND code = 'dictionarySystem'
);

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675587, 1123598815738675562, 'dictionaryBiz', '业务字典', 'dictbiz',
       '/system/dictionary/biz', 'book-marked-line', 2, 1, 0, 1,
       'views/system/dictionaryManagement/index', 'dictBiz', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND code = 'dictionaryBiz'
);

-- 校正子菜单
UPDATE blade_menu
SET parent_id = 1123598815738675562,
    name = '系统字典',
    path = '/system/dictionary/system',
    source = 'book-read-line',
    component = 'views/system/dictionaryManagement/index',
    sort = 1,
    remark = 'dictSystem'
WHERE code = 'dictionarySystem' AND is_deleted = 0;

UPDATE blade_menu
SET parent_id = 1123598815738675562,
    name = '业务字典',
    path = '/system/dictionary/biz',
    source = 'book-marked-line',
    component = 'views/system/dictionaryManagement/index',
    sort = 2,
    remark = 'dictBiz'
WHERE code = 'dictionaryBiz' AND is_deleted = 0;

-- 2) 常用菜单靠前
UPDATE blade_menu SET sort = 1,  source = 'user-follow-line'   WHERE code = 'personalCenter' AND is_deleted = 0;
UPDATE blade_menu SET sort = 2,  source = 'user-3-line'        WHERE code = 'userManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 3,  source = 'admin-line'         WHERE code = 'roleManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 4,  source = 'group-line'         WHERE code = 'departmentManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 5,  source = 'menu-2-fill'        WHERE code = 'menu' AND is_deleted = 0;
UPDATE blade_menu SET sort = 6,  source = 'book-2-line'        WHERE code = 'dictionaryManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 7,  source = 'settings-3-line'    WHERE code = 'paramManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 8,  source = 'building-2-line'    WHERE code = 'tenantManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 9,  source = 'key-line'           WHERE code = 'permission' AND is_deleted = 0;
UPDATE blade_menu SET sort = 10, source = 'folder-3-line'      WHERE code = 'resource' AND is_deleted = 0;
UPDATE blade_menu SET sort = 11, source = 'file-list-3-line'   WHERE code = 'auditLog' AND is_deleted = 0;
UPDATE blade_menu SET sort = 12, source = 'file-shield-2-line' WHERE code = 'systemLog' AND is_deleted = 0;
UPDATE blade_menu SET sort = 13, source = 'global-line'        WHERE code = 'websiteSetting' AND is_deleted = 0;
UPDATE blade_menu SET sort = 14, source = 'task-line'          WHERE code = 'taskManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 15, source = 'dashboard-line'     WHERE code = 'performanceMonitor' AND is_deleted = 0;
UPDATE blade_menu SET sort = 16, source = 'server-line'        WHERE code = 'serverManagement' AND is_deleted = 0;
UPDATE blade_menu SET sort = 17, source = 'mastercard-line'    WHERE code = 'iotManagement' AND is_deleted = 0;

-- 权限 / 资源子菜单图标
UPDATE blade_menu SET source = 'database-line'       WHERE code = 'dataScope' AND is_deleted = 0;
UPDATE blade_menu SET source = 'code-s-slash-line'   WHERE code = 'apiScope' AND is_deleted = 0;
UPDATE blade_menu SET source = 'hard-drive-2-line'   WHERE code = 'oss' AND is_deleted = 0;
UPDATE blade_menu SET source = 'attachment-line'     WHERE code = 'attach' AND is_deleted = 0;
UPDATE blade_menu SET source = 'message-2-line'      WHERE code = 'sms' AND is_deleted = 0;

-- 3) 授权新字典子菜单
INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT FLOOR(RAND() * 1000000000000000000) + 2000000000000000000, m.id, r.id
FROM blade_menu m
CROSS JOIN blade_role r
WHERE m.is_deleted = 0
  AND r.is_deleted = 0
  AND r.id IN (1123598816738675201, 2082711797382647809)
  AND m.code IN ('dictionarySystem', 'dictionaryBiz', 'dictionaryManagement')
  AND NOT EXISTS (
    SELECT 1 FROM blade_role_menu rm WHERE rm.menu_id = m.id AND rm.role_id = r.id
  );

COMMIT;

SELECT id, parent_id, code, name, path, source, sort, component
FROM blade_menu
WHERE is_deleted = 0
  AND (parent_id = @sys OR parent_id = 1123598815738675562 OR code = 'system')
ORDER BY CASE WHEN parent_id = 0 THEN 0 WHEN parent_id = @sys THEN 1 ELSE 2 END, sort, id;
