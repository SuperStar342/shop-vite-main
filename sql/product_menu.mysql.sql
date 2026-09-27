-- 商品管理菜单：仅保留列表；新增在列表内，驾驶舱已并入资料缺失条
SET NAMES utf8mb4;

INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 2083134009698754801, 2081960438830845954, 'productManagement', '商品管理', 'menu', '/product', 'shopping-bag-3-line', 6, 1, 0, 1, '', '商品管理目录', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754801 OR code = 'productManagement'));

UPDATE blade_menu SET name='商品管理', path='/product', component='', sort=6
WHERE is_deleted=0 AND (id=2083134009698754801 OR code='productManagement');

-- 列表（主入口）
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 2083134009698754802, 2083134009698754801, 'productList', '商品列表', 'menu', '/product/index', 'list-check-3', 1, 1, 0, 1, 'views/product/index', '商品列表（含新增与资料缺失）', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (id=2083134009698754802 OR code='productList'));

UPDATE blade_menu SET name='商品列表', path='/product/index', component='views/product/index', sort=1, remark='含新增向导与资料缺失'
WHERE is_deleted=0 AND (id=2083134009698754802 OR code='productList');

-- 驾驶舱 / 独立新增：隐藏
UPDATE blade_menu SET is_deleted = 1, remark = '已并入商品列表'
WHERE code IN ('productCockpit', 'productCreate') AND is_deleted = 0;

-- 工作台（隐藏路由）
INSERT INTO blade_menu (id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted)
SELECT 2083134009698754805, 2083134009698754801, 'productWorkbench', '商品工作台', 'menu', '/product/workbench', 'layout-grid-line', 3, 1, 0, 1, 'views/product/workbench', '商品详情工作台（隐藏）', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM blade_menu WHERE is_deleted=0 AND (id=2083134009698754805 OR code='productWorkbench'));

UPDATE blade_menu SET name='商品工作台', path='/product/workbench', component='views/product/workbench', sort=3, remark='隐藏路由'
WHERE is_deleted=0 AND (id=2083134009698754805 OR code='productWorkbench');

UPDATE blade_menu SET path='/product/edit', component='views/product/edit', remark='兼容跳转'
WHERE is_deleted=0 AND code='productEdit';

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT 2083134009698754822, 2083134009698754805, 1123598816738675201 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blade_role_menu WHERE menu_id=2083134009698754805 AND role_id=1123598816738675201);
