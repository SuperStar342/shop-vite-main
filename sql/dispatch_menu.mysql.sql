-- 派工管理菜单（挂在采购管理下，只读查询 SQL Server SF）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754606,
  2083134009698754601,
  'dispatch',
  '派工管理',
  'menu',
  '/procurement/dispatch/index',
  'file-list-3-line',
  5,
  1,
  0,
  1,
  'views/procurement/dispatch/index',
  '派工查询（SQL Server SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754606 OR code = 'dispatch')
);

UPDATE blade_menu
SET name = '派工管理',
    path = '/procurement/dispatch/index',
    component = 'views/procurement/dispatch/index'
WHERE is_deleted = 0 AND (id = 2083134009698754606 OR code = 'dispatch');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754706,
  2083134009698754606,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754606 AND role_id = 1123598816738675201
);
