-- 报表中心菜单与管理员角色授权
SET NAMES utf8mb4;

-- 一级：报表中心（parent_id=0；若环境一级挂在工作台下则改为实际 parent）
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754930, 0, 'printReport', '报表中心', 'menu',
  '/printReport', 'file-chart-line', 90, 1, 0, 1, 'Layout', '单据打印模板中心', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754930 OR code = 'printReport')
);

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754931, 2083134009698754930, 'printTemplate', '模板列表', 'menu',
  '/printReport/templates/index', 'file-list-3-line', 1, 1, 0, 1,
  'views/printReport/templates/index', '打印模板维护', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754931 OR code = 'printTemplate')
);

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754932, 2083134009698754930, 'printMount', '挂载配置', 'menu',
  '/printReport/mounts/index', 'links-line', 2, 1, 0, 1,
  'views/printReport/mounts/index', '单据类型挂载业务页', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754932 OR code = 'printMount')
);

-- 管理员角色（与现有种子一致）
INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754940, 2083134009698754930, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754930 AND role_id = 1123598816738675201);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754941, 2083134009698754931, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754931 AND role_id = 1123598816738675201);

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754933, 2083134009698754930, 'printTemplateDesign', '模板设计', 'menu',
  '/printReport/templates/design', 'edit-box-line', 3, 1, 0, 1,
  'views/printReport/templates/design', '打印模板设计（隐藏菜单，标签页打开）', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754933 OR code = 'printTemplateDesign')
);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754943, 2083134009698754933, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id = 2083134009698754933 AND role_id = 1123598816738675201);
