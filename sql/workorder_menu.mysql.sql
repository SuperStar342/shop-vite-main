-- 工单列表菜单（挂在采购管理下，只读查询）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754605,
  2083134009698754601,
  'workOrder',
  '工单列表',
  'menu',
  '/procurement/workOrder/index',
  'file-list-2-line',
  4,
  1,
  0,
  1,
  'views/procurement/workOrder/index',
  '工单查询（SQL Server SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754605 OR code = 'workOrder')
);

UPDATE blade_menu
SET name = '工单列表'
WHERE is_deleted = 0 AND (id = 2083134009698754605 OR code = 'workOrder');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754705,
  2083134009698754605,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754605 AND role_id = 1123598816738675201
);
