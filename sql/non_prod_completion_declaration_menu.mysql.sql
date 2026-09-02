-- 非生产派工 · 完工申报管理（挂在 nonProdDispatch 下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754623,
  2083134009698754620,
  'completionDeclaration',
  '完工申报管理',
  'menu',
  '/nonProd/completionDeclaration/index',
  'file-check-line',
  3,
  1,
  0,
  1,
  'views/nonProd/completionDeclaration/index',
  '非生产完工申报管理（SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754623 OR code = 'completionDeclaration')
);

UPDATE blade_menu
SET name = '完工申报管理',
    parent_id = 2083134009698754620,
    path = '/nonProd/completionDeclaration/index',
    component = 'views/nonProd/completionDeclaration/index',
    source = 'file-check-line',
    sort = 3,
    remark = '非生产完工申报管理（SF）'
WHERE is_deleted = 0 AND (id = 2083134009698754623 OR code = 'completionDeclaration');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754723,
  2083134009698754623,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754623 AND role_id = 1123598816738675201
);
