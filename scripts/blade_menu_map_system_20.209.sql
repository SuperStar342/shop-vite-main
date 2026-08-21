-- =============================================================================
-- 20.209 / shop_vite：补全 views/system 菜单映射并授权管理员
-- 已有：user/dept/dict/menu/tenant/auditLog
-- 补全：role/param/personal/permission/resource/log/task/iot/server/perf/website
-- =============================================================================
SET NAMES utf8mb4;
START TRANSACTION;

SET @sys := 1123598815738675203;

-- 角色管理
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675570, @sys, 'roleManagement', '角色管理', 'role', '/system/roleManagement/index', 'admin-line', 3, 1, 0, 1, 'views/system/roleManagement/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='roleManagement' OR path='/system/roleManagement/index'));

-- 参数管理
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675571, @sys, 'paramManagement', '参数管理', 'param', '/system/paramManagement/index', 'settings-3-line', 5, 1, 0, 1, 'views/system/paramManagement/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='paramManagement' OR path='/system/paramManagement/index'));

-- 个人中心
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675572, @sys, 'personalCenter', '个人中心', 'personal', '/system/personalCenter/index', 'user-follow-line', 1, 1, 0, 1, 'views/system/personalCenter/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='personalCenter' OR path='/system/personalCenter/index'));

-- 权限管理目录
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675573, @sys, 'permission', '权限管理', 'permission', '/system/permission', 'shield-keyhole-line', 8, 1, 0, 1, '', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND code='permission' AND parent_id=@sys);

SET @perm := (SELECT id FROM blade_menu WHERE is_deleted=0 AND code='permission' AND parent_id=@sys LIMIT 1);

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675574, @perm, 'dataScope', '数据权限', 'data_scope', '/system/permission/dataScope/index', 'database-2-line', 1, 1, 0, 1, 'views/system/permission/dataScope/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='dataScope' OR path='/system/permission/dataScope/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675575, @perm, 'apiScope', '接口权限', 'api_scope', '/system/permission/apiScope/index', 'code-box-line', 2, 1, 0, 1, 'views/system/permission/apiScope/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='apiScope' OR path='/system/permission/apiScope/index'));

-- 资源管理目录
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675576, @sys, 'resource', '资源管理', 'resource', '/system/resource', 'folder-3-line', 9, 1, 0, 1, '', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND code='resource' AND parent_id=@sys);

SET @res := (SELECT id FROM blade_menu WHERE is_deleted=0 AND code='resource' AND parent_id=@sys LIMIT 1);

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675577, @res, 'oss', '对象存储', 'oss', '/system/resource/oss/index', 'hard-drive-2-line', 1, 1, 0, 1, 'views/system/resource/oss/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='oss' OR path='/system/resource/oss/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675578, @res, 'attach', '附件管理', 'attach', '/system/resource/attach/index', 'attachment-line', 2, 1, 0, 1, 'views/system/resource/attach/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='attach' OR path='/system/resource/attach/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675579, @res, 'sms', '短信配置', 'sms', '/system/resource/sms/index', 'message-2-line', 3, 1, 0, 1, 'views/system/resource/sms/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='sms' OR path='/system/resource/sms/index'));

-- 其它系统页
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675580, @sys, 'systemLog', '系统日志', 'log', '/system/systemLog/index', 'file-shield-2-line', 10, 1, 0, 1, 'views/system/systemLog/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='systemLog' OR path='/system/systemLog/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675581, @sys, 'taskManagement', '任务管理', 'task', '/system/taskManagement/index', 'task-line', 11, 1, 0, 1, 'views/system/taskManagement/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='taskManagement' OR path='/system/taskManagement/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675582, @sys, 'iotManagement', '物联网管理', 'iot', '/system/iotManagement/index', 'mastercard-line', 12, 1, 0, 1, 'views/system/iotManagement/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='iotManagement' OR path='/system/iotManagement/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675583, @sys, 'serverManagement', '服务器管理', 'server', '/system/serverManagement/index', 'server-line', 13, 1, 0, 1, 'views/system/serverManagement/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='serverManagement' OR path='/system/serverManagement/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675584, @sys, 'performanceMonitor', '性能监控', 'perf', '/system/performanceMonitor/index', 'dashboard-line', 14, 1, 0, 1, 'views/system/performanceMonitor/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='performanceMonitor' OR path='/system/performanceMonitor/index'));

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 1123598815738675585, @sys, 'websiteSetting', '网站设置', 'website', '/system/websiteSetting/index', 'global-line', 15, 1, 0, 1, 'views/system/websiteSetting/index', 'map:views/system', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (code='websiteSetting' OR path='/system/websiteSetting/index'));

-- 校正已有菜单的 component（防旧值）
UPDATE blade_menu SET component='views/system/userManagement/index', path='/system/userManagement/index' WHERE is_deleted=0 AND code='userManagement';
UPDATE blade_menu SET component='views/system/departmentManagement/index', path='/system/departmentManagement/index' WHERE is_deleted=0 AND code='departmentManagement';
UPDATE blade_menu SET component='views/system/dictionaryManagement/index', path='/system/dictionaryManagement/index' WHERE is_deleted=0 AND code='dictionaryManagement';
UPDATE blade_menu SET component='views/system/menu/index', path='/system/menu/index' WHERE is_deleted=0 AND code='menu';
UPDATE blade_menu SET component='views/system/tenantManagement/index', path='/system/tenantManagement/index' WHERE is_deleted=0 AND code='tenantManagement';
UPDATE blade_menu SET component='views/system/auditLog/index', path='/system/auditLog/index' WHERE is_deleted=0 AND code='auditLog';
UPDATE blade_menu SET component='views/system/roleManagement/index', path='/system/roleManagement/index' WHERE is_deleted=0 AND code='roleManagement';
UPDATE blade_menu SET component='views/system/paramManagement/index', path='/system/paramManagement/index' WHERE is_deleted=0 AND code='paramManagement';
UPDATE blade_menu SET component='views/system/personalCenter/index', path='/system/personalCenter/index' WHERE is_deleted=0 AND code='personalCenter';
UPDATE blade_menu SET component='views/system/permission/dataScope/index', path='/system/permission/dataScope/index' WHERE is_deleted=0 AND code='dataScope';
UPDATE blade_menu SET component='views/system/permission/apiScope/index', path='/system/permission/apiScope/index' WHERE is_deleted=0 AND code='apiScope';
UPDATE blade_menu SET component='views/system/resource/oss/index', path='/system/resource/oss/index' WHERE is_deleted=0 AND code='oss';
UPDATE blade_menu SET component='views/system/resource/attach/index', path='/system/resource/attach/index' WHERE is_deleted=0 AND code='attach';
UPDATE blade_menu SET component='views/system/resource/sms/index', path='/system/resource/sms/index' WHERE is_deleted=0 AND code='sms';
UPDATE blade_menu SET component='views/system/systemLog/index', path='/system/systemLog/index' WHERE is_deleted=0 AND code='systemLog';
UPDATE blade_menu SET component='views/system/taskManagement/index', path='/system/taskManagement/index' WHERE is_deleted=0 AND code='taskManagement';
UPDATE blade_menu SET component='views/system/iotManagement/index', path='/system/iotManagement/index' WHERE is_deleted=0 AND code='iotManagement';
UPDATE blade_menu SET component='views/system/serverManagement/index', path='/system/serverManagement/index' WHERE is_deleted=0 AND code='serverManagement';
UPDATE blade_menu SET component='views/system/performanceMonitor/index', path='/system/performanceMonitor/index' WHERE is_deleted=0 AND code='performanceMonitor';
UPDATE blade_menu SET component='views/system/websiteSetting/index', path='/system/websiteSetting/index' WHERE is_deleted=0 AND code='websiteSetting';
UPDATE blade_menu SET component='' WHERE is_deleted=0 AND code IN ('system','permission','resource');

-- 授权给 administrator(ceo) 与 admin
INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT FLOOR(RAND()*1000000000000000000)+2000000000000000000, m.id, r.id
FROM blade_menu m
CROSS JOIN blade_role r
WHERE m.is_deleted=0
  AND r.is_deleted=0
  AND r.id IN (1123598816738675201, 2082711797382647809)
  AND m.parent_id IN (@sys, @perm, @res, 0)
  AND (m.path LIKE '/system%' OR m.code='system')
  AND NOT EXISTS (
    SELECT 1 FROM blade_role_menu rm WHERE rm.menu_id=m.id AND rm.role_id=r.id
  );

COMMIT;

SELECT id, code, name, path, component FROM blade_menu WHERE is_deleted=0 AND (path LIKE '/system%' OR code='system') ORDER BY parent_id, sort, id;
