-- 普通派工菜单（挂在采购管理下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754608,
  2083134009698754601,
  'normalDispatch',
  '普通派工',
  'menu',
  '/procurement/normalDispatch/index',
  'user',
  7,
  1,
  0,
  1,
  'views/procurement/normalDispatch/index',
  '多工单同工序合并派工，人员挂在工序行上按未派量比例拆分（SQL Server SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754608 OR code = 'normalDispatch')
);

UPDATE blade_menu
SET name = '普通派工',
    path = '/procurement/normalDispatch/index',
    component = 'views/procurement/normalDispatch/index',
    source = 'user',
    sort = 7,
    remark = '多工单同工序合并派工，人员挂在工序行上按未派量比例拆分（SQL Server SF）'
WHERE is_deleted = 0 AND (id = 2083134009698754608 OR code = 'normalDispatch');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754708,
  2083134009698754608,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754608 AND role_id = 1123598816738675201
);
