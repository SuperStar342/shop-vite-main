-- 报工管理菜单（挂在采购管理下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754609,
  2083134009698754601,
  'workReport',
  '报工管理',
  'menu',
  '/procurement/workReport/index',
  'edit',
  8,
  1,
  0,
  1,
  'views/procurement/workReport/index',
  '派工任务报工、质量录入与制令进度看板',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754609 OR code = 'workReport')
);

UPDATE blade_menu
SET name = '报工管理',
    path = '/procurement/workReport/index',
    component = 'views/procurement/workReport/index',
    source = 'edit',
    sort = 8,
    remark = '派工任务报工、质量录入与制令进度看板'
WHERE is_deleted = 0 AND (id = 2083134009698754609 OR code = 'workReport');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754709,
  2083134009698754609,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754609 AND role_id = 1123598816738675201
);
