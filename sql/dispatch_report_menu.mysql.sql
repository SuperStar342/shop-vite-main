-- 派工报工菜单（挂在采购管理下，专注报工与一键报满）
-- 注意：勿与 quick_dispatch_menu（id=4607）复用同一 id
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754610,
  2083134009698754601,
  'dispatchReport',
  '派工报工',
  'menu',
  '/procurement/dispatchReport/index',
  'checkbox-circle-line',
  7,
  1,
  0,
  1,
  'views/procurement/dispatchReport/index',
  '派工单工序报工、一键报满与进度汇总',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754610 OR code = 'dispatchReport')
);

UPDATE blade_menu
SET name = '派工报工',
    path = '/procurement/dispatchReport/index',
    component = 'views/procurement/dispatchReport/index',
    source = 'checkbox-circle-line',
    sort = 7,
    remark = '派工单工序报工、一键报满与进度汇总'
WHERE is_deleted = 0 AND code = 'dispatchReport';

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754710,
  2083134009698754610,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754610 AND role_id = 1123598816738675201
);
