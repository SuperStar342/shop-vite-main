-- 非生产派工（挂在「首页」下）+ 单价设置
-- 首页菜单 id：2081960438830845954（与采购管理同级）
SET NAMES utf8mb4;

-- 目录：非生产派工
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754620,
  2081960438830845954,
  'nonProdDispatch',
  '非生产派工',
  'menu',
  '/nonProd',
  'tools-line',
  4,
  1,
  0,
  1,
  '',
  '非生产派工业务目录',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754620 OR code = 'nonProdDispatch')
);

UPDATE blade_menu
SET name = '非生产派工',
    parent_id = 2081960438830845954,
    path = '/nonProd',
    component = '',
    source = 'tools-line',
    sort = 4,
    remark = '非生产派工业务目录'
WHERE is_deleted = 0 AND (id = 2083134009698754620 OR code = 'nonProdDispatch');

-- 子菜单：单价设置
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754621,
  2083134009698754620,
  'unitPriceSetting',
  '单价设置',
  'menu',
  '/nonProd/unitPrice/index',
  'money-cny-circle-line',
  1,
  1,
  0,
  1,
  'views/nonProd/unitPrice/index',
  '非生产派工计件单价维护',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754621 OR code = 'unitPriceSetting')
);

UPDATE blade_menu
SET name = '单价设置',
    parent_id = 2083134009698754620,
    path = '/nonProd/unitPrice/index',
    component = 'views/nonProd/unitPrice/index',
    source = 'money-cny-circle-line',
    sort = 1,
    remark = '非生产派工计件单价维护'
WHERE is_deleted = 0 AND (id = 2083134009698754621 OR code = 'unitPriceSetting');

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754720,
  2083134009698754620,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754620 AND role_id = 1123598816738675201
);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754721,
  2083134009698754621,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754621 AND role_id = 1123598816738675201
);
