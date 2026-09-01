-- 非生产派工 · 类型设置（挂在 nonProdDispatch 下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754622,
  2083134009698754620,
  'dispatchTypeSetting',
  '类型设置',
  'menu',
  '/nonProd/dispatchType/index',
  'list-settings-line',
  2,
  1,
  0,
  1,
  'views/nonProd/dispatchType/index',
  '非生产派工类型设置（SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754622 OR code = 'dispatchTypeSetting')
);

UPDATE blade_menu
SET name = '类型设置',
    parent_id = 2083134009698754620,
    path = '/nonProd/dispatchType/index',
    component = 'views/nonProd/dispatchType/index',
    source = 'list-settings-line',
    sort = 2,
    remark = '非生产派工类型设置（SF）'
WHERE is_deleted = 0 AND (id = 2083134009698754622 OR code = 'dispatchTypeSetting');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754722,
  2083134009698754622,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754622 AND role_id = 1123598816738675201
);
