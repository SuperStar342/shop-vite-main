-- 非生产派工 · 非生产派工管理（挂在 nonProdDispatch 下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754624,
  2083134009698754620,
  'otherDispatch',
  '非生产派工管理',
  'menu',
  '/nonProd/otherDispatch/index',
  'list-check-2',
  1,
  1,
  0,
  1,
  'views/nonProd/otherDispatch/index',
  '非生产派工管理（SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754624 OR code = 'otherDispatch')
);

UPDATE blade_menu
SET name = '非生产派工管理',
    parent_id = 2083134009698754620,
    path = '/nonProd/otherDispatch/index',
    component = 'views/nonProd/otherDispatch/index',
    source = 'list-check-2',
    sort = 1,
    remark = '非生产派工管理（SF）'
WHERE is_deleted = 0 AND (id = 2083134009698754624 OR code = 'otherDispatch');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754724,
  2083134009698754624,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754624 AND role_id = 1123598816738675201
);
