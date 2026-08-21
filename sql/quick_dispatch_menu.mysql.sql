-- 快捷派工菜单（挂在采购管理下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754607,
  2083134009698754601,
  'quickDispatch',
  '按工单派工',
  'menu',
  '/procurement/quickDispatch/index',
  'user-shared-line',
  6,
  1,
  0,
  1,
  'views/procurement/quickDispatch/index',
  '按工单选择工序与工人生成派工单（SQL Server SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754607 OR code = 'quickDispatch')
);

UPDATE blade_menu
SET name = '按工单派工',
    path = '/procurement/quickDispatch/index',
    component = 'views/procurement/quickDispatch/index',
    source = 'user-shared-line',
    sort = 6,
    remark = '按工单选择工序与工人生成派工单（SQL Server SF）'
WHERE is_deleted = 0 AND (id = 2083134009698754607 OR code = 'quickDispatch');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754707,
  2083134009698754607,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754607 AND role_id = 1123598816738675201
);
